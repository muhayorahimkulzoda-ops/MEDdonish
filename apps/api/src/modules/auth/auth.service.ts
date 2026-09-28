import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { Errors } from '../../common/errors';
import { generateOtp, generateRefreshToken, maskPhone, sha256 } from '../../common/crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService, DevicePayload } from '../devices/devices.service';
import { SmsService } from './sms.service';
import { isTajikPhone, normalizeTajikPhone } from './phone';
import { assertPassword } from './password';
import { RegisterDto } from './dto';
import { verifySocialToken, type SocialProvider } from './social';

const OTP_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly devices: DevicesService,
    private readonly sms: SmsService,
  ) {}

  async requestOtp(rawPhone: string, purpose: 'login' | 'register' | 'reset' = 'login') {
    const phone = purpose === 'login' ? rawPhone : normalizeTajikPhone(rawPhone);
    if (purpose !== 'login' && !isTajikPhone(phone)) throw Errors.phoneInvalid();

    const ttl = Number(this.config.get('OTP_TTL_SECONDS') ?? 300);
    if (purpose === 'register') {
      const taken = await this.prisma.user.findUnique({ where: { phone } });
      if (taken) throw Errors.phoneTaken();
    }
    if (purpose === 'reset') {
      const user = await this.prisma.user.findUnique({ where: { phone } });
      if (!user) return { expiresIn: ttl };
    }

    const code = generateOtp(Number(this.config.get('OTP_LENGTH') ?? 6));
    const codeHash = await hash(code, OTP_SALT_ROUNDS);

    await this.prisma.otpRequest.create({
      data: {
        phone,
        codeHash,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });

    this.logger.log(`OTP requested for ${maskPhone(phone)}`);
    await this.sms.sendOtp(phone, code);

    const echo = this.config.get('OTP_DEV_ECHO') === 'true';
    return {
      expiresIn: ttl,
      ...(echo ? { devCode: code } : {}),
    };
  }

  async verifyOtp(phone: string, code: string, device: DevicePayload) {
    await this.consumeOtp(phone, code, device.ip);

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: { phoneVerified: true, lastLoginAt: new Date() },
      create: {
        phone,
        phoneVerified: true,
        lastLoginAt: new Date(),
        profile: { create: {} },
      },
    });

    if (user.status === 'blocked') throw Errors.userBlocked();
    if (user.status === 'deleted') throw Errors.userNotFound();
    return this.issueSession(user.id, device);
  }

  async register(dto: RegisterDto, device: DevicePayload) {
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const phone = normalizeTajikPhone(dto.phone);
    if (!firstName || !lastName || !isTajikPhone(phone)) throw Errors.phoneInvalid();
    assertPassword(dto.password, dto.passwordConfirm);

    const taken = await this.prisma.user.findUnique({ where: { phone } });
    if (taken) throw Errors.phoneTaken();
    await this.consumeOtp(phone, dto.code, device.ip);

    const user = await this.prisma.user.create({
      data: {
        phone,
        phoneVerified: true,
        passwordHash: await hash(dto.password, 12),
        lastLoginAt: new Date(),
        profile: {
          create: {
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
          },
        },
      },
      include: { profile: true },
    });
    const session = await this.issueSession(user.id, device);
    return { ...session, user: this.publicUser(user) };
  }

  async loginWithPassword(rawPhone: string, password: string, device: DevicePayload) {
    const phone = normalizeTajikPhone(rawPhone);
    const user = isTajikPhone(phone)
      ? await this.prisma.user.findUnique({ where: { phone }, include: { profile: true } })
      : null;
    if (!user || user.status === 'deleted') throw Errors.authInvalid();
    if (!user.passwordHash) throw Errors.passwordNotSet();
    if (user.status === 'blocked') throw Errors.userBlocked();

    const recentFails = await this.prisma.securityEvent.count({
      where: {
        userId: user.id,
        type: 'password_failed',
        createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
      },
    });
    if (recentFails >= 8) throw Errors.authLocked();

    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      await this.securityEvent({
        userId: user.id,
        phone: user.phone ?? '',
        type: 'password_failed',
        ip: device.ip,
      });
      throw Errors.authInvalid();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const session = await this.issueSession(user.id, device);
    return { ...session, user: this.publicUser(user) };
  }

  async resetPassword(
    rawPhone: string,
    code: string,
    password: string,
    passwordConfirm: string,
    device: DevicePayload,
  ) {
    const phone = normalizeTajikPhone(rawPhone);
    if (!isTajikPhone(phone)) throw Errors.phoneInvalid();
    assertPassword(password, passwordConfirm);
    await this.consumeOtp(phone, code, device.ip);
    const user = await this.prisma.user.findUnique({ where: { phone }, include: { profile: true } });
    if (!user || user.status === 'deleted') throw Errors.authInvalid();
    if (user.status === 'blocked') throw Errors.userBlocked();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hash(password, 12), phoneVerified: true, lastLoginAt: new Date() },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const session = await this.issueSession(user.id, device);
    return { ...session, user: this.publicUser(user) };
  }

  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    password: string,
    passwordConfirm: string,
  ) {
    assertPassword(password, passwordConfirm);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash) {
      if (!currentPassword) throw Errors.authInvalid();
      const ok = await compare(currentPassword, user.passwordHash);
      if (!ok) throw Errors.authInvalid();
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(password, 12) },
    });
    return { ok: true };
  }

  async socialLogin(provider: SocialProvider, idToken: string | undefined, device: DevicePayload) {
    const identity = await verifySocialToken({
      provider,
      idToken,
      deviceId: device.deviceId,
    });
    const existing =
      (provider === 'google'
        ? await this.prisma.user.findUnique({
            where: { googleSub: identity.sub },
            include: { profile: true },
          })
        : await this.prisma.user.findUnique({
            where: { appleSub: identity.sub },
            include: { profile: true },
          })) ??
      (identity.email
        ? await this.prisma.user.findUnique({
            where: { email: identity.email },
            include: { profile: true },
          })
        : null);

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            lastLoginAt: new Date(),
            email: existing.email ?? identity.email,
            googleSub: provider === 'google' ? identity.sub : existing.googleSub,
            appleSub: provider === 'apple' ? identity.sub : existing.appleSub,
          },
          include: { profile: true },
        })
      : await this.prisma.user.create({
          data: {
            email: identity.email,
            googleSub: provider === 'google' ? identity.sub : undefined,
            appleSub: provider === 'apple' ? identity.sub : undefined,
            lastLoginAt: new Date(),
            profile: { create: {} },
          },
          include: { profile: true },
        });

    if (user.status === 'blocked') throw Errors.userBlocked();
    if (user.status === 'deleted') throw Errors.userNotFound();
    const session = await this.issueSession(user.id, device);
    return {
      ...session,
      needsName: !user.profile?.displayName,
      suggestedName: user.profile?.displayName ?? identity.name ?? '',
    };
  }

  async login(phone: string, pin: string, device: DevicePayload) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || user.status === 'deleted') throw Errors.userNotFound();
    if (user.status === 'blocked') throw Errors.userBlocked();
    if (!user.pinHash) throw Errors.pinNotSet();

    const recentPinFails = await this.prisma.securityEvent.count({
      where: {
        userId: user.id,
        type: 'pin_failed',
        createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
      },
    });
    if (recentPinFails >= 8) throw Errors.pinLocked();

    const ok = await compare(pin, user.pinHash);
    if (!ok) {
      await this.securityEvent({ userId: user.id, phone: user.phone ?? '', type: 'pin_failed', ip: device.ip });
      throw Errors.pinInvalid();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueSession(user.id, device);
  }

  async setPin(userId: string, pin: string) {
    const pinHash = await hash(pin, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash },
    });
    return { ok: true };
  }

  async refresh(refreshToken: string) {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { device: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      if (stored?.revokedAt) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.prisma.session.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.prisma.securityEvent.create({
          data: {
            userId: stored.userId,
            type: 'refresh_reuse',
            payload: { deviceId: stored.deviceId },
          },
        });
      }
      throw Errors.refreshInvalid();
    }
    if (!stored.device.isActive) throw Errors.deviceInvalid();
    const owner = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!owner || owner.status !== 'active') throw Errors.refreshInvalid();

    const next = generateRefreshToken();
    const days = 30;
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedBy: undefined },
    });
    await this.prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        deviceId: stored.deviceId,
        tokenHash: sha256(next),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = await this.signAccess(stored.userId, stored.deviceId);
    return { accessToken, refreshToken: next, tokenType: 'Bearer' as const };
  }

  async logout(userId: string, deviceRecordId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, deviceId: deviceRecordId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.session.updateMany({
      where: { userId, deviceId: deviceRecordId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private async consumeOtp(phone: string, code: string, ip?: string) {
    const request = await this.prisma.otpRequest.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!request) {
      await this.securityEvent({ phone, type: 'otp_failed', ip });
      throw Errors.otpInvalid();
    }
    if (request.attempts >= 5) {
      await this.prisma.otpRequest.update({
        where: { id: request.id },
        data: { consumedAt: new Date() },
      });
      throw Errors.otpLocked();
    }

    const matches = await compare(code, request.codeHash);
    await this.prisma.otpRequest.update({
      where: { id: request.id },
      data: {
        attempts: { increment: 1 },
        consumedAt: matches ? new Date() : undefined,
      },
    });
    if (!matches) {
      await this.securityEvent({ phone, type: 'otp_failed', ip });
      throw Errors.otpInvalid();
    }
  }

  private async issueSession(userId: string, device: DevicePayload) {
    const bound = await this.devices.attach(userId, device);
    const refreshToken = generateRefreshToken();
    const session = await this.prisma.session.create({
      data: { userId, deviceId: bound.id },
    });
    await this.prisma.refreshToken.create({
      data: {
        userId,
        deviceId: bound.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: await this.signAccess(userId, bound.id),
      refreshToken,
      tokenType: 'Bearer' as const,
      sessionId: session.id,
      device: {
        id: bound.id,
        deviceId: bound.deviceId,
        platform: bound.platform,
      },
    };
  }

  private async securityEvent(params: {
    phone: string;
    type: string;
    userId?: string;
    ip?: string;
  }) {
    const userId =
      params.userId ??
      (await this.prisma.user.findUnique({ where: { phone: params.phone }, select: { id: true } }))?.id;
    await this.prisma.securityEvent.create({
      data: {
        userId,
        type: params.type,
        payload: { phone: maskPhone(params.phone) },
        ip: params.ip,
      },
    });
  }

  private publicUser(user: {
    id: string;
    phone: string | null;
    profile?: { firstName?: string | null; lastName?: string | null; displayName?: string | null } | null;
  }) {
    return {
      id: user.id,
      phone: user.phone,
      firstName: user.profile?.firstName ?? '',
      lastName: user.profile?.lastName ?? '',
      displayName: user.profile?.displayName ?? '',
    };
  }

  private signAccess(userId: string, deviceRecordId: string) {
    return this.jwt.signAsync({
      sub: userId,
      deviceId: deviceRecordId,
      tokenType: 'subscriber',
    });
  }
}

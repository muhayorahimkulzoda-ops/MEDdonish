import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Errors } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { ACCESS_COOKIE, readCookie } from './cookies';

export interface SubscriberJwt {
  sub: string;
  deviceId: string;
  tokenType: 'subscriber';
}

export interface SubscriberPayload {
  userId: string;
  deviceRecordId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: DevicesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request) => (request ? readCookie(request, ACCESS_COOKIE) : null),
      ]),
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev-change-me-access',
      issuer: 'meddonish-api',
      audience: 'meddonish-subscriber',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: SubscriberJwt): Promise<SubscriberPayload> {
    if (payload.tokenType !== 'subscriber') throw Errors.deviceInvalid();
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'active') throw Errors.userBlocked();
    await this.devices.assertActive(user.id, payload.deviceId);
    const openSession = await this.prisma.session.findFirst({
      where: { userId: user.id, deviceId: payload.deviceId, revokedAt: null },
    });
    if (!openSession) throw Errors.deviceInvalid();
    return { userId: user.id, deviceRecordId: payload.deviceId };
  }
}

import { Injectable } from '@nestjs/common';
import { EntitlementStatus, PaymentStatus, Prisma, UserStatus } from '@prisma/client';
import { AppException } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../admin-cms/audit.service';
import { DevicesService } from '../devices/devices.service';
import { AccountDeletionService } from './account-deletion.service';

const PUBLIC_USER = {
  id: true,
  phone: true,
  email: true,
  status: true,
  preferredLanguage: true,
  phoneVerified: true,
  createdAt: true,
  lastLoginAt: true,
  profile: { select: { displayName: true, firstName: true, lastName: true, appRole: true } },
} as const;

@Injectable()
export class UsersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: DevicesService,
    private readonly audit: AuditService,
    private readonly deletion: AccountDeletionService,
  ) {}

  async list(query?: string, take = 2000) {
    const q = query?.trim();
    const where: Prisma.UserWhereInput = {
      status: { not: UserStatus.deleted },
      ...(q
        ? {
            OR: [
              { phone: { contains: q } },
              { email: { contains: q, mode: 'insensitive' } },
              {
                profile: {
                  OR: [
                    { displayName: { contains: q, mode: 'insensitive' } },
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName: { contains: q, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    };
    const [ranks, items] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(take, 2000),
        select: {
          ...PUBLIC_USER,
          _count: {
            select: {
              entitlements: { where: { status: EntitlementStatus.active } },
              devices: { where: { isActive: true } },
              orders: { where: { status: PaymentStatus.paid } },
            },
          },
          entitlements: {
            where: { status: EntitlementStatus.active, expiresAt: { gt: new Date() } },
            orderBy: { expiresAt: 'desc' },
            take: 1,
            select: { expiresAt: true },
          },
        },
      }),
    ]);
    const seq = new Map(ranks.map((user, index) => [user.id, index + 1]));
    return {
      items: items.map((user) => ({
        id: user.id,
        number: seq.get(user.id) ?? 0,
        phone: user.phone,
        email: user.email,
        status: user.status,
        preferredLanguage: user.preferredLanguage,
        phoneVerified: user.phoneVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        displayName: user.profile?.displayName ?? null,
        firstName: user.profile?.firstName ?? null,
        lastName: user.profile?.lastName ?? null,
        role: user.profile?.appRole ?? 'student',
        activeEntitlements: user._count.entitlements,
        activeDevices: user._count.devices,
        paidOrders: user._count.orders,
        accessExpiresAt: user.entitlements[0]?.expiresAt ?? null,
      })),
    };
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...PUBLIC_USER,
        entitlements: {
          orderBy: { expiresAt: 'desc' },
          take: 20,
          include: { course: { include: { translations: true } }, plan: true },
        },
        devices: {
          orderBy: { lastSeenAt: 'desc' },
          select: {
            id: true,
            deviceId: true,
            platform: true,
            isActive: true,
            lastSeenAt: true,
            lastIp: true,
          },
        },
        testAttempts: {
          where: { finishedAt: { not: null } },
          orderBy: { finishedAt: 'desc' },
          take: 10,
          select: { id: true, grade: true, score: true, finishedAt: true, test: { select: { title: true } } },
        },
      },
    });
    if (!user) throw new AppException('USER_NOT_FOUND', 'User not found');
    if (user.status === UserStatus.deleted) {
      throw new AppException('USER_NOT_FOUND', 'User not found');
    }
    return {
      id: user.id,
      phone: user.phone,
      status: user.status,
      preferredLanguage: user.preferredLanguage,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      displayName: user.profile?.displayName ?? null,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      role: user.profile?.appRole ?? 'student',
      entitlements: user.entitlements,
      devices: user.devices,
      attempts: user.testAttempts,
    };
  }

  listStaff() {
    return this.prisma.adminAccount.findMany({
      select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' },
    }).then((items) => items.map((item) => ({ ...item, role: 'admin' })));
  }

  async updateProfile(
    adminId: string,
    id: string,
    data: { firstName?: string; lastName?: string; appRole?: string },
    ip?: string,
  ) {
    if (data.appRole && !['student', 'doctor', 'admin'].includes(data.appRole)) {
      throw new AppException('USER_STATUS_INVALID', 'Role is not allowed');
    }
    await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const profile = await this.prisma.userProfile.upsert({
      where: { userId: id },
      create: {
        userId: id,
        firstName: data.firstName,
        lastName: data.lastName,
        appRole: data.appRole ?? 'student',
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        appRole: data.appRole,
      },
    });
    await this.audit.log({ adminId, action: 'update', entity: 'user_profile', entityId: id, ip });
    return {
      id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.appRole,
    };
  }

  async setStatus(adminId: string, id: string, status: UserStatus, ip?: string) {
    if (status !== UserStatus.active && status !== UserStatus.blocked) {
      throw new AppException('USER_STATUS_INVALID', 'Only active or blocked is allowed');
    }
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (current.status === UserStatus.deleted) {
      throw new AppException('USER_STATUS_INVALID', 'Deleted accounts cannot be restored');
    }
    if (status === UserStatus.blocked) {
      await this.devices.release(id);
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: PUBLIC_USER,
    });
    await this.audit.log({
      adminId,
      action: status === UserStatus.blocked ? 'block' : 'unblock',
      entity: 'user',
      entityId: id,
      ip,
    });
    return {
      id: updated.id,
      phone: updated.phone,
      status: updated.status,
      lastLoginAt: updated.lastLoginAt,
    };
  }

  async releaseDevice(adminId: string, id: string, ip?: string) {
    await this.prisma.user.findUniqueOrThrow({ where: { id } });
    await this.devices.release(id);
    await this.audit.log({
      adminId,
      action: 'release_device',
      entity: 'user',
      entityId: id,
      ip,
    });
    return { ok: true };
  }

  async remove(adminId: string, id: string, ip?: string) {
    await this.deletion.deleteAccount(id);
    await this.audit.log({
      adminId,
      action: 'delete',
      entity: 'user',
      entityId: id,
      ip,
    });
    return { id, deleted: true };
  }
}

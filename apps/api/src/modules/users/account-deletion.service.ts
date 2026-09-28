import { Injectable } from '@nestjs/common';
import { EntitlementStatus, SubscriptionStatus, UserStatus } from '@prisma/client';
import { AppException } from '../../common/errors';
import { maskPhone } from '../../common/crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class AccountDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: DevicesService,
  ) {}

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppException('USER_NOT_FOUND', 'User not found');
    if (user.status === UserStatus.deleted) {
      return { ok: true, deleted: true };
    }

    const phone = user.phone;
    await this.devices.release(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.devicePushToken.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.userNote.deleteMany({ where: { userId } });
      if (phone) await tx.otpRequest.deleteMany({ where: { phone } });
      await tx.userProfile.updateMany({
        where: { userId },
        data: { displayName: null },
      });
      await tx.entitlement.updateMany({
        where: { userId, status: EntitlementStatus.active },
        data: { status: EntitlementStatus.revoked },
      });
      await tx.subscription.updateMany({
        where: { userId, status: SubscriptionStatus.active },
        data: { status: SubscriptionStatus.cancelled },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.deleted,
          phone: `deleted:${userId}`,
          phoneVerified: false,
          pinHash: null,
        },
      });
      await tx.securityEvent.create({
        data: {
          userId,
          type: 'account_deleted',
          payload: { phone: phone ? maskPhone(phone) : null },
        },
      });
    });

    return { ok: true, deleted: true };
  }
}

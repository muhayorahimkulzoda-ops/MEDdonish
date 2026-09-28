import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountExportService {
  private readonly logger = new Logger(AccountExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportMine(userId: string) {
    this.logger.log(`Data export requested for ${userId}`);

    const [user, devices, entitlements, videoProgress, attempts, orders, notifications] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: {
            id: true,
            phone: true,
            status: true,
            preferredLanguage: true,
            createdAt: true,
            lastLoginAt: true,
            profile: { select: { displayName: true } },
          },
        }),
        this.prisma.device.findMany({
          where: { userId },
          select: {
            deviceId: true,
            platform: true,
            deviceModel: true,
            lastSeenAt: true,
            isActive: true,
          },
        }),
        this.prisma.entitlement.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            source: true,
            startedAt: true,
            expiresAt: true,
            course: { select: { slug: true, translations: { select: { language: true, title: true } } } },
            plan: { select: { code: true, durationDays: true } },
          },
        }),
        this.prisma.videoProgress.findMany({
          where: { userId },
          select: {
            videoId: true,
            watchPercent: true,
            completed: true,
            lastSeenAt: true,
          },
        }),
        this.prisma.testAttempt.findMany({
          where: { userId, finishedAt: { not: null } },
          orderBy: { finishedAt: 'desc' },
          take: 100,
          select: {
            id: true,
            score: true,
            grade: true,
            correctCount: true,
            finishedAt: true,
            test: { select: { title: true } },
          },
        }),
        this.prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amountMinor: true,
            currency: true,
            source: true,
            status: true,
            createdAt: true,
            payments: {
              select: {
                status: true,
                source: true,
                amountMinor: true,
                currency: true,
                createdAt: true,
              },
            },
          },
        }),
        this.prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: { title: true, body: true, readAt: true, createdAt: true },
        }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        phone: user.phone,
        status: user.status,
        preferredLanguage: user.preferredLanguage,
        displayName: user.profile?.displayName ?? null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      devices,
      entitlements,
      videoProgress,
      attempts,
      orders,
      notifications,
    };
  }
}

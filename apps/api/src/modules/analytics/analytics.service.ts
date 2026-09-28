import { Injectable } from '@nestjs/common';
import { EntitlementStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DAY = 86_400_000;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * DAY);
    const d14 = new Date(now.getTime() - 14 * DAY);
    const d30 = new Date(now.getTime() - 30 * DAY);
    const soon = new Date(now.getTime() + 7 * DAY);

    const [
      users,
      activeUsers,
      newUsers7d,
      newUsers30d,
      activeEntitlements,
      expiring7d,
      expiredEntitlements,
      orders,
      paidPayments,
      paidBySource,
      finishedAttempts,
      failedAttempts,
      videoCompleted,
      questions,
      recentUsers,
      recentPaid,
      entitlementsByCourse,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'active' } }),
      this.prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.entitlement.count({
        where: { status: EntitlementStatus.active, expiresAt: { gt: now } },
      }),
      this.prisma.entitlement.count({
        where: { status: EntitlementStatus.active, expiresAt: { gt: now, lte: soon } },
      }),
      this.prisma.entitlement.count({ where: { status: EntitlementStatus.expired } }),
      this.prisma.order.count(),
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.paid },
        select: { amountMinor: true, currency: true, createdAt: true, order: { select: { courseId: true } } },
      }),
      this.prisma.payment.groupBy({
        by: ['source'],
        where: { status: PaymentStatus.paid },
        _sum: { amountMinor: true },
        _count: { _all: true },
      }),
      this.prisma.testAttempt.count({ where: { finishedAt: { not: null } } }),
      this.prisma.testAttempt.count({ where: { finishedAt: { not: null }, grade: 'failed' } }),
      this.prisma.videoProgress.count({ where: { completed: true } }),
      this.prisma.question.count(),
      this.prisma.user.findMany({
        where: { createdAt: { gte: d14 } },
        select: { createdAt: true },
      }),
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.paid, createdAt: { gte: d14 } },
        select: { amountMinor: true, createdAt: true },
      }),
      this.prisma.entitlement.groupBy({
        by: ['courseId'],
        where: { status: EntitlementStatus.active, expiresAt: { gt: now } },
        _count: { _all: true },
      }),
    ]);

    const revenueMinor = paidPayments.reduce((sum, row) => sum + row.amountMinor, 0);
    const series = days(14).map((date) => {
      const key = date.toISOString().slice(0, 10);
      const usersCount = recentUsers.filter((row) => row.createdAt.toISOString().slice(0, 10) === key).length;
      const paid = recentPaid.filter((row) => row.createdAt.toISOString().slice(0, 10) === key);
      return {
        date: key,
        users: usersCount,
        paidOrders: paid.length,
        revenueMinor: paid.reduce((sum, row) => sum + row.amountMinor, 0),
      };
    });

    const revenueByCourse = new Map<string, number>();
    for (const row of paidPayments) {
      const courseId = row.order.courseId;
      revenueByCourse.set(courseId, (revenueByCourse.get(courseId) ?? 0) + row.amountMinor);
    }
    const courseIds = [...new Set([
      ...entitlementsByCourse.map((row) => row.courseId),
      ...revenueByCourse.keys(),
    ])];
    const courses = courseIds.length
      ? await this.prisma.course.findMany({
          where: { id: { in: courseIds } },
          include: { translations: true },
        })
      : [];
    const title = (id: string) =>
      courses.find((course) => course.id === id)?.translations.find((row) => row.language === 'ru')?.title
      ?? courses.find((course) => course.id === id)?.translations[0]?.title
      ?? id;

    return {
      users: { total: users, active: activeUsers, new7d: newUsers7d, new30d: newUsers30d },
      entitlements: { active: activeEntitlements, expiring7d, expired: expiredEntitlements },
      payments: {
        orders,
        paid: paidPayments.length,
        revenueMinor,
        conversion: orders === 0 ? 0 : Math.round((paidPayments.length / orders) * 100),
        bySource: paidBySource.map((row) => ({
          source: row.source,
          count: row._count._all,
          amountMinor: row._sum.amountMinor ?? 0,
        })),
      },
      learning: {
        finishedAttempts,
        failedAttempts,
        videoCompleted,
        questions,
      },
      series,
      topCourses: courseIds
        .map((id) => ({
          courseId: id,
          title: title(id),
          activeEntitlements: entitlementsByCourse.find((row) => row.courseId === id)?._count._all ?? 0,
          revenueMinor: revenueByCourse.get(id) ?? 0,
        }))
        .sort((a, b) => b.activeEntitlements - a.activeEntitlements || b.revenueMinor - a.revenueMinor)
        .slice(0, 8),
    };
  }
}

function days(count: number) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => new Date(start.getTime() - (count - 1 - index) * DAY));
}

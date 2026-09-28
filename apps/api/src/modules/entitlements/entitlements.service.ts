import { Injectable } from '@nestjs/common';
import { AccessSource, EntitlementStatus } from '@prisma/client';
import { Errors } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { isYear3Slug, YEAR3_BUNDLE_SLUGS } from '../catalog/offer';

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string) {
    await this.expireOverdue(userId);
    return this.prisma.entitlement.findMany({
      where: { userId },
      include: {
        course: {
          include: { translations: true, discipline: { include: { translations: true } } },
        },
        plan: true,
      },
      orderBy: { expiresAt: 'desc' },
    });
  }

  async assertActive(userId: string, courseId: string) {
    await this.expireOverdue(userId);
    const entitlement = await this.prisma.entitlement.findFirst({
      where: {
        userId,
        courseId,
        status: EntitlementStatus.active,
        expiresAt: { gt: new Date() },
      },
    });
    if (!entitlement) throw Errors.entitlementInactive();
    return entitlement;
  }

  async grant(params: {
    userId: string;
    courseId: string;
    planId?: string;
    source: AccessSource;
    startedAt: Date;
    expiresAt: Date;
  }) {
    await this.expireOverdue(params.userId);
    const current = await this.prisma.entitlement.findFirst({
      where: {
        userId: params.userId,
        courseId: params.courseId,
        status: EntitlementStatus.active,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'desc' },
    });
    if (current) {
      const base = current.expiresAt > params.startedAt ? current.expiresAt : params.startedAt;
      const extraMs = params.expiresAt.getTime() - params.startedAt.getTime();
      return this.prisma.entitlement.update({
        where: { id: current.id },
        data: {
          planId: params.planId ?? current.planId,
          source: params.source,
          expiresAt: new Date(base.getTime() + extraMs),
          status: EntitlementStatus.active,
        },
      });
    }
    return this.prisma.entitlement.create({
      data: {
        userId: params.userId,
        courseId: params.courseId,
        planId: params.planId,
        source: params.source,
        startedAt: params.startedAt,
        expiresAt: params.expiresAt,
        status: EntitlementStatus.active,
      },
    });
  }

  async activateFromPaidPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { order: { include: { plan: true } }, subscription: true },
    });
    if (payment.status !== 'paid') {
      throw Errors.entitlementInactive();
    }
    if (payment.subscription) {
      return this.prisma.entitlement.findFirst({
        where: { userId: payment.subscription.userId, courseId: payment.subscription.courseId },
        orderBy: { expiresAt: 'desc' },
      });
    }

    const user = await this.ensureUser(payment.order.userId, payment.order.phone);
    if (payment.order.userId !== user.id) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { userId: user.id },
      });
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + payment.order.plan.durationDays * 86_400_000);
    const courseIds = await this.courseIdsForPaidAccess(payment.order.courseId);
    await this.prisma.subscription.create({
      data: {
        userId: user.id,
        courseId: payment.order.courseId,
        planId: payment.order.planId,
        paymentId: payment.id,
        source: AccessSource.payment,
        startsAt: startedAt,
        expiresAt,
        status: 'active',
      },
    });
    let last = null;
    for (const courseId of courseIds) {
      last = await this.grant({
        userId: user.id,
        courseId,
        planId: payment.order.planId,
        source: AccessSource.payment,
        startedAt,
        expiresAt,
      });
    }
    return last;
  }

  async revokeFromRefundedPayment(userId: string, courseId: string) {
    const courseIds = await this.courseIdsForPaidAccess(courseId);
    await this.prisma.entitlement.updateMany({
      where: { userId, courseId: { in: courseIds }, status: EntitlementStatus.active },
      data: { status: EntitlementStatus.revoked },
    });
  }

  async grantForUser(params: {
    userId: string;
    courseId: string;
    planId: string;
    source: AccessSource;
    days?: number;
  }) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: params.userId } });
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { id: params.planId } });
    const startedAt = new Date();
    const days = params.days ?? plan.durationDays;
    const expiresAt = new Date(startedAt.getTime() + days * 86_400_000);
    await this.prisma.subscription.create({
      data: {
        userId: user.id,
        courseId: params.courseId,
        planId: params.planId,
        source: params.source,
        startsAt: startedAt,
        expiresAt,
        status: 'active',
      },
    });
    const courseIds = await this.courseIdsForPaidAccess(params.courseId);
    let last = null;
    for (const courseId of courseIds) {
      last = await this.grant({
        userId: user.id,
        courseId,
        planId: params.planId,
        source: params.source,
        startedAt,
        expiresAt,
      });
    }
    if (!last) throw Errors.entitlementInactive();
    return last;
  }

  async grantByPhone(params: {
    phone: string;
    courseId: string;
    planId: string;
    source: AccessSource;
    days?: number;
  }) {
    const user = await this.ensureUser(null, params.phone);
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { id: params.planId } });
    const startedAt = new Date();
    const days = params.days ?? plan.durationDays;
    const expiresAt = new Date(startedAt.getTime() + days * 86_400_000);
    await this.prisma.subscription.create({
      data: {
        userId: user.id,
        courseId: params.courseId,
        planId: params.planId,
        source: params.source,
        startsAt: startedAt,
        expiresAt,
        status: 'active',
      },
    });
    return this.grant({
      userId: user.id,
      courseId: params.courseId,
      planId: params.planId,
      source: params.source,
      startedAt,
      expiresAt,
    });
  }

  async setStatus(id: string, status: EntitlementStatus) {
    return this.prisma.entitlement.update({
      where: { id },
      data: { status },
    });
  }

  async extend(id: string, days: number) {
    const row = await this.prisma.entitlement.findUniqueOrThrow({ where: { id } });
    const base = row.expiresAt > new Date() ? row.expiresAt : new Date();
    return this.prisma.entitlement.update({
      where: { id },
      data: {
        status: EntitlementStatus.active,
        expiresAt: new Date(base.getTime() + days * 86_400_000),
      },
    });
  }

  private async courseIdsForPaidAccess(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { slug: true },
    });
    if (!course || !isYear3Slug(course.slug)) return [courseId];
    const rows = await this.prisma.course.findMany({
      where: { slug: { in: [...YEAR3_BUNDLE_SLUGS] } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async ensureUser(userId: string | null, phone: string) {
    if (userId) {
      const existing = await this.prisma.user.findUnique({ where: { id: userId } });
      if (existing) return existing;
    }
    return this.prisma.user.upsert({
      where: { phone },
      update: { phoneVerified: true },
      create: {
        phone,
        phoneVerified: true,
        profile: { create: { displayName: phone } },
      },
    });
  }

  private async expireOverdue(userId: string) {
    await this.prisma.entitlement.updateMany({
      where: {
        userId,
        status: EntitlementStatus.active,
        expiresAt: { lte: new Date() },
      },
      data: { status: EntitlementStatus.expired },
    });
    await this.prisma.subscription.updateMany({
      where: {
        userId,
        status: 'active',
        expiresAt: { lte: new Date() },
      },
      data: { status: 'expired' },
    });
  }
}

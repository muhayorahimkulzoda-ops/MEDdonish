import { Injectable } from '@nestjs/common';
import { Language, Platform, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { copyFor } from './copy';
import { PushAdapter } from './push.adapter';

const DAY = 86_400_000;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushAdapter,
  ) {}

  listMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
        template: { select: { code: true } },
      },
    });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async registerToken(userId: string, platform: Platform, token: string) {
    await this.prisma.devicePushToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, platform, token },
    });
    return { ok: true };
  }

  async removeToken(userId: string, token: string) {
    await this.prisma.devicePushToken.deleteMany({ where: { userId, token } });
    return { ok: true };
  }

  listTemplates() {
    return this.prisma.notificationTemplate.findMany({ orderBy: { code: 'asc' } });
  }

  setTemplate(code: string, enabled: boolean) {
    return this.prisma.notificationTemplate.update({
      where: { code },
      data: { enabled },
    });
  }

  listRecent() {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        user: { select: { phone: true } },
        template: { select: { code: true, enabled: true } },
      },
    });
  }

  async announce(code: string, options?: {
    title?: string;
    body?: string;
    courseId?: string;
    userIds?: string[];
    extra?: string;
  }) {
    const template = await this.prisma.notificationTemplate.findUnique({ where: { code } });
    if (!template?.enabled) return { sent: 0, skipped: true };

    const users = options?.userIds?.length
      ? await this.prisma.user.findMany({ where: { id: { in: options.userIds }, status: 'active' } })
      : options?.courseId
        ? await this.usersWithCourse(options.courseId)
        : await this.prisma.user.findMany({ where: { status: 'active' } });

    let sent = 0;
    for (const user of users) {
      const created = await this.createOne({
        userId: user.id,
        language: user.preferredLanguage,
        templateId: template.id,
        code,
        title: options?.title,
        body: options?.body,
        dedupeKey: options?.extra ? `${code}:${options.extra}:${user.id}` : undefined,
      });
      if (created) sent += 1;
    }
    return { sent, skipped: false };
  }

  async sendSystem(title: string, body: string) {
    return this.announce('system', { title, body, extra: `system:${Date.now()}` });
  }

  async runExpiryScan() {
    await this.expireOverdue();
    const now = Date.now();
    const windows = [
      { code: 'subscription_expires_7d', min: now + 6.5 * DAY, max: now + 7.5 * DAY },
      { code: 'subscription_expires_3d', min: now + 2.5 * DAY, max: now + 3.5 * DAY },
      { code: 'subscription_expires_1d', min: now + 0.5 * DAY, max: now + 1.5 * DAY },
    ];
    let sent = 0;
    for (const window of windows) {
      const rows = await this.prisma.entitlement.findMany({
        where: {
          status: 'active',
          expiresAt: { gte: new Date(window.min), lte: new Date(window.max) },
        },
        include: { user: true },
      });
      for (const row of rows) {
        const day = row.expiresAt.toISOString().slice(0, 10);
        const created = await this.createOne({
          userId: row.userId,
          language: row.user.preferredLanguage,
          code: window.code,
          dedupeKey: `${window.code}:${row.id}:${day}`,
        });
        if (created) sent += 1;
      }
    }

    const expired = await this.prisma.entitlement.findMany({
      where: {
        status: 'expired',
        expiresAt: { gte: new Date(now - DAY), lte: new Date() },
      },
      include: { user: true },
    });
    for (const row of expired) {
      const day = row.expiresAt.toISOString().slice(0, 10);
      const created = await this.createOne({
        userId: row.userId,
        language: row.user.preferredLanguage,
        code: 'subscription_expired',
        dedupeKey: `subscription_expired:${row.id}:${day}`,
      });
      if (created) sent += 1;
    }
    return { sent };
  }

  private async usersWithCourse(courseId: string) {
    const entitlements = await this.prisma.entitlement.findMany({
      where: { courseId, status: 'active', expiresAt: { gt: new Date() } },
      select: { userId: true },
    });
    const ids = [...new Set(entitlements.map((row) => row.userId))];
    return this.prisma.user.findMany({ where: { id: { in: ids }, status: 'active' } });
  }

  private async createOne(params: {
    userId: string;
    language: Language;
    code: string;
    templateId?: string;
    title?: string;
    body?: string;
    dedupeKey?: string;
  }) {
    const template = params.templateId
      ? { id: params.templateId }
      : await this.prisma.notificationTemplate.findUnique({ where: { code: params.code } });
    if (!template) return null;
    if (!params.templateId) {
      const enabled = await this.prisma.notificationTemplate.findUnique({ where: { code: params.code } });
      if (!enabled?.enabled) return null;
    }
    const text = copyFor(params.code, params.language, { title: params.title, body: params.body });
    try {
      const row = await this.prisma.notification.create({
        data: {
          userId: params.userId,
          templateId: template.id,
          title: text.title,
          body: text.body,
          dedupeKey: params.dedupeKey,
        },
      });
      const tokens = await this.prisma.devicePushToken.findMany({
        where: { userId: params.userId },
        select: { platform: true },
      });
      for (const item of tokens) {
        await this.push.send({ platform: item.platform, title: text.title, body: text.body });
      }
      return row;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    }
  }

  private async expireOverdue() {
    await this.prisma.entitlement.updateMany({
      where: { status: 'active', expiresAt: { lte: new Date() } },
      data: { status: 'expired' },
    });
    await this.prisma.subscription.updateMany({
      where: { status: 'active', expiresAt: { lte: new Date() } },
      data: { status: 'expired' },
    });
  }
}

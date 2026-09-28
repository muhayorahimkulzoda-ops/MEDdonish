import { Injectable } from '@nestjs/common';
import { Errors } from '../../common/errors';
import { generateTotpSecret, totpUri, verifyTotp } from '../../common/totp';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../admin-cms/audit.service';
import { SettingsService } from './settings.service';
import type { UpdateSettingsDto } from './settings.dto';

@Injectable()
export class AdminSystemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  listSettings() {
    return this.settings.list();
  }

  async updateSettings(adminId: string, patch: UpdateSettingsDto, ip?: string) {
    const updated = await this.settings.update({ ...patch });
    await this.audit.log({
      adminId,
      action: 'update',
      entity: 'settings',
      entityId: 'bundle',
      ip,
    });
    return updated;
  }

  async auditLogs(take = 80) {
    const items = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 200),
      include: { admin: { select: { email: true } } },
    });
    return {
      items: items.map((row) => ({
        id: row.id,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        ip: row.ip,
        createdAt: row.createdAt,
        adminEmail: row.admin?.email ?? null,
      })),
    };
  }

  async security(adminId: string, take = 80) {
    const admin = await this.prisma.adminAccount.findUniqueOrThrow({
      where: { id: adminId },
      select: { totpEnabled: true },
    });
    const [events, grouped] = await Promise.all([
      this.prisma.securityEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: Math.min(take, 200),
        include: { user: { select: { phone: true } } },
      }),
      this.prisma.securityEvent.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
    ]);
    return {
      totpEnabled: admin.totpEnabled,
      counts: Object.fromEntries(grouped.map((row) => [row.type, row._count._all])),
      events: events.map((row) => ({
        id: row.id,
        type: row.type,
        payload: row.payload,
        ip: row.ip,
        createdAt: row.createdAt,
        phone: row.user?.phone ?? null,
      })),
    };
  }

  async setupTotp(adminId: string, email: string, ip?: string) {
    const secret = generateTotpSecret();
    await this.prisma.adminAccount.update({
      where: { id: adminId },
      data: { totpSecret: secret, totpEnabled: false },
    });
    await this.audit.log({
      adminId,
      action: 'setup',
      entity: 'admin_totp',
      entityId: adminId,
      ip,
    });
    return { otpauth: totpUri(email, secret), secret };
  }

  async enableTotp(adminId: string, code: string, ip?: string) {
    const admin = await this.prisma.adminAccount.findUniqueOrThrow({ where: { id: adminId } });
    if (!admin.totpSecret || !verifyTotp(admin.totpSecret, code)) {
      throw Errors.totpInvalid();
    }
    await this.prisma.adminAccount.update({
      where: { id: adminId },
      data: { totpEnabled: true },
    });
    await this.audit.log({
      adminId,
      action: 'enable',
      entity: 'admin_totp',
      entityId: adminId,
      ip,
    });
    return { totpEnabled: true };
  }

  async disableTotp(adminId: string, code: string, ip?: string) {
    const admin = await this.prisma.adminAccount.findUniqueOrThrow({ where: { id: adminId } });
    if (!admin.totpSecret || !admin.totpEnabled || !verifyTotp(admin.totpSecret, code)) {
      throw Errors.totpInvalid();
    }
    await this.prisma.adminAccount.update({
      where: { id: adminId },
      data: { totpEnabled: false, totpSecret: null },
    });
    await this.audit.log({
      adminId,
      action: 'disable',
      entity: 'admin_totp',
      entityId: adminId,
      ip,
    });
    return { totpEnabled: false };
  }
}

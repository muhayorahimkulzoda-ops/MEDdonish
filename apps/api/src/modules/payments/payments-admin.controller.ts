import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessSource } from '@prisma/client';
import type { Request } from 'express';
import { CurrentAdmin } from '../../common/current-admin';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import type { AdminPayload } from '../admin-auth/admin-jwt.strategy';
import { AuditService } from '../admin-cms/audit.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminEntitlementPatchDto, AdminGrantDto, ReviewPaymentDto } from './payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('admin-payments')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class PaymentsAdminController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly entitlements: EntitlementsService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('orders')
  orders() {
    return this.payments.listOrders();
  }

  @Post('orders/:id/review')
  async review(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: ReviewPaymentDto,
    @Req() req: Request,
  ) {
    const result = await this.payments.settleReview(id, body.decision === 'yes', `admin:${admin.adminId}`);
    await this.audit.log({
      adminId: admin.adminId,
      action: body.decision === 'yes' ? 'payment_approve' : 'payment_reject',
      entity: 'order',
      entityId: id,
      ip: req.ip,
    });
    return result;
  }

  @Get('entitlements')
  entitlementsList() {
    return this.payments.listEntitlements();
  }

  @Post('entitlements')
  async grant(
    @CurrentAdmin() admin: AdminPayload,
    @Body() body: AdminGrantDto,
    @Req() req: Request,
  ) {
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { code: body.planCode } });
    const granted = body.userId
      ? await this.entitlements.grantForUser({
          userId: body.userId,
          courseId: body.courseId,
          planId: plan.id,
          source: body.source ?? AccessSource.admin,
          days: body.days,
        })
      : await this.entitlements.grantByPhone({
          phone: body.phone ?? '',
          courseId: body.courseId,
          planId: plan.id,
          source: body.source ?? AccessSource.admin,
          days: body.days,
        });
    await this.audit.log({
      adminId: admin.adminId,
      action: 'grant',
      entity: 'entitlement',
      entityId: granted.id,
      ip: req.ip,
    });
    return granted;
  }

  @Patch('entitlements/:id')
  async patch(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: AdminEntitlementPatchDto,
    @Req() req: Request,
  ) {
    const updated = body.extendDays
      ? await this.entitlements.extend(id, body.extendDays)
      : body.status
        ? await this.entitlements.setStatus(id, body.status)
        : await this.prisma.entitlement.findUniqueOrThrow({ where: { id } });
    await this.audit.log({
      adminId: admin.adminId,
      action: body.extendDays ? 'extend' : 'update',
      entity: 'entitlement',
      entityId: id,
      ip: req.ip,
    });
    return updated;
  }
}

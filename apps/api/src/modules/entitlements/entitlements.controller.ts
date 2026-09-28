import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { SubscriberPayload } from '../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsService } from './entitlements.service';

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class EntitlementsController {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me/entitlements')
  listEntitlements(@Req() req: Request & { user: SubscriberPayload }) {
    return this.entitlements.listMine(req.user.userId);
  }

  @Get('me/subscriptions')
  listSubscriptions(@Req() req: Request & { user: SubscriberPayload }) {
    return this.prisma.subscription.findMany({
      where: { userId: req.user.userId },
      include: { course: { include: { translations: true } }, plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

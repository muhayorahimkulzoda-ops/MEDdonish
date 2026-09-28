import { Body, Controller, Get, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentAdmin } from '../../common/current-admin';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import type { AdminPayload } from '../admin-auth/admin-jwt.strategy';
import { HealthService } from '../health/health.service';
import { AdminSystemService } from './admin-system.service';
import { TotpCodeDto, UpdateSettingsDto } from './settings.dto';

@ApiTags('admin-system')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AdminSystemController {
  constructor(
    private readonly system: AdminSystemService,
    private readonly health: HealthService,
  ) {}

  @Get('health')
  adminHealth() {
    return this.health.adminCheck();
  }

  @Get('settings')
  settings() {
    return this.system.listSettings();
  }

  @Patch('settings')
  updateSettings(
    @CurrentAdmin() admin: AdminPayload,
    @Body() body: UpdateSettingsDto,
    @Req() req: Request,
  ) {
    return this.system.updateSettings(admin.adminId, body, req.ip);
  }

  @Get('audit-logs')
  auditLogs(@Query('take') take?: string) {
    return this.system.auditLogs(take ? Number(take) : 80);
  }

  @Get('security')
  security(@CurrentAdmin() admin: AdminPayload, @Query('take') take?: string) {
    return this.system.security(admin.adminId, take ? Number(take) : 80);
  }

  @Post('security/totp/setup')
  setupTotp(@CurrentAdmin() admin: AdminPayload, @Req() req: Request) {
    return this.system.setupTotp(admin.adminId, admin.email, req.ip);
  }

  @Post('security/totp/enable')
  enableTotp(
    @CurrentAdmin() admin: AdminPayload,
    @Body() body: TotpCodeDto,
    @Req() req: Request,
  ) {
    return this.system.enableTotp(admin.adminId, body.totp, req.ip);
  }

  @Post('security/totp/disable')
  disableTotp(
    @CurrentAdmin() admin: AdminPayload,
    @Body() body: TotpCodeDto,
    @Req() req: Request,
  ) {
    return this.system.disableTotp(admin.adminId, body.totp, req.ip);
  }
}

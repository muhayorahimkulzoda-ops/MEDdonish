import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('admin-analytics')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AnalyticsAdminController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('analytics')
  overview() {
    return this.analytics.overview();
  }
}

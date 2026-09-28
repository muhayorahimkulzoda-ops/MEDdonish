import { Module } from '@nestjs/common';
import { AnalyticsAdminController } from './analytics-admin.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsAdminController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HealthModule } from '../health/health.module';
import { AuditService } from '../admin-cms/audit.service';
import { AccountDeletionService } from '../users/account-deletion.service';
import { UsersAdminController } from '../users/users-admin.controller';
import { UsersAdminService } from '../users/users-admin.service';
import { AdminSystemController } from './admin-system.controller';
import { AdminSystemService } from './admin-system.service';
import { SettingsService } from './settings.service';

@Module({
  imports: [AuthModule, HealthModule],
  controllers: [AdminSystemController, UsersAdminController],
  providers: [AdminSystemService, SettingsService, AuditService, UsersAdminService, AccountDeletionService],
  exports: [SettingsService],
})
export class AdminSystemModule {}

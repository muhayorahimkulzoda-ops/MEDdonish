import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../admin-cms/audit.service';
import { QuestionImportService } from './question-import.service';
import { TestAdminService } from './test-admin.service';
import { TestEngineService } from './test-engine.service';
import { TestingAdminController } from './testing-admin.controller';
import { TestingController } from './testing.controller';

@Module({
  imports: [MediaModule, NotificationsModule],
  controllers: [TestingAdminController, TestingController],
  providers: [
    QuestionImportService,
    TestAdminService,
    TestEngineService,
    SettingsService,
    AuditService,
  ],
})
export class TestingModule {}

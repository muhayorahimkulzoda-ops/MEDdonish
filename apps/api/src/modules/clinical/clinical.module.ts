import { Module } from '@nestjs/common';
import { AuditService } from '../admin-cms/audit.service';
import { MediaModule } from '../media/media.module';
import { ClinicalAdminController } from './clinical-admin.controller';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';

@Module({
  imports: [MediaModule],
  controllers: [ClinicalAdminController, ClinicalController],
  providers: [ClinicalService, AuditService],
  exports: [ClinicalService],
})
export class ClinicalModule {}

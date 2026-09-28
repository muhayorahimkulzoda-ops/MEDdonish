import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditService } from '../admin-cms/audit.service';
import { AdminCmsController } from '../admin-cms/admin-cms.controller';
import { CatalogAdminService } from '../admin-cms/catalog-admin.service';
import { DrugsAdminController } from '../admin-cms/drugs.controller';
import { DrugsAdminService } from '../admin-cms/drugs.service';
import { AdminMediaController } from '../media/admin-media.controller';
import { MaterialsAdminController } from '../media/materials-admin.controller';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtStrategy } from './admin-jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({}), MediaModule, NotificationsModule],
  controllers: [AdminAuthController, AdminCmsController, AdminMediaController, MaterialsAdminController, DrugsAdminController],
  providers: [AdminAuthService, AdminJwtStrategy, CatalogAdminService, DrugsAdminService, AuditService],
})
export class AdminAuthModule {}

import { Module } from '@nestjs/common';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { AuditService } from '../admin-cms/audit.service';
import { DocumentService } from './document.service';
import { LessonAccessService } from './lesson-access.service';
import { MediaController } from './media.controller';
import { MediaLibraryService } from './media-library.service';
import { MaterialsService } from './materials.service';
import { MediaTokenService } from './media-token.service';
import { MediaSessionService } from './session.service';
import { StorageService } from './storage.service';
import { SubscriberMediaController } from './subscriber-media.controller';
import { VideoUploadService } from './video-upload.service';
import { SettingsService } from '../settings/settings.service';

@Module({
  controllers: [MediaController, SubscriberMediaController],
  providers: [
    StorageService,
    MediaTokenService,
    MediaSessionService,
    VideoUploadService,
    DocumentService,
    MediaLibraryService,
    MaterialsService,
    LessonAccessService,
    EntitlementsService,
    AuditService,
    SettingsService,
  ],
  exports: [
    StorageService,
    MediaTokenService,
    MediaSessionService,
    VideoUploadService,
    DocumentService,
    MediaLibraryService,
    MaterialsService,
    LessonAccessService,
    EntitlementsService,
    AuditService,
  ],
})
export class MediaModule {}

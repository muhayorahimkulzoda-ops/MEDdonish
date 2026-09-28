import { Module } from '@nestjs/common';
import { NotificationsAdminController } from './notifications-admin.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushAdapter } from './push.adapter';

@Module({
  controllers: [NotificationsController, NotificationsAdminController],
  providers: [NotificationsService, PushAdapter],
  exports: [NotificationsService],
})
export class NotificationsModule {}

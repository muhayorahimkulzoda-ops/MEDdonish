import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { SystemNotificationDto, ToggleTemplateDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('admin-notifications')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class NotificationsAdminController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notification-templates')
  templates() {
    return this.notifications.listTemplates();
  }

  @Patch('notification-templates/:code')
  toggle(@Param('code') code: string, @Body() body: ToggleTemplateDto) {
    return this.notifications.setTemplate(code, body.enabled);
  }

  @Get('notifications')
  recent() {
    return this.notifications.listRecent();
  }

  @Post('notifications')
  system(@Body() body: SystemNotificationDto) {
    return this.notifications.sendSystem(body.title, body.body);
  }

  @Post('notifications/scan')
  scan() {
    return this.notifications.runExpiryScan();
  }
}

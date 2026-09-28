import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { SubscriberPayload } from '../auth/jwt.strategy';
import { PushTokenDto, RemovePushTokenDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  list(@Req() req: Request & { user: SubscriberPayload }) {
    return this.notifications.listMine(req.user.userId);
  }

  @Post('notifications/:id/read')
  read(
    @Param('id') id: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.notifications.markRead(req.user.userId, id);
  }

  @Post('notifications/read-all')
  readAll(@Req() req: Request & { user: SubscriberPayload }) {
    return this.notifications.markAllRead(req.user.userId);
  }

  @Post('push-token')
  register(
    @Body() body: PushTokenDto,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.notifications.registerToken(req.user.userId, body.platform, body.token);
  }

  @Delete('push-token')
  remove(
    @Body() body: RemovePushTokenDto,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.notifications.removeToken(req.user.userId, body.token ?? '');
  }
}

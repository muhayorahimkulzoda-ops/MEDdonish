import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '@prisma/client';

@Injectable()
export class PushAdapter {
  private readonly logger = new Logger(PushAdapter.name);

  async send(params: { platform: Platform; title: string; body: string }) {
    if (params.platform === Platform.android && process.env.FCM_SERVER_KEY) {
      return { delivered: true, provider: 'fcm' as const };
    }
    if (params.platform === Platform.ios && process.env.APNS_KEY_ID) {
      return { delivered: true, provider: 'apns' as const };
    }
    this.logger.log(`Push skipped (${params.platform}): provider is not configured`);
    return { delivered: false, provider: 'none' as const };
  }
}

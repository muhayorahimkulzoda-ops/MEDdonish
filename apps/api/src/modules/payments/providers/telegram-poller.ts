import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { TelegramReviewAdapter } from './telegram-review';

@Injectable()
export class TelegramPoller implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramPoller.name);
  private running = false;
  private offset = 0;

  constructor(
    private readonly telegram: TelegramReviewAdapter,
    private readonly payments: PaymentsService,
  ) {}

  onModuleInit() {
    if (!this.telegram?.hasToken()) {
      this.logger.log('telegram poller skipped: no bot token');
      return;
    }
    if (process.env.NODE_ENV === 'production' && process.env.TELEGRAM_WEBHOOK_SECRET) return;
    this.running = true;
    void this.loop();
  }

  onModuleDestroy() {
    this.running = false;
  }

  private async loop() {
    await this.telegram.deleteWebhook().catch(() => undefined);
    this.logger.log(
      this.telegram.configured()
        ? 'telegram poller started; receipts can be sent'
        : 'telegram poller started; send /start to the bot so receipts can be delivered',
    );
    while (this.running) {
      try {
        const updates = await this.telegram.getUpdates(this.offset);
        for (const update of updates) {
          const id = Number(update.update_id ?? 0);
          if (id >= this.offset) this.offset = id + 1;
          await this.telegram.bindAdminChatFromUpdate(update);
          await this.payments.handleTelegramPollUpdate(update);
        }
      } catch (err) {
        this.logger.warn(`telegram poller: ${err instanceof Error ? err.message : 'error'}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
}

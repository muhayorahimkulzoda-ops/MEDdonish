import { Module } from '@nestjs/common';
import { AuditService } from '../admin-cms/audit.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { MediaModule } from '../media/media.module';
import { OrdersController } from './orders.controller';
import { PaymentsAdminController } from './payments-admin.controller';
import { PaymentsService } from './payments.service';
import { StoreReceiptVerifier } from './providers/store-verifier';
import { TelegramPoller } from './providers/telegram-poller';
import { TelegramReviewAdapter } from './providers/telegram-review';
import { WebPaymentProvider } from './providers/web-provider';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [MediaModule],
  controllers: [OrdersController, WebhooksController, PaymentsAdminController],
  providers: [
    PaymentsService,
    EntitlementsService,
    AuditService,
    WebPaymentProvider,
    StoreReceiptVerifier,
    TelegramReviewAdapter,
    TelegramPoller,
  ],
})
export class PaymentsModule {}

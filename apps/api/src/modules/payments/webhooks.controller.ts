import { Body, Controller, Headers, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { PaymentSource } from '@prisma/client';
import { ProviderWebhookDto } from './payments.dto';
import { canonicalWebhook } from './canonical';
import { PaymentsService } from './payments.service';

@ApiTags('webhooks')
@SkipThrottle()
@Controller()
export class WebhooksController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('webhooks/payments/web')
  web(
    @Body() body: ProviderWebhookDto,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
  ) {
    return this.payments.ingestWebhook(
      PaymentSource.WEB_PAYMENT,
      canonicalWebhook(body),
      signature,
      body,
      timestamp,
    );
  }

  @Post('webhooks/google-play')
  google(
    @Body() body: ProviderWebhookDto,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
  ) {
    return this.payments.ingestWebhook(
      PaymentSource.GOOGLE_PLAY,
      canonicalWebhook(body),
      signature,
      body,
      timestamp,
    );
  }

  @Post('webhooks/apple')
  apple(
    @Body() body: ProviderWebhookDto,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
  ) {
    return this.payments.ingestWebhook(
      PaymentSource.APPLE_IAP,
      canonicalWebhook(body),
      signature,
      body,
      timestamp,
    );
  }

  @Post('webhooks/telegram')
  telegram(
    @Body() body: Record<string, unknown>,
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    return this.payments.handleTelegramUpdate(body, secret);
  }
}

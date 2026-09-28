import { Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors';

export type WebCheckoutSession = {
  checkoutUrl: string;
  providerPaymentId?: string;
};

@Injectable()
export class WebPaymentProvider {
  async createSession(input: {
    orderId: string;
    amountMinor: number;
    currency: string;
  }): Promise<WebCheckoutSession> {
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3001';
    const sandboxUrl = `${webOrigin}/checkout/${input.orderId}`;
    if ((process.env.WEB_PAYMENT_PROVIDER ?? 'sandbox') !== 'http') {
      return { checkoutUrl: sandboxUrl };
    }

    const url = process.env.WEB_PAYMENT_API_URL;
    const key = process.env.WEB_PAYMENT_API_KEY;
    if (!url || !key) {
      throw new AppException('PAYMENT_PROVIDER_UNAVAILABLE', 'Web payment provider is not configured', 503);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: input.orderId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        returnUrl: `${webOrigin}/checkout/success?orderId=${input.orderId}`,
        notifyUrl: `${process.env.API_PUBLIC_URL ?? 'http://localhost:3000'}/api/v1/webhooks/payments/web`,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      throw new AppException('PAYMENT_PROVIDER_UNAVAILABLE', 'Web payment provider failed', 502);
    }
    const body = (await response.json()) as { checkoutUrl?: string; providerPaymentId?: string };
    if (!body.checkoutUrl) {
      throw new AppException('PAYMENT_PROVIDER_UNAVAILABLE', 'Web payment provider returned no checkout URL', 502);
    }
    return { checkoutUrl: body.checkoutUrl, providerPaymentId: body.providerPaymentId };
  }
}

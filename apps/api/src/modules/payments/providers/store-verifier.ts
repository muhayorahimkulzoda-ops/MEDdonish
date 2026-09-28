import { Injectable, Logger } from '@nestjs/common';
import { PaymentSource } from '@prisma/client';

export type StoreVerifyInput = {
  source: PaymentSource;
  orderId: string;
  purchaseToken: string;
  amountMinor: number;
  currency: string;
};

export type StoreVerifyResult = {
  paid: boolean;
  amountMinor?: number;
  currency?: string;
  providerPaymentId?: string;
};

@Injectable()
export class StoreReceiptVerifier {
  private readonly logger = new Logger(StoreReceiptVerifier.name);

  async verify(input: StoreVerifyInput): Promise<StoreVerifyResult> {
    const url = process.env.STORE_VERIFY_URL;
    if (!url) {
      return { paid: false };
    }
    const key = process.env.STORE_VERIFY_KEY;
    if (!key) {
      this.logger.warn(`Store verifier has no key for ${input.source}`);
      return { paid: false };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: input.source,
        orderId: input.orderId,
        purchaseToken: input.purchaseToken,
        amountMinor: input.amountMinor,
        currency: input.currency,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      this.logger.warn(`Store verifier rejected ${input.source} order`);
      return { paid: false };
    }
    const body = (await response.json()) as StoreVerifyResult;
    if (body.paid !== true || typeof body.amountMinor !== 'number' || !body.currency) {
      return { paid: false };
    }
    return {
      paid: true,
      amountMinor: body.amountMinor,
      currency: body.currency,
      providerPaymentId: body.providerPaymentId,
    };
  }
}

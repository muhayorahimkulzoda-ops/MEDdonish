export type WebhookFields = {
  eventId: string;
  orderId: string;
  providerPaymentId: string;
  amountMinor: number;
  currency: string;
  status: string;
};

export function canonicalWebhook(dto: WebhookFields) {
  return JSON.stringify({
    eventId: dto.eventId,
    orderId: dto.orderId,
    providerPaymentId: dto.providerPaymentId,
    amountMinor: dto.amountMinor,
    currency: dto.currency,
    status: dto.status,
  });
}

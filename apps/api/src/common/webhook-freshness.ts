import { AppException } from './errors';

const WINDOW_SEC = 300;

export function assertWebhookFresh(timestamp?: string, now = Date.now(), production = process.env.NODE_ENV === 'production') {
  if (!timestamp) {
    if (production) {
      throw new AppException('WEBHOOK_STALE', 'Webhook timestamp is required', 401);
    }
    return;
  }
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(now / 1000 - seconds) > WINDOW_SEC) {
    throw new AppException('WEBHOOK_STALE', 'Webhook timestamp is outside the allowed window', 401);
  }
}

export function webhookSignedMessage(rawBody: string, timestamp?: string) {
  return timestamp ? `${timestamp}.${rawBody}` : rawBody;
}

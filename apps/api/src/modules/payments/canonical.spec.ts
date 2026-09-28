import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonicalWebhook } from './canonical';

test('webhook payload uses a fixed field order', () => {
  const raw = canonicalWebhook({
    status: 'paid',
    currency: 'TJS',
    amountMinor: 15000,
    providerPaymentId: 'p1',
    orderId: '11111111-1111-1111-1111-111111111111',
    eventId: 'evt-1',
  });
  assert.equal(
    raw,
    '{"eventId":"evt-1","orderId":"11111111-1111-1111-1111-111111111111","providerPaymentId":"p1","amountMinor":15000,"currency":"TJS","status":"paid"}',
  );
});

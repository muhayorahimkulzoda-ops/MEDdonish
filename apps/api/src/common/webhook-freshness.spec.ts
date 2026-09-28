import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppException } from './errors';
import { assertWebhookFresh, webhookSignedMessage } from './webhook-freshness';

test('development allows a missing timestamp', () => {
  assert.doesNotThrow(() => assertWebhookFresh(undefined, Date.now(), false));
});

test('production requires a timestamp', () => {
  assert.throws(
    () => assertWebhookFresh(undefined, Date.now(), true),
    (err) => err instanceof AppException && err.code === 'WEBHOOK_STALE',
  );
});

test('rejects a replay older than five minutes', () => {
  const now = Date.now();
  assert.throws(
    () => assertWebhookFresh(String(Math.floor(now / 1000) - 400), now, false),
    (err) => err instanceof AppException && err.code === 'WEBHOOK_STALE',
  );
});

test('accepts a current timestamp', () => {
  const now = Date.now();
  assert.doesNotThrow(() => assertWebhookFresh(String(Math.floor(now / 1000)), now, true));
});

test('binds the webhook HMAC to the timestamp', () => {
  assert.equal(webhookSignedMessage('{"a":1}', '1700000000'), '1700000000.{"a":1}');
  assert.equal(webhookSignedMessage('{"a":1}'), '{"a":1}');
});

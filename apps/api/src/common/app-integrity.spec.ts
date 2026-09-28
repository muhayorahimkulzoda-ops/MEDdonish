import assert from 'node:assert/strict';
import { test } from 'node:test';
import { issueIntegrityTicket, verifyAppIntegrity } from './app-integrity';
import { AppException } from './errors';

const secret = 'integrity-secret-value-ok-ok';
const deviceId = 'android-device-1';

test('skips when not required', () => {
  assert.doesNotThrow(() => verifyAppIntegrity(undefined, deviceId, {}));
});

test('rejects a missing ticket when required', () => {
  assert.throws(
    () => verifyAppIntegrity(undefined, deviceId, { APP_INTEGRITY_REQUIRED: 'true', APP_INTEGRITY_SECRET: secret }),
    (err) => err instanceof AppException && err.code === 'APP_INTEGRITY_REQUIRED',
  );
});

test('accepts a fresh HMAC ticket', () => {
  const ticket = issueIntegrityTicket(deviceId, secret);
  assert.doesNotThrow(() =>
    verifyAppIntegrity(ticket, deviceId, { APP_INTEGRITY_REQUIRED: 'true', APP_INTEGRITY_SECRET: secret }),
  );
});

test('does not lock the web cabinet when required', () => {
  assert.doesNotThrow(() =>
    verifyAppIntegrity(undefined, deviceId, { APP_INTEGRITY_REQUIRED: 'true', APP_INTEGRITY_SECRET: secret }, 'web'),
  );
});

test('rejects a ticket for another device', () => {
  const ticket = issueIntegrityTicket('other', secret);
  assert.throws(
    () => verifyAppIntegrity(ticket, deviceId, { APP_INTEGRITY_REQUIRED: 'true', APP_INTEGRITY_SECRET: secret }),
    (err) => err instanceof AppException && err.code === 'APP_INTEGRITY_INVALID',
  );
});

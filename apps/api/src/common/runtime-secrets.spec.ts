import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertRuntimeSecrets } from './runtime-secrets';

const strong = {
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  JWT_ADMIN_ACCESS_SECRET: 'c'.repeat(32),
  WEB_PAYMENT_WEBHOOK_SECRET: 'd'.repeat(32),
  GOOGLE_PLAY_WEBHOOK_SECRET: 'e'.repeat(32),
  APPLE_IAP_WEBHOOK_SECRET: 'f'.repeat(32),
  MEDIA_SIGNING_SECRET: 'g'.repeat(32),
  SMS_PROVIDER: 'http',
  SMS_API_URL: 'https://sms.example.test/send',
  SMS_API_KEY: 'h'.repeat(24),
  WEB_PAYMENT_PROVIDER: 'http',
  WEB_PAYMENT_API_URL: 'https://pay.example.test/checkout',
  WEB_PAYMENT_API_KEY: 'i'.repeat(24),
  STORE_VERIFY_URL: 'https://verify.example.test/receipts',
  STORE_VERIFY_KEY: 'j'.repeat(24),
  LICENSE_SERVER_URL: 'https://license.example.test/widevine',
  LICENSE_SIGNING_SECRET: 'k'.repeat(32),
  CDN_PUBLIC_BASE: 'https://cdn.example.test',
  CDN_SIGNING_SECRET: 'l'.repeat(32),
  APP_INTEGRITY_SECRET: 'm'.repeat(32),
};

test('development skips production checks', () => {
  assert.doesNotThrow(() => assertRuntimeSecrets({ NODE_ENV: 'development', OTP_DEV_ECHO: 'true' }));
});

test('production rejects OTP_DEV_ECHO', () => {
  assert.throws(
    () => assertRuntimeSecrets({ NODE_ENV: 'production', OTP_DEV_ECHO: 'true', ...strong }),
    /OTP_DEV_ECHO/,
  );
});

test('production rejects console SMS', () => {
  assert.throws(
    () => assertRuntimeSecrets({ NODE_ENV: 'production', ...strong, SMS_PROVIDER: 'console' }),
    /SMS_PROVIDER/,
  );
});

test('production rejects sandbox payments', () => {
  assert.throws(
    () => assertRuntimeSecrets({ NODE_ENV: 'production', ...strong, WEB_PAYMENT_PROVIDER: 'sandbox' }),
    /WEB_PAYMENT_PROVIDER/,
  );
});

test('production rejects missing license server', () => {
  assert.throws(
    () => assertRuntimeSecrets({ NODE_ENV: 'production', ...strong, LICENSE_SERVER_URL: '' }),
    /LICENSE_SERVER_URL/,
  );
});

test('production accepts the full payment and DRM contour', () => {
  assert.doesNotThrow(() => assertRuntimeSecrets({ NODE_ENV: 'production', ...strong }));
});

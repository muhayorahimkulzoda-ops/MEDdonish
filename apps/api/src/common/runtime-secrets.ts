const WEAK = /change-me|dev-|password|secret123|changeme/i;

function required(env: NodeJS.ProcessEnv, key: string, min = 24) {
  const value = env[key] ?? '';
  if (value.length < min || WEAK.test(value)) {
    throw new Error(`${key} is missing or too weak for production`);
  }
}

export function assertRuntimeSecrets(env: NodeJS.ProcessEnv = process.env) {
  if ((env.NODE_ENV ?? 'development') !== 'production') return;

  if (env.OTP_DEV_ECHO === 'true') {
    throw new Error('OTP_DEV_ECHO cannot be true in production');
  }
  if (env.PAYMENTS_DEV_COMPLETE === 'true') {
    throw new Error('PAYMENTS_DEV_COMPLETE cannot be true in production');
  }

  required(env, 'JWT_ACCESS_SECRET');
  required(env, 'JWT_REFRESH_SECRET');
  required(env, 'JWT_ADMIN_ACCESS_SECRET');
  required(env, 'WEB_PAYMENT_WEBHOOK_SECRET');
  required(env, 'GOOGLE_PLAY_WEBHOOK_SECRET');
  required(env, 'APPLE_IAP_WEBHOOK_SECRET');
  required(env, 'MEDIA_SIGNING_SECRET');

  if (env.SMS_PROVIDER !== 'http') {
    throw new Error('SMS_PROVIDER must be http in production');
  }
  httpsUrl(env, 'SMS_API_URL');
  required(env, 'SMS_API_KEY', 16);

  if (env.WEB_PAYMENT_PROVIDER !== 'http') {
    throw new Error('WEB_PAYMENT_PROVIDER must be http in production');
  }
  httpsUrl(env, 'WEB_PAYMENT_API_URL');
  required(env, 'WEB_PAYMENT_API_KEY', 16);
  httpsUrl(env, 'STORE_VERIFY_URL');
  required(env, 'STORE_VERIFY_KEY', 16);

  httpsUrl(env, 'LICENSE_SERVER_URL');
  required(env, 'LICENSE_SIGNING_SECRET');
  httpsUrl(env, 'CDN_PUBLIC_BASE');
  required(env, 'CDN_SIGNING_SECRET');
  required(env, 'APP_INTEGRITY_SECRET');
}

function httpsUrl(env: NodeJS.ProcessEnv, key: string) {
  if (!env[key]?.startsWith('https://')) {
    throw new Error(`${key} must be https in production`);
  }
}

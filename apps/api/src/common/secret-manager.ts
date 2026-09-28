import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const MANAGED_SECRET_KEYS = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ADMIN_ACCESS_SECRET',
  'WEB_PAYMENT_WEBHOOK_SECRET',
  'GOOGLE_PLAY_WEBHOOK_SECRET',
  'APPLE_IAP_WEBHOOK_SECRET',
  'MEDIA_SIGNING_SECRET',
  'WEB_PAYMENT_API_KEY',
  'STORE_VERIFY_KEY',
  'SMS_API_KEY',
  'LICENSE_SIGNING_SECRET',
  'CDN_SIGNING_SECRET',
  'APP_INTEGRITY_SECRET',
  'TELEGRAM_BOT_TOKEN',
] as const;

export class SecretManager {
  constructor(
    private readonly backend = process.env.SECRET_BACKEND ?? 'env',
    private readonly dir = process.env.SECRET_DIR ?? '',
  ) {}

  get(name: string): string | undefined {
    if (this.backend === 'file' && this.dir) {
      try {
        const value = readFileSync(join(this.dir, name), 'utf8').replace(/^\uFEFF/, '').trim();
        if (value) return value;
      } catch {
        // File backend falls back to process env. Never log the value.
      }
    }
    const value = process.env[name];
    return value && value.length > 0 ? value : undefined;
  }

  hydrate(keys: readonly string[] = MANAGED_SECRET_KEYS) {
    for (const key of keys) {
      const value = this.get(key);
      if (value) process.env[key] = value;
    }
  }
}

export function loadManagedSecrets() {
  const manager = new SecretManager();
  manager.hydrate();
  return manager;
}

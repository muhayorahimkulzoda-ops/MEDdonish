import { AppException } from './errors';
import { hmacEquals, hmacHex } from './crypto';

export function verifyAppIntegrity(
  header: string | undefined,
  deviceId: string,
  env: NodeJS.ProcessEnv = process.env,
  platform?: string,
) {
  if (env.APP_INTEGRITY_REQUIRED !== 'true') return;
  if ((platform ?? '').toLowerCase() === 'web') return;
  const secret = env.APP_INTEGRITY_SECRET ?? '';
  if (!header || !secret || !deviceId) {
    throw new AppException('APP_INTEGRITY_REQUIRED', 'App integrity attestation is required', 403);
  }
  const [exp, sig] = header.split('.');
  const seconds = Number(exp);
  if (!exp || !sig || !Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) {
    throw new AppException('APP_INTEGRITY_INVALID', 'App integrity attestation is invalid', 403);
  }
  if (!hmacEquals(secret, `${deviceId}.${exp}`, sig)) {
    throw new AppException('APP_INTEGRITY_INVALID', 'App integrity attestation is invalid', 403);
  }
}

export function issueIntegrityTicket(deviceId: string, secret: string, now = Date.now()) {
  const exp = Math.floor(now / 1000) + 180;
  return `${exp}.${hmacHex(secret, `${deviceId}.${exp}`)}`;
}

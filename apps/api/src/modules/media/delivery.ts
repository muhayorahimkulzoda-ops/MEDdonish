import { hmacHex } from '../../common/crypto';

export type DeliveryEnv = {
  CDN_PUBLIC_BASE?: string;
  CDN_SIGNING_SECRET?: string;
  LICENSE_SERVER_URL?: string;
  LICENSE_SIGNING_SECRET?: string;
};

export function mediaPath(kind: 'video' | 'pdf' | 'image', token: string, file?: string) {
  const base = `/api/v1/media/${kind}/${token}`;
  return file ? `${base}/${file}` : base;
}

export function publicMediaUrl(
  path: string,
  ttlSeconds: number,
  env: DeliveryEnv = process.env,
) {
  const base = env.CDN_PUBLIC_BASE?.replace(/\/$/, '');
  const secret = env.CDN_SIGNING_SECRET;
  if (!base || !secret) {
    return { url: path, cdn: false };
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = hmacHex(secret, `${path}.${exp}`);
  return { url: `${base}${path}?exp=${exp}&sig=${sig}`, cdn: true };
}

export function drmSession(
  subject: string,
  videoId: string,
  ttlSeconds: number,
  env: DeliveryEnv = process.env,
) {
  const licenseBase = env.LICENSE_SERVER_URL?.replace(/\/$/, '');
  const secret = env.LICENSE_SIGNING_SECRET;
  if (!licenseBase || !secret) {
    return { provider: 'none' as const, licenseUrl: null as string | null };
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const ticket = hmacHex(secret, `${subject}.${videoId}.${exp}`);
  return {
    provider: 'widevine' as const,
    licenseUrl: `${licenseBase}?exp=${exp}&ticket=${ticket}`,
  };
}

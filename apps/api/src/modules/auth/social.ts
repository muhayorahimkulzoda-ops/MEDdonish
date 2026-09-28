import { createPublicKey, verify } from 'crypto';
import { Errors } from '../../common/errors';

export type SocialProvider = 'google' | 'apple';

export type SocialIdentity = {
  provider: SocialProvider;
  sub: string;
  email?: string;
  name?: string;
};

type AppleJwk = {
  kid?: string;
  kty: string;
  n?: string;
  e?: string;
  alg?: string;
  use?: string;
};

export async function verifySocialToken(input: {
  provider: SocialProvider;
  idToken?: string;
  deviceId: string;
}): Promise<SocialIdentity> {
  const token = input.idToken?.trim() ?? '';
  if (process.env.OTP_DEV_ECHO === 'true' && (!token || token === 'dev')) {
    return {
      provider: input.provider,
      sub: `dev:${input.provider}:${input.deviceId}`,
    };
  }
  if (input.provider === 'google') return verifyGoogle(token);
  return verifyApple(token);
}

async function verifyGoogle(idToken: string): Promise<SocialIdentity> {
  const audience = process.env.GOOGLE_OAUTH_CLIENT_ID ?? '';
  if (!idToken || !audience) throw Errors.socialInvalid();
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { signal: AbortSignal.timeout(8_000) },
  );
  if (!response.ok) throw Errors.socialInvalid();
  const body = (await response.json()) as {
    aud?: string;
    sub?: string;
    email?: string;
    email_verified?: string;
    name?: string;
  };
  if (body.aud !== audience || !body.sub || body.email_verified === 'false') {
    throw Errors.socialInvalid();
  }
  return {
    provider: 'google',
    sub: body.sub,
    email: body.email,
    name: body.name,
  };
}

async function verifyApple(idToken: string): Promise<SocialIdentity> {
  const audience = process.env.APPLE_OAUTH_CLIENT_ID ?? '';
  if (!idToken || !audience) throw Errors.socialInvalid();
  const parts = idToken.split('.');
  if (parts.length !== 3) throw Errors.socialInvalid();
  const header = jsonFromB64(parts[0]) as { kid?: string; alg?: string };
  const payload = jsonFromB64(parts[1]) as {
    iss?: string;
    aud?: string;
    sub?: string;
    email?: string;
    exp?: number;
  };
  if (header.alg !== 'RS256' || payload.iss !== 'https://appleid.apple.com') {
    throw Errors.socialInvalid();
  }
  if (payload.aud !== audience || !payload.sub || (payload.exp ?? 0) * 1000 < Date.now()) {
    throw Errors.socialInvalid();
  }
  const keys = await fetch('https://appleid.apple.com/auth/keys', {
    signal: AbortSignal.timeout(8_000),
  }).then((response) => response.json() as Promise<{ keys?: AppleJwk[] }>);
  const jwk = keys.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw Errors.socialInvalid();
  const key = createPublicKey({ key: jwk, format: 'jwk' });
  const ok = verify(
    'SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    key,
    Buffer.from(parts[2], 'base64url'),
  );
  if (!ok) throw Errors.socialInvalid();
  return { provider: 'apple', sub: payload.sub, email: payload.email };
}

function jsonFromB64(value: string) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>;
}

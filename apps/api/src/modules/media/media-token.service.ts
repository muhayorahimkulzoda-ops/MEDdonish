import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type MediaKind = 'video' | 'pdf' | 'image';

export interface MediaTokenPayload {
  kind: MediaKind;
  id: string;
  exp: number;
  sub: string;
  preview?: boolean;
}

@Injectable()
export class MediaTokenService {
  private secret() {
    return process.env.MEDIA_SIGNING_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'dev-change-me-media';
  }

  issue(kind: MediaKind, id: string, subject: string, ttlSeconds = 120, preview = false) {
    const payload: MediaTokenPayload = {
      kind,
      id,
      sub: subject,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
      preview: preview || undefined,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.secret()).update(body).digest('base64url');
    return `${body}.${signature}`;
  }

  verify(token: string): MediaTokenPayload {
    const [body, signature] = token.split('.');
    if (!body || !signature) throw new Error('invalid');
    const expected = createHmac('sha256', this.secret()).update(body).digest('base64url');
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new Error('invalid');
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as MediaTokenPayload;
    if (payload.exp * 1000 < Date.now()) throw new Error('expired');
    return payload;
  }
}

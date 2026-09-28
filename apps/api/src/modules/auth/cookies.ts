import { randomBytes } from 'crypto';
import type { CookieOptions, Request, Response } from 'express';

export const ACCESS_COOKIE = 'meddonish_access';
export const REFRESH_COOKIE = 'meddonish_refresh';
export const CSRF_COOKIE = 'meddonish_csrf';

export function readCookie(req: Request, name: string) {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function baseCookie(): CookieOptions {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'lax',
    path: '/',
  };
}

function csrfCookieOptions(): CookieOptions {
  return { ...baseCookie(), httpOnly: false };
}

export function setCsrfCookie(res: Response) {
  res.cookie(CSRF_COOKIE, randomBytes(32).toString('hex'), {
    ...csrfCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookie(), maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...baseCookie(), maxAge: 30 * 24 * 60 * 60 * 1000 });
  setCsrfCookie(res);
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, baseCookie());
  res.clearCookie(REFRESH_COOKIE, baseCookie());
  res.clearCookie(CSRF_COOKIE, csrfCookieOptions());
}

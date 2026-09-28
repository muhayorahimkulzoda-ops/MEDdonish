const TOKEN_KEY = 'meddonish.admin.token';
const ADMIN_GATE_COOKIE = 'meddonish_admin_gate';

export function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') return '/api/v1';
  return 'http://127.0.0.1:3000/api/v1';
}

export function getWebOrigin() {
  if (process.env.NEXT_PUBLIC_WEB_ORIGIN) return process.env.NEXT_PUBLIC_WEB_ORIGIN;
  if (typeof window === 'undefined') return 'http://localhost:3001';
  if (window.location.protocol === 'https:') {
    return `${window.location.protocol}//${window.location.hostname}`;
  }
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

export function markAdminSession(active: boolean) {
  if (typeof document === 'undefined') return;
  document.cookie = active
    ? `${ADMIN_GATE_COOKIE}=1; Path=/; SameSite=Lax; Max-Age=43200`
    : `${ADMIN_GATE_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
  markAdminSession(Boolean(token));
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${getApiBase()}${path}`, { ...init, headers });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
  };

  if (!response.ok) {
    if (response.status === 401) setToken(null);
    throw new AdminApiError(
      payload.message ?? `Request failed: ${response.status}`,
      response.status,
      payload.code,
    );
  }

  return payload as T;
}

export async function adminUpload<T>(path: string, body: FormData): Promise<T> {
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${getApiBase()}${path}`, { method: 'POST', headers, body });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
  };
  if (!response.ok) {
    throw new AdminApiError(payload.message ?? `Upload failed: ${response.status}`, response.status, payload.code);
  }
  return payload as T;
}

export async function adminUploadPut<T>(path: string, body: FormData): Promise<T> {
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${getApiBase()}${path}`, { method: 'PUT', headers, body });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
  };
  if (!response.ok) {
    throw new AdminApiError(payload.message ?? `Upload failed: ${response.status}`, response.status, payload.code);
  }
  return payload as T;
}

export type Translation = {
  language: 'ru' | 'tg' | 'en';
  title: string;
  description?: string;
  body?: string | null;
};

export function titleOf(items: Translation[] | undefined, language: Translation['language'] = 'tg') {
  return items?.find((item) => item.language === language)?.title
    ?? items?.[0]?.title
    ?? '—';
}

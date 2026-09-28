export function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window === 'undefined') return 'http://127.0.0.1:3000/api/v1';
  return `${window.location.origin}/api/v1`;
}

const ADMIN_GATE_COOKIE = 'meddonish_admin_gate';
const ADMIN_GATE_STORAGE = 'meddonish.admin.ui';

export function getAdminOrigin() {
  if (process.env.NEXT_PUBLIC_ADMIN_ORIGIN) return process.env.NEXT_PUBLIC_ADMIN_ORIGIN;
  if (typeof window === 'undefined') return 'http://localhost:3002';
  if (window.location.protocol === 'https:') {
    return 'http://localhost:8081';
  }
  return `${window.location.protocol}//${window.location.hostname}:3002`;
}

export function hasAdminGate() {
  if (typeof window === 'undefined') return false;
  if (window.sessionStorage.getItem(ADMIN_GATE_STORAGE) === '1') return true;
  return document.cookie.split(';').some((part) => part.trim() === `${ADMIN_GATE_COOKIE}=1`);
}

export function captureAdminGateFromUrl() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('from') !== 'admin') return;
  window.sessionStorage.setItem(ADMIN_GATE_STORAGE, '1');
  document.cookie = `${ADMIN_GATE_COOKIE}=1; Path=/; SameSite=Lax; Max-Age=43200`;
  params.delete('from');
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', next);
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const DEVICE_KEY = 'meddonish.web.device';

type ApiError = Error & { code?: string; status?: number };

let refreshInFlight: Promise<boolean> | null = null;

export function mediaUrl(path: string) {
  if (!path) return path;
  if (path.startsWith('/api/v1/')) return path;
  if (path.startsWith('http')) {
    try {
      const parsed = new URL(path);
      if (parsed.pathname.startsWith('/api/v1/')) return `${parsed.pathname}${parsed.search}`;
    } catch {
      return path;
    }
    return path;
  }
  return path.startsWith('/') ? path : `/${path}`;
}

export function getDeviceId() {
  if (typeof window === 'undefined') return 'web-checkout';
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getToken() {
  return null;
}

export function setToken(_token: string | null) {
  setSession(null);
}

export function setSession(_accessToken?: string | null, _refreshToken?: string | null) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('meddonish.web.token');
  window.localStorage.removeItem('meddonish.web.refresh');
}

function readCsrf() {
  if (typeof document === 'undefined') return '';
  const part = document.cookie.split(';').map((row) => row.trim()).find((row) => row.startsWith('meddonish_csrf='));
  return part ? decodeURIComponent(part.slice('meddonish_csrf='.length)) : '';
}

function withCsrf(headers: Headers) {
  const token = readCsrf();
  if (token) headers.set('x-csrf-token', token);
  return headers;
}

function fail(payload: { message?: string; code?: string }, status: number): never {
  const error = new Error(payload.message ?? `Request failed: ${status}`) as ApiError;
  error.code = payload.code;
  error.status = status;
  throw error;
}

async function refreshAccess() {
  const response = await fetch(`${getApiBase()}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: withCsrf(new Headers({ Accept: 'application/json', 'Content-Type': 'application/json' })),
    body: JSON.stringify({}),
  });
  return response.ok;
}

function refreshOnce() {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccess().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function canRefresh(path: string, status: number) {
  return status === 401 && !path.startsWith('/auth/');
}

export async function apiForm<T>(path: string, form: FormData, opts?: { auth?: boolean }): Promise<T> {
  const useAuth = opts?.auth !== false;
  const request = async () => {
    const headers = new Headers();
    headers.set('Accept', 'application/json');
    withCsrf(headers);
    return fetch(`${getApiBase()}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: form,
    });
  };
  let response = await request();
  if (useAuth && canRefresh(path, response.status) && (await refreshOnce())) {
    response = await request();
  }
  const payload = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
  if (!response.ok) fail(payload, response.status);
  return payload as T;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const request = async () => {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    withCsrf(headers);
    return fetch(`${getApiBase()}${path}`, { ...init, credentials: 'include', headers });
  };
  let response = await request();
  if (canRefresh(path, response.status) && (await refreshOnce())) {
    response = await request();
  }
  const payload = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
  if (!response.ok) fail(payload, response.status);
  return payload as T;
}

export type SessionUser = {
  id: string;
  phone: string | null;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  hasPassword?: boolean;
};

export async function fetchMe() {
  setSession(null);
  try {
    return await api<SessionUser>('/me');
  } catch {
    return null;
  }
}

export async function logoutSession() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    // cookies may already be gone
  }
  setSession(null);
}

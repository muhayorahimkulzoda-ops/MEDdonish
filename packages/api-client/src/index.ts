export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
}

export class MeddonishApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'MeddonishApiError';
  }
}

export function createApiClient(options: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await options.getAccessToken?.();
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(`${options.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    };

    if (!response.ok) {
      throw new MeddonishApiError(
        payload.message ?? `Request failed: ${response.status}`,
        response.status,
        payload.code,
      );
    }

    return payload as T;
  }

  return {
    requestOtp: (phone: string) =>
      request('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    verifyOtp: (body: unknown) =>
      request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    login: (body: unknown) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    refresh: (refreshToken: string) =>
      request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/me'),
    publicCourses: () => request('/public/courses'),
    publicDisciplines: () => request('/public/disciplines'),
  };
}

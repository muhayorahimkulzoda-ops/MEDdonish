'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminApiError, adminRequest, setToken } from '../../lib/api';
import { t } from '../../lib/i18n';

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [needTotp, setNeedTotp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    const data = new FormData(event.currentTarget);
    const totp = String(data.get('totp') ?? '').trim();
    try {
      const result = await adminRequest<{ accessToken: string }>('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: String(data.get('email') ?? ''),
          password: String(data.get('password') ?? ''),
          ...(totp ? { totp } : {}),
        }),
      });
      setToken(result.accessToken);
      router.replace('/');
    } catch (err) {
      if (err instanceof AdminApiError && err.code === 'TOTP_REQUIRED') {
        setNeedTotp(true);
        setError(t('admin.totpRequired'));
      } else if (err instanceof AdminApiError && err.code === 'ADMIN_INVALID') {
        setError(t('admin.loginInvalid'));
      } else if (err instanceof TypeError) {
        setError(t('admin.loginNetworkError'));
      } else {
        setError(t('admin.loginFailed'));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login">
      <form className="form" onSubmit={onSubmit}>
        <h1>{t('admin.login')}</h1>
        {error ? <div className="error">{error}</div> : null}
        <label>
          {t('admin.email')}
          <input name="email" type="email" defaultValue="admin@meddonish.local" required />
        </label>
        <label>
          {t('admin.password')}
          <span className="password-field">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              defaultValue="MeddonishAdmin2026"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? t('auth.password.hide') : t('auth.password.show')}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M4 20 20 4" />
                </svg>
              )}
            </button>
          </span>
        </label>
        {needTotp ? (
          <label>
            {t('admin.totpCode')}
            <input name="totp" inputMode="numeric" pattern="\d{6}" maxLength={6} required />
          </label>
        ) : null}
        <button type="submit" disabled={pending}>
          {t('admin.signIn')}
        </button>
      </form>
    </div>
  );
}

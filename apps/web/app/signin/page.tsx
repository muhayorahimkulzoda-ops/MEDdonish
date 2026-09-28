'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getDeviceId } from '../../lib/api';
import { formatTajikPhoneInput, isTajikPhone, normalizePhone } from '../../lib/phone';
import { authError } from '../../lib/auth-errors';
import { setAppLocale, t, useLocale } from '../../lib/i18n';
import { Shell } from '../../components/Shell';
import { PasswordField } from '../../components/PasswordField';
import { AuthLangChips } from '../../components/AuthLangChips';
import { BrandMark } from '../../components/BrandMark';

type OtpResponse = { expiresIn: number; devCode?: string };

export default function SignInPage() {
  const router = useRouter();
  useLocale();
  useEffect(() => {
    setAppLocale('tg');
  }, []);
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [phone, setPhone] = useState('+992 ');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  function nextPath() {
    const next = new URLSearchParams(window.location.search).get('next');
    return next && next.startsWith('/') ? next : '/';
  }

  async function sendOtp() {
    const normalized = normalizePhone(phone);
    if (!isTajikPhone(normalized)) {
      setError(t('auth.error.phoneInvalid'));
      return;
    }
    setSending(true);
    setError('');
    try {
      const sent = await api<OtpResponse>('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: normalized, purpose: 'login' }),
      });
      setMode('otp');
      setNotice(sent.devCode ? t('auth.devCodeReady') : t('auth.otp.sent'));
      if (sent.devCode) setCode(sent.devCode);
    } catch (err) {
      const errCode = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
      setError(authError(errCode, err instanceof Error ? err.message : t('auth.error.invalid')));
    } finally {
      setSending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const normalized = normalizePhone(phone);
    if (!isTajikPhone(normalized)) {
      setError(t('auth.error.phoneInvalid'));
      return;
    }
    setSending(true);
    try {
      if (mode === 'otp') {
        await api('/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({
            phone: normalized,
            code,
            device: { deviceId: getDeviceId(), platform: 'web' },
          }),
        });
      } else {
        await api('/auth/signin', {
          method: 'POST',
          body: JSON.stringify({
            phone: normalized,
            password,
            device: { deviceId: getDeviceId(), platform: 'web' },
          }),
        });
      }
      router.push(nextPath());
    } catch (err) {
      const errCode = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
      setError(authError(errCode, err instanceof Error ? err.message : t('auth.error.invalid')));
    } finally {
      setSending(false);
    }
  }

  return (
    <Shell>
      <div className="gate gate-inline" data-step="signin">
        <div className="gate-aurora" aria-hidden="true" />
        <div className="gate-orbs" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="login-page">
          <div className="login-frame">
            <div className="login-card">
              <button
                type="button"
                className="login-back"
                aria-label={t('welcome.back')}
                onClick={() => {
                  try {
                    const from = document.referrer ? new URL(document.referrer) : null;
                    if (from && from.origin === window.location.origin && from.pathname !== window.location.pathname) {
                      router.back();
                      return;
                    }
                  } catch {
                    /* home */
                  }
                  router.push('/');
                }}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <p className="gate-kicker">
                <BrandMark />
              </p>
              <AuthLangChips />
              <h1 className="gate-title">{t('auth.enterTitle')}</h1>
              <p className="gate-hint">{t('auth.enterHint')}</p>
              {error ? <p className="login-alert">{error}</p> : null}
              {notice ? <p className="login-ok">{notice}</p> : null}
              <form className="auth-form" onSubmit={(event) => void submit(event)}>
                <label className="pay-label">
                  {t('auth.phone')}
                  <input
                    value={phone}
                    onChange={(event) => setPhone(formatTajikPhoneInput(event.target.value))}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+992 XX XXX XX XX"
                    required
                  />
                </label>
                {mode === 'password' ? (
                  <PasswordField
                    label={t('auth.secret')}
                    value={password}
                    onChange={setPassword}
                    autoComplete="current-password"
                    shown={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                  />
                ) : (
                  <label className="pay-label">
                    {t('auth.otp.code')}
                    <input
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </label>
                )}
                <button className="login-btn" type="submit" disabled={sending}>
                  {t('auth.signIn')}
                </button>
              </form>
              <p className="auth-switch">
                <a href="/forgot">{t('auth.forgot')}</a>
              </p>
              <p className="auth-switch">
                {t('auth.noAccount')}{' '}
                <a href="/register">{t('auth.register')}</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

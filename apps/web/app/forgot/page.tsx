'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getDeviceId } from '../../lib/api';
import { formatTajikPhoneInput, isTajikPhone, normalizePhone } from '../../lib/phone';
import { passwordIssue } from '../../lib/password';
import { authError } from '../../lib/auth-errors';
import { setAppLocale, t, useLocale } from '../../lib/i18n';
import { Shell } from '../../components/Shell';
import { PasswordField } from '../../components/PasswordField';
import { AuthLangChips } from '../../components/AuthLangChips';
import { BrandMark } from '../../components/BrandMark';

type OtpResponse = { expiresIn: number; devCode?: string };

export default function ForgotPage() {
  const router = useRouter();
  useLocale();
  useEffect(() => {
    setAppLocale('tg');
  }, []);
  const [step, setStep] = useState<'phone' | 'reset'>('phone');
  const [phone, setPhone] = useState('+992 ');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  async function sendCode() {
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
        body: JSON.stringify({ phone: normalized, purpose: 'reset' }),
      });
      setStep('reset');
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
    if (step === 'phone') {
      await sendCode();
      return;
    }
    const issue = passwordIssue(password, passwordConfirm);
    if (issue === 'short') {
      setError(t('auth.error.passwordShort'));
      return;
    }
    if (issue === 'mismatch') {
      setError(t('auth.error.passwordMismatch'));
      return;
    }
    if (issue === 'weak') {
      setError(t('auth.error.passwordWeak'));
      return;
    }
    setSending(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          phone: normalizePhone(phone),
          code,
          password,
          passwordConfirm,
          device: { deviceId: getDeviceId(), platform: 'web' },
        }),
      });
      router.push('/');
    } catch (err) {
      const errCode = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
      setError(authError(errCode, err instanceof Error ? err.message : t('auth.error.invalid')));
    } finally {
      setSending(false);
    }
  }

  return (
    <Shell>
      <div className="gate gate-inline" data-step="forgot">
        <div className="gate-aurora" aria-hidden="true" />
        <div className="gate-orbs" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="login-page">
          <div className="login-frame">
            <div className="login-card">
              <p className="gate-kicker">
                <BrandMark />
              </p>
              <AuthLangChips />
              <h1 className="gate-title">{t('auth.forgot.title')}</h1>
              <p className="gate-hint">{t('auth.forgot.hint')}</p>
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
                {step === 'reset' ? (
                  <>
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
                    <PasswordField
                      label={t('auth.secret')}
                      value={password}
                      onChange={setPassword}
                      autoComplete="new-password"
                      shown={showPassword}
                      onToggle={() => setShowPassword((value) => !value)}
                    />
                    <PasswordField
                      label={t('auth.secretConfirm')}
                      value={passwordConfirm}
                      onChange={setPasswordConfirm}
                      autoComplete="new-password"
                      shown={showConfirm}
                      onToggle={() => setShowConfirm((value) => !value)}
                    />
                  </>
                ) : null}
                <button className="login-btn" type="submit" disabled={sending}>
                  {step === 'phone' ? t('auth.forgot.send') : t('auth.forgot.save')}
                </button>
              </form>
              <p className="auth-switch">
                <a href="/signin">{t('auth.signIn')}</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

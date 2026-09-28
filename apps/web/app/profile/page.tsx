'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, fetchMe, logoutSession } from '../../lib/api';
import { passwordIssue } from '../../lib/password';
import { authError } from '../../lib/auth-errors';
import { setAppLocale, t } from '../../lib/i18n';
import { Shell } from '../../components/Shell';
import { PasswordField } from '../../components/PasswordField';

type Me = {
  phone: string;
  preferredLanguage: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  hasPassword?: boolean;
};

type Device = {
  deviceId: string;
  platform: string;
  lastSeenAt: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [pin, setPin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchMe().then((user) => {
      if (!user) {
        router.replace('/signin');
        return;
      }
      Promise.all([api<Me>('/me'), api<Device>('/me/device')])
        .then(([row, bound]) => {
          setMe(row);
          setFirstName(row.firstName ?? '');
          setLastName(row.lastName ?? '');
          setDevice(bound);
        })
        .catch((err: Error) => setError(err.message));
    });
  }, [router]);

  async function savePin(event: FormEvent) {
    event.preventDefault();
    setError('');
    await api('/auth/set-pin', { method: 'POST', body: JSON.stringify({ pin }) })
      .then(() => setPin(''))
      .catch((err: Error) => setError(err.message));
  }

  async function saveLanguage(language: 'ru' | 'tg' | 'en') {
    const updated = await api<Me>('/me', { method: 'PATCH', body: JSON.stringify({ preferredLanguage: language }) });
    setAppLocale(language);
    setMe(updated);
  }

  async function saveName(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const updated = await api<Me>('/me', {
        method: 'PATCH',
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      setMe(updated);
      setNotice(t('auth.name.saved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
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
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: me?.hasPassword ? currentPassword : undefined,
          password,
          passwordConfirm,
        }),
      });
      setCurrentPassword('');
      setPassword('');
      setPasswordConfirm('');
      setMe(me ? { ...me, hasPassword: true } : me);
      setNotice(t('auth.password.changed'));
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
      setError(authError(code, err instanceof Error ? err.message : 'failed'));
    }
  }

  async function downloadData() {
    setError('');
    try {
      const data = await api<Record<string, unknown>>('/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'meddonish-data.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    }
  }

  async function release() {
    await api('/me/device', { method: 'DELETE' });
    router.replace('/signin');
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/me/delete', { method: 'POST', body: JSON.stringify({ confirm: 'DELETE' }) });
      await logoutSession();
      router.replace('/account-deletion');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    }
  }

  return (
    <Shell>
      <section className="hero">
        <h1>{t('nav.profile')}</h1>
        <p>{me?.phone}</p>
      </section>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="login-ok">{notice}</p> : null}
      <form className="card form-card" onSubmit={(event) => void saveName(event)}>
        <label>
          {t('auth.firstName')}
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required />
        </label>
        <label>
          {t('auth.lastName')}
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required />
        </label>
        <button className="button" type="submit">{t('auth.saveName')}</button>
      </form>
      <form className="card form-card" onSubmit={(event) => void savePassword(event)}>
        {me?.hasPassword ? (
          <PasswordField
            label={t('auth.password.current')}
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            shown={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
          />
        ) : (
          <p>{t('auth.password.setHint')}</p>
        )}
        <PasswordField
          label={t('auth.password.next')}
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
          shown={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />
        <button className="button" type="submit">{t('admin.save')}</button>
      </form>
      <div className="card form-card">
        <p>{t('language.choose')}</p>
        {(['ru', 'tg', 'en'] as const).map((language) => (
          <button
            key={language}
            type="button"
            className="button"
            onClick={() => void saveLanguage(language)}
          >
            {t(`language.${language}`)}
          </button>
        ))}
      </div>
      <form className="card form-card" onSubmit={savePin}>
        <label>
          {t('auth.setPin')}
          <input type="password" value={pin} onChange={(event) => setPin(event.target.value)} minLength={4} required />
        </label>
        <button className="button" type="submit">{t('admin.save')}</button>
      </form>
      <div className="card form-card">
        <h2>{t('subscriber.device')}</h2>
        <p>{device?.deviceId} · {device?.platform}</p>
        <button type="button" className="button" onClick={() => void release()}>{t('subscriber.release')}</button>
      </div>
      <div className="card form-card">
        <h2>{t('account.export')}</h2>
        <p>{t('legal.privacy.export')}</p>
        <button type="button" className="button" onClick={() => void downloadData()}>{t('account.export')}</button>
      </div>
      <form className="card form-card" onSubmit={(event) => void deleteAccount(event)}>
        <h2>{t('account.delete')}</h2>
        <p>{t('account.delete.confirm')}</p>
        <label>
          DELETE
          <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} required />
        </label>
        <button className="button button-danger" type="submit" disabled={deleteConfirm !== 'DELETE'}>
          {t('account.delete')}
        </button>
      </form>
    </Shell>
  );
}

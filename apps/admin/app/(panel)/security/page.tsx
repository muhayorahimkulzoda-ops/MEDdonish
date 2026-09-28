'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminRequest } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Security = {
  totpEnabled: boolean;
  counts: Record<string, number>;
  events: {
    id: string;
    type: string;
    payload: unknown;
    ip: string | null;
    createdAt: string;
    phone: string | null;
  }[];
};

export default function SecurityPage() {
  const [data, setData] = useState<Security | null>(null);
  const [secret, setSecret] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [error, setError] = useState('');

  function reload() {
    return adminRequest<Security>('/admin/security').then(setData);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
  }, []);

  async function setup() {
    setError('');
    try {
      const result = await adminRequest<{ secret: string; otpauth: string }>('/admin/security/totp/setup', {
        method: 'POST',
      });
      setSecret(result.secret);
      setOtpauth(result.otpauth);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function submitTotp(event: FormEvent<HTMLFormElement>, path: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const totp = String(new FormData(form).get('totp') ?? '');
    setError('');
    try {
      await adminRequest(path, { method: 'POST', body: JSON.stringify({ totp }) });
      form.reset();
      setSecret('');
      setOtpauth('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <>
      <h1>{t('admin.security')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        <div className="muted">{t('admin.totp')}</div>
        <h2>{data?.totpEnabled ? t('admin.enabled') : t('admin.disabled')}</h2>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => void setup()}>
            {t('admin.totpSetup')}
          </button>
        </div>
        {otpauth ? (
          <p className="muted" style={{ marginTop: 12, wordBreak: 'break-all' }}>
            {otpauth}
            <br />
            {secret}
          </p>
        ) : null}
        {data && !data.totpEnabled ? (
          <form className="form section-block" onSubmit={(event) => void submitTotp(event, '/admin/security/totp/enable')}>
            <label>
              {t('admin.totpCode')}
              <input name="totp" inputMode="numeric" pattern="\d{6}" required maxLength={6} />
            </label>
            <button type="submit">{t('admin.totpEnable')}</button>
          </form>
        ) : (
          <form className="form section-block" onSubmit={(event) => void submitTotp(event, '/admin/security/totp/disable')}>
            <label>
              {t('admin.totpCode')}
              <input name="totp" inputMode="numeric" pattern="\d{6}" required maxLength={6} />
            </label>
            <button type="submit" className="danger">{t('admin.totpDisable')}</button>
          </form>
        )}
      </div>

      <div className="grid section-block">
        {Object.entries(data?.counts ?? {}).map(([type, count]) => (
          <div className="card" key={type}>
            <div className="muted">{type}</div>
            <h2>{count}</h2>
          </div>
        ))}
      </div>

      <div className="table-wrap section-block">
        <table>
          <thead>
            <tr>
              <th>{t('admin.event')}</th>
              <th>{t('admin.users')}</th>
              <th>{t('admin.ip')}</th>
            </tr>
          </thead>
          <tbody>
            {!data || data.events.length === 0 ? (
              <tr><td colSpan={3}>{t('admin.empty')}</td></tr>
            ) : data.events.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.type}
                  <div className="muted">{new Date(row.createdAt).toLocaleString()}</div>
                </td>
                <td>{row.phone ?? '—'}</td>
                <td>{row.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

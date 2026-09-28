'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, setToken } from '../../lib/api';
import { t } from '../../lib/i18n';
import { Shell } from '../../components/Shell';

export default function AccountDeletionPage() {
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/me/delete', { method: 'POST', body: JSON.stringify({ confirm: 'DELETE' }) });
      setToken(null);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    }
  }

  return (
    <Shell>
      <article className="legal">
        <h1>{t('legal.accountDeletion')}</h1>
        <p>{t('legal.accountDeletion.intro')}</p>
        <p>{t('legal.accountDeletion.how')}</p>
        <p>{t('legal.accountDeletion.keeps')}</p>
        {done ? <p>{t('account.delete.done')}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!done ? (
          <form className="card form-card" onSubmit={(event) => void submit(event)}>
            <label>
              {t('account.delete.confirm')}
              <input value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
            </label>
            <button className="button button-danger" type="submit" disabled={confirm !== 'DELETE'}>
              {t('account.delete')}
            </button>
          </form>
        ) : null}
      </article>
    </Shell>
  );
}

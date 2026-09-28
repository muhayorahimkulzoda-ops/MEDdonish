'use client';

import { useEffect, useState } from 'react';
import { adminRequest } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Check = { ok: boolean; ms?: number };

type Health = {
  status: string;
  uptimeSec: number;
  pendingVideoJobs: number;
  failedPayments24h: number;
  storage: { ok: boolean };
  checks: { postgres: Check; redis: Check };
  sms?: { provider: string; configured: boolean; failed24h: number };
  payments?: { provider: string; storeVerifyConfigured: boolean };
  drm?: { configured: boolean; cdn: boolean };
  integrity?: { secretConfigured: boolean; required: boolean };
};

export default function OpsPage() {
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminRequest<Health>('/admin/health')
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <h1>{t('admin.ops')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <div className="grid">
        <Stat label={t('admin.status')} value={data?.status} />
        <Stat label={t('admin.postgres')} value={data?.checks.postgres.ok ? `${data.checks.postgres.ms} ms` : 'down'} />
        <Stat label={t('admin.redis')} value={data?.checks.redis.ok ? `${data.checks.redis.ms} ms` : 'down'} />
        <Stat label={t('admin.storage')} value={data?.storage.ok ? t('admin.ready') : t('admin.failed')} />
        <Stat label={t('admin.videos')} value={data?.pendingVideoJobs} />
        <Stat label={t('admin.payments')} value={data?.failedPayments24h} />
        <Stat
          label={t('admin.sms')}
          value={data?.sms ? `${data.sms.provider} · ${data.sms.failed24h}` : '—'}
        />
        <Stat
          label={t('admin.payProvider')}
          value={data?.payments ? `${data.payments.provider}${data.payments.storeVerifyConfigured ? ' · store' : ''}` : '—'}
        />
        <Stat
          label={t('admin.drm')}
          value={data?.drm ? `${data.drm.configured ? t('admin.ready') : t('admin.failed')}${data.drm.cdn ? ' · CDN' : ''}` : '—'}
        />
        <Stat
          label={t('admin.integrity')}
          value={
            data?.integrity
              ? `${data.integrity.secretConfigured ? t('admin.ready') : t('admin.failed')}${data.integrity.required ? ' · required' : ''}`
              : '—'
          }
        />
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value?: number | string }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <h2>{value ?? '—'}</h2>
    </div>
  );
}

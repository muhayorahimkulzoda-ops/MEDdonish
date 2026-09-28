'use client';

import { useEffect, useState } from 'react';
import { adminRequest } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Analytics = {
  users: { total: number; active: number; new7d: number; new30d: number };
  entitlements: { active: number; expiring7d: number; expired: number };
  payments: {
    orders: number;
    paid: number;
    revenueMinor: number;
    conversion: number;
    bySource: { source: string; count: number; amountMinor: number }[];
  };
  learning: { finishedAttempts: number; failedAttempts: number; videoCompleted: number; questions: number };
  series: { date: string; users: number; paidOrders: number; revenueMinor: number }[];
  topCourses: { courseId: string; title: string; activeEntitlements: number; revenueMinor: number }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminRequest<Analytics>('/admin/analytics')
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (!data) return error ? <div className="error">{error}</div> : null;
  const maxPaid = Math.max(1, ...data.series.map((row) => row.paidOrders));

  return (
    <>
      <h1>{t('admin.analytics')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <div className="grid">
        <Stat label={t('admin.users')} value={data.users.total} />
        <Stat label={t('admin.newUsers')} value={data.users.new7d} />
        <Stat label={t('admin.subscriptions')} value={data.entitlements.active} />
        <Stat label={t('admin.expiring')} value={data.entitlements.expiring7d} />
        <Stat label={t('admin.revenue')} value={data.payments.revenueMinor / 100} />
        <Stat label={t('admin.conversion')} value={`${data.payments.paid}/${data.payments.orders}`} />
        <Stat label={t('admin.attempts')} value={data.learning.finishedAttempts} />
        <Stat label={t('admin.videoDone')} value={data.learning.videoCompleted} />
      </div>

      <div className="card section-block">
        <h2>{t('admin.payments')}</h2>
        <div className="bars">
          {data.series.map((row) => (
            <div key={row.date} className="bar-col" title={`${row.date}: ${row.paidOrders}`}>
              <div className="bar" style={{ height: `${Math.max(4, (row.paidOrders / maxPaid) * 100)}%` }} />
              <span>{row.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="table-wrap section-block">
        <table>
          <thead>
            <tr>
              <th>{t('admin.payments')}</th>
              <th>{t('admin.conversion')}</th>
              <th>{t('admin.revenue')}</th>
            </tr>
          </thead>
          <tbody>
            {data.payments.bySource.length === 0 ? (
              <tr><td colSpan={3}>{t('admin.empty')}</td></tr>
            ) : data.payments.bySource.map((row) => (
              <tr key={row.source}>
                <td>{row.source}</td>
                <td>{row.count}</td>
                <td>{(row.amountMinor / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap section-block">
        <table>
          <thead>
            <tr>
              <th>{t('admin.courses')}</th>
              <th>{t('admin.subscriptions')}</th>
              <th>{t('admin.revenue')}</th>
            </tr>
          </thead>
          <tbody>
            {data.topCourses.length === 0 ? (
              <tr><td colSpan={3}>{t('admin.empty')}</td></tr>
            ) : data.topCourses.map((row) => (
              <tr key={row.courseId}>
                <td>{row.title}</td>
                <td>{row.activeEntitlements}</td>
                <td>{(row.revenueMinor / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MessageKey } from '@meddonish/localization';
import { adminRequest } from '../../lib/api';
import { t } from '../../lib/i18n';

type Dashboard = {
  users: number;
  activeLast7Days: number;
  activeEntitlements: number;
  pendingPayments: number;
  expiringIn7Days: number;
  newQuestions: number;
  suspiciousEvents: number;
};

const CARDS: {
  key: MessageKey;
  field: keyof Dashboard;
  href: string;
  tone: string;
  icon: 'users' | 'active' | 'book' | 'card' | 'clock' | 'alert' | 'warn';
}[] = [
  { key: 'admin.dash.students', field: 'users', href: '/students/accounts', tone: 'blue', icon: 'users' },
  { key: 'admin.dash.active7', field: 'activeLast7Days', href: '/students/accounts', tone: 'green', icon: 'active' },
  { key: 'admin.dash.subscriptions', field: 'activeEntitlements', href: '/students/access', tone: 'purple', icon: 'book' },
  { key: 'admin.dash.pendingPay', field: 'pendingPayments', href: '/payments', tone: 'yellow', icon: 'card' },
  { key: 'admin.dash.expiring7', field: 'expiringIn7Days', href: '/students/access', tone: 'rose', icon: 'clock' },
  { key: 'admin.dash.newQuestions', field: 'newQuestions', href: '/questions', tone: 'cyan', icon: 'alert' },
  { key: 'admin.dash.suspicious', field: 'suspiciousEvents', href: '/security', tone: 'red', icon: 'warn' },
];

function DashIcon({ name }: { name: (typeof CARDS)[number]['icon'] }) {
  if (name === 'users') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3.1" />
        <circle cx="16.2" cy="9" r="2.4" />
        <path d="M3.8 18.6c.8-3.1 2.9-4.7 5.4-4.7s4.6 1.6 5.4 4.7" />
        <path d="M14.6 14.4c2.2-.2 3.9 1.1 4.6 3.8" />
      </svg>
    );
  }
  if (name === 'active') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8.2" r="3.2" />
        <path d="M6.2 18.4c.9-3 3-4.6 5.8-4.6s4.9 1.6 5.8 4.6" />
        <path d="M17.4 6.2v3.6M15.6 8h3.6" />
      </svg>
    );
  }
  if (name === 'book') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6.6c1.9-.9 4-.9 6 0v11.4c-2-.9-4.1-.9-6 0V6.6Z" />
        <path d="M13 6.6c1.9-.9 4-.9 6 0v11.4c-2-.9-4.1-.9-6 0V6.6Z" />
      </svg>
    );
  }
  if (name === 'card') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="6.2" width="17" height="11.6" rx="2.2" />
        <path d="M3.5 10.2h17" />
        <path d="M7 14.6h4.4" />
      </svg>
    );
  }
  if (name === 'clock') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" />
        <path d="M12 8.4v4.1l2.8 1.7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.6 3.8 18.8h16.4L12 4.6Z" />
      <path d="M12 10.2v4.2" />
      <circle cx="12" cy="16.6" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminRequest<Dashboard>('/admin/dashboard')
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section className="dash">
      <h1 className="dash-title">{t('admin.dashboard')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <div className="dash-grid">
        {CARDS.map((card) => (
          <Link className={`dash-card dash-${card.tone}`} href={card.href} key={card.key}>
            <span className="dash-icon">
              <DashIcon name={card.icon} />
            </span>
            <p className="dash-label">{t(card.key)}</p>
            <strong className="dash-value">{data ? data[card.field] ?? 0 : '—'}</strong>
            <span className="dash-hint">{t('admin.dash.clickWho')}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

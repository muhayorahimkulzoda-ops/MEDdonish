'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { adminRequest, getToken, getWebOrigin, markAdminSession, setToken } from '../../lib/api';
import { t } from '../../lib/i18n';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    adminRequest('/admin/me')
      .then(() => {
        markAdminSession(true);
        setReady(true);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  if (!ready) {
    return (
      <div className="login">
        <div className="form">
          <h1>{t('home.title')}</h1>
          <p className="muted">{t('admin.processing')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside>
        <div className="admin-brand">
          <h2>{t('home.title')}</h2>
          <p>{t('admin.title')}</p>
        </div>
        <AdminNav />
        <div className="admin-aside-actions">
          <a className="button" href={`${getWebOrigin()}/?from=admin`}>
            {t('admin.openWeb')}
          </a>
          <a className="button" href={`${getWebOrigin()}/login?from=admin`}>
            {t('admin.openSubscriber')}
          </a>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setToken(null);
              router.replace('/login');
            }}
          >
            {t('admin.logout')}
          </button>
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}

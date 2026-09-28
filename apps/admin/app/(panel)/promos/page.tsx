'use client';

import { t } from '../../../lib/i18n';

export default function PromosPage() {
  return (
    <>
      <h1>{t('admin.nav.promos')}</h1>
      <div className="card">
        <p className="muted">{t('admin.promos.empty')}</p>
      </div>
    </>
  );
}

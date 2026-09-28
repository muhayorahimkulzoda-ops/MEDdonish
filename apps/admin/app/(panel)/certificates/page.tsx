'use client';

import { t } from '../../../lib/i18n';

export default function CertificatesPage() {
  return (
    <>
      <h1>{t('admin.nav.certificates')}</h1>
      <div className="card">
        <p className="muted">{t('admin.certificates.empty')}</p>
      </div>
    </>
  );
}

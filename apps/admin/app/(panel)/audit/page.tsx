'use client';

import { useEffect, useState } from 'react';
import { adminRequest } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Row = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  ip: string | null;
  createdAt: string;
  adminEmail: string | null;
};

export default function AuditPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminRequest<{ items: Row[] }>('/admin/audit-logs')
      .then((data) => setItems(data.items))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <h1>{t('admin.audit')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('admin.action')}</th>
              <th>{t('admin.entity')}</th>
              <th>{t('admin.email')}</th>
              <th>{t('admin.ip')}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4}>{t('admin.empty')}</td></tr>
            ) : items.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.action}
                  <div className="muted">{new Date(row.createdAt).toLocaleString()}</div>
                </td>
                <td>
                  {row.entity}
                  <div className="muted">{row.entityId}</div>
                </td>
                <td>{row.adminEmail ?? '—'}</td>
                <td>{row.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

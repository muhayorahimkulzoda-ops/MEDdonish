'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminTable } from '../../../components/AdminTable';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useAdminToast } from '../../../components/AdminToast';
import { adminUpload, adminRequest } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Asset = { id: string; title: string; kind: string; mimeType: string; byteSize: number; createdAt: string };

export default function MediaPage() {
  const toast = useAdminToast();
  const [items, setItems] = useState<Asset[]>([]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [error, setError] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);

  function reload() {
    return adminRequest<Asset[]>(`/admin/media${query ? `?q=${encodeURIComponent(query)}` : ''}`).then(setItems);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      reload().catch((err: Error) => setError(err.message));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const rows = useMemo(() => items.filter((item) => (kind ? item.kind === kind : true)), [items, kind]);

  return (
    <>
      <div className="row">
        <h1>{t('admin.nav.media')}</h1>
        <label className="button">
          {t('admin.create')}
          <input
            type="file"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const body = new FormData();
              body.append('file', file);
              body.append('title', file.name);
              adminUpload('/admin/media', body)
                .then(() => {
                  toast(t('admin.saved'));
                  return reload();
                })
                .catch((err: Error) => setError(err.message));
            }}
          />
        </label>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="admin-filters">
        <label>{t('admin.media.search')}<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label>
          {t('admin.filter.category')}
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="" />
            <option value="image">{t('admin.media.images')}</option>
            <option value="pdf">{t('admin.media.pdf')}</option>
            <option value="attachment">Attachments</option>
          </select>
        </label>
      </div>
      <AdminTable
        rows={rows}
        columns={[
          { key: 'title', label: t('admin.nav.media'), render: (row) => row.title },
          { key: 'kind', label: t('admin.filter.category'), render: (row) => row.kind },
          { key: 'mime', label: 'MIME', render: (row) => row.mimeType },
          { key: 'updated', label: t('admin.filter.date'), render: (row) => new Date(row.createdAt).toLocaleDateString() },
        ]}
        actions={(row) => (
          <button type="button" className="danger" onClick={() => setRemoveId(row.id)}>{t('admin.delete')}</button>
        )}
      />
      <ConfirmDialog
        open={Boolean(removeId)}
        onCancel={() => setRemoveId(null)}
        onConfirm={() => {
          if (!removeId) return;
          adminRequest(`/admin/media/${removeId}`, { method: 'DELETE' })
            .then(() => {
              toast(t('admin.saved'));
              setRemoveId(null);
              return reload();
            })
            .catch((err: Error) => setError(err.message));
        }}
      />
    </>
  );
}

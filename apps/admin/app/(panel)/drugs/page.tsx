'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminTable } from '../../../components/AdminTable';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useAdminToast } from '../../../components/AdminToast';
import { Pagination } from '../../../components/AdminUi';
import { StatusBadge } from '../../../components/StatusBadge';
import { adminRequest } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Drug = {
  id: string;
  generic_name: string;
  brand_name?: string | null;
  drug_class?: string | null;
  status: string;
  updated_at: string;
};

export default function DrugsPage() {
  const toast = useAdminToast();
  const [items, setItems] = useState<Drug[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  function reload() {
    return adminRequest<Drug[]>('/admin/drugs').then(setItems);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const created = await adminRequest<{ id: string }>('/admin/drugs', {
        method: 'POST',
        body: JSON.stringify({
          generic_name: String(data.get('generic_name')),
          brand_name: String(data.get('brand_name') || '') || undefined,
          drug_class: String(data.get('drug_class') || '') || undefined,
          status: 'draft',
        }),
      });
      toast(t('admin.saved'));
      window.location.href = `/drugs/${created.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  const filtered = useMemo(() => items.filter((item) => (status ? item.status === status : true)), [items, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const rows = filtered.slice((page - 1) * 20, page * 20);

  return (
    <>
      <div className="row">
        <h1>{t('admin.nav.drugs')}</h1>
      </div>
      <p className="muted">{t('admin.drugs.disclaimer')}</p>
      {error ? <div className="error">{error}</div> : null}
      <form className="form" onSubmit={create}>
        <label>{t('admin.genericName')}<input name="generic_name" required lang="tg" /></label>
        <label>{t('admin.brandName')}<input name="brand_name" /></label>
        <label>{t('admin.drugClass')}<input name="drug_class" /></label>
        <button type="submit">{t('admin.create')}</button>
      </form>
      <div className="admin-filters">
        <label>
          {t('admin.filter.status')}
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="" />
            <option value="draft">{t('admin.draft')}</option>
            <option value="published">{t('admin.published')}</option>
            <option value="archived">{t('admin.archived')}</option>
          </select>
        </label>
      </div>
      <AdminTable
        rows={rows}
        columns={[
          { key: 'title', label: t('admin.genericName'), render: (row) => row.generic_name },
          { key: 'cat', label: t('admin.filter.category'), render: (row) => row.drug_class ?? '—' },
          { key: 'status', label: t('admin.status'), render: (row) => <StatusBadge status={row.status} /> },
          { key: 'updated', label: t('admin.filter.date'), render: (row) => new Date(row.updated_at).toLocaleDateString() },
        ]}
        actions={(row) => (
          <>
            <Link className="button" href={`/drugs/${row.id}`}>{t('admin.edit')}</Link>
            <button type="button" className="danger" onClick={() => setRemoveId(row.id)}>{t('admin.delete')}</button>
          </>
        )}
      />
      <Pagination page={page} pages={pages} onPage={setPage} />
      <ConfirmDialog
        open={Boolean(removeId)}
        onCancel={() => setRemoveId(null)}
        onConfirm={() => {
          if (!removeId) return;
          adminRequest(`/admin/drugs/${removeId}`, { method: 'DELETE' })
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

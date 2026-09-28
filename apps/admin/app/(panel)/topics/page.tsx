'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { AdminTable } from '../../../components/AdminTable';
import { Pagination } from '../../../components/AdminUi';
import { StatusBadge } from '../../../components/StatusBadge';
import { adminRequest, titleOf, type Translation } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Topic = {
  id: string;
  status: string;
  updatedAt: string;
  translations: Translation[];
  course: { id: string; translations: Translation[] };
  _count: { lessons: number };
};

export default function TopicsPage() {
  const [items, setItems] = useState<Topic[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    adminRequest<Topic[]>('/admin/topics')
      .then(setItems)
      .catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(
    () => items.filter((item) => (status ? item.status === status : true)),
    [items, status],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <div className="row">
        <h1>{t('admin.nav.topics')}</h1>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="admin-filters">
        <label>
          {t('admin.filter.status')}
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">{t('admin.filter.status')}</option>
            <option value="draft">{t('admin.draft')}</option>
            <option value="published">{t('admin.published')}</option>
            <option value="archived">{t('admin.archived')}</option>
          </select>
        </label>
      </div>
      <AdminTable
        rows={rows}
        columns={[
          { key: 'title', label: t('admin.nav.topics'), render: (row) => titleOf(row.translations) },
          { key: 'course', label: t('admin.nav.courses'), render: (row) => titleOf(row.course.translations) },
          { key: 'status', label: t('admin.status'), render: (row) => <StatusBadge status={row.status} /> },
          { key: 'updated', label: t('admin.filter.date'), render: (row) => new Date(row.updatedAt).toLocaleDateString() },
        ]}
        actions={(row) => (
          <Link className="button" href={`/courses/${row.course.id}`}>{t('admin.edit')}</Link>
        )}
      />
      <Pagination page={page} pages={pages} onPage={setPage} />
    </>
  );
}

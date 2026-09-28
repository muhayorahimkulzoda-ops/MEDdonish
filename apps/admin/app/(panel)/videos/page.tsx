'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminTable } from '../../../components/AdminTable';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Pagination } from '../../../components/AdminUi';
import { useAdminToast } from '../../../components/AdminToast';
import { adminRequest, titleOf, type Translation } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Video = {
  id: string;
  title?: string | null;
  status: string;
  durationSec?: number | null;
  language?: string | null;
  externalUrl?: string | null;
  lessonId: string;
  lesson: { translations: Translation[]; section: { course: { translations: Translation[] } } };
};

type LessonOption = { id: string; title: string };

export default function VideosPage() {
  const toast = useAdminToast();
  const [items, setItems] = useState<Video[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [error, setError] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  function reload() {
    return adminRequest<Video[]>('/admin/videos').then(setItems);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    adminRequest<LessonOption[]>('/admin/clinical/lessons').then(setLessons).catch(() => undefined);
  }, []);

  async function attachExternal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      await adminRequest(`/admin/lessons/${String(data.get('lessonId'))}/videos/external`, {
        method: 'POST',
        body: JSON.stringify({
          title: String(data.get('title')),
          externalUrl: String(data.get('externalUrl')),
          thumbnailUrl: String(data.get('thumbnailUrl') || '') || undefined,
          durationSec: Number(data.get('durationSec') || 0) || undefined,
          language: String(data.get('language') || 'tg'),
        }),
      });
      toast(t('admin.saved'));
      event.currentTarget.reset();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const rows = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page]);

  return (
    <>
      <h1>{t('admin.nav.videos')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <form className="form" onSubmit={attachExternal}>
        <p className="muted">{t('admin.externalVideo')}</p>
        <label>{t('admin.titleRu')}<input name="title" required /></label>
        <label>{t('admin.videoUrl')}<input name="externalUrl" required placeholder="https://" /></label>
        <label>{t('admin.thumbnail')}<input name="thumbnailUrl" /></label>
        <label>{t('admin.duration')}<input name="durationSec" type="number" min="0" /></label>
        <label>
          {t('admin.language')}
          <select name="language" defaultValue="tg">
            <option value="tg">TJ</option>
            <option value="ru">RU</option>
            <option value="en">EN</option>
          </select>
        </label>
        <label>
          {t('admin.nav.topics')}
          <select name="lessonId" required>
            <option value="">{t('admin.nav.topics')}</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
            ))}
          </select>
        </label>
        <button type="submit">{t('admin.create')}</button>
      </form>
      <AdminTable
        rows={rows}
        columns={[
          { key: 'title', label: t('admin.nav.videos'), render: (row) => row.title || row.id },
          { key: 'course', label: t('admin.nav.courses'), render: (row) => titleOf(row.lesson.section.course.translations) },
          { key: 'status', label: t('admin.status'), render: (row) => row.status },
          { key: 'lang', label: t('admin.language'), render: (row) => row.language ?? '—' },
        ]}
        actions={(row) => (
          <button type="button" className="danger" onClick={() => setRemoveId(row.id)}>{t('admin.delete')}</button>
        )}
      />
      <Pagination page={page} pages={pages} onPage={setPage} />
      <ConfirmDialog
        open={Boolean(removeId)}
        onCancel={() => setRemoveId(null)}
        onConfirm={() => {
          if (!removeId) return;
          adminRequest(`/admin/videos/${removeId}`, { method: 'DELETE' })
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

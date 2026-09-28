'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminTable } from '../../../components/AdminTable';
import { StatusBadge } from '../../../components/StatusBadge';
import { useAdminToast } from '../../../components/AdminToast';
import { adminRequest, adminUploadProgress, adminUploadPut, titleOf, type Translation } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type LessonOpt = { id: string; title: string; courseTitle: string };
type Item = {
  id: string;
  title: string;
  contentType: string;
  accessType: string;
  status: string;
  updatedAt: string;
  entityId: string;
  course?: { translations: Translation[] };
  lesson?: { translations: Translation[] };
  upload?: { id: string; byteSize: number; chunkSize: number };
};

const CHUNK = 8 * 1024 * 1024;

export default function MaterialsPage() {
  const toast = useAdminToast();
  const [items, setItems] = useState<Item[]>([]);
  const [lessons, setLessons] = useState<LessonOpt[]>([]);
  const [type, setType] = useState('');
  const [access, setAccess] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  function reload() {
    const query = new URLSearchParams();
    if (type) query.set('type', type);
    if (access) query.set('access', access === 'premium' ? 'paid' : access);
    if (status) query.set('status', status);
    return adminRequest<Item[]>(`/admin/materials?${query.toString()}`).then(setItems);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    adminRequest<LessonOpt[]>('/admin/materials/lessons').then(setLessons).catch(() => undefined);
  }, [type, access, status]);

  const rows = useMemo(() => items, [items]);

  async function uploadVideoChunks(videoId: string, file: File) {
    let offset = 0;
    while (offset < file.size) {
      const chunk = file.slice(offset, offset + CHUNK);
      const body = new FormData();
      body.append('chunk', chunk);
      body.append('offset', String(offset));
      await adminUploadPut(`/admin/videos/${videoId}/chunks`, body);
      offset += chunk.size;
      setProgress(Math.round((offset / file.size) * 100));
    }
    await adminRequest(`/admin/videos/${videoId}/complete`, { method: 'POST' });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const contentType = String(data.get('contentType'));
    const file = (form.elements.namedItem('file') as HTMLInputElement).files?.[0];
    setError('');
    setBusy(true);
    setProgress(0);
    try {
      if (contentType === 'video') {
        if (!file) throw new Error(t('admin.empty'));
        const created = await adminRequest<Item>('/admin/materials', {
          method: 'POST',
          body: JSON.stringify({
            title: String(data.get('title')),
            lessonId: String(data.get('lessonId')),
            contentType: 'video',
            accessType: String(data.get('accessType')),
            status: String(data.get('status')),
            originalName: file.name,
            byteSize: file.size,
            previewDurationSec: Number(data.get('previewDurationSec') || 0) || undefined,
          }),
        });
        const videoId = created.upload?.id ?? created.entityId;
        await uploadVideoChunks(videoId, file);
      } else {
        const body = new FormData();
        ['title', 'lessonId', 'contentType', 'accessType', 'status', 'previewPagesCount', 'demoQuestionsCount'].forEach((key) => {
          body.append(key, String(data.get(key) ?? ''));
        });
        if (file) body.append('file', file);
        await adminUploadProgress('/admin/materials', body, setProgress);
      }
      const preview = (form.elements.namedItem('preview') as HTMLInputElement).files?.[0];
      const thumb = (form.elements.namedItem('thumb') as HTMLInputElement).files?.[0];
      toast(t('admin.saved'));
      form.reset();
      await reload();
      const latest = (await adminRequest<Item[]>('/admin/materials'))[0];
      if (latest && preview) {
        const body = new FormData();
        body.append('file', preview);
        await adminUploadProgress(`/admin/materials/${latest.id}/preview`, body, setProgress);
      }
      if (latest && thumb) {
        const body = new FormData();
        body.append('file', thumb);
        await adminUploadProgress(`/admin/materials/${latest.id}/thumbnail`, body);
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>{t('admin.nav.materials')}</h1>
      <p className="muted">{t('admin.materials.lead')}</p>
      {error ? <div className="error">{error}</div> : null}

      <form className="form" onSubmit={(event) => void onSubmit(event)}>
        <label>
          {t('admin.lesson.name')}
          <input name="title" required />
        </label>
        <label>
          {t('admin.courses')}
          <select name="lessonId" required>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.courseTitle} · {lesson.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('admin.filter.category')}
          <select name="contentType" defaultValue="video">
            <option value="video">{t('admin.materials.uploadVideo')}</option>
            <option value="pdf">{t('admin.materials.uploadPdf')}</option>
            <option value="presentation">{t('admin.materials.uploadPresentation')}</option>
            <option value="test">{t('admin.materials.createTest')}</option>
          </select>
        </label>
        <label>
          {t('admin.materials.access')}
          <select name="accessType" defaultValue="paid">
            <option value="free">{t('admin.filter.free')}</option>
            <option value="paid">{t('admin.filter.premium')}</option>
            <option value="subscription">{t('admin.filter.premium')}</option>
          </select>
        </label>
        <label>
          {t('admin.status')}
          <select name="status" defaultValue="draft">
            <option value="draft">{t('admin.filter.draft')}</option>
            <option value="published">{t('admin.filter.published')}</option>
          </select>
        </label>
        <label>
          {t('admin.materials.previewPages')}
          <input name="previewPagesCount" type="number" min={0} defaultValue={0} />
        </label>
        <label>
          {t('admin.materials.demoQuestions')}
          <input name="demoQuestionsCount" type="number" min={0} defaultValue={0} />
        </label>
        <label>
          File
          <input name="file" type="file" accept="video/mp4,video/webm,video/quicktime,application/pdf" />
        </label>
        <label>
          {t('admin.materials.preview')}
          <input name="preview" type="file" />
        </label>
        <label>
          {t('admin.materials.thumb')}
          <input name="thumb" type="file" accept="image/png,image/jpeg,image/webp" />
        </label>
        {busy ? <p>{progress}%</p> : null}
        <button type="submit" disabled={busy}>{t('admin.save')}</button>
      </form>

      <div className="admin-filters">
        <label>
          {t('admin.filter.category')}
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="" />
            <option value="video">Video</option>
            <option value="presentation">Presentation</option>
            <option value="pdf">PDF</option>
            <option value="test">Test</option>
          </select>
        </label>
        <label>
          {t('admin.materials.access')}
          <select value={access} onChange={(event) => setAccess(event.target.value)}>
            <option value="" />
            <option value="free">{t('admin.filter.free')}</option>
            <option value="premium">{t('admin.filter.premium')}</option>
          </select>
        </label>
        <label>
          {t('admin.filter.status')}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="" />
            <option value="draft">{t('admin.filter.draft')}</option>
            <option value="published">{t('admin.filter.published')}</option>
          </select>
        </label>
      </div>

      <AdminTable
        rows={rows}
        columns={[
          { key: 'title', label: t('admin.lesson.name'), render: (row) => row.title },
          { key: 'type', label: t('admin.filter.category'), render: (row) => row.contentType },
          { key: 'access', label: t('admin.materials.access'), render: (row) => row.accessType },
          { key: 'course', label: t('admin.courses'), render: (row) => titleOf(row.course?.translations) },
          { key: 'status', label: t('admin.status'), render: (row) => <StatusBadge status={row.status} /> },
        ]}
      />
    </>
  );
}

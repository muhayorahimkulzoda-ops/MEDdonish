'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminRequest, titleOf, type Translation } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Preview = {
  total: number;
  valid: number;
  errors: string[];
};

type Job = {
  id: string;
  status: string;
  total: number;
  imported: number;
  errors: unknown;
};

type Question = {
  id: string;
  type: string;
  isActive: boolean;
  translations: { language: string; prompt: string }[];
  options: { code: string; isCorrect: boolean }[];
};

type Course = {
  id: string;
  translations: Translation[];
};

export default function QuestionsPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const [jsonText, setJsonText] = useState('');

  function reload() {
    return adminRequest<Question[]>('/admin/questions').then(setItems);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    adminRequest<Course[]>('/admin/courses').then(setCourses).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'failed') return;
    const timer = window.setInterval(() => {
      adminRequest<Job>(`/admin/questions/import/${job.id}`)
        .then((next) => {
          setJob(next);
          if (next.status === 'done' || next.status === 'failed') void reload();
        })
        .catch((err: Error) => setError(err.message));
    }, 800);
    return () => window.clearInterval(timer);
  }, [job]);

  function parseQuestions() {
    const parsed = JSON.parse(jsonText) as unknown;
    return Array.isArray(parsed) ? parsed : (parsed as { questions: unknown[] }).questions;
  }

  async function runPreview(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const result = await adminRequest<Preview>('/admin/questions/import/preview', {
        method: 'POST',
        body: JSON.stringify({ questions: parseQuestions() }),
      });
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      const created = await adminRequest<Job>('/admin/questions/import/confirm', {
        method: 'POST',
        body: JSON.stringify({
          questions: parseQuestions(),
          language: 'ru',
          courseId: String(data.get('courseId') || '') || undefined,
        }),
      });
      setJob(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <>
      <h1>{t('admin.questions')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <form className="form" onSubmit={runPreview}>
        <label>
          {t('admin.json')}
          <textarea name="json" value={jsonText} onChange={(event) => setJsonText(event.target.value)} />
        </label>
        <div className="actions">
          <button type="submit">{t('admin.importPreview')}</button>
        </div>
      </form>
      {preview ? (
        <div className="card section-block">
          <div>{t('admin.valid')}: {preview.valid} / {preview.total}</div>
          {preview.errors.length > 0 ? (
            <ul>
              {preview.errors.map((item) => <li key={item} className="error">{item}</li>)}
            </ul>
          ) : (
            <form className="form" onSubmit={confirm}>
              <label>
                {t('admin.courses')}
                <select name="courseId">
                  <option value="">—</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{titleOf(course.translations)}</option>
                  ))}
                </select>
              </label>
              <button type="submit">{t('admin.importConfirm')}</button>
            </form>
          )}
        </div>
      ) : null}
      {job ? (
        <div className="card section-block">
          {t('admin.importJob')}: {job.status} — {job.imported}/{job.total}
        </div>
      ) : null}
      <div className="table-wrap section-block">
        <table>
          <thead>
            <tr>
              <th>{t('admin.questions')}</th>
              <th>{t('admin.status')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={3}>{t('admin.empty')}</td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td>{item.translations[0]?.prompt ?? item.id}</td>
                <td><span className="badge">{item.type}</span></td>
                <td>{item.options.filter((option) => option.isCorrect).map((option) => option.code).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

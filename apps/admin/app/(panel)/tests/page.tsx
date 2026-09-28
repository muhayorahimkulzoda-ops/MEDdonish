'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { adminRequest, titleOf, type Translation } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type TestRow = {
  id: string;
  title: string;
  mode: string;
  questionCount: number;
  timePerQuestion: number;
  isActive: boolean;
  _count: { pool: number; attempts: number };
  course?: { translations: Translation[] };
};

type Course = { id: string; translations: Translation[] };

export default function TestsPage() {
  const [items, setItems] = useState<TestRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');

  function reload() {
    return adminRequest<TestRow[]>('/admin/tests').then(setItems);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    adminRequest<Course[]>('/admin/courses').then(setCourses).catch(() => undefined);
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    try {
      await adminRequest('/admin/tests', {
        method: 'POST',
        body: JSON.stringify({
          title: String(data.get('title')),
          mode: String(data.get('mode')),
          questionCount: Number(data.get('questionCount') || 30),
          timePerQuestion: Number(data.get('timePerQuestion') || 20),
          courseId: String(data.get('courseId') || '') || undefined,
        }),
      });
      form.reset();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <>
      <h1>{t('admin.tests')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <form className="form" onSubmit={create}>
        <label>{t('admin.titleRu')}<input name="title" required /></label>
        <label>
          {t('admin.mode')}
          <select name="mode" defaultValue="TRAINING">
            <option value="TRAINING">{t('admin.training')}</option>
            <option value="EXAM">{t('admin.exam')}</option>
          </select>
        </label>
        <label>{t('admin.questionCount')}<input name="questionCount" type="number" defaultValue={30} /></label>
        <label>20 {t('admin.seconds')}<input name="timePerQuestion" type="number" defaultValue={20} /></label>
        <label>
          {t('admin.courses')}
          <select name="courseId">
            <option value="">—</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{titleOf(course.translations)}</option>
            ))}
          </select>
        </label>
        <button type="submit">{t('admin.newTest')}</button>
      </form>
      <div className="table-wrap section-block">
        <table>
          <thead>
            <tr>
              <th>{t('admin.tests')}</th>
              <th>{t('admin.mode')}</th>
              <th>{t('admin.pool')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4}>{t('admin.empty')}</td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.mode}</td>
                <td>{item._count.pool}</td>
                <td><Link href={`/tests/${item.id}`}>{t('admin.open')}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

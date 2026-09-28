'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminRequest, titleOf, type Translation } from '../../../../lib/api';
import { t } from '../../../../lib/i18n';

type Discipline = { id: string; translations: Translation[] };

export default function NewCoursePage() {
  const router = useRouter();
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminRequest<Discipline[]>('/admin/disciplines').then(setDisciplines).catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      const course = await adminRequest<{ id: string }>('/admin/courses', {
        method: 'POST',
        body: JSON.stringify({
          disciplineId: String(data.get('disciplineId')),
          slug: String(data.get('slug')),
          instructor: String(data.get('instructor') || ''),
          coverUrl: String(data.get('coverUrl') || '') || undefined,
          status: String(data.get('status')),
          translations: [
            {
              language: 'ru',
              title: String(data.get('titleRu')),
              description: String(data.get('description') || ''),
            },
            {
              language: 'tg',
              title: String(data.get('titleTg') || data.get('titleRu')),
              description: String(data.get('description') || ''),
            },
          ],
          prices: [
            { planCode: 'month_1', amountMinor: Math.round(Number(data.get('price1')) * 100), currency: 'TJS' },
            { planCode: 'month_5', amountMinor: Math.round(Number(data.get('price5')) * 100), currency: 'TJS' },
            { planCode: 'year_1', amountMinor: Math.round(Number(data.get('price12')) * 100), currency: 'TJS' },
          ],
        }),
      });
      router.replace(`/courses/${course.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <>
      <h1>{t('admin.newCourse')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <form className="form" onSubmit={onSubmit}>
        <label>
          {t('admin.disciplines')}
          <select name="disciplineId" required>
            <option value="">{t('admin.disciplines')}</option>
            {disciplines.map((item) => (
              <option key={item.id} value={item.id}>{titleOf(item.translations)}</option>
            ))}
          </select>
        </label>
        <label>{t('admin.titleRu')}<input name="titleRu" required /></label>
        <label>{t('admin.titleTg')}<input name="titleTg" /></label>
        <label>{t('admin.slug')}<input name="slug" placeholder="osteology" required /></label>
        <label>{t('admin.description')}<textarea name="description" /></label>
        <label>{t('admin.instructor')}<input name="instructor" /></label>
        <label>{t('admin.cover')}<input name="coverUrl" /></label>
        <label>{t('admin.priceMonth1')}<input name="price1" type="number" min="0" step="0.01" required /></label>
        <label>{t('admin.priceMonth5')}<input name="price5" type="number" min="0" step="0.01" required /></label>
        <label>{t('admin.priceYear1')}<input name="price12" type="number" min="0" step="0.01" required /></label>
        <label>
          {t('admin.status')}
          <select name="status" defaultValue="draft">
            <option value="draft">{t('admin.draft')}</option>
            <option value="published">{t('admin.publish')}</option>
          </select>
        </label>
        <button type="submit">{t('admin.create')}</button>
      </form>
    </>
  );
}

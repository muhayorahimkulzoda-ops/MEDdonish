'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { adminRequest, titleOf, type Translation } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type LessonOption = { id: string; title: string };

type Row = {
  type: 'simple' | 'interactive';
  id: string;
  title: string;
  lesson?: { translations: Translation[] };
};

export default function ClinicalPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [error, setError] = useState('');

  function reload() {
    return adminRequest<Row[]>('/admin/clinical').then(setItems);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    adminRequest<LessonOption[]>('/admin/clinical/lessons')
      .then(setLessons)
      .catch(() => undefined);
  }, []);

  async function createSimple(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    try {
      await adminRequest('/admin/situational-tasks', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: String(data.get('lessonId')),
          title: String(data.get('title')),
          vignette: String(data.get('vignette')),
          questions: [
            {
              prompt: String(data.get('prompt')),
              options: [
                { id: 'A', text: String(data.get('optA')) },
                { id: 'B', text: String(data.get('optB')) },
                { id: 'C', text: String(data.get('optC')) },
                { id: 'D', text: String(data.get('optD')) },
              ],
              correct: String(data.get('correct')),
              explanation: String(data.get('explanation') || ''),
            },
          ],
        }),
      });
      form.reset();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    try {
      const created = await adminRequest<{ id: string }>('/admin/clinical-cases', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: String(data.get('lessonId')),
          title: String(data.get('title')),
          patientAge: Number(data.get('patientAge') || 0) || undefined,
          patientSex: String(data.get('patientSex') || '') || undefined,
          complaints: String(data.get('complaints') || '') || undefined,
          steps: [
            { title: String(data.get('stepTitle') || t('admin.steps')), body: String(data.get('stepBody') || '') },
          ],
        }),
      });
      form.reset();
      window.location.href = `/clinical/cases/${created.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <>
      <h1>{t('admin.clinical')}</h1>
      <p className="muted">{t('admin.deidentified')}</p>
      {error ? <div className="error">{error}</div> : null}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <form className="form" onSubmit={createSimple}>
          <h2>{t('admin.newSimpleCase')}</h2>
          <LessonSelect lessons={lessons} />
          <label>{t('admin.titleRu')}<input name="title" required /></label>
          <label>{t('admin.vignette')}<textarea name="vignette" required /></label>
          <label>{t('admin.questions')}<input name="prompt" required /></label>
          <label>A<input name="optA" required /></label>
          <label>B<input name="optB" required /></label>
          <label>C<input name="optC" required /></label>
          <label>D<input name="optD" required /></label>
          <label>{t('admin.correct')}<input name="correct" defaultValue="A" required /></label>
          <label>{t('admin.description')}<textarea name="explanation" /></label>
          <button type="submit">{t('admin.create')}</button>
        </form>

        <form className="form" onSubmit={createCase}>
          <h2>{t('admin.newClinicalCase')}</h2>
          <LessonSelect lessons={lessons} />
          <label>{t('admin.titleRu')}<input name="title" required /></label>
          <label>{t('admin.patientAge')}<input name="patientAge" type="number" /></label>
          <label>{t('admin.patientSex')}<input name="patientSex" /></label>
          <label>{t('admin.complaints')}<textarea name="complaints" /></label>
          <label>{t('admin.steps')}<input name="stepTitle" /></label>
          <label><textarea name="stepBody" /></label>
          <button type="submit">{t('admin.create')}</button>
        </form>
      </div>

      <div className="table-wrap section-block">
        <table>
          <thead>
            <tr>
              <th>{t('admin.clinical')}</th>
              <th>{t('admin.mode')}</th>
              <th>{t('admin.lessons')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4}>{t('admin.empty')}</td></tr>
            ) : items.map((item) => (
              <tr key={`${item.type}-${item.id}`}>
                <td>{item.title}</td>
                <td>{item.type === 'simple' ? t('admin.simpleCase') : t('admin.interactiveCase')}</td>
                <td>{titleOf(item.lesson?.translations)}</td>
                <td>
                  {item.type === 'simple' ? (
                    <Link href={`/clinical/tasks/${item.id}/play`}>{t('admin.tryCase')}</Link>
                  ) : (
                    <Link href={`/clinical/cases/${item.id}`}>{t('admin.open')}</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LessonSelect({ lessons }: { lessons: LessonOption[] }) {
  return (
    <label>
      {t('admin.lessons')}
      <select name="lessonId" required>
        <option value="">{t('admin.empty')}</option>
        {lessons.map((lesson) => (
          <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
        ))}
      </select>
    </label>
  );
}

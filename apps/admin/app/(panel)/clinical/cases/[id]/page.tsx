'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE, adminRequest, adminUpload } from '../../../../../lib/api';
import { t } from '../../../../../lib/i18n';

type Case = {
  id: string;
  title: string;
  patientAge?: number | null;
  patientSex?: string | null;
  complaints?: string | null;
  history?: string | null;
  examination?: string | null;
  laboratory?: string | null;
  instrumental?: string | null;
  diagnosis?: string | null;
  differential?: string | null;
  discussion?: string | null;
  conclusion?: string | null;
  steps: { id?: string; title: string; body: string; sortOrder: number }[];
  media: { id: string; kind: string; caption?: string | null }[];
};

export default function ClinicalCaseEditorPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Case | null>(null);
  const [error, setError] = useState('');

  function reload() {
    return adminRequest<Case>(`/admin/clinical-cases/${params.id}`).then(setItem);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
  }, [params.id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) return;
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      await adminRequest(`/admin/clinical-cases/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: String(data.get('title')),
          patientAge: Number(data.get('patientAge') || 0) || undefined,
          patientSex: String(data.get('patientSex') || '') || undefined,
          complaints: String(data.get('complaints') || '') || undefined,
          history: String(data.get('history') || '') || undefined,
          examination: String(data.get('examination') || '') || undefined,
          laboratory: String(data.get('laboratory') || '') || undefined,
          instrumental: String(data.get('instrumental') || '') || undefined,
          diagnosis: String(data.get('diagnosis') || '') || undefined,
          differential: String(data.get('differential') || '') || undefined,
          discussion: String(data.get('discussion') || '') || undefined,
          conclusion: String(data.get('conclusion') || '') || undefined,
          steps: item.steps.map((step, index) => ({
            title: String(data.get(`stepTitle-${index}`) || step.title),
            body: String(data.get(`stepBody-${index}`) || step.body),
            sortOrder: index,
          })),
        }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function addStep() {
    setItem((current) =>
      current
        ? { ...current, steps: [...current.steps, { title: '', body: '', sortOrder: current.steps.length }] }
        : current,
    );
  }

  async function uploadImage(file: File) {
    if (!item) return;
    const body = new FormData();
    body.append('file', file);
    body.append('caption', file.name);
    await adminUpload(`/admin/clinical-cases/${item.id}/media`, body);
    await reload();
  }

  async function openImage(id: string) {
    const session = await adminRequest<{ viewUrl: string }>(`/admin/clinical-media/${id}/view-session`, {
      method: 'POST',
    });
    window.open(`${API_BASE.replace(/\/api\/v1$/, '')}${session.viewUrl}`, '_blank');
  }

  if (!item) return error ? <div className="error">{error}</div> : null;

  return (
    <>
      <div className="row">
        <h1>{item.title}</h1>
        <Link className="button" href={`/clinical/cases/${item.id}/play`}>{t('admin.tryCase')}</Link>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <p className="muted">{t('admin.deidentified')}</p>
      <form className="form" onSubmit={save}>
        <label>{t('admin.titleRu')}<input name="title" defaultValue={item.title} /></label>
        <label>{t('admin.patientAge')}<input name="patientAge" type="number" defaultValue={item.patientAge ?? ''} /></label>
        <label>{t('admin.patientSex')}<input name="patientSex" defaultValue={item.patientSex ?? ''} /></label>
        <label>{t('admin.complaints')}<textarea name="complaints" defaultValue={item.complaints ?? ''} /></label>
        <label>{t('admin.history')}<textarea name="history" defaultValue={item.history ?? ''} /></label>
        <label>{t('admin.examination')}<textarea name="examination" defaultValue={item.examination ?? ''} /></label>
        <label>{t('admin.laboratory')}<textarea name="laboratory" defaultValue={item.laboratory ?? ''} /></label>
        <label>{t('admin.instrumental')}<textarea name="instrumental" defaultValue={item.instrumental ?? ''} /></label>
        <label>{t('admin.diagnosis')}<textarea name="diagnosis" defaultValue={item.diagnosis ?? ''} /></label>
        <label>{t('admin.differential')}<textarea name="differential" defaultValue={item.differential ?? ''} /></label>
        <label>{t('admin.discussion')}<textarea name="discussion" defaultValue={item.discussion ?? ''} /></label>
        <label>{t('admin.conclusion')}<textarea name="conclusion" defaultValue={item.conclusion ?? ''} /></label>
        <h2>{t('admin.steps')}</h2>
        {item.steps.map((step, index) => (
          <div className="card section-block" key={`${step.id ?? 'new'}-${index}`}>
            <label>{t('admin.titleRu')}<input name={`stepTitle-${index}`} defaultValue={step.title} /></label>
            <label><textarea name={`stepBody-${index}`} defaultValue={step.body} /></label>
          </div>
        ))}
        <div className="actions">
          <button type="button" className="secondary" onClick={() => void addStep()}>{t('admin.addStep')}</button>
          <button type="submit">{t('admin.save')}</button>
        </div>
      </form>
      <div className="card section-block">
        <label className="button">
          {t('admin.uploadImage')}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadImage(file).catch((err: Error) => setError(err.message));
            }}
          />
        </label>
        {item.media.map((media) => (
          <div key={media.id} className="lesson-row">
            <span>{media.caption ?? media.id}</span>
            <button className="secondary" onClick={() => void openImage(media.id)}>{t('admin.open')}</button>
          </div>
        ))}
      </div>
    </>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_BASE, adminRequest } from '../../../../../../lib/api';
import { t } from '../../../../../../lib/i18n';

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
  steps: { title: string; body: string }[];
  media: { id: string; caption?: string | null }[];
};

export default function ClinicalPlayPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Case | null>(null);
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminRequest<Case>(`/admin/clinical-cases/${params.id}`)
      .then(setItem)
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  async function openImage(id: string) {
    const session = await adminRequest<{ viewUrl: string }>(`/admin/clinical-media/${id}/view-session`, {
      method: 'POST',
    });
    window.open(`${API_BASE.replace(/\/api\/v1$/, '')}${session.viewUrl}`, '_blank');
  }

  if (error) return <div className="error">{error}</div>;
  if (!item) return null;

  const current = item.steps[step];
  const last = step >= item.steps.length - 1;

  return (
    <div className="player">
      <div className="muted">{item.title}</div>
      <p className="muted">
        {[item.patientAge ? `${item.patientAge}` : null, item.patientSex].filter(Boolean).join(', ')}
      </p>
      {item.complaints ? <p><b>{t('admin.complaints')}:</b> {item.complaints}</p> : null}
      {item.history ? <p><b>{t('admin.history')}:</b> {item.history}</p> : null}
      {item.examination ? <p><b>{t('admin.examination')}:</b> {item.examination}</p> : null}
      {item.laboratory ? <p><b>{t('admin.laboratory')}:</b> {item.laboratory}</p> : null}
      {item.instrumental ? <p><b>{t('admin.instrumental')}:</b> {item.instrumental}</p> : null}
      {current ? (
        <div className="card">
          <div className="muted">{step + 1} / {item.steps.length}</div>
          <h2>{current.title}</h2>
          <p>{current.body}</p>
        </div>
      ) : null}
      <div className="actions">
        {item.media.map((media) => (
          <button key={media.id} className="secondary" onClick={() => void openImage(media.id)}>
            {media.caption ?? t('admin.uploadImage')}
          </button>
        ))}
        {!last ? (
          <button onClick={() => setStep((value) => value + 1)}>{t('admin.next')}</button>
        ) : (
          <button onClick={() => setRevealed(true)}>{t('admin.reveal')}</button>
        )}
      </div>
      {revealed ? (
        <div className="card section-block">
          {item.diagnosis ? <p><b>{t('admin.diagnosis')}:</b> {item.diagnosis}</p> : null}
          {item.differential ? <p><b>{t('admin.differential')}:</b> {item.differential}</p> : null}
          {item.discussion ? <p><b>{t('admin.discussion')}:</b> {item.discussion}</p> : null}
          {item.conclusion ? <p><b>{t('admin.conclusion')}:</b> {item.conclusion}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getToken, mediaUrl } from '../../../../lib/api';
import { t } from '../../../../lib/i18n';
import { Shell } from '../../../../components/Shell';

type Case = {
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

export default function LearnCasePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Case | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api<Case>(`/clinical-cases/${params.id}`)
      .then(setItem)
      .catch((err: Error) => setError(err.message));
  }, [params.id, router]);

  async function reveal() {
    const opened = await api<Case>(`/clinical-cases/${params.id}/complete`, { method: 'POST' });
    setItem(opened);
  }

  async function openImage(id: string) {
    const session = await api<{ viewUrl: string }>(`/clinical-media/${id}/view-session`, { method: 'POST' });
    window.open(mediaUrl(session.viewUrl), '_blank');
  }

  const current = item?.steps[step];
  const last = item ? step >= item.steps.length - 1 : true;

  return (
    <Shell>
      <a href="/courses">{t('nav.courses')}</a>
      {error ? <p className="error">{error}</p> : null}
      {item ? (
        <>
          <section className="hero">
            <h1>{item.title}</h1>
            <p>{[item.patientAge, item.patientSex].filter(Boolean).join(', ')}</p>
          </section>
          {item.complaints ? <p>{item.complaints}</p> : null}
          {item.history ? <p>{item.history}</p> : null}
          {item.examination ? <p>{item.examination}</p> : null}
          {current ? (
            <div className="card">
              <p className="muted">{step + 1} / {item.steps.length}</p>
              <h2>{current.title}</h2>
              <p>{current.body}</p>
            </div>
          ) : null}
          <div className="actions">
            {item.media.map((media) => (
              <button key={media.id} type="button" className="button" onClick={() => void openImage(media.id)}>
                {media.caption ?? t('lesson.clinical')}
              </button>
            ))}
            {!last ? (
              <button type="button" className="button" onClick={() => setStep((value) => value + 1)}>{t('test.next')}</button>
            ) : !item.diagnosis ? (
              <button type="button" className="button" onClick={() => void reveal()}>{t('clinical.reveal')}</button>
            ) : null}
          </div>
          {item.diagnosis ? (
            <div className="card form-card">
              <p><b>{t('clinical.diagnosis')}</b>: {item.diagnosis}</p>
              {item.differential ? <p>{item.differential}</p> : null}
              {item.discussion ? <p>{item.discussion}</p> : null}
              {item.conclusion ? <p>{item.conclusion}</p> : null}
            </div>
          ) : null}
        </>
      ) : null}
    </Shell>
  );
}

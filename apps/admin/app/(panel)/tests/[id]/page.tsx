'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminRequest } from '../../../../lib/api';
import { t } from '../../../../lib/i18n';

type Test = {
  id: string;
  title: string;
  mode: string;
  questionCount: number;
  timePerQuestion: number;
  pool: { question: { translations: { prompt: string }[] } }[];
  _count: { attempts: number };
};

export default function TestDetailPage() {
  const params = useParams<{ id: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminRequest<Test>(`/admin/tests/${params.id}`)
      .then(setTest)
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  if (!test) return error ? <div className="error">{error}</div> : null;

  return (
    <>
      <div className="row">
        <h1>{test.title}</h1>
        <Link className="button" href={`/tests/${test.id}/play`}>{t('admin.tryTest')}</Link>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        <div className="muted">{t('admin.mode')}: {test.mode}</div>
        <div className="muted">{t('admin.questionCount')}: {test.questionCount}</div>
        <div className="muted">{t('admin.pool')}: {test.pool.length}</div>
        <div className="muted">{test.timePerQuestion} {t('admin.seconds')}</div>
      </div>
      <div className="table-wrap section-block">
        <table>
          <thead>
            <tr><th>{t('admin.questions')}</th></tr>
          </thead>
          <tbody>
            {test.pool.map((item, index) => (
              <tr key={`${item.question.translations[0]?.prompt}-${index}`}>
                <td>{item.question.translations[0]?.prompt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

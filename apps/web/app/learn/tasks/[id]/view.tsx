'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getToken } from '../../../../lib/api';
import { t } from '../../../../lib/i18n';
import { Shell } from '../../../../components/Shell';

type Task = {
  title: string;
  vignette: string;
  questions: { prompt: string; options: { id: string; text: string }[] }[];
};

type Result = {
  correctCount: number;
  questionCount: number;
  items: { index: number; correct: boolean; explanation: string | null }[];
};

export default function LearnTaskPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [selected, setSelected] = useState<string[][]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api<Task>(`/situational-tasks/${params.id}`)
      .then((item) => {
        setTask(item);
        setSelected(item.questions.map(() => []));
      })
      .catch((err: Error) => setError(err.message));
  }, [params.id, router]);

  async function submit() {
    if (!task) return;
    const payload = await api<Result>(`/situational-tasks/${params.id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ selected }),
    });
    setResult(payload);
  }

  return (
    <Shell>
      <a href="/courses">{t('nav.courses')}</a>
      {error ? <p className="error">{error}</p> : null}
      {task ? (
        <>
          <section className="hero">
            <h1>{task.title}</h1>
            <p>{task.vignette}</p>
          </section>
          {task.questions.map((question, index) => (
            <div className="card form-card" key={question.prompt}>
              <h2>{question.prompt}</h2>
              <div className="options">
                {question.options.map((option) => {
                  const marked = selected[index]?.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`option ${marked ? 'selected' : ''}`}
                      onClick={() => {
                        setSelected((current) => current.map((row, rowIndex) => (
                          rowIndex === index ? (marked ? row.filter((id) => id !== option.id) : [...row, option.id]) : row
                        )));
                      }}
                    >
                      {option.text}
                    </button>
                  );
                })}
              </div>
              {result ? (
                <p className="muted">
                  {result.items[index]?.correct ? t('test.correct') : t('test.wrong')}
                  {result.items[index]?.explanation ? ` — ${result.items[index]?.explanation}` : ''}
                </p>
              ) : null}
            </div>
          ))}
          {!result ? <button className="button" type="button" onClick={() => void submit()}>{t('admin.finish')}</button> : (
            <p>{result.correctCount} / {result.questionCount}</p>
          )}
        </>
      ) : null}
    </Shell>
  );
}

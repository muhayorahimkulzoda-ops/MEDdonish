'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminRequest } from '../../../../../../lib/api';
import { t } from '../../../../../../lib/i18n';

type Task = {
  id: string;
  title: string;
  vignette: string;
  questions: {
    prompt: string;
    options: { id: string; text: string }[];
    correct?: string | string[];
    explanation?: string | null;
  }[];
};

type Result = {
  correctCount: number;
  questionCount: number;
  items: { index: number; correct: boolean; correctCodes: string[]; explanation: string | null }[];
};

export default function SimpleCasePlayPage() {
  const params = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [selected, setSelected] = useState<string[][]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminRequest<Task>(`/admin/situational-tasks/${params.id}`)
      .then((item) => {
        setTask(item);
        setSelected(item.questions.map(() => []));
      })
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  async function submit() {
    if (!task) return;
    const payload = await adminRequest<Result>(`/admin/situational-tasks/${task.id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ selected }),
    }).catch(() => null);
    if (payload) {
      setResult(payload);
      return;
    }
    const items = task.questions.map((question, index) => {
      const correct = Array.isArray(question.correct) ? question.correct : [question.correct ?? ''];
      const chosen = selected[index] ?? [];
      return {
        index,
        correct: chosen.length === correct.length && [...chosen].sort().join('|') === [...correct].sort().join('|'),
        correctCodes: correct,
        explanation: question.explanation ?? null,
      };
    });
    setResult({
      correctCount: items.filter((item) => item.correct).length,
      questionCount: items.length,
      items,
    });
  }

  if (error) return <div className="error">{error}</div>;
  if (!task) return null;

  return (
    <div className="player">
      <h1>{task.title}</h1>
      <p>{task.vignette}</p>
      {task.questions.map((question, index) => (
        <div className="card section-block" key={question.prompt}>
          <h2>{question.prompt}</h2>
          <div className="options">
            {question.options.map((option) => {
              const marked = selected[index]?.includes(option.id);
              const item = result?.items[index];
              const isCorrect = item?.correctCodes.includes(option.id);
              const isWrong = Boolean(item && marked && !isCorrect);
              return (
                <button
                  key={option.id}
                  className={`option ${marked ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                  disabled={Boolean(result)}
                  onClick={() => {
                    setSelected((current) => {
                      const next = current.map((row) => [...row]);
                      next[index] = [option.id];
                      return next;
                    });
                  }}
                >
                  {option.id}. {option.text}
                </button>
              );
            })}
          </div>
          {result?.items[index]?.explanation ? (
            <div className="muted">{result.items[index].explanation}</div>
          ) : null}
        </div>
      ))}
      {result ? (
        <div className="card">{result.correctCount} / {result.questionCount}</div>
      ) : (
        <button onClick={() => void submit()}>{t('admin.finish')}</button>
      )}
    </div>
  );
}

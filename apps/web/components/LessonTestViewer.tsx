'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { t, useLocale } from '../lib/i18n';
import { BrandMark } from './BrandMark';

type Question = {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
};

type Quiz = {
  title: string;
  questionCount: number;
  questions: Question[];
};

type Grade = {
  correctCount: number;
  questionCount: number;
  percent: number;
  grade: 5 | 4 | 3 | 'failed';
};

type Props = {
  lessonId: string;
  onClose: () => void;
};

export function LessonTestViewer({ lessonId, onClose }: Props) {
  const locale = useLocale();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Grade | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    api<Quiz>(`/public/lessons/${lessonId}/test?lang=${locale}`)
      .then((payload) => {
        setQuiz(payload);
        setIndex(0);
        setSelected('');
        setAnswers({});
        setResult(null);
      })
      .catch((err: Error) => setError(err.message));
  }, [lessonId, locale]);

  const question = quiz?.questions[index];
  const last = Boolean(quiz && index >= quiz.questions.length - 1);

  async function goNext() {
    if (!quiz || !question || !selected || busy) return;
    const nextAnswers = { ...answers, [question.id]: selected };
    setAnswers(nextAnswers);
    if (!last) {
      setIndex((value) => value + 1);
      setSelected(nextAnswers[quiz.questions[index + 1]?.id] ?? '');
      return;
    }
    setBusy(true);
    try {
      const grade = await api<Grade>(`/public/lessons/${lessonId}/test/grade`, {
        method: 'POST',
        body: JSON.stringify({
          answers: quiz.questions.map((item) => ({
            questionId: item.id,
            selectedCode: nextAnswers[item.id] ?? '',
          })),
        }),
      });
      setResult(grade);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pdf-viewer" role="dialog" aria-modal="true" aria-label={t('lesson.test')}>
      <div className="pdf-viewer-bar">
        <h2>{quiz?.title || t('lesson.test')}</h2>
        <button type="button" className="pdf-viewer-close" onClick={onClose} aria-label={t('lesson.closePdf')}>
          ×
        </button>
      </div>
      <div className="pdf-viewer-body">
        {error ? <p className="error">{error}</p> : null}
        {result ? (
          <article className="test-sheet">
            <p className="pdf-notes-kicker">
              <BrandMark />
            </p>
            <h3>{t('test.result.title')}</h3>
            <p className="test-grade">
              {result.grade === 'failed' ? t('test.result.failed') : t('test.result.grade', { grade: result.grade })}
            </p>
            <p>{t('test.result.score', { correct: result.correctCount, total: result.questionCount })}</p>
            <ul className="test-scale">
              <li>28–30 — 5</li>
              <li>24–27 — 4</li>
              <li>15–23 — 3</li>
              <li>0–14 — {t('test.result.failed')}</li>
            </ul>
            <button className="button" type="button" onClick={onClose}>
              {t('lesson.closePdf')}
            </button>
          </article>
        ) : question ? (
          <article className="test-sheet">
            <div className="test-progress">
              {index + 1} / {quiz?.questionCount}
            </div>
            <h3>{question.prompt}</h3>
            <div className="options">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`option ${selected === option.id ? 'selected' : ''}`}
                  onClick={() => setSelected(option.id)}
                >
                  {option.id}. {option.text}
                </button>
              ))}
            </div>
            <button className="button" type="button" disabled={!selected || busy} onClick={() => void goNext()}>
              {last ? t('test.finish') : t('test.next')}
            </button>
          </article>
        ) : null}
      </div>
    </div>
  );
}

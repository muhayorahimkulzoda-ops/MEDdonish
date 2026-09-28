'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { adminRequest } from '../../../../../lib/api';
import { t } from '../../../../../lib/i18n';

type QuestionView = {
  finished?: boolean;
  attemptId: string;
  position: number;
  total: number;
  secondsLeft: number;
  timePerQuestion: number;
  mode: 'TRAINING' | 'EXAM';
  type: string;
  question: string;
  options: { id: string; text: string }[];
};

type AnswerView = {
  finished: boolean;
  verdict?: 'correct' | 'wrong' | 'timeout';
  correctCodes?: string[];
  explanation?: string | null;
  grade?: 5 | 4 | 3 | 'failed';
};

type ResultView = {
  finished: boolean;
  correctCount: number;
  wrongCount: number;
  timeoutCount: number;
  grade: 5 | 4 | 3 | 'failed';
  passed: boolean;
  percent: number;
  questionCount: number;
};

export default function TestPlayPage() {
  const params = useParams<{ id: string }>();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionView | null>(null);
  const [reveal, setReveal] = useState<AnswerView | null>(null);
  const [result, setResult] = useState<ResultView | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(20);
  const [error, setError] = useState('');
  const ticking = useRef(true);

  useEffect(() => {
    adminRequest<{ id: string }>(`/admin/tests/${params.id}/preview`, { method: 'POST' })
      .then((started) => setAttemptId(started.id))
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  useEffect(() => {
    if (!attemptId) return;
    loadQuestion(attemptId).catch((err: Error) => setError(err.message));
  }, [attemptId]);

  useEffect(() => {
    if (!question || reveal || result) return;
    ticking.current = true;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (!ticking.current) return value;
        if (value <= 1) {
          ticking.current = false;
          window.clearInterval(timer);
          void submit(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [question, reveal, result]);

  async function loadQuestion(id: string) {
    const payload = await adminRequest<QuestionView | ResultView>(`/admin/test-attempts/${id}/question`);
    if ('finished' in payload && payload.finished) {
      setResult(payload as ResultView);
      setQuestion(null);
      return;
    }
    const next = payload as QuestionView;
    setReveal(null);
    setSelected([]);
    setQuestion(next);
    setSeconds(next.secondsLeft);
  }

  async function submit(timedOut = false) {
    if (!attemptId || !question) return;
    ticking.current = false;
    try {
      const payload = await adminRequest<AnswerView | ResultView>(`/admin/test-attempts/${attemptId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ selectedCodes: timedOut ? [] : selected, timedOut }),
      });
      if (payload.finished) {
        setResult(payload as ResultView);
        setQuestion(null);
        return;
      }
      const answered = payload as AnswerView;
      if (question.mode === 'TRAINING') {
        setReveal(answered);
        window.setTimeout(() => {
          void loadQuestion(attemptId);
        }, 2500);
      } else {
        await loadQuestion(attemptId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  if (error) return <div className="error">{error}</div>;
  if (result) {
    return (
      <div className="player">
        <h1>{t('admin.grade')}</h1>
        <div className="card">
          <h2>{result.grade === 'failed' ? t('admin.failedTest') : result.grade}</h2>
          <p>{result.correctCount} / {result.questionCount} · {result.percent}%</p>
        </div>
      </div>
    );
  }
  if (!question) return null;

  return (
    <div className="player">
      <div className="muted">{question.position} / {question.total}</div>
      <div className={`timer ${seconds <= 5 ? 'warn' : ''}`}>{seconds}</div>
      <h1>{question.question}</h1>
      <div className="options">
        {question.options.map((option) => {
          const marked = selected.includes(option.id);
          const isCorrect = reveal?.correctCodes?.includes(option.id);
          const isWrong = Boolean(reveal && marked && !isCorrect);
          return (
            <button
              key={option.id}
              className={`option ${marked ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
              disabled={Boolean(reveal)}
              onClick={() => {
                if (question.type === 'ORDERING') {
                  setSelected((current) =>
                    current.includes(option.id)
                      ? current.filter((code) => code !== option.id)
                      : [...current, option.id],
                  );
                  return;
                }
                setSelected([option.id]);
              }}
            >
              {option.id}. {option.text}
            </button>
          );
        })}
      </div>
      {reveal ? (
        <div className="muted">
          {reveal.verdict === 'correct' ? t('admin.correct') : reveal.verdict === 'timeout' ? t('admin.timeout') : t('admin.wrong')}
          {reveal.explanation ? ` — ${reveal.explanation}` : ''}
        </div>
      ) : (
        <button onClick={() => void submit(false)}>{t('admin.next')}</button>
      )}
    </div>
  );
}

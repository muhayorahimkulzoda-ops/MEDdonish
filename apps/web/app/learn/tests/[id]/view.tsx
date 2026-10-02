'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getToken } from '../../../../lib/api';
import { t } from '../../../../lib/i18n';
import { Shell } from '../../../../components/Shell';

type QuestionView = {
  finished?: boolean;
  attemptId: string;
  position: number;
  total: number;
  secondsLeft: number;
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
};

type ResultView = {
  finished: boolean;
  correctCount: number;
  questionCount: number;
  percent: number;
  grade: 5 | 4 | 3 | 'failed';
};

export default function LearnTestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionView | null>(null);
  const [reveal, setReveal] = useState<AnswerView | null>(null);
  const [result, setResult] = useState<ResultView | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(20);
  const [error, setError] = useState('');
  const ticking = useRef(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api<{ id: string }>(`/tests/${params.id}/start`, { method: 'POST' })
      .then((started) => setAttemptId(started.id))
      .catch((err: Error) => setError(err.message));
  }, [params.id, router]);

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
    const payload = await api<QuestionView | ResultView>(`/test-attempts/${id}/question`);
    if ('finished' in payload && payload.finished && 'grade' in payload) {
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
    const payload = await api<AnswerView | ResultView>(`/test-attempts/${attemptId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ selectedCodes: timedOut ? [] : selected, timedOut }),
    });
    if ('finished' in payload && payload.finished && 'grade' in payload) {
      setResult(payload as ResultView);
      setQuestion(null);
      return;
    }
    const answered = payload as AnswerView;
    if (question.mode === 'TRAINING') {
      setReveal(answered);
      window.setTimeout(() => void loadQuestion(attemptId), 2500);
    } else {
      await loadQuestion(attemptId);
    }
  }

  return (
    <Shell>
      <a href="/courses">{t('nav.courses')}</a>
      {error ? <p className="error">{error}</p> : null}
      {result ? (
        <section className="hero">
          <h1>{t('test.result.title')}</h1>
          <p>{result.grade === 'failed' ? t('test.result.failed') : t('test.result.grade', { grade: result.grade })}</p>
          <p>{result.correctCount} / {result.questionCount} · {result.percent}%</p>
        </section>
      ) : question ? (
        <div className="player-box">
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
                  type="button"
                  className={`option ${marked ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                  disabled={Boolean(reveal)}
                  onClick={() => setSelected(question.type === 'ORDERING'
                    ? (marked ? selected.filter((code) => code !== option.id) : [...selected, option.id])
                    : [option.id])}
                >
                  {option.id}. {option.text}
                </button>
              );
            })}
          </div>
          {reveal ? (
            <p className="muted">
              {reveal.verdict === 'correct' ? t('test.correct') : reveal.verdict === 'timeout' ? t('test.timeout') : t('test.wrong')}
              {reveal.explanation ? ` — ${reveal.explanation}` : ''}
            </p>
          ) : (
            <button className="button" type="button" onClick={() => void submit(false)}>{t('test.next')}</button>
          )}
        </div>
      ) : null}
    </Shell>
  );
}

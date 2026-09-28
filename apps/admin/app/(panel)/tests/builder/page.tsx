'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminToast } from '../../../../components/AdminToast';
import { adminRequest } from '../../../../lib/api';
import { t } from '../../../../lib/i18n';

type Answer = { id: string; text: string; correct: boolean };

type QuestionDraft = {
  type: 'single_choice' | 'multiple_choice';
  question: string;
  explanation: string;
  difficulty: string;
  topic: string;
  answers: Answer[];
};

function blankQuestion(): QuestionDraft {
  return {
    type: 'single_choice',
    question: '',
    explanation: '',
    difficulty: 'medium',
    topic: '',
    answers: [
      { id: 'A', text: '', correct: true },
      { id: 'B', text: '', correct: false },
    ],
  };
}

export default function TestBuilderPage() {
  const router = useRouter();
  const toast = useAdminToast();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([blankQuestion()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = questions.map((item) => ({
        type: 'single_choice',
        question: item.question,
        options: item.answers.map((answer) => ({ id: answer.id, text: answer.text })),
        correct_answer: item.type === 'multiple_choice'
          ? item.answers.filter((answer) => answer.correct).map((answer) => answer.id)
          : item.answers.find((answer) => answer.correct)?.id ?? 'A',
        explanation: item.explanation,
      }));
      const job = await adminRequest<{ jobId: string }>('/admin/questions/import/confirm', {
        method: 'POST',
        body: JSON.stringify({ questions: payload, language: 'tg' }),
      });
      const created = await adminRequest<{ id: string }>('/admin/tests', {
        method: 'POST',
        body: JSON.stringify({ title, questionCount: questions.length }),
      });
      toast(t('admin.saved'));
      router.replace(`/tests/${created.id}`);
      void job;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>{t('admin.nav.tests')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <form className="form" onSubmit={save}>
        <label>{t('admin.titleRu')}<input value={title} onChange={(event) => setTitle(event.target.value)} required lang="tg" /></label>
        {questions.map((question, index) => (
          <div className="card section-block" key={index}>
            <label>
              {t('admin.questionType')}
              <select
                value={question.type}
                onChange={(event) => updateQuestion(index, { type: event.target.value as QuestionDraft['type'] })}
              >
                <option value="single_choice">{t('admin.singleChoice')}</option>
                <option value="multiple_choice">{t('admin.multipleChoice')}</option>
              </select>
            </label>
            <label>{t('admin.questions')}<textarea value={question.question} onChange={(event) => updateQuestion(index, { question: event.target.value })} required lang="tg" /></label>
            <label>{t('admin.topic')}<input value={question.topic} onChange={(event) => updateQuestion(index, { topic: event.target.value })} /></label>
            <label>{t('admin.difficulty')}<input value={question.difficulty} onChange={(event) => updateQuestion(index, { difficulty: event.target.value })} /></label>
            {question.answers.map((answer, answerIndex) => (
              <label key={answer.id}>
                {answer.id}
                <input
                  value={answer.text}
                  onChange={(event) => {
                    const answers = question.answers.map((row, i) => (i === answerIndex ? { ...row, text: event.target.value } : row));
                    updateQuestion(index, { answers });
                  }}
                />
                <span className="lesson-check">
                  <input
                    type={question.type === 'single_choice' ? 'radio' : 'checkbox'}
                    name={`correct-${index}`}
                    checked={answer.correct}
                    onChange={(event) => {
                      const answers = question.answers.map((row, i) =>
                        question.type === 'single_choice'
                          ? { ...row, correct: i === answerIndex }
                          : i === answerIndex
                            ? { ...row, correct: event.target.checked }
                            : row,
                      );
                      updateQuestion(index, { answers });
                    }}
                  />
                  {t('admin.correct')}
                </span>
              </label>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                updateQuestion(index, {
                  answers: [...question.answers, { id: String.fromCharCode(65 + question.answers.length), text: '', correct: false }],
                })
              }
            >
              {t('admin.addAnswer')}
            </button>
            <label>{t('admin.explanation')}<textarea value={question.explanation} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} /></label>
          </div>
        ))}
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setQuestions((current) => [...current, blankQuestion()])}>
            {t('admin.addQuestion')}
          </button>
          <button type="submit" disabled={saving}>{saving ? t('admin.loading') : t('admin.save')}</button>
        </div>
      </form>
    </>
  );
}

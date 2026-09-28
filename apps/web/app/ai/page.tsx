'use client';

import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import { t, useLocale } from '../../lib/i18n';
import { Shell } from '../../components/Shell';
import { AIQuickPrompt } from '../../components/AIQuickPrompt';

type ChatItem = { role: 'user' | 'ai'; text: string };

export default function AiPage() {
  const locale = useLocale();
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [chat, setChat] = useState<ChatItem[]>([]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (text.length < 2 || sending) return;
    setSending(true);
    setError('');
    setQuestion('');
    setChat((rows) => [...rows, { role: 'user', text }]);
    try {
      const result = await api<{ answer: string }>('/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ question: text, locale }),
      });
      setChat((rows) => [...rows, { role: 'ai', text: result.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.error'));
    } finally {
      setSending(false);
    }
  }

  const prompts = [t('ai.explain'), t('ai.summarize'), t('ai.test'), t('ai.clinical'), t('ai.latin')];

  return (
    <Shell>
      <section className="md-page md-ai">
        <h1>{t('ai.title')}</h1>
        <p className="md-lead">{t('ai.lead')}</p>
        {chat.length ? (
          <div className="md-ai-thread">
            {chat.map((item, index) => (
              <article className={`md-ai-msg is-${item.role}`} key={`${item.role}-${index}`}>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        ) : null}
        <form className="md-ai-form" onSubmit={(event) => void onSubmit(event)}>
          <label className="sr-only" htmlFor="ai-q">
            {t('ai.placeholder')}
          </label>
          <textarea
            id="ai-q"
            rows={4}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t('ai.placeholder')}
            disabled={sending}
          />
          <button type="submit" className="md-btn md-btn-primary" disabled={sending}>
            {sending ? t('ai.thinking') : t('ai.send')}
          </button>
        </form>
        <div className="md-chips">
          {prompts.map((label) => (
            <AIQuickPrompt key={label} label={label} onPick={(value) => setQuestion(value)} />
          ))}
        </div>
        {error ? <p className="error">{error}</p> : null}
        <p className="md-note">{t('ai.disclaimer')}</p>
      </section>
    </Shell>
  );
}

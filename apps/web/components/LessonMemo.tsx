'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, getToken } from '../lib/api';
import { t } from '../lib/i18n';

function storageKey(lessonId: string) {
  return `meddonish.memo.${lessonId}`;
}

type Props = {
  lessonId: string;
};

export function LessonMemo({ lessonId }: Props) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const local = window.localStorage.getItem(storageKey(lessonId)) ?? '';
    setText(local);
    setSaved(false);
    if (!getToken()) return;
    api<{ content: string }>(`/me/lessons/${lessonId}/note`)
      .then((row) => {
        if (typeof row.content === 'string') {
          setText(row.content);
          window.localStorage.setItem(storageKey(lessonId), row.content);
        }
      })
      .catch(() => undefined);
  }, [lessonId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    window.localStorage.setItem(storageKey(lessonId), text);
    try {
      if (getToken()) {
        await api(`/me/lessons/${lessonId}/note`, {
          method: 'PUT',
          body: JSON.stringify({ content: text }),
        });
      }
      setSaved(true);
    } catch {
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="lesson-memo" onSubmit={(event) => void save(event)}>
      <label htmlFor={`memo-${lessonId}`}>{t('lesson.memo')}</label>
      <textarea
        id={`memo-${lessonId}`}
        value={text}
        maxLength={4000}
        placeholder={t('lesson.memo.placeholder')}
        onChange={(event) => {
          setText(event.target.value);
          setSaved(false);
        }}
      />
      <div className="lesson-memo-actions">
        <button className="button" type="submit" disabled={busy}>
          {t('lesson.memo.save')}
        </button>
        {saved ? <span className="muted">{t('lesson.memo.saved')}</span> : null}
      </div>
    </form>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { api, getToken } from '../../lib/api';
import { t } from '../../lib/i18n';
import { Shell } from '../../components/Shell';

type Item = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsInboxPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      setError(t('nav.login'));
      return;
    }
    api<Item[]>('/me/notifications')
      .then(setItems)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <Shell>
      <section className="hero">
        <h1>{t('nav.notifications')}</h1>
      </section>
      {error ? <p className="error">{error}</p> : null}
      <div className="grid">
        {items.map((item) => (
          <article className="card" key={item.id}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </Shell>
  );
}

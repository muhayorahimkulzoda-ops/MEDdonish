'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminRequest } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Template = { id: string; code: string; enabled: boolean };

type Row = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  user?: { phone: string };
  template?: { code: string };
};

export default function NotificationsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [error, setError] = useState('');

  function reload() {
    return Promise.all([
      adminRequest<Template[]>('/admin/notification-templates').then(setTemplates),
      adminRequest<Row[]>('/admin/notifications').then(setItems),
    ]);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
  }, []);

  async function toggle(code: string, enabled: boolean) {
    await adminRequest(`/admin/notification-templates/${code}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
    await reload();
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    try {
      await adminRequest('/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: String(data.get('title')),
          body: String(data.get('body')),
        }),
      });
      form.reset();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <>
      <div className="row">
        <h1>{t('admin.notifications')}</h1>
        <button className="secondary" onClick={() => void adminRequest('/admin/notifications/scan', { method: 'POST' }).then(() => reload())}>
          {t('admin.scan')}
        </button>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('admin.notifications')}</th>
              <th>{t('admin.status')}</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((item) => (
              <tr key={item.id}>
                <td>{item.code}</td>
                <td>
                  <button className="secondary" onClick={() => void toggle(item.code, !item.enabled)}>
                    {item.enabled ? t('admin.enabled') : t('admin.disabled')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="form section-block" onSubmit={send}>
        <label>{t('admin.titleRu')}<input name="title" required /></label>
        <label>{t('admin.description')}<textarea name="body" required /></label>
        <button type="submit">{t('admin.send')}</button>
      </form>
      <div className="table-wrap section-block">
        <table>
          <thead>
            <tr>
              <th>{t('admin.users')}</th>
              <th>{t('admin.notifications')}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={2}>{t('admin.empty')}</td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td>{item.user?.phone}</td>
                <td>
                  <b>{item.title}</b>
                  <div className="muted">{item.body}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

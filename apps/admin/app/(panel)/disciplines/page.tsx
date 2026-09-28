'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminRequest, titleOf, type Translation } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Discipline = {
  id: string;
  slug: string;
  status: string;
  translations: Translation[];
  _count?: { courses: number };
};

export default function DisciplinesPage() {
  const [items, setItems] = useState<Discipline[]>([]);
  const [error, setError] = useState('');

  function reload() {
    return adminRequest<Discipline[]>('/admin/disciplines').then(setItems);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    try {
      await adminRequest('/admin/disciplines', {
        method: 'POST',
        body: JSON.stringify({
          slug: String(data.get('slug')),
          status: String(data.get('status')),
          translations: [
            { language: 'ru', title: String(data.get('titleRu')), description: String(data.get('description') ?? '') },
            { language: 'tg', title: String(data.get('titleTg') || data.get('titleRu')) },
          ],
        }),
      });
      form.reset();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function publish(item: Discipline, status: string) {
    await adminRequest(`/admin/disciplines/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await reload();
  }

  return (
    <>
      <h1>{t('admin.disciplines')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <form className="form" onSubmit={onCreate}>
        <h3>{t('admin.newDiscipline')}</h3>
        <label>
          {t('admin.titleRu')}
          <input name="titleRu" required />
        </label>
        <label>
          {t('admin.titleTg')}
          <input name="titleTg" />
        </label>
        <label>
          {t('admin.slug')}
          <input name="slug" placeholder="anatomy" required />
        </label>
        <label>
          {t('admin.description')}
          <textarea name="description" />
        </label>
        <label>
          {t('admin.status')}
          <select name="status" defaultValue="draft">
            <option value="draft">{t('admin.draft')}</option>
            <option value="published">{t('admin.publish')}</option>
          </select>
        </label>
        <button type="submit">{t('admin.create')}</button>
      </form>
      <div className="table-wrap section-block">
        <table>
          <thead>
            <tr>
              <th>{t('admin.titleRu')}</th>
              <th>{t('admin.slug')}</th>
              <th>{t('admin.courses')}</th>
              <th>{t('admin.status')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5}>{t('admin.empty')}</td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td>{titleOf(item.translations)}</td>
                <td>{item.slug}</td>
                <td>{item._count?.courses ?? 0}</td>
                <td><span className={`badge ${item.status}`}>{item.status}</span></td>
                <td>
                  {item.status !== 'published' ? (
                    <button className="secondary" onClick={() => publish(item, 'published')}>
                      {t('admin.publish')}
                    </button>
                  ) : (
                    <button className="secondary" onClick={() => publish(item, 'draft')}>
                      {t('admin.draft')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminForm } from '../../../../components/AdminUi';
import { useAdminToast } from '../../../../components/AdminToast';
import { adminRequest } from '../../../../lib/api';
import { t } from '../../../../lib/i18n';

type Drug = {
  id: string;
  generic_name: string;
  brand_name?: string | null;
  drug_class?: string | null;
  mechanism?: string | null;
  indications?: string | null;
  contraindications?: string | null;
  adverse_effects?: string | null;
  dosage?: string | null;
  interactions?: string | null;
  pregnancy?: string | null;
  status: string;
  reviewer_name?: string | null;
  sources?: { sourceTitle: string; author?: string | null; year?: number | null; url?: string | null }[];
  disclaimer: string;
};

export default function DrugEditorPage() {
  const params = useParams<{ id: string }>();
  const toast = useAdminToast();
  const [item, setItem] = useState<Drug | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminRequest<Drug>(`/admin/drugs/${params.id}`).then(setItem).catch((err: Error) => setError(err.message));
  }, [params.id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      const sources = [{
        source_title: String(data.get('source_title') || ''),
        author: String(data.get('source_author') || '') || undefined,
        year: Number(data.get('source_year') || 0) || undefined,
        url: String(data.get('source_url') || '') || undefined,
      }].filter((row) => row.source_title);
      const saved = await adminRequest<Drug>(`/admin/drugs/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          generic_name: String(data.get('generic_name')),
          brand_name: String(data.get('brand_name') || '') || undefined,
          drug_class: String(data.get('drug_class') || '') || undefined,
          mechanism: String(data.get('mechanism') || '') || undefined,
          indications: String(data.get('indications') || '') || undefined,
          contraindications: String(data.get('contraindications') || '') || undefined,
          adverse_effects: String(data.get('adverse_effects') || '') || undefined,
          dosage: String(data.get('dosage') || '') || undefined,
          interactions: String(data.get('interactions') || '') || undefined,
          pregnancy: String(data.get('pregnancy') || '') || undefined,
          status: String(data.get('status')),
          reviewer_name: String(data.get('reviewer_name') || '') || undefined,
          sources,
        }),
      });
      setItem(saved);
      toast(t('admin.saved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (!item) return error ? <div className="error">{error}</div> : <p className="muted">{t('admin.loading')}</p>;

  return (
    <>
      <h1>{item.generic_name}</h1>
      <p className="muted">{item.disclaimer}</p>
      <AdminForm onSubmit={save} error={error} saving={saving}>
        <label>{t('admin.genericName')}<input name="generic_name" defaultValue={item.generic_name} required lang="tg" /></label>
        <label>{t('admin.brandName')}<input name="brand_name" defaultValue={item.brand_name ?? ''} /></label>
        <label>{t('admin.drugClass')}<input name="drug_class" defaultValue={item.drug_class ?? ''} /></label>
        <label>{t('admin.mechanism')}<textarea name="mechanism" defaultValue={item.mechanism ?? ''} /></label>
        <label>{t('admin.indications')}<textarea name="indications" defaultValue={item.indications ?? ''} /></label>
        <label>{t('admin.contraindications')}<textarea name="contraindications" defaultValue={item.contraindications ?? ''} /></label>
        <label>{t('admin.adverseEffects')}<textarea name="adverse_effects" defaultValue={item.adverse_effects ?? ''} /></label>
        <label>{t('admin.dosage')}<textarea name="dosage" defaultValue={item.dosage ?? ''} /></label>
        <label>{t('admin.interactions')}<textarea name="interactions" defaultValue={item.interactions ?? ''} /></label>
        <label>{t('admin.pregnancy')}<textarea name="pregnancy" defaultValue={item.pregnancy ?? ''} /></label>
        <label>{t('admin.reviewer')}<input name="reviewer_name" defaultValue={item.reviewer_name ?? ''} /></label>
        <label>
          {t('admin.status')}
          <select name="status" defaultValue={item.status}>
            <option value="draft">{t('admin.draft')}</option>
            <option value="published">{t('admin.published')}</option>
            <option value="archived">{t('admin.archived')}</option>
          </select>
        </label>
        <h2>{t('admin.references')}</h2>
        <label>{t('admin.sourceTitle')}<input name="source_title" defaultValue={item.sources?.[0]?.sourceTitle ?? ''} /></label>
        <label>{t('admin.sourceAuthor')}<input name="source_author" defaultValue={item.sources?.[0]?.author ?? ''} /></label>
        <label>{t('admin.sourceYear')}<input name="source_year" type="number" defaultValue={item.sources?.[0]?.year ?? ''} /></label>
        <label>{t('admin.sourceUrl')}<input name="source_url" defaultValue={item.sources?.[0]?.url ?? ''} /></label>
        <button type="submit">{t('admin.save')}</button>
      </AdminForm>
    </>
  );
}

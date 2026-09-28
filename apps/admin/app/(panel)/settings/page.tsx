'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminRequest } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Settings = {
  values: Record<string, number | string>;
};

const FIELDS: { key: string; label: string; type: 'number' | 'select'; min?: number; max?: number }[] = [
  { key: 'grade_5_min', label: 'admin.grade5', type: 'number', min: 0, max: 30 },
  { key: 'grade_4_min', label: 'admin.grade4', type: 'number', min: 0, max: 30 },
  { key: 'grade_3_min', label: 'admin.grade3', type: 'number', min: 0, max: 30 },
  { key: 'pass_min', label: 'admin.passMin', type: 'number', min: 0, max: 30 },
  { key: 'video_completed_percent', label: 'admin.videoPercent', type: 'number', min: 1, max: 100 },
  { key: 'free_preview_limit', label: 'admin.previewLimit', type: 'number', min: 0, max: 20 },
  { key: 'default_question_count', label: 'admin.questionCount', type: 'number', min: 1, max: 50 },
  { key: 'seconds_per_question', label: 'admin.secondsPerQuestion', type: 'number', min: 5, max: 120 },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, number | string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    adminRequest<Settings>('/admin/settings')
      .then((data) => setValues(data.values))
      .catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const saved = await adminRequest<Settings>('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          grade_5_min: Number(values.grade_5_min),
          grade_4_min: Number(values.grade_4_min),
          grade_3_min: Number(values.grade_3_min),
          pass_min: Number(values.pass_min),
          video_completed_percent: Number(values.video_completed_percent),
          free_preview_limit: Number(values.free_preview_limit),
          default_question_count: Number(values.default_question_count),
          seconds_per_question: Number(values.seconds_per_question),
          single_device_policy: values.single_device_policy,
        }),
      });
      setValues(saved.values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <>
      <h1>{t('admin.settings')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <form className="form" onSubmit={onSubmit}>
        {FIELDS.map((field) => (
          <label key={field.key}>
            {t(field.label as Parameters<typeof t>[0])}
            <input
              type="number"
              min={field.min}
              max={field.max}
              value={values[field.key] ?? ''}
              onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: Number(event.target.value) }))}
            />
          </label>
        ))}
        <label>
          {t('admin.devicePolicy')}
          <select
            value={String(values.single_device_policy ?? 'require_release')}
            onChange={(event) => setValues((prev) => ({ ...prev, single_device_policy: event.target.value }))}
          >
            <option value="require_release">{t('admin.requireRelease')}</option>
            <option value="auto_revoke">{t('admin.autoRevoke')}</option>
          </select>
        </label>
        <button type="submit">{t('admin.save')}</button>
      </form>
    </>
  );
}

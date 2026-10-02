'use client';

import { t } from '../lib/i18n';

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="card" role="dialog">
      <p>{t('admin.delete')}</p>
      <div className="row">
        <button type="button" className="secondary" onClick={onCancel}>
          {t('admin.cancel')}
        </button>
        <button type="button" className="danger" onClick={onConfirm}>
          {t('admin.delete')}
        </button>
      </div>
    </div>
  );
}

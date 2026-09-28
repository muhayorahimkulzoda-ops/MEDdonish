'use client';

import { t } from '../lib/i18n';

export function SectionHeader({
  title,
  actionHref,
  actionLabel,
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="md-section-head">
      <h2>{title}</h2>
      {actionHref ? (
        <a className="md-link" href={actionHref}>
          {actionLabel ?? t('course.details')}
        </a>
      ) : null}
    </div>
  );
}

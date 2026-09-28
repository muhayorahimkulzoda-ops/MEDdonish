'use client';

import type { LucideIcon } from 'lucide-react';

export function MedicalCategoryCard({
  href,
  title,
  icon: Icon,
  onClick,
}: {
  href?: string;
  title: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="md-cat-icon" aria-hidden="true">
        <Icon strokeWidth={1.85} />
      </span>
      <strong>{title}</strong>
    </>
  );
  if (href) {
    return (
      <a className="md-cat-card" href={href}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" className="md-cat-card" onClick={onClick}>
      {body}
    </button>
  );
}

'use client';

import type { FormEvent, ReactNode } from 'react';

export function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="row">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ‹
      </button>
      <span>
        {page} / {pages}
      </span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        ›
      </button>
    </div>
  );
}

export function AdminForm({
  onSubmit,
  error,
  saving,
  children,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  error?: string;
  saving?: boolean;
  children: ReactNode;
}) {
  return (
    <form className="form" onSubmit={onSubmit} aria-busy={saving}>
      {error ? <div className="error">{error}</div> : null}
      {children}
    </form>
  );
}

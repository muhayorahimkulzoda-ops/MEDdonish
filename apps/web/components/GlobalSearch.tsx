'use client';

import { FormEvent, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { t } from '../lib/i18n';

export function GlobalSearch({ size = 'md', autoFocus = false }: { size?: 'md' | 'lg'; autoFocus?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const fieldId = useId();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <form className={`md-search md-search-${size}`} onSubmit={onSubmit} role="search">
      <Search strokeWidth={1.85} aria-hidden="true" />
      <label className="sr-only" htmlFor={fieldId}>
        {t('nav.search')}
      </label>
      <input
        id={fieldId}
        name="q"
        value={query}
        autoFocus={autoFocus}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('home.search.placeholder')}
        autoComplete="off"
      />
    </form>
  );
}

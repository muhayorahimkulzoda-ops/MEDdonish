'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { t, useLocale } from '../../lib/i18n';
import { SEARCH_INDEX } from '../../lib/search-index';
import { Shell } from '../../components/Shell';
import { GlobalSearch } from '../../components/GlobalSearch';

function SearchResults() {
  useLocale();
  const params = useSearchParams();
  const q = (params.get('q') ?? '').trim().toLowerCase();

  const results = useMemo(() => {
    return SEARCH_INDEX.filter((item) => {
      if (!q) return true;
      const title = t(item.titleKey).toLowerCase();
      return title.includes(q) || item.group.includes(q);
    });
  }, [q]);

  return (
    <section className="md-page">
      <h1>{t('search.title')}</h1>
      <p className="md-lead">{t('search.hint')}</p>
      <GlobalSearch size="lg" />
      {results.length === 0 ? (
        <p className="md-note">{t('search.empty')}</p>
      ) : (
        <ul className="md-list md-search-results">
          {results.map((item) => (
            <li key={`${item.href}-${item.titleKey}`}>
              <a href={item.href}>{t(item.titleKey)}</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function SearchPage() {
  return (
    <Shell>
      <Suspense fallback={<p className="muted">...</p>}>
        <SearchResults />
      </Suspense>
    </Shell>
  );
}

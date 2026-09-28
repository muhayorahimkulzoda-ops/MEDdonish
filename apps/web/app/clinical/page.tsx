'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Bookmark,
  BookMarked,
  Calculator,
  ClipboardList,
  Pill,
  Search,
  Stethoscope,
} from 'lucide-react';
import { t, useLocale } from '../../lib/i18n';
import { Shell } from '../../components/Shell';
import { SectionHeader } from '../../components/SectionHeader';
import { MedicalCategoryCard } from '../../components/MedicalCategoryCard';
import { GlobalSearch } from '../../components/GlobalSearch';

const CATS = [
  { id: 'diseases', titleKey: 'clinical.diseases' as const, icon: Stethoscope },
  { id: 'drugs', titleKey: 'clinical.drugs' as const, icon: Pill },
  { id: 'cases', titleKey: 'clinical.cases' as const, icon: ClipboardList },
  { id: 'calculators', titleKey: 'clinical.calculators' as const, icon: Calculator },
  { id: 'guidelines', titleKey: 'clinical.guidelines' as const, icon: BookMarked },
  { id: 'ddx', titleKey: 'clinical.ddx' as const, icon: Activity },
];

export default function ClinicalPage() {
  useLocale();
  const [active, setActive] = useState('diseases');
  const [saved, setSaved] = useState<string[]>(['diseases']);
  const recent = useMemo(() => ['drugs', 'cases'], []);

  return (
    <Shell>
      <section className="md-page">
        <h1>{t('clinical.title')}</h1>
        <p className="md-lead">{t('clinical.lead')}</p>
        <GlobalSearch size="lg" />
        <div className="md-quick-grid">
          {CATS.map((cat) => (
            <MedicalCategoryCard
              key={cat.id}
              title={t(cat.titleKey)}
              icon={cat.icon}
              onClick={() => setActive(cat.id)}
            />
          ))}
        </div>
        <SectionHeader title={t('clinical.recent')} />
        <ul className="md-list">
          {recent.map((id) => {
            const cat = CATS.find((row) => row.id === id);
            return (
              <li key={id}>
                <button type="button" onClick={() => setActive(id)}>
                  {cat ? t(cat.titleKey) : id}
                </button>
              </li>
            );
          })}
        </ul>
        <SectionHeader title={t('clinical.bookmarks')} />
        <ul className="md-list">
          {saved.map((id) => {
            const cat = CATS.find((row) => row.id === id);
            return (
              <li key={id}>
                <Bookmark strokeWidth={1.85} aria-hidden="true" />
                <span>{cat ? t(cat.titleKey) : id}</span>
              </li>
            );
          })}
        </ul>
        <article className="md-panel" id={active}>
          <div className="md-panel-top">
            <h2>{t(CATS.find((row) => row.id === active)?.titleKey ?? 'clinical.title')}</h2>
            <button
              type="button"
              className="md-icon-btn"
              aria-label={t('clinical.bookmarks')}
              onClick={() =>
                setSaved((prev) => (prev.includes(active) ? prev.filter((id) => id !== active) : [...prev, active]))
              }
            >
              <Bookmark strokeWidth={1.85} />
            </button>
          </div>
          <p>
            <Search strokeWidth={1.85} className="md-inline-icon" aria-hidden="true" /> {t('clinical.soon')}
          </p>
        </article>
      </section>
    </Shell>
  );
}

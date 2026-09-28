'use client';

import { useState } from 'react';
import { Brain, CircleDot, HeartPulse, Bone, Scan } from 'lucide-react';
import { t, useLocale } from '../../lib/i18n';
import { Shell } from '../../components/Shell';
import { MedicalCategoryCard } from '../../components/MedicalCategoryCard';
import { SectionHeader } from '../../components/SectionHeader';

const REGIONS = [
  { id: 'upper', titleKey: 'anatomy.upper' as const, icon: Bone, image: '/images/track-anatomy-skeleton.png' },
  { id: 'lower', titleKey: 'anatomy.lower' as const, icon: Bone, image: '/images/track-anatomy-muscles.png' },
  { id: 'thorax', titleKey: 'anatomy.thorax' as const, icon: HeartPulse, image: '/images/track-anatomy-vessels.png' },
  { id: 'abdomen', titleKey: 'anatomy.abdomen' as const, icon: CircleDot, image: '/images/track-anatomy-nerves.png' },
  { id: 'head', titleKey: 'anatomy.head' as const, icon: Scan, image: '/images/track-anatomy-skull.png' },
  { id: 'neuro', titleKey: 'anatomy.neuro' as const, icon: Brain, image: '/images/track-anatomy.png' },
];

const LAYERS = ['anatomy.bones', 'anatomy.joints', 'anatomy.muscles', 'anatomy.vessels', 'anatomy.nerves'] as const;

export default function AnatomyPage() {
  useLocale();
  const [region, setRegion] = useState(REGIONS[0]);

  return (
    <Shell>
      <section className="md-page">
        <h1>{t('anatomy.title')}</h1>
        <p className="md-lead">{t('anatomy.lead')}</p>
        <div className="md-quick-grid">
          {REGIONS.map((item) => (
            <MedicalCategoryCard
              key={item.id}
              title={t(item.titleKey)}
              icon={item.icon}
              onClick={() => setRegion(item)}
            />
          ))}
        </div>
        <article className="md-panel">
          <SectionHeader title={t(region.titleKey)} />
          <div className="md-atlas">
            <img src={region.image} alt="" />
          </div>
          <div className="md-chips">
            {LAYERS.map((key) => (
              <span className="md-chip md-chip-static" key={key}>
                {t(key)}
              </span>
            ))}
          </div>
          <div className="md-actions">
            <span className="md-btn md-btn-secondary" aria-disabled="true">
              {t('anatomy.view3d')} · {t('anatomy.soon')}
            </span>
            <a className="md-btn md-btn-secondary" href="/courses/anatomy-osteo">
              {t('anatomy.atlas')}
            </a>
            <a className="md-btn md-btn-primary" href="/courses/anatomy-osteo">
              {t('anatomy.lecture')}
            </a>
            <a className="md-btn md-btn-ghost" href="/courses/anatomy-osteo">
              {t('anatomy.test')}
            </a>
          </div>
        </article>
      </section>
    </Shell>
  );
}

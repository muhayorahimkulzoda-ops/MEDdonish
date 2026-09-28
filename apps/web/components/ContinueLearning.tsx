'use client';

import { useEffect, useState } from 'react';
import { t } from '../lib/i18n';
import { readContinueLesson, type ContinueLesson } from '../lib/continue-learning';
import { ProgressCard } from './ProgressCard';
import { SectionHeader } from './SectionHeader';

export function ContinueLearning() {
  const [item, setItem] = useState<ContinueLesson | null>(null);

  useEffect(() => {
    setItem(readContinueLesson());
  }, []);

  const card = item ?? {
    courseTitle: t('home.track.anatomy'),
    topicTitle: t('course.topics'),
    href: '/courses/anatomy-osteo',
    progress: 0,
  };
  const started = Boolean(item);

  return (
    <section className="md-block">
      <SectionHeader title={t('home.continue')} />
      <a className="md-continue" href={card.href}>
        <div>
          <p className="md-kicker">{card.courseTitle}</p>
          <h3>{card.topicTitle}</h3>
          <ProgressCard value={card.progress} />
          <span className="md-course-pct">{card.progress}%</span>
        </div>
        <span className="md-btn md-btn-primary">{started ? t('home.continue.cta') : t('home.start')}</span>
      </a>
    </section>
  );
}

'use client';

import { ProgressCard } from './ProgressCard';
import { t } from '../lib/i18n';

export function CourseCard({
  href,
  title,
  description,
  lectures,
  tests,
  progress,
  started,
}: {
  href: string;
  title: string;
  description: string;
  lectures: number;
  tests: number;
  progress?: number;
  started?: boolean;
}) {
  return (
    <a className="md-course-card" href={href}>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      <ul className="md-course-meta">
        <li>
          {lectures} {t('course.lecturesCount')}
        </li>
        <li>
          {tests} {t('course.testsCount')}
        </li>
      </ul>
      {typeof progress === 'number' ? (
        <>
          <ProgressCard value={progress} />
          <span className="md-course-pct">{progress}%</span>
        </>
      ) : null}
      <span className="md-btn md-btn-primary md-btn-compact">{started ? t('home.continue.cta') : t('home.start')}</span>
    </a>
  );
}

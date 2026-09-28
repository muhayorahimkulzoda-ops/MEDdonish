'use client';

import { useLocale, t } from '../lib/i18n';
import { CATALOG_COURSES } from '../lib/catalog-courses';
import { Shell } from '../components/Shell';
import { CourseCard } from '../components/CourseCard';

export default function HomePage() {
  useLocale();
  const featured = CATALOG_COURSES[0];

  return (
    <Shell>
      <section className="md-page">
        <h1>{t('home.app.subtitle')}</h1>
        <div className="md-course-grid md-course-grid-one">
          <CourseCard
            href={featured.href}
            title={t(featured.titleKey)}
            description={t(featured.descriptionKey)}
            lectures={featured.lectures}
            tests={featured.tests}
            started
          />
        </div>
      </section>
    </Shell>
  );
}

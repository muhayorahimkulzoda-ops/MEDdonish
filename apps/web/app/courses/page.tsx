'use client';

import { useLocale, t } from '../../lib/i18n';
import { CATALOG_COURSES } from '../../lib/catalog-courses';
import { Shell } from '../../components/Shell';
import { CourseCard } from '../../components/CourseCard';

export default function CoursesPage() {
  useLocale();

  return (
    <Shell>
      <section className="md-page">
        <h1>{t('nav.courses')}</h1>
        <div className="md-course-grid">
          {CATALOG_COURSES.map((course) => (
            <CourseCard
              key={course.href}
              href={course.href}
              title={t(course.titleKey)}
              description={t(course.descriptionKey)}
              lectures={course.lectures}
              tests={course.tests}
              started={course.href.includes('anatomy')}
            />
          ))}
        </div>
      </section>
    </Shell>
  );
}

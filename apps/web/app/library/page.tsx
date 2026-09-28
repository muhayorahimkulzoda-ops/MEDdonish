'use client';

import { t, useLocale } from '../../lib/i18n';
import { Shell } from '../../components/Shell';
import { CourseCard } from '../../components/CourseCard';

export default function LibraryPage() {
  useLocale();
  return (
    <Shell>
      <section className="md-page">
        <h1>{t('library.title')}</h1>
        <p className="md-lead">{t('library.lead')}</p>
        <div className="md-course-grid">
          <CourseCard
            href="/courses/anatomy-osteo"
            title={t('home.track.anatomy')}
            description={t('home.stage.notesLead')}
            lectures={24}
            tests={12}
            started
          />
          <CourseCard
            href="/courses/pharmacology-y3"
            title={t('home.track.pharma')}
            description={t('home.stage.y3notesLead')}
            lectures={18}
            tests={10}
          />
          <CourseCard
            href="/courses/pathophysiology-y3"
            title={t('home.track.pathphys')}
            description={t('home.stage.y3notesLead')}
            lectures={18}
            tests={10}
          />
          <CourseCard
            href="/courses/pathanatomy-y3"
            title={t('home.track.pathanat')}
            description={t('home.stage.y3notesLead')}
            lectures={18}
            tests={10}
          />
        </div>
      </section>
    </Shell>
  );
}

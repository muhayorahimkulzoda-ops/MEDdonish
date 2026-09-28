'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { t, useLocale } from '../../../lib/i18n';
import { Shell } from '../../../components/Shell';

type Translation = { language: string; title: string; description?: string; body?: string | null };

type PublicCourse = {
  id: string;
  slug: string;
  translations: Translation[];
  sections: {
    id: string;
    translations: Translation[];
    lessons: {
      id: string;
      isFreePreview: boolean;
      translations: Translation[];
      topicTitle?: string;
    }[];
  }[];
};

function pickText(items: Translation[] | undefined, locale: string, field: 'title' | 'description' = 'title') {
  const row =
    items?.find((item) => item.language === 'tg') ??
    items?.find((item) => item.language === locale) ??
    items?.find((item) => item.language === 'ru');
  if (!row) return '';
  return field === 'description' ? (row.description ?? '') : row.title;
}

export default function CoursePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const [course, setCourse] = useState<PublicCourse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<PublicCourse>(`/public/courses/${params.slug}`)
      .then(setCourse)
      .catch((err: Error) => setError(err.message));
  }, [params.slug]);

  if (!course) {
    return (
      <Shell>
        <p className={error ? 'error' : 'muted'}>{error || '...'}</p>
      </Shell>
    );
  }

  const lessons = course.sections.flatMap((section) => section.lessons);
  const isAnatomy = course.slug === 'anatomy-osteo';
  const title = isAnatomy ? t('home.track.anatomy') : pickText(course.translations, locale);
  const lead = isAnatomy ? '' : pickText(course.translations, locale, 'description');

  return (
    <Shell>
      <section className="hero course-hero">
        <h1>{title}</h1>
        {lead ? <p>{lead}</p> : null}
      </section>
      {error ? <p className="error">{error}</p> : null}
      <section className="lesson-panel">
        <h2>{t('course.topics')}</h2>
        <div className="lesson-squares">
          {lessons.map((lesson, index) => (
            <button
              type="button"
              className="lesson-square"
              key={lesson.id}
              onClick={() => router.push(`/learn/lessons/${lesson.id}`)}
            >
              <span>{index + 1}</span>
              <strong>{lesson.topicTitle || pickText(lesson.translations, locale)}</strong>
            </button>
          ))}
        </div>
      </section>
    </Shell>
  );
}

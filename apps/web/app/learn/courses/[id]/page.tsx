'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getToken } from '../../../../lib/api';
import { t, useLocale } from '../../../../lib/i18n';
import { Shell } from '../../../../components/Shell';

type Outline = {
  id: string;
  slug: string;
  entitled: boolean;
  translations: { language: string; title: string }[];
  tests: { id: string; title: string }[];
  sections: {
    id: string;
    translations: { language: string; title: string }[];
    lessons: {
      id: string;
      accessible: boolean;
      isFreePreview: boolean;
      translations: { language: string; title: string }[];
      topicTitle?: string;
      tests: { id: string; title: string }[];
    }[];
  }[];
};

export default function LearnCoursePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const [data, setData] = useState<Outline | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api<Outline>(`/courses/${params.id}/lessons`)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [params.id, router]);

  const title =
    data?.translations.find((item) => item.language === locale)?.title ??
    data?.translations.find((item) => item.language === 'ru')?.title ??
    '';

  return (
    <Shell>
      <a href="/courses">{t('nav.courses')}</a>
      <section className="hero">
        <h1>{title}</h1>
      </section>
      {error ? <p className="error">{error}</p> : null}
      {data?.sections.map((section) => (
        <section key={section.id} className="lesson-panel">
          <h2>{section.translations.find((item) => item.language === locale)?.title
            ?? section.translations.find((item) => item.language === 'ru')?.title}</h2>
          <div className="lesson-squares">
            {section.lessons.map((lesson, index) => (
              <button
                type="button"
                className="lesson-square"
                key={lesson.id}
                disabled={!lesson.accessible}
                onClick={() => {
                  if (lesson.accessible) router.push(`/learn/lessons/${lesson.id}`);
                }}
              >
                <span>{index + 1}</span>
                <strong>
                  {lesson.topicTitle
                    ?? lesson.translations.find((item) => item.language === locale)?.title
                    ?? lesson.translations.find((item) => item.language === 'ru')?.title}
                </strong>
                {lesson.accessible ? null : <em>{t('subscriber.locked')}</em>}
              </button>
            ))}
          </div>
        </section>
      ))}
    </Shell>
  );
}

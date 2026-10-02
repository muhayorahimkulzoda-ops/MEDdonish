'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, mediaUrl } from '../../../../lib/api';
import { t, useLocale } from '../../../../lib/i18n';
import { Shell } from '../../../../components/Shell';
import { LessonMemo } from '../../../../components/LessonMemo';
import { LessonPdfViewer } from '../../../../components/LessonPdfViewer';
import { LessonTestViewer } from '../../../../components/LessonTestViewer';
import { writeContinueLesson } from '../../../../lib/continue-learning';

type Lesson = {
  id: string;
  translations: { language: string; title: string; body?: string | null }[];
  tests: { id: string; title: string }[];
  documents?: { id: string; title: string; kind: string }[];
  course: { id: string; slug: string };
  hasPdf?: boolean;
  hasVideo?: boolean;
  videoId?: string | null;
  topicTitle?: string;
};

type SubscriberLesson = {
  id: string;
  tests: { id: string; title: string }[];
  documents: { id: string; title: string; kind?: string }[];
  videos: { id: string }[];
};

function pick(
  items: { language: string; title: string; body?: string | null }[] | undefined,
  locale: string,
  field: 'title' | 'body' = 'title',
) {
  const hit =
    items?.find((item) => item.language === 'tg') ??
    items?.find((item) => item.language === locale) ??
    items?.find((item) => item.language === 'ru') ??
    items?.[0];
  return (hit?.[field] ?? '') as string;
}

async function firstOk<T>(jobs: Array<() => Promise<T>>): Promise<T> {
  let last: Error | null = null;
  for (const job of jobs) {
    try {
      return await job();
    } catch (err) {
      last = err instanceof Error ? err : new Error('Error');
    }
  }
  throw last ?? new Error('Error');
}

export default function LearnLessonPage() {
  const params = useParams<{ id: string }>();
  const locale = useLocale();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState('');
  const [showPdf, setShowPdf] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [videoSrc, setVideoSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    setVideoSrc('');
    setError('');
    api<Lesson>(`/public/lessons/${params.id}`)
      .then(async (row) => {
        if (cancelled) return;
        setLesson(row);
        try {
          const privateLesson = await api<SubscriberLesson>(`/lessons/${row.id}`);
          if (cancelled) return;
          setLesson({
            ...row,
            tests: privateLesson.tests.length ? privateLesson.tests : row.tests,
            hasPdf: privateLesson.documents.some((item) => item.kind !== 'presentation') || row.hasPdf,
            hasVideo: privateLesson.videos.length > 0 || row.hasVideo,
            videoId: privateLesson.videos[0]?.id ?? row.videoId,
          });
        } catch {
          /* guest */
        }
        try {
          const session = await firstOk([
            () => api<{ playbackUrl: string }>(`/lessons/${row.id}/playback-session`, { method: 'POST' }),
            () => api<{ playbackUrl: string }>(`/public/lessons/${row.id}/playback-session`, { method: 'POST' }),
          ]);
          if (!cancelled) setVideoSrc(mediaUrl(session.playbackUrl));
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : t('admin.empty'));
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const title = lesson?.topicTitle || pick(lesson?.translations, locale);
  const notes = pick(lesson?.translations, locale, 'body');
  const test = lesson?.tests[0];
  const backHref = lesson?.course.slug ? `/courses/${lesson.course.slug}` : '/courses/anatomy-osteo';

  useEffect(() => {
    if (!lesson) return;
    writeContinueLesson({
      courseTitle: lesson.course.slug === 'anatomy-osteo' ? t('home.track.anatomy') : lesson.course.slug,
      topicTitle: title || t('course.topics'),
      href: `/learn/lessons/${lesson.id}`,
      progress: 0,
    });
  }, [lesson, title]);

  async function openPdf() {
    if (!lesson) return;
    setError('');
    try {
      const session = await firstOk([
        () => api<{ viewUrl: string }>(`/lessons/${lesson.id}/notes-session`, { method: 'POST' }),
        () => api<{ viewUrl: string }>(`/public/lessons/${lesson.id}/notes-session`, { method: 'POST' }),
      ]);
      setPdfUrl(mediaUrl(session.viewUrl));
      setShowPdf(true);
    } catch (err) {
      if (notes) {
        setPdfUrl('');
        setShowPdf(true);
        return;
      }
      setError(err instanceof Error ? err.message : t('admin.empty'));
    }
  }

  function openTest() {
    if (!test) return;
    setShowTest(true);
  }

  return (
    <Shell>
      <a href={backHref}>{t('home.track.anatomy')}</a>
      <section className="hero">
        <h1>{title || '...'}</h1>
      </section>
      {error ? <p className="error">{error}</p> : null}

      <div className="lesson-player">
        {videoSrc ? (
          <video
            className="player"
            controls
            playsInline
            preload="auto"
            src={videoSrc}
          />
        ) : (
          <div className="player" />
        )}
      </div>

      <div className="lesson-tools">
        <div className="lesson-col-pdf">
          <button className="button tool-pdf" type="button" onClick={() => void openPdf()}>
            {t('lesson.pdf')}
          </button>
          {lesson ? <LessonMemo lessonId={lesson.id} /> : null}
        </div>
        <button className="button tool-test" type="button" disabled={!test} onClick={openTest}>
          {t('lesson.test')}
        </button>
      </div>

      {showPdf ? (
        <LessonPdfViewer
          title={title}
          notes={notes}
          pdfUrl={pdfUrl}
          onClose={() => {
            setShowPdf(false);
            setPdfUrl('');
          }}
        />
      ) : null}
      {showTest && lesson ? <LessonTestViewer lessonId={lesson.id} onClose={() => setShowTest(false)} /> : null}
    </Shell>
  );
}

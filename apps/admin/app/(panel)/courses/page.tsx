'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CourseProgramSlide } from '../../../components/CourseProgramSlide';
import { adminRequest, titleOf, type Translation } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Course = {
  id: string;
  slug: string;
  status: string;
  translations: Translation[];
  discipline?: { translations: Translation[] };
  prices: { amountMinor: number; currency: string; plan: { code: string } }[];
  sections?: { _count: { lessons: number } }[];
};

const SHOWCASE = [
  { slug: 'pharmacology-y3', title: 'Фармакология', tone: 'blue', lessons: 37, price: 9000 },
  { slug: 'pathophysiology-y3', title: 'Патофизиология', tone: 'purple', lessons: 36, price: 8500 },
  { slug: 'pathanatomy-y3', title: 'Патанатомия', tone: 'pink', lessons: 32, price: 8500 },
  { slug: 'anatomy-osteo', title: 'Анатомия', tone: 'cyan', lessons: 19, price: 8000 },
] as const;

const TONES = ['blue', 'purple', 'pink', 'cyan'] as const;

function asCourses(payload: unknown): Course[] {
  if (Array.isArray(payload)) return payload as Course[];
  if (payload && typeof payload === 'object') {
    const record = payload as { items?: unknown; data?: unknown };
    if (Array.isArray(record.items)) return record.items as Course[];
    if (Array.isArray(record.data)) return record.data as Course[];
  }
  return [];
}

function lessonCount(course?: Course, fallback = 0) {
  if (!course?.sections?.length) return fallback;
  return course.sections.reduce((sum, section) => sum + (section._count?.lessons ?? 0), 0) || fallback;
}

function priceLabel(course?: Course, fallback = 0) {
  const month = course?.prices.find((price) => price.plan.code === 'month_1');
  if (!month) return `${fallback.toLocaleString('ru-RU')} сом`;
  const amount = month.amountMinor >= 1000 ? Math.round(month.amountMinor / 100) : month.amountMinor;
  return `${amount.toLocaleString('ru-RU')} сом`;
}

function statusLabel(status?: string) {
  if (status === 'published') return t('admin.published');
  if (status === 'draft') return t('admin.draft');
  if (status === 'archived') return t('admin.archived');
  return t('admin.published');
}

function matchCourse(items: Course[], slug: string, title: string) {
  const bySlug = items.find((item) => item.slug === slug);
  if (bySlug) return bySlug;
  const needle = title.toLowerCase();
  return items.find((item) =>
    (item.translations ?? []).some((row) => row.title.toLowerCase().includes(needle)),
  );
}

export default function CoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    adminRequest<unknown>('/admin/courses')
      .then((payload) => setItems(asCourses(payload)))
      .catch((err: Error) => setError(err.message));
  }, []);

  const cards = useMemo(() => {
    const used = new Set<string>();
    const showcase = SHOWCASE.map((row) => {
      const course = matchCourse(items, row.slug, row.title);
      if (course) used.add(course.id);
      return {
        key: row.slug,
        id: course?.id,
        slug: course?.slug ?? row.slug,
        tone: row.tone,
        title: row.slug === 'anatomy-osteo' ? row.title : course ? titleOf(course.translations, 'tg') || row.title : row.title,
        category: course ? titleOf(course.discipline?.translations, 'tg') || row.title : row.title,
        lessons: lessonCount(course, row.lessons),
        price: priceLabel(course, row.price),
        status: statusLabel(course?.status),
      };
    });
    const extra = items
      .filter((course) => !used.has(course.id))
      .map((course, index) => ({
        key: course.id,
        id: course.id,
        slug: course.slug,
        tone: TONES[index % TONES.length],
        title: titleOf(course.translations, 'tg'),
        category: titleOf(course.discipline?.translations, 'tg'),
        lessons: lessonCount(course, 0),
        price: priceLabel(course, 0),
        status: statusLabel(course.status),
      }));
    return [...showcase, ...extra];
  }, [items]);

  const slide =
    mounted && openKey
      ? createPortal(
          <CourseProgramSlide
            courseId={openKey}
            onClose={() => {
              setOpenKey(null);
              adminRequest<unknown>('/admin/courses')
                .then((payload) => setItems(asCourses(payload)))
                .catch(() => undefined);
            }}
          />,
          document.body,
        )
      : null;

  return (
    <div className="courses-board">
      <div className="row">
        <h1>{t('admin.nav.courses')}</h1>
        <Link className="button courses-create" href="/courses/new">
          + {t('admin.createCourse')}
        </Link>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="course-stack">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            className="course-card"
            data-tone={card.tone}
            onClick={() => {
              setError('');
              if (card.id) {
                setOpenKey(card.id);
                return;
              }
              void adminRequest<unknown>('/admin/courses')
                .then((payload) => {
                  const list = asCourses(payload);
                  setItems(list);
                  const course = matchCourse(list, card.slug, card.title);
                  if (course?.id) setOpenKey(course.id);
                  else setError('Курс ёфт нашуд');
                })
                .catch((err: Error) => setError(err.message));
            }}
          >
            <div className="course-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 5.6c1.8-.8 3.7-.8 5.5 0v12.8c-1.8-.8-3.7-.8-5.5 0V5.6Z" />
                <path d="M13.5 5.6c1.8-.8 3.7-.8 5.5 0v12.8c-1.8-.8-3.7-.8-5.5 0V5.6Z" />
              </svg>
            </div>
            <div className="course-card-body">
              <div className="course-card-title">
                <h2>{card.title}</h2>
                <span className="course-chip">{card.status}</span>
              </div>
              <p>
                {card.category} · {card.lessons} {t('admin.lessonCount')} · {card.price}
              </p>
            </div>
            <span className="course-edit">{t('admin.edit')}</span>
          </button>
        ))}
      </div>
      {slide}
    </div>
  );
}

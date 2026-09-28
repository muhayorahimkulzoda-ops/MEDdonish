'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { API_BASE, adminRequest, adminUpload, adminUploadPut, titleOf, type Translation } from '../lib/api';
import { t } from '../lib/i18n';

type Video = {
  id: string;
  status: string;
  originalName?: string;
  uploadedBytes?: number;
  byteSize?: number;
  errorMessage?: string | null;
};

type Lesson = {
  id: string;
  status: string;
  isFreePreview: boolean;
  sortOrder: number;
  translations: Translation[];
  videos?: Video[];
  documents?: { document: { id: string; title: string } }[];
  tests?: { id: string; title: string; _count?: { pool: number } }[];
};

type Section = {
  id: string;
  status: string;
  sortOrder: number;
  translations: Translation[];
  lessons: Lesson[];
};

type Course = {
  id: string;
  slug: string;
  status: string;
  instructor?: string;
  translations: Translation[];
  prices: { amountMinor: number; currency: string; plan: { code: string } }[];
  sections: Section[];
};

function fanTitle(items: Translation[] | undefined) {
  return titleOf(items, 'tg');
}

function titleFromVideoName(name?: string) {
  if (!name?.trim()) return '';
  return name.replace(/\.[a-z0-9]{2,8}$/i, '').replace(/\.+$/, '').trim();
}

function lessonLabel(lesson: Lesson) {
  return fanTitle(lesson.translations) || titleFromVideoName(lesson.videos?.[0]?.originalName);
}

function questionCount(lesson: Lesson) {
  return (lesson.tests ?? []).reduce((sum, test) => sum + (test._count?.pool ?? 0), 0);
}

export function CourseProgramSlide({ courseId, onClose }: { courseId: string; onClose?: () => void }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState('published');
  const [editFree, setEditFree] = useState(false);
  const [studioTab, setStudioTab] = useState<'main' | 'media' | 'tests' | 'timecodes'>('main');
  const [dragId, setDragId] = useState<string | null>(null);

  function reload() {
    return adminRequest<Course>(`/admin/courses/${courseId}`).then((next) => {
      setCourse(next);
      setEditing((current) => {
        if (!current) return null;
        const nextLesson =
          next.sections?.flatMap((section) => section.lessons).find((lesson) => lesson.id === current.id) ?? null;
        return nextLesson;
      });
      setEditTitle((currentTitle) => {
        const editingId = editing?.id;
        if (!editingId) return currentTitle;
        const nextLesson = next.sections?.flatMap((section) => section.lessons).find((lesson) => lesson.id === editingId);
        if (!nextLesson) return currentTitle;
        const saved = fanTitle(nextLesson.translations);
        if (currentTitle.trim() && currentTitle.trim() !== saved) return currentTitle;
        return saved || currentTitle;
      });
      return next;
    });
  }

  useEffect(() => {
    setCourse(null);
    setError('');
    reload().catch((err: Error) => setError(err.message));
  }, [courseId]);

  useEffect(() => {
    if (!onClose) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (editing) {
        setEditing(null);
        return;
      }
      onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, editing]);

  const lessons = course?.sections?.flatMap((section) => section.lessons) ?? [];
  const nextNumber = lessons.length + 1;

  function priceLabel() {
    if (!course) return '';
    const month = course.prices.find((item) => item.plan.code === 'month_1') ?? course.prices[0];
    if (!month) return t('admin.fromPrice', { price: '0 сомонӣ' });
    const amount = month.amountMinor >= 1000 ? Math.round(month.amountMinor / 100) : month.amountMinor;
    return t('admin.fromPrice', { price: `${amount.toLocaleString('ru-RU')} сомонӣ` });
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course) return;
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      await adminRequest(`/admin/courses/${course.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          instructor: String(data.get('instructor') || ''),
          status: String(data.get('status')),
          translations: [
            { language: 'ru', title: String(data.get('titleRu')), description: String(data.get('description') || '') },
            { language: 'tg', title: String(data.get('titleTg') || data.get('titleRu')) },
          ],
          prices: [
            { planCode: 'month_1', amountMinor: Math.round(Number(data.get('price1')) * 100), currency: 'TJS' },
            { planCode: 'month_5', amountMinor: Math.round(Number(data.get('price5')) * 100), currency: 'TJS' },
            { planCode: 'year_1', amountMinor: Math.round(Number(data.get('price12')) * 100), currency: 'TJS' },
          ],
        }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function ensureSection(current: Course) {
    if (current.sections[0]) return current.sections[0].id;
    const section = await adminRequest<{ id: string }>(`/admin/courses/${current.id}/sections`, {
      method: 'POST',
      body: JSON.stringify({
        sortOrder: 0,
        status: 'published',
        translations: [
          { language: 'ru', title: t('admin.lessons') },
          { language: 'tg', title: t('admin.lessons') },
        ],
      }),
    });
    return section.id;
  }

  async function addLessonQuick() {
    if (!course) return;
    setError('');
    try {
      const sectionId = await ensureSection(course);
      const title = t('admin.lesson.n', { n: nextNumber });
      await adminRequest(`/admin/sections/${sectionId}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          sortOrder: nextNumber - 1,
          status: 'published',
          translations: [
            { language: 'ru', title },
            { language: 'tg', title },
          ],
        }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function removeLesson(id: string) {
    if (!confirm(t('admin.delete'))) return;
    setError('');
    try {
      await adminRequest(`/admin/lessons/${id}`, { method: 'DELETE' });
      if (editing?.id === id) setEditing(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function moveLesson(index: number, direction: -1 | 1) {
    const other = lessons[index + direction];
    const current = lessons[index];
    if (!current || !other) return;
    setError('');
    try {
      await adminRequest(`/admin/lessons/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ sortOrder: other.sortOrder }),
      });
      await adminRequest(`/admin/lessons/${other.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ sortOrder: current.sortOrder }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = lessons.map((lesson) => lesson.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    setDragId(null);
    setError('');
    try {
      await Promise.all(
        ids.map((id, index) =>
          adminRequest(`/admin/lessons/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ sortOrder: index }),
          }),
        ),
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function persistTopic(value?: string) {
    if (!editing) return;
    const next = (value ?? editTitle).trim();
    if (!next) return;
    await adminRequest(`/admin/lessons/${editing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        translations: [
          { language: 'ru', title: next },
          { language: 'tg', title: next },
        ],
      }),
    });
    setEditing((current) =>
      current
        ? {
            ...current,
            translations: [
              { language: 'ru', title: next },
              { language: 'tg', title: next },
            ],
          }
        : current,
    );
  }

  async function saveEditedTitle() {
    if (!editing || !editTitle.trim()) return;
    setError('');
    try {
      await adminRequest(`/admin/lessons/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: editStatus,
          isFreePreview: editFree,
          translations: [
            { language: 'ru', title: editTitle.trim() },
            { language: 'tg', title: editTitle.trim() },
          ],
        }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  function openLesson(lesson: Lesson) {
    setEditing(lesson);
    setEditTitle(fanTitle(lesson.translations));
    setEditStatus(lesson.status);
    setEditFree(lesson.isFreePreview);
    setStudioTab('media');
  }

  const price = (code: string) => (course?.prices.find((item) => item.plan.code === code)?.amountMinor ?? 0) / 100;

  const inner = !course ? (
    error ? <div className="error">{error}</div> : <p className="muted">{t('admin.processing')}</p>
  ) : (
    <>
      {editing ? (
        <button className="fan-back" type="button" onClick={() => setEditing(null)}>
          ← {t('admin.subjects.all')}
        </button>
      ) : onClose ? (
        <button className="fan-back" type="button" onClick={onClose}>
          ← {t('admin.subjects.all')}
        </button>
      ) : (
        <Link className="fan-back" href="/courses">
          ← {t('admin.subjects.all')}
        </Link>
      )}
      {error ? <div className="error">{error}</div> : null}
      {editing ? (
        <LessonStudio
          lesson={editing}
          index={Math.max(0, lessons.findIndex((item) => item.id === editing.id))}
          title={editTitle}
          status={editStatus}
          free={editFree}
          tab={studioTab}
          onTitle={setEditTitle}
          onTitleSave={() => void persistTopic().catch((err: Error) => setError(err.message))}
          onStatus={setEditStatus}
          onFree={setEditFree}
          onTab={setStudioTab}
          onSave={() => saveEditedTitle()}
          onCancel={() => setEditing(null)}
          onDelete={() => void removeLesson(editing.id)}
          onChanged={reload}
        />
      ) : (
        <>
      <div className="fan-head">
        <div>
          <h1 className="fan-title">{course.slug === 'anatomy-osteo' ? t('home.track.anatomy') : fanTitle(course.translations)}</h1>
          <div className="fan-meta">
            <span className="fan-badge">
              {course.status === 'published' ? t('admin.publishedFull') : t('admin.draft')}
            </span>
            <span>
              {lessons.length} {t('admin.lessonCount')}
            </span>
            <span>{priceLabel()}</span>
          </div>
        </div>
        <button className="fan-add" type="button" onClick={() => void addLessonQuick()}>
          + {t('admin.lesson.n', { n: nextNumber })}
        </button>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <section className="fan-program">
        <div className="fan-program-head">
          <span className="fan-program-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M6 7h12M6 12h12M6 17h8" />
            </svg>
          </span>
          <div>
            <h2>{t('admin.subject.program')}</h2>
            <p>{t('admin.subject.programHint')}</p>
          </div>
          <button className="fan-add-mini" type="button" onClick={() => void addLessonQuick()}>
            + №{nextNumber}
          </button>
        </div>

        <div className="fan-lessons">
          {lessons.length === 0 ? <p className="muted">{t('admin.empty')}</p> : null}
          {lessons.map((lesson, index) => (
            <article
              className={`fan-lesson${dragId === lesson.id ? ' is-dragging' : ''}`}
              key={lesson.id}
              draggable
              onDragStart={() => setDragId(lesson.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void dropOn(lesson.id)}
            >
              <span className="fan-grip" aria-hidden="true">
                ⋮⋮
              </span>
              <span className="fan-num">{index + 1}</span>
              <div className="fan-lesson-copy">
                <strong>{lessonLabel(lesson)}</strong>
                <span>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 8.2h9.2a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5.8a2 2 0 0 1 2-2Z" />
                    <path d="m14.2 11.4 5.6-3.2v8.4l-5.6-3.2" />
                  </svg>
                  {t('admin.lesson.video')}
                </span>
              </div>
              <div className="fan-lesson-actions">
                <button
                  className="fan-edit"
                  type="button"
                  onClick={() => openLesson(lesson)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 17.6V20h2.4L16.8 9.6l-2.4-2.4L4 17.6Z" />
                    <path d="m14.8 6.8 2.4 2.4" />
                  </svg>
                  {t('admin.change')}
                </button>
                <button className="fan-del" type="button" onClick={() => void removeLesson(lesson.id)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7" />
                  </svg>
                  {t('admin.delete')}
                </button>
                <span className="fan-move">
                  <button type="button" disabled={index === 0} onClick={() => void moveLesson(index, -1)} aria-label="up">
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={index === lessons.length - 1}
                    onClick={() => void moveLesson(index, 1)}
                    aria-label="down"
                  >
                    ▼
                  </button>
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
        </>
      )}

      {editing || onClose ? null : (
        <details className="fan-settings">
          <summary>{t('admin.settings')}</summary>
          <form className="form" onSubmit={saveCourse}>
            <label>
              {t('admin.titleRu')}
              <input name="titleRu" defaultValue={titleOf(course.translations, 'ru')} />
            </label>
            <label>
              {t('admin.titleTg')}
              <input name="titleTg" defaultValue={titleOf(course.translations, 'tg')} />
            </label>
            <label>
              {t('admin.description')}
              <textarea name="description" defaultValue={course.translations.find((item) => item.language === 'ru')?.description} />
            </label>
            <label>
              {t('admin.instructor')}
              <input name="instructor" defaultValue={course.instructor} />
            </label>
            <label>
              {t('admin.priceMonth1')}
              <input name="price1" type="number" step="0.01" defaultValue={price('month_1')} />
            </label>
            <label>
              {t('admin.priceMonth5')}
              <input name="price5" type="number" step="0.01" defaultValue={price('month_5')} />
            </label>
            <label>
              {t('admin.priceYear1')}
              <input name="price12" type="number" step="0.01" defaultValue={price('year_1')} />
            </label>
            <label>
              {t('admin.status')}
              <select name="status" defaultValue={course.status}>
                <option value="draft">{t('admin.draft')}</option>
                <option value="published">{t('admin.publish')}</option>
                <option value="archived">{t('admin.archived')}</option>
              </select>
            </label>
            <button type="submit">{t('admin.save')}</button>
          </form>
        </details>
      )}
    </>
  );

  return <div className={onClose ? 'fan-slide-overlay' : 'fan-page'}>{inner}</div>;
}

function LessonStudio({
  lesson,
  index,
  title,
  status,
  free,
  tab,
  onTitle,
  onTitleSave,
  onStatus,
  onFree,
  onTab,
  onSave,
  onCancel,
  onDelete,
  onChanged,
}: {
  lesson: Lesson;
  index: number;
  title: string;
  status: string;
  free: boolean;
  tab: 'main' | 'media' | 'tests' | 'timecodes';
  onTitle: (value: string) => void;
  onTitleSave: () => void;
  onStatus: (value: string) => void;
  onFree: (value: boolean) => void;
  onTab: (value: 'main' | 'media' | 'tests' | 'timecodes') => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
  onChanged: () => Promise<unknown>;
}) {
  const questions = questionCount(lesson);
  const heading = title || fanTitle(lesson.translations);
  const testsSave = useRef<(() => Promise<void>) | null>(null);
  const cuesSave = useRef<(() => Promise<void>) | null>(null);
  const [liveCount, setLiveCount] = useState(questions);

  useEffect(() => {
    setLiveCount(questions);
  }, [questions, lesson.id]);

  async function saveAll() {
    await onSave();
    await testsSave.current?.();
    await cuesSave.current?.();
  }
  return (
    <div className="lesson-studio">
      <article className="fan-lesson">
        <span className="fan-grip" aria-hidden="true">
          ⋮⋮
        </span>
        <span className="fan-num">{index + 1}</span>
        <div className="fan-lesson-copy">
          <strong>{heading}</strong>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8.2h9.2a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5.8a2 2 0 0 1 2-2Z" />
              <path d="m14.2 11.4 5.6-3.2v8.4l-5.6-3.2" />
            </svg>
            {t('admin.lesson.video')}
          </span>
        </div>
        <div className="fan-lesson-actions">
          <button className="fan-edit" type="button" onClick={() => void saveAll()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 17.6V20h2.4L16.8 9.6l-2.4-2.4L4 17.6Z" />
              <path d="m14.8 6.8 2.4 2.4" />
            </svg>
            {t('admin.change')}
          </button>
          <button className="fan-del" type="button" onClick={onDelete}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7" />
            </svg>
            {t('admin.delete')}
          </button>
        </div>
      </article>

      <section className="lesson-studio-card">
        <div className="lesson-studio-card-head">
          <div className="lesson-studio-heading">
            <span className="fan-num">{index + 1}</span>
            <div>
              <h2>{t('admin.lesson.editPanel')}</h2>
              <p>{heading}</p>
            </div>
          </div>
          <div className="lesson-chips">
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 8.2h9.2a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5.8a2 2 0 0 1 2-2Z" />
                <path d="m14.2 11.4 5.6-3.2v8.4l-5.6-3.2" />
              </svg>
              {t('admin.lesson.video')}
            </span>
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4h7l5 5v11H7z" />
                <path d="M14 4v5h5" />
              </svg>
              PDF
            </span>
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 5h12v14H6z" />
                <path d="M9 9h6M9 12h6M9 15h4" />
              </svg>
              {t('admin.questionsShort', { n: liveCount })}
            </span>
          </div>
        </div>

        <label className="lesson-field lesson-topic-field">
          {t('admin.lesson.name')}
          <input
            value={title}
            onChange={(event) => onTitle(event.target.value)}
            onBlur={() => onTitleSave()}
            placeholder={t('admin.lesson.name')}
          />
        </label>

        <div className="lesson-tabs">
          <button type="button" data-active={tab === 'main'} onClick={() => onTab('main')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="7" cy="7" r="2" />
              <circle cx="17" cy="7" r="2" />
              <circle cx="12" cy="17" r="2" />
              <path d="M9 8.2 11 15.2M15 8.2 13 15.2" />
            </svg>
            {t('admin.tab.main')}
          </button>
          <button type="button" data-active={tab === 'media'} onClick={() => onTab('media')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8.2h9.2a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5.8a2 2 0 0 1 2-2Z" />
              <path d="m14.2 11.4 5.6-3.2v8.4l-5.6-3.2" />
            </svg>
            {t('admin.tab.media')}
          </button>
          <button type="button" data-active={tab === 'tests'} onClick={() => onTab('tests')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 5h12v14H6z" />
              <path d="M9 9h6M9 12h6M9 15h4" />
            </svg>
            {t('admin.tab.tests', { n: liveCount })}
          </button>
          <button type="button" data-active={tab === 'timecodes'} onClick={() => onTab('timecodes')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8" fill="none" />
              <path d="M12 8v5l3 2" fill="none" />
            </svg>
            {t('admin.tab.timecodes')}
          </button>
        </div>

        {tab === 'main' ? (
          <div className="lesson-studio-form">
            <label className="lesson-field">
              {t('admin.status')}
              <select value={status} onChange={(event) => onStatus(event.target.value)}>
                <option value="published">{t('admin.publishedFull')}</option>
                <option value="draft">{t('admin.draft')}</option>
                <option value="archived">{t('admin.archived')}</option>
              </select>
            </label>
            <label className="lesson-check">
              <input type="checkbox" checked={free} onChange={(event) => onFree(event.target.checked)} />
              <span>
                <strong>{t('admin.freePreview')}</strong>
                <small>{t('admin.freePreviewHint')}</small>
              </span>
            </label>
          </div>
        ) : null}

        {tab === 'media' ? <LessonMedia lesson={lesson} topicName={title} onChanged={onChanged} /> : null}
        <div hidden={tab !== 'tests'}>
          <LessonTests
            lesson={lesson}
            title={heading}
            saveRef={testsSave}
            onCount={setLiveCount}
            onChanged={onChanged}
          />
        </div>
        <div hidden={tab !== 'timecodes'}>
          <LessonTimecodes lessonId={lesson.id} saveRef={cuesSave} />
        </div>

        <div className="lesson-studio-actions">
          <button className="fan-add" type="button" onClick={() => void saveAll()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 4h9l3 3v13H6z" />
              <path d="M9 4v5h6V4M9 14h6" />
            </svg>
            {t('admin.saveChanges')}
          </button>
          <button className="lesson-cancel" type="button" onClick={onCancel}>
            {t('admin.cancel')}
          </button>
        </div>
      </section>
    </div>
  );
}

type StoredQuestion = {
  isActive?: boolean;
  translations?: { language: string; prompt: string }[];
  options?: {
    isCorrect: boolean;
    sortOrder: number;
    translations?: { language: string; text: string }[];
  }[];
};

function promptOf(items: { language: string; prompt?: string; text?: string }[] | undefined) {
  return items?.find((item) => item.language === 'tg')?.prompt
    ?? items?.find((item) => item.language === 'tg')?.text
    ?? items?.[0]?.prompt
    ?? items?.[0]?.text
    ?? '';
}

function questionsToJson(rows: StoredQuestion[]) {
  const items = rows.map((row) => ({
    questionText: promptOf(row.translations),
    answers: (row.options ?? []).map((option) => ({
      answerText: promptOf(option.translations),
      isCorrect: option.isCorrect,
    })),
  }));
  return JSON.stringify(items, null, 2);
}

function parsedCount(text: string) {
  if (!text.trim()) return 0;
  try {
    const parsed = JSON.parse(text) as unknown;
    const list = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown[] }).questions;
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

function LessonTests({
  lesson,
  title,
  saveRef,
  onCount,
  onChanged,
}: {
  lesson: Lesson;
  title: string;
  saveRef: { current: (() => Promise<void>) | null };
  onCount: (value: number) => void;
  onChanged: () => Promise<unknown>;
}) {
  const [jsonText, setJsonText] = useState('[]');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminRequest<StoredQuestion[]>(`/admin/questions?lessonId=${lesson.id}`)
      .then((rows) => {
        if (cancelled) return;
        const text = questionsToJson(rows);
        setJsonText(text);
        onCount(parsedCount(text));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [lesson.id]);

  useEffect(() => {
    saveRef.current = async () => {
      setError('');
      setNotice('');
      const trimmed = jsonText.trim();
      let questions: unknown[] = [];
      if (trimmed) {
        try {
          const parsed = JSON.parse(trimmed) as unknown;
          questions = Array.isArray(parsed) ? parsed : ((parsed as { questions?: unknown[] }).questions ?? []);
          if (!Array.isArray(questions)) throw new Error(t('admin.tests.invalid'));
        } catch {
          setError(t('admin.tests.invalid'));
          throw new Error(t('admin.tests.invalid'));
        }
      }
      setBusy(true);
      try {
        await adminRequest(`/admin/lessons/${lesson.id}/tests`, {
          method: 'PUT',
          body: JSON.stringify({
            title: `${t('admin.tests.title')}: ${title}`.slice(0, 180),
            questions,
          }),
        });
        setNotice(t('admin.tests.saved'));
        onCount(questions.length);
        await onChanged();
      } catch (err) {
        const message = err instanceof Error ? err.message : t('admin.tests.invalid');
        setError(message);
        throw err;
      } finally {
        setBusy(false);
      }
    };
    return () => {
      saveRef.current = null;
    };
  }, [jsonText, lesson.id, title, onChanged, onCount, saveRef]);

  const count = parsedCount(jsonText);
  let previewItems: { questionText: string; answers: { answerText: string; isCorrect: boolean }[] }[] = [];
  try {
    const parsed = JSON.parse(jsonText || '[]') as unknown;
    const list = Array.isArray(parsed) ? parsed : [];
    previewItems = list.slice(0, 12).map((item) => {
      const row = item as {
        questionText?: string;
        question?: string;
        answers?: { answerText?: string; text?: string; isCorrect?: boolean }[];
        options?: { text: string; id: string }[];
        correct_answer?: string | string[];
      };
      if (row.answers) {
        return {
          questionText: row.questionText || row.question || '',
          answers: row.answers.map((answer) => ({
            answerText: answer.answerText || answer.text || '',
            isCorrect: Boolean(answer.isCorrect),
          })),
        };
      }
      const correct = new Set(Array.isArray(row.correct_answer) ? row.correct_answer : [row.correct_answer]);
      return {
        questionText: row.question || '',
        answers: (row.options ?? []).map((option) => ({
          answerText: option.text,
          isCorrect: correct.has(option.id),
        })),
      };
    });
  } catch {
    previewItems = [];
  }

  return (
    <div className="tests-panel">
      <p className="tests-hint">{t('admin.tests.hint')}</p>
      {error ? <div className="error">{error}</div> : null}
      {notice ? <p className="muted">{notice}</p> : null}
      <article className="tests-card">
        <div className="tests-card-head">
          <div>
            <h3>{t('admin.tests.title')}</h3>
            <p>{t('admin.tests.format')}</p>
          </div>
          <span className="media-check">✓</span>
        </div>
        <label className="tests-upload">
          JSON
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = '';
              if (!file) return;
              file.text().then((text) => {
                setJsonText(text);
                onCount(parsedCount(text));
              }).catch((err: Error) => setError(err.message));
            }}
          />
        </label>
        <textarea
          className="tests-json"
          value={jsonText}
          spellCheck={false}
          disabled={busy}
          onChange={(event) => {
            setJsonText(event.target.value);
            onCount(parsedCount(event.target.value));
          }}
        />
        <div className="tests-card-foot">
          <span>{t('admin.tests.count', { n: count })}</span>
          <button className="tests-show" type="button" onClick={() => setPreview((open) => !open)}>
            {preview ? t('admin.tests.hide') : t('admin.tests.show')}
          </button>
        </div>
      </article>
      {preview ? (
        <div className="tests-preview">
          <h3>{t('admin.tests.preview')}</h3>
          {previewItems.length === 0 ? <p className="muted">{t('admin.tests.empty')}</p> : null}
          {previewItems.map((item, index) => (
            <article key={index} className="tests-preview-item">
              <strong>
                {index + 1}. {item.questionText}
              </strong>
              <ul>
                {item.answers.map((answer, answerIndex) => (
                  <li key={answerIndex} data-correct={answer.isCorrect}>
                    {answer.answerText}
                    {answer.isCorrect ? ` · ${t('admin.tests.correct')}` : ''}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type CueItem = { id: string; prompt: string; offsetSec: number };

function parseClock(value: string) {
  const text = value.trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(text);
  const parts = text.split(':').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function formatClock(sec: number) {
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function LessonTimecodes({
  lessonId,
  saveRef,
}: {
  lessonId: string;
  saveRef: { current: (() => Promise<void>) | null };
}) {
  const [items, setItems] = useState<CueItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [clock, setClock] = useState('0:31');
  const [error, setError] = useState('');

  function persist(next: CueItem[]) {
    return adminRequest(`/admin/lessons/${lessonId}/timecodes`, {
      method: 'PUT',
      body: JSON.stringify({
        items: next.map((item) => ({ prompt: item.prompt, offsetSec: item.offsetSec })),
      }),
    });
  }

  useEffect(() => {
    let cancelled = false;
    adminRequest<CueItem[]>(`/admin/lessons/${lessonId}/timecodes`)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  useEffect(() => {
    saveRef.current = async () => {
      setError('');
      await persist(items);
    };
    return () => {
      saveRef.current = null;
    };
  }, [items, lessonId, saveRef]);

  async function addCue() {
    const text = prompt.trim();
    const offset = parseClock(clock);
    if (!text) {
      setError(t('admin.timecodes.needBoth'));
      return;
    }
    if (offset === null) {
      setError(t('admin.timecodes.badTime'));
      return;
    }
    setError('');
    const next = [...items, { id: `local-${Date.now()}`, prompt: text, offsetSec: offset }].sort(
      (a, b) => a.offsetSec - b.offsetSec,
    );
    setPrompt('');
    try {
      const saved = await persist(next);
      setItems(saved as CueItem[]);
    } catch (err) {
      setItems(next);
      setError(err instanceof Error ? err.message : t('admin.timecodes.badTime'));
    }
  }

  async function removeCue(id: string) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    try {
      const saved = await persist(next);
      setItems(saved as CueItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.timecodes.badTime'));
    }
  }

  return (
    <section className="cues-card">
      <div className="cues-head">
        <span className="cues-clock" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12 8v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h3>{t('admin.timecodes.title')}</h3>
          <p>{t('admin.timecodes.hint')}</p>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="cues-row">
        <input
          value={prompt}
          placeholder={t('admin.timecodes.question')}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void addCue();
            }
          }}
        />
        <input
          className="cues-time"
          value={clock}
          placeholder="0:31"
          onChange={(event) => setClock(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void addCue();
            }
          }}
        />
        <button className="cues-add" type="button" onClick={() => void addCue()} aria-label="+">
          +
        </button>
      </div>
      {items.length === 0 ? <p className="muted">{t('admin.timecodes.empty')}</p> : null}
      {items.map((item) => (
        <div className="cues-item" key={item.id}>
          <span>{item.prompt}</span>
          <strong>{formatClock(item.offsetSec)}</strong>
          <button className="media-x" type="button" onClick={() => void removeCue(item.id)}>
            ×
          </button>
        </div>
      ))}
    </section>
  );
}

const CHUNK = 8 * 1024 * 1024;
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${bytes} B`;
}

function isAllowedVideo(file: File) {
  return /\.(mp4|webm|mov)$/i.test(file.name);
}

function LessonMedia({
  lesson,
  topicName,
  onChanged,
}: {
  lesson: Lesson;
  topicName?: string;
  onChanged: () => Promise<unknown>;
}) {
  const video = lesson.videos?.[0];
  const document = lesson.documents?.[0]?.document;
  const [progress, setProgress] = useState<number | null>(null);
  const [picked, setPicked] = useState<{ name: string; size: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!video?.id || busy === 'video') {
      setPreviewUrl('');
      return;
    }
    let cancelled = false;
    adminRequest<{ playbackUrl: string }>(`/admin/videos/${video.id}/playback-session`, { method: 'POST' })
      .then((session) => {
        if (cancelled) return;
        const host = window.location.hostname;
        setPreviewUrl(`http://${host}:3000${session.playbackUrl}`);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [video?.id, busy]);

  function isHevc(file: File) {
    const name = file.name.toLowerCase();
    return name.includes('hevc') || name.includes('h265') || name.includes('h.265') || file.type.includes('hevc');
  }

  async function uploadVideo(file: File, replace = false) {
    if (!isAllowedVideo(file)) {
      setError(t('admin.media.badType'));
      return;
    }
    if (isHevc(file)) {
      setError(t('admin.media.hevc'));
      return;
    }
    if (file.size > 6 * 1024 * 1024 * 1024) {
      setError(t('admin.media.tooBig'));
      return;
    }
    setError('');
    setPicked({ name: file.name, size: file.size });
    setProgress(0);
    setBusy('video');
    try {
      if (replace && video) {
        await adminRequest(`/admin/videos/${video.id}`, { method: 'DELETE' });
      }
      const created = await adminRequest<{ id: string; chunkSize: number }>(`/admin/lessons/${lesson.id}/videos`, {
        method: 'POST',
        body: JSON.stringify({ originalName: file.name, byteSize: file.size }),
      });
      for (let offset = 0; offset < file.size; offset += CHUNK) {
        const part = file.slice(offset, Math.min(offset + CHUNK, file.size));
        const body = new FormData();
        body.append('chunk', part);
        body.append('offset', String(offset));
        await adminUploadPut(`/admin/videos/${created.id}/chunks`, body);
        setProgress(Math.round(((offset + part.size) / file.size) * 100));
      }
      await adminRequest(`/admin/videos/${created.id}/complete`, { method: 'POST' });
      const typed = topicName?.trim();
      if (typed) {
        await adminRequest(`/admin/lessons/${lesson.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            translations: [
              { language: 'ru', title: typed },
              { language: 'tg', title: typed },
            ],
          }),
        });
      }
      setProgress(100);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy('');
      setProgress(null);
      setPicked(null);
    }
  }

  async function uploadPdf(file: File) {
    setError('');
    setBusy('pdf');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('title', file.name.replace(/\.pdf$/i, '') || file.name);
      await adminUpload(`/admin/lessons/${lesson.id}/documents`, body);
      const typed = topicName?.trim();
      if (typed) {
        await adminRequest(`/admin/lessons/${lesson.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            translations: [
              { language: 'ru', title: typed },
              { language: 'tg', title: typed },
            ],
          }),
        });
      }
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy('');
    }
  }

  async function removeVideo() {
    if (!video) return;
    setError('');
    setBusy('video');
    try {
      await adminRequest(`/admin/videos/${video.id}`, { method: 'DELETE' });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy('');
    }
  }

  async function removePdf() {
    if (!document) return;
    setError('');
    setBusy('pdf');
    try {
      await adminRequest(`/admin/documents/${document.id}`, { method: 'DELETE' });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy('');
    }
  }

  async function openSigned(path: string, urlKey: 'viewUrl' | 'playbackUrl') {
    const session = await adminRequest<{ [key: string]: string }>(path, { method: 'POST' });
    window.open(`${API_BASE.replace(/\/api\/v1$/, '')}${session[urlKey]}`, '_blank');
  }

  return (
    <div className="media-grid">
      {error ? <div className="error" style={{ gridColumn: '1 / -1' }}>{error}</div> : null}
      <article className="media-card">
        <div className="media-card-head">
          <h3>{t('admin.media.videoTitle')}</h3>
        </div>
        <p>{t('admin.media.videoHint')}</p>
        {video && busy !== 'video' ? (
          <>
            <div className="media-file">
              <span className="media-check">✓</span>
              <span>
                {t('admin.media.uploaded')}
                <br />
                {video.originalName ?? t('admin.media.videoTitle')}
                {video.byteSize ? ` · ${formatBytes(Number(video.byteSize))}` : ''}
              </span>
            </div>
            {previewUrl ? (
              <video className="media-preview" controls playsInline preload="metadata" src={previewUrl} />
            ) : null}
            <div className="media-video-actions">
              <label className="media-file media-file-empty">
                {t('admin.media.replaceVideo')}
                <input
                  type="file"
                  accept={VIDEO_ACCEPT}
                  hidden
                  disabled={busy === 'video'}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = '';
                    if (file) void uploadVideo(file, true);
                  }}
                />
              </label>
              <button className="media-file" type="button" onClick={() => void removeVideo()} disabled={busy === 'video'}>
                {t('admin.media.deleteVideo')}
              </button>
            </div>
          </>
        ) : (
          <>
            {picked ? (
              <div className="media-file">
                <span>
                  {picked.name} · {formatBytes(picked.size)}
                </span>
              </div>
            ) : null}
            <label className="media-file media-file-empty">
              {busy === 'video' ? t('admin.processing') : t('admin.media.chooseVideo')}
              <input
                type="file"
                accept={VIDEO_ACCEPT}
                hidden
                disabled={busy === 'video'}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = '';
                  if (file) void uploadVideo(file);
                }}
              />
            </label>
          </>
        )}
        {progress !== null ? (
          <div className="media-progress">
            <i>
              <span style={{ width: `${progress}%` }} />
            </i>
            <em>{progress}%</em>
          </div>
        ) : null}
      </article>

      <article className="media-card">
        <div className="media-card-head">
          <h3>{t('admin.media.pdfTitle')}</h3>
          {document ? (
            <button className="media-x" type="button" onClick={() => void removePdf()} disabled={busy === 'pdf'}>
              ×
            </button>
          ) : null}
        </div>
        <p>{t('admin.media.pdfHint')}</p>
        {document ? (
          <button
            className="media-file"
            type="button"
            disabled={busy === 'pdf'}
            onClick={() => void openSigned(`/admin/documents/${document.id}/view-session`, 'viewUrl')}
          >
            <span className="media-check">✓</span>
            <span>{document.title}</span>
          </button>
        ) : (
          <label className="media-file media-file-empty">
            {busy === 'pdf' ? t('admin.processing') : t('admin.media.choosePdf')}
            <input
              type="file"
              accept="application/pdf,.pdf"
              hidden
              disabled={busy === 'pdf'}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = '';
                if (file) void uploadPdf(file);
              }}
            />
          </label>
        )}
      </article>
    </div>
  );
}

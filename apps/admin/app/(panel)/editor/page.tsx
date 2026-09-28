'use client';

import { useEffect, useState } from 'react';
import {
  adminRequest,
  adminUpload,
  adminUploadPut,
  titleOf,
  type Translation,
} from '../../../lib/api';
import { t } from '../../../lib/i18n';

const YEAR3 = [
  { slug: 'pathophysiology-y3', title: 'Патофизиология' },
  { slug: 'pathanatomy-y3', title: 'Патанатомия' },
  { slug: 'pharmacology-y3', title: 'Фармакология' },
] as const;

const SAMPLE_JSON = `[
  {
    "type": "single_choice",
    "question": "Вопрос 1",
    "options": [
      { "id": "A", "text": "Вариант A" },
      { "id": "B", "text": "Вариант B" },
      { "id": "C", "text": "Вариант C" },
      { "id": "D", "text": "Вариант D" }
    ],
    "correct_answer": "A"
  }
]`;

const CHUNK = 8 * 1024 * 1024;

type Lesson = {
  id: string;
  status: string;
  sortOrder: number;
  translations: Translation[];
  videos?: { id: string; status: string; originalName?: string }[];
  documents?: { document: { id: string; title: string } }[];
  tests?: { id: string; title: string; _count?: { pool: number } }[];
};

type Course = {
  id: string;
  slug: string;
  translations: Translation[];
  sections: { id: string; translations: Translation[]; lessons: Lesson[] }[];
};

type CourseCard = {
  id: string;
  slug: string;
  translations: Translation[];
};

function parseQuestions(text: string) {
  const parsed = JSON.parse(text) as unknown;
  const questions = Array.isArray(parsed) ? parsed : (parsed as { questions: unknown[] }).questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('JSON должен быть массивом вопросов');
  }
  return questions;
}

export default function EditorPage() {
  const [cards, setCards] = useState<CourseCard[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [topic, setTopic] = useState('');
  const [notesText, setNotesText] = useState('');
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    adminRequest<CourseCard[]>('/admin/courses')
      .then(setCards)
      .catch((err: Error) => setError(err.message));
  }, []);

  const year3 = YEAR3.map((item) => ({
    ...item,
    course: cards.find((row) => row.slug === item.slug),
  }));

  function resetDraft() {
    setLessonId('');
    setTopic('');
    setNotesText('');
    setJsonText(SAMPLE_JSON);
    setVideoFile(null);
    setPdfFile(null);
    setProgress(null);
  }

  async function reloadCourse(id: string) {
    const next = await adminRequest<Course>(`/admin/courses/${id}`);
    setCourse(next);
    return next;
  }

  async function openCourse(id: string) {
    setError('');
    setNotice('');
    resetDraft();
    await reloadCourse(id);
    setOpen(false);
  }

  function editLesson(lesson: Lesson) {
    setLessonId(lesson.id);
    setTopic(titleOf(lesson.translations));
    setNotesText(lesson.translations.find((row) => row.language === 'ru')?.body
      ?? lesson.translations[0]?.body
      ?? '');
    setJsonText(SAMPLE_JSON);
    setVideoFile(null);
    setPdfFile(null);
    setProgress(null);
    setError('');
    setNotice('');
    setOpen(true);
  }

  async function removeLesson(id: string) {
    if (!course) return;
    setError('');
    setNotice('');
    setBusy('delete');
    try {
      await adminRequest(`/admin/lessons/${id}`, { method: 'DELETE' });
      if (lessonId === id) resetDraft();
      await reloadCourse(course.id);
      setNotice(t('admin.editor.deleted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy('');
    }
  }

  async function ensureLesson() {
    if (!course) throw new Error(t('admin.editor.needTopic'));
    if (lessonId) return lessonId;
    if (!topic.trim()) throw new Error(t('admin.editor.needTopic'));
    let sectionId = course.sections[0]?.id;
    if (!sectionId) {
      const section = await adminRequest<{ id: string }>(`/admin/courses/${course.id}/sections`, {
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
      sectionId = section.id;
    }
    const lesson = await adminRequest<{ id: string }>(`/admin/sections/${sectionId}/lessons`, {
      method: 'POST',
      body: JSON.stringify({
        sortOrder: course.sections.reduce((sum, section) => sum + section.lessons.length, 0),
        status: 'published',
        translations: [
          { language: 'ru', title: topic.trim(), body: notesText },
          { language: 'tg', title: topic.trim(), body: notesText },
        ],
      }),
    });
    setLessonId(lesson.id);
    await reloadCourse(course.id);
    return lesson.id;
  }

  async function run(section: string, work: () => Promise<string>) {
    if (!course) return;
    setError('');
    setNotice('');
    setBusy(section);
    try {
      const message = await work();
      await reloadCourse(course.id);
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy('');
      setProgress(null);
    }
  }

  function lessonTranslations() {
    return [
      { language: 'ru', title: topic.trim(), body: notesText },
      { language: 'tg', title: topic.trim() || notesText.slice(0, 80), body: notesText },
    ];
  }

  async function saveTopic() {
    await run('topic', async () => {
      if (!topic.trim()) throw new Error(t('admin.editor.topic'));
      if (lessonId) {
        await adminRequest(`/admin/lessons/${lessonId}`, {
          method: 'PATCH',
          body: JSON.stringify({ translations: lessonTranslations() }),
        });
      } else {
        await ensureLesson();
      }
      return t('admin.editor.topicSaved');
    });
  }

  async function saveText() {
    await run('text', async () => {
      const id = await ensureLesson();
      await adminRequest(`/admin/lessons/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ translations: lessonTranslations() }),
      });
      return t('admin.editor.textSaved');
    });
  }

  async function saveVideo() {
    await run('video', async () => {
      if (!videoFile) throw new Error(t('admin.editor.videoFile'));
      const id = await ensureLesson();
      const created = await adminRequest<{ id: string }>(`/admin/lessons/${id}/videos`, {
        method: 'POST',
        body: JSON.stringify({ originalName: videoFile.name, byteSize: videoFile.size }),
      });
      for (let offset = 0; offset < videoFile.size; offset += CHUNK) {
        const part = videoFile.slice(offset, Math.min(offset + CHUNK, videoFile.size));
        const body = new FormData();
        body.append('chunk', part);
        body.append('offset', String(offset));
        await adminUploadPut(`/admin/videos/${created.id}/chunks`, body);
        setProgress(Math.round(((offset + part.size) / videoFile.size) * 100));
      }
      await adminRequest(`/admin/videos/${created.id}/complete`, { method: 'POST' });
      setVideoFile(null);
      return t('admin.editor.videoSaved');
    });
  }

  async function savePdf() {
    await run('pdf', async () => {
      if (!pdfFile) throw new Error(t('admin.editor.notesPdf'));
      const id = await ensureLesson();
      const body = new FormData();
      body.append('file', pdfFile);
      body.append('title', pdfFile.name);
      await adminUpload(`/admin/lessons/${id}/documents`, body);
      setPdfFile(null);
      return t('admin.editor.pdfSaved');
    });
  }

  async function saveTest() {
    await run('test', async () => {
      const questions = parseQuestions(jsonText);
      const id = await ensureLesson();
      await adminRequest(`/admin/lessons/${id}/tests`, {
        method: 'POST',
        body: JSON.stringify({ title: `Тест: ${topic.trim() || 'урок'}`, questions }),
      });
      return t('admin.editor.testSaved');
    });
  }

  const lessons = course?.sections.flatMap((section) => section.lessons) ?? [];
  const locked = Boolean(busy);

  return (
    <>
      <h1>{t('admin.editor')}</h1>
      <p className="muted">{t('admin.editor.pick')}</p>
      {error && !open ? <div className="error">{error}</div> : null}
      {notice && !open ? <p className="muted">{notice}</p> : null}

      <div className="editor-tracks">
        {year3.map((item) => (
          <button
            type="button"
            className={`card editor-track${course?.slug === item.slug ? ' editor-track-active' : ''}`}
            key={item.slug}
            disabled={!item.course || locked}
            onClick={() => item.course && void openCourse(item.course.id)}
          >
            <strong>{item.title}</strong>
          </button>
        ))}
      </div>

      {course ? (
        <section className="section-block">
          <div className="row">
            <h2>{titleOf(course.translations)}</h2>
            <div className="actions">
              <button
                type="button"
                onClick={() => {
                  resetDraft();
                  setError('');
                  setNotice('');
                  setOpen(true);
                }}
              >
                {t('admin.editor.add')}
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('admin.editor.topic')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lessons.length === 0 ? (
                  <tr><td colSpan={2}>{t('admin.empty')}</td></tr>
                ) : lessons.map((lesson) => (
                  <tr key={lesson.id}>
                    <td>{titleOf(lesson.translations)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="secondary"
                          disabled={locked}
                          onClick={() => editLesson(lesson)}
                        >
                          {t('admin.edit')}
                        </button>
                        <button
                          type="button"
                          className="danger icon-x"
                          disabled={locked}
                          aria-label={t('admin.editor.deleted')}
                          onClick={() => void removeLesson(lesson.id)}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {open && course ? (
        <div className="modal-backdrop" role="presentation" onClick={() => !locked && setOpen(false)}>
          <div className="modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="row">
              <h2>{titleOf(course.translations)}</h2>
              <button className="secondary" type="button" disabled={locked} onClick={() => setOpen(false)}>
                {t('admin.editor.close')}
              </button>
            </div>
            {error ? <div className="error">{error}</div> : null}
            {notice ? <p className="muted">{notice}</p> : null}

            <section className="editor-block">
              <h3>{t('admin.editor.topic')}</h3>
              <label>
                {t('admin.editor.topic')}
                <input value={topic} onChange={(event) => setTopic(event.target.value)} />
              </label>
              <button type="button" disabled={locked || !topic.trim()} onClick={() => void saveTopic()}>
                {busy === 'topic' ? t('admin.processing') : t('admin.save')}
              </button>
            </section>

            <section className="editor-block">
              <h3>{t('admin.editor.video')}</h3>
              <label>
                {t('admin.editor.videoFile')}
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                />
                {videoFile ? <span className="muted">{videoFile.name}</span> : null}
                {progress !== null ? <span className="muted">{progress}%</span> : null}
              </label>
              <button type="button" disabled={locked || !videoFile} onClick={() => void saveVideo()}>
                {busy === 'video' ? t('admin.processing') : t('admin.save')}
              </button>
            </section>

            <section className="editor-block">
              <h3>{t('admin.editor.text')}</h3>
              <label>
                {t('admin.editor.text')}
                <textarea value={notesText} onChange={(event) => setNotesText(event.target.value)} rows={8} />
              </label>
              <button type="button" disabled={locked || !topic.trim()} onClick={() => void saveText()}>
                {busy === 'text' ? t('admin.processing') : t('admin.save')}
              </button>
            </section>

            <section className="editor-block">
              <h3>{t('admin.editor.notes')}</h3>
              <label>
                {t('admin.editor.notesPdf')}
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
                />
                {pdfFile ? <span className="muted">{pdfFile.name}</span> : null}
              </label>
              <button type="button" disabled={locked || !pdfFile} onClick={() => void savePdf()}>
                {busy === 'pdf' ? t('admin.processing') : t('admin.save')}
              </button>
            </section>

            <section className="editor-block">
              <h3>{t('admin.editor.testJson')}</h3>
              <label>
                {t('admin.editor.testJson')}
                <textarea className="json-box" value={jsonText} onChange={(event) => setJsonText(event.target.value)} rows={12} />
                <span className="muted">{t('admin.editor.testHint')}</span>
              </label>
              <button type="button" disabled={locked || !jsonText.trim()} onClick={() => void saveTest()}>
                {busy === 'test' ? t('admin.processing') : t('admin.save')}
              </button>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function titleFromVideoName(originalName?: string | null) {
  if (!originalName?.trim()) return '';
  return originalName.replace(/\.[a-z0-9]{2,8}$/i, '').replace(/\.+$/, '').trim();
}

export function pickLessonTitle(translations: { language: string; title?: string | null }[] | undefined) {
  return (
    translations?.find((item) => item.language === 'tg')?.title
    || translations?.find((item) => item.language === 'ru')?.title
    || translations?.[0]?.title
    || ''
  );
}

export function lessonTopicTitle(
  translations: { language: string; title?: string | null }[] | undefined,
  originalName?: string | null,
  _times?: { lessonUpdatedAt?: Date | string; videoUpdatedAt?: Date | string },
) {
  return pickLessonTitle(translations) || titleFromVideoName(originalName);
}

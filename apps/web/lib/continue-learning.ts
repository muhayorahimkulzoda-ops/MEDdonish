const CONTINUE_KEY = 'meddonish.continue';

export type ContinueLesson = {
  courseTitle: string;
  topicTitle: string;
  href: string;
  progress: number;
};

export function readContinueLesson(): ContinueLesson | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONTINUE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContinueLesson;
    if (!parsed?.href || !parsed.courseTitle) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeContinueLesson(entry: ContinueLesson) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONTINUE_KEY, JSON.stringify(entry));
}

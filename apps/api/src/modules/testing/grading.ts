export interface GradeSettings {
  grade5Min: number;
  grade4Min: number;
  grade3Min: number;
  passMin: number;
}

export const DEFAULT_GRADE_SETTINGS: GradeSettings = {
  grade5Min: 28,
  grade4Min: 24,
  grade3Min: 15,
  passMin: 15,
};

export function gradeAttempt(
  correctCount: number,
  questionCount: number,
  settings: GradeSettings = DEFAULT_GRADE_SETTINGS,
) {
  const percent =
    questionCount === 0 ? 0 : Math.round((correctCount / questionCount) * 100);
  let grade: 5 | 4 | 3 | 'failed' = 'failed';
  if (correctCount >= settings.grade5Min) grade = 5;
  else if (correctCount >= settings.grade4Min) grade = 4;
  else if (correctCount >= settings.grade3Min) grade = 3;
  return {
    correctCount,
    questionCount,
    percent,
    grade,
    passed: correctCount >= settings.passMin,
    label: grade === 'failed' ? 'failed' : String(grade),
  };
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const TYPE_MAP = {
  single_choice: 'SINGLE_CHOICE',
  true_false: 'TRUE_FALSE',
  matching: 'MATCHING',
  ordering: 'ORDERING',
  image_single_choice: 'IMAGE_SINGLE_CHOICE',
} as const;

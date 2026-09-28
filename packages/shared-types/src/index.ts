export const LANGUAGES = ['ru', 'tg', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const USER_STATUSES = ['active', 'blocked', 'deleted'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PLATFORMS = ['web', 'android', 'ios'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const ACCESS_SOURCES = ['payment', 'admin', 'promotion'] as const;
export type AccessSource = (typeof ACCESS_SOURCES)[number];

export const PAYMENT_STATUSES = [
  'created',
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_SOURCES = [
  'WEB_PAYMENT',
  'GOOGLE_PLAY',
  'APPLE_IAP',
  'ADMIN',
] as const;
export type PaymentSource = (typeof PAYMENT_SOURCES)[number];

export const WEB_PAYMENT_METHODS = ['dushanbe_city', 'alif', 'eskhata'] as const;
export type WebPaymentMethod = (typeof WEB_PAYMENT_METHODS)[number];

export function isWebPaymentMethod(value: string | undefined): value is WebPaymentMethod {
  return Boolean(value && (WEB_PAYMENT_METHODS as readonly string[]).includes(value));
}

export const PLAN_CODES = ['month_1', 'month_5', 'year_1'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const PLAN_DURATION_DAYS: Record<PlanCode, number> = {
  month_1: 30,
  month_5: 150,
  year_1: 365,
};

export const QUESTION_TYPES = [
  'SINGLE_CHOICE',
  'TRUE_FALSE',
  'MATCHING',
  'ORDERING',
  'IMAGE_SINGLE_CHOICE',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const TEST_MODES = ['TRAINING', 'EXAM'] as const;
export type TestMode = (typeof TEST_MODES)[number];

export const VIDEO_STATUSES = [
  'UPLOADING',
  'PROCESSING',
  'ENCRYPTING',
  'READY',
  'FAILED',
] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const ENTITLEMENT_STATUSES = [
  'active',
  'expired',
  'suspended',
  'revoked',
] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export type GradeValue = 5 | 4 | 3 | 'failed';

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

export interface GradeResult {
  correctCount: number;
  questionCount: number;
  percent: number;
  grade: GradeValue;
  passed: boolean;
}

export function gradeAttempt(
  correctCount: number,
  questionCount: number,
  settings: GradeSettings = DEFAULT_GRADE_SETTINGS,
): GradeResult {
  const percent =
    questionCount === 0 ? 0 : Math.round((correctCount / questionCount) * 100);

  let grade: GradeValue = 'failed';
  if (correctCount >= settings.grade5Min) grade = 5;
  else if (correctCount >= settings.grade4Min) grade = 4;
  else if (correctCount >= settings.grade3Min) grade = 3;

  return {
    correctCount,
    questionCount,
    percent,
    grade,
    passed: correctCount >= settings.passMin,
  };
}

export const DEFAULT_TEST_QUESTION_COUNT = 30;
export const DEFAULT_SECONDS_PER_QUESTION = 20;
export const DEFAULT_VIDEO_COMPLETED_PERCENT = 90;
export const DEFAULT_FREE_PREVIEW_LIMIT = 1;

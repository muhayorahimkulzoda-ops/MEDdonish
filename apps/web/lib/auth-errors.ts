import { t } from '../lib/i18n';

export function authError(code: string, fallback: string) {
  if (code === 'PHONE_TAKEN') return t('auth.error.phoneTaken');
  if (code === 'PHONE_INVALID') return t('auth.error.phoneInvalid');
  if (code === 'PASSWORD_TOO_SHORT') return t('auth.error.passwordShort');
  if (code === 'PASSWORD_MISMATCH') return t('auth.error.passwordMismatch');
  if (code === 'PASSWORD_WEAK') return t('auth.error.passwordWeak');
  if (code === 'PASSWORD_NOT_SET') return t('auth.error.passwordNotSet');
  if (code === 'AUTH_INVALID') return t('auth.error.invalid');
  if (code === 'AUTH_LOCKED' || code === 'OTP_LOCKED') return t('auth.otpLocked');
  if (code === 'OTP_INVALID') return t('auth.error.otpInvalid');
  return fallback;
}

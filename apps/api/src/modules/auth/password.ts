import { Errors } from '../../common/errors';

const WEAK = new Set([
  'password',
  'password1',
  '12345678',
  '123456789',
  'qwertyui',
  'qwerty123',
  'meddonish',
]);

export function assertPassword(password: string, passwordConfirm: string) {
  if (password !== passwordConfirm) throw Errors.passwordMismatch();
  if (password.length < 8) throw Errors.passwordTooShort();
  const hasLetter = /[A-Za-zА-Яа-яЁёӢӣӮӯҲҳҚқҶҷҒғ]/u.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit || WEAK.has(password.toLowerCase())) {
    throw Errors.passwordWeak();
  }
}

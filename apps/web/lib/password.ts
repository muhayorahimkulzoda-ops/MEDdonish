export function passwordIssue(password: string, passwordConfirm: string): 'mismatch' | 'short' | 'weak' | null {
  if (password !== passwordConfirm) return 'mismatch';
  if (password.length < 8) return 'short';
  const hasLetter = /[A-Za-zА-Яа-яЁёӢӣӮӯҲҳҚқҶҷҒғ]/u.test(password);
  const hasDigit = /\d/.test(password);
  const weak = new Set(['password', 'password1', '12345678', '123456789', 'qwertyui', 'qwerty123', 'meddonish']);
  if (!hasLetter || !hasDigit || weak.has(password.toLowerCase())) return 'weak';
  return null;
}

export function normalizeTajikPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('992') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9) return `+992${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+992${digits.slice(1)}`;
  return '';
}

export function isTajikPhone(phone: string) {
  return /^\+992\d{9}$/.test(phone);
}

export function formatTajikPhone(phone: string) {
  const normalized = normalizeTajikPhone(phone);
  if (!isTajikPhone(normalized)) return phone;
  const rest = normalized.slice(4);
  return `+992 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5, 7)} ${rest.slice(7, 9)}`;
}

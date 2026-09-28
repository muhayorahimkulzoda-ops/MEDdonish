export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('992') && digits.length >= 12) return `+${digits.slice(0, 12)}`;
  if (digits.length === 9) return `+992${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+992${digits.slice(1)}`;
  if (digits.startsWith('992')) return `+${digits}`;
  if (raw.trim().startsWith('+')) return `+${digits}`;
  return `+${digits}`;
}

export function isE164(phone: string) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export function isTajikPhone(phone: string) {
  return /^\+992\d{9}$/.test(phone);
}

export function formatTajikPhoneInput(raw: string) {
  const digits = raw.replace(/\D/g, '').replace(/^992/, '').slice(0, 9);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  return parts.length ? `+992 ${parts.join(' ')}` : '+992 ';
}

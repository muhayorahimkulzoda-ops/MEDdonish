export function isSafeHlsName(file: string) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file);
}

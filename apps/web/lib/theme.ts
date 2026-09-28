const THEME_KEY = 'meddonish.theme';

export type ThemeMode = 'light' | 'dark';

export function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = mode;
}

export function hydrateTheme() {
  applyTheme(readStoredTheme());
}

export function setTheme(mode: ThemeMode) {
  if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = readStoredTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

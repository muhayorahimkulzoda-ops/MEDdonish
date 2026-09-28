'use client';

import { useEffect, useState } from 'react';
import { translate, type Locale, type MessageKey } from '@meddonish/localization';

export const LOCALE_KEY = 'meddonish.locale';
export const WELCOME_KEY = 'meddonish.welcome.seen';

let currentLocale: Locale = 'tg';
const listeners = new Set<() => void>();

function isLocale(value: string | null): value is Locale {
  return value === 'ru' || value === 'tg' || value === 'en';
}

export function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(LOCALE_KEY);
  return isLocale(value) ? value : null;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function hydrateLocale() {
  const stored = readStoredLocale();
  currentLocale = stored ?? 'tg';
  if (typeof document !== 'undefined') document.documentElement.lang = currentLocale;
  listeners.forEach((listener) => listener());
}

export function setAppLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_KEY, locale);
    document.documentElement.lang = locale;
  }
  listeners.forEach((listener) => listener());
}

export function welcomeWasSeen() {
  return typeof window !== 'undefined' && window.localStorage.getItem(WELCOME_KEY) === '1';
}

export function markWelcomeSeen() {
  if (typeof window !== 'undefined') window.localStorage.setItem(WELCOME_KEY, '1');
}

export function clearWelcomeSeen() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(WELCOME_KEY);
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function t(key: MessageKey, vars?: Record<string, string | number>) {
  return translate(currentLocale, key, vars);
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(currentLocale);
  useEffect(() => subscribeLocale(() => setLocale(currentLocale)), []);
  return locale;
}

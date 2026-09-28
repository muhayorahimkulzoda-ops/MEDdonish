import en from './en.json';
import ru from './ru.json';
import tg from './tg.json';

export type Locale = 'ru' | 'tg' | 'en';

export const locales: Locale[] = ['ru', 'tg', 'en'];

export const dictionaries = { ru, tg, en } as const;

export type MessageKey = keyof typeof ru;

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = dictionaries[locale][key] ?? dictionaries.ru[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

import { dictionaries, type MessageKey } from '@meddonish/localization';

export function t(key: MessageKey, vars?: Record<string, string | number>) {
  const template = dictionaries.tg[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

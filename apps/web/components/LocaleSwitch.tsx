'use client';

import { t, setAppLocale, useLocale } from '../lib/i18n';

export function LocaleSwitch({ className = 'locale-switch' }: { className?: string }) {
  const locale = useLocale();

  return (
    <div className={className} role="group" aria-label={t('language.choose')}>
      <button type="button" className={locale === 'tg' ? 'active' : undefined} onClick={() => setAppLocale('tg')}>
        {t('language.tg')}
      </button>
      <button type="button" className={locale === 'ru' ? 'active' : undefined} onClick={() => setAppLocale('ru')}>
        {t('language.ru')}
      </button>
    </div>
  );
}

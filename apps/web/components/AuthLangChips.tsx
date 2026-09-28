'use client';

import { setAppLocale, t, useLocale } from '../lib/i18n';

export function AuthLangChips() {
  const locale = useLocale();
  return (
    <div className="lang-chips">
      <button type="button" className={locale === 'tg' ? 'on' : ''} onClick={() => setAppLocale('tg')}>
        {t('language.tg')}
      </button>
      <button type="button" className={locale === 'ru' ? 'on' : ''} onClick={() => setAppLocale('ru')}>
        {t('language.ru')}
      </button>
      <button type="button" className={locale === 'en' ? 'on' : ''} onClick={() => setAppLocale('en')}>
        {t('language.en')}
      </button>
    </div>
  );
}

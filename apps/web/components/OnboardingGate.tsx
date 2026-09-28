'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@meddonish/localization';
import {
  hydrateLocale,
  markWelcomeSeen,
  readStoredLocale,
  setAppLocale,
  t,
  useLocale,
  welcomeWasSeen,
} from '../lib/i18n';
import { BrandMark } from './BrandMark';
import { hydrateTheme } from '../lib/theme';

type Step = 'boot' | 'language' | 'welcome' | 'app';

function FlowCopy({ text, className }: { text: string; className: string }) {
  const chunks = text.split(/(MEDdonish)/g);
  return (
    <p className={className}>
      {chunks.map((chunk, index) =>
        chunk === 'MEDdonish' ? (
          <BrandMark key={index} />
        ) : (
          <span key={index}>{chunk}</span>
        ),
      )}
    </p>
  );
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [step, setStep] = useState<Step>('boot');

  useEffect(() => {
    hydrateLocale();
    hydrateTheme();
    const params = new URLSearchParams(window.location.search);
    const pickLanguage = params.get('lang') === 'choose';
    if (pickLanguage) {
      params.delete('lang');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
      window.history.replaceState(null, '', next);
      setStep('language');
      return;
    }
    const stored = readStoredLocale();
    if (!stored) {
      setStep('language');
      return;
    }
    setAppLocale(stored);
    setStep(welcomeWasSeen() ? 'app' : 'welcome');
  }, []);

  useEffect(() => {
    document.body.classList.toggle('gate-open', step !== 'app');
    return () => document.body.classList.remove('gate-open');
  }, [step]);

  function chooseLanguage(next: Locale) {
    setAppLocale(next);
    if (welcomeWasSeen()) {
      setStep('app');
      return;
    }
    setStep('welcome');
  }

  function enter() {
    markWelcomeSeen();
    setStep('app');
  }

  if (step === 'app') return <>{children}</>;

  return (
    <div className="gate" data-step={step}>
      <div className="gate-aurora" aria-hidden="true" />
      <div className="gate-orbs" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      {step === 'boot' ? (
        <div className="gate-panel">
          <p className="gate-kicker">
            <BrandMark />
          </p>
        </div>
      ) : null}

      {step === 'language' ? (
        <div className="gate-panel">
          <p className="gate-kicker">{t('onboarding.kicker')}</p>
          <h1 className="gate-title">{t('language.choose')}</h1>
          <div className="lang-grid">
            <button type="button" className="lang-card lang-card-tg" onClick={() => chooseLanguage('tg')}>
              <span className="lang-flag" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <strong>{t('language.tg')}</strong>
            </button>
            <button type="button" className="lang-card lang-card-ru" onClick={() => chooseLanguage('ru')}>
              <span className="lang-flag" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <strong>{t('language.ru')}</strong>
            </button>
          </div>
        </div>
      ) : null}

      {step === 'welcome' ? (
        <div className="welcome-frame">
          <div className="welcome-card">
            <div className="welcome-digits" aria-hidden="true">
              <span>01</span>
              <span>02</span>
            </div>
            <p className="gate-kicker">{t('onboarding.kicker')}</p>
            <FlowCopy text={t('welcome.lead')} className="welcome-lead" />
            <FlowCopy text={t('welcome.body')} className="welcome-body" />
            <div className="welcome-actions">
              <button type="button" className="welcome-back" onClick={() => setStep('language')}>
                {t('welcome.back')}
              </button>
              <button type="button" className="welcome-enter" onClick={enter}>
                {t('welcome.continue')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <span className="sr-only" suppressHydrationWarning>
        {locale}
      </span>
    </div>
  );
}

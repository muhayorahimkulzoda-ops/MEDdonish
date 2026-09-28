'use client';

import { useEffect, useState } from 'react';
import type { MessageKey } from '@meddonish/localization';
import { api } from '../../lib/api';
import { setAppLocale, t, useLocale } from '../../lib/i18n';
import { Shell } from '../../components/Shell';
import { BrandMark } from '../../components/BrandMark';

type OfferPrice = {
  planCode: string;
  amountMinor: number;
  currency: string;
  recommended: boolean;
};

type OfferCourse = {
  id: string;
  slug: string;
  translations: { language: string; title: string; description?: string }[];
  prices: OfferPrice[];
};

type Year3Bundle = {
  checkoutCourseId: string;
  checkoutSlug: string;
  titles: { slug: string; translations: { language: string; title: string }[] }[];
  prices: OfferPrice[];
};

type Offer = {
  grantsAccess: boolean;
  includes: MessageKey[];
  courses: OfferCourse[];
  year3Bundle: Year3Bundle | null;
};

const YEAR3_SLUGS = new Set(['pathophysiology-y3', 'pathanatomy-y3', 'pharmacology-y3']);

const ACCESS_PLANS: OfferPrice[] = [
  { planCode: 'month_5', amountMinor: 80000, currency: 'TJS', recommended: false },
  { planCode: 'year_1', amountMinor: 150000, currency: 'TJS', recommended: true },
];

function money(amountMinor: number) {
  return t('offer.money', { amount: Math.round(amountMinor / 100) });
}

function planLabel(code: string) {
  if (code === 'month_1' || code === 'month_5' || code === 'year_1') {
    return t(`course.plans.${code}`);
  }
  return code;
}

function accessPrices(offer: Offer | null): OfferPrice[] {
  const fromApi = offer?.year3Bundle?.prices ?? [];
  return ACCESS_PLANS.map(
    (fallback) => fromApi.find((price) => price.planCode === fallback.planCode) ?? fallback,
  );
}

function pickTitle(
  translations: { language: string; title: string }[] | undefined,
  locale: string,
) {
  return translations?.find((row) => row.language === locale)?.title
    ?? translations?.find((row) => row.language === 'ru')?.title
    ?? '';
}

export default function OfferPage() {
  const locale = useLocale();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setAppLocale('tg');
    api<Offer>('/public/offer').then(setOffer).catch(() => undefined);
  }, []);

  const extraCourses = (offer?.courses ?? []).filter((course) => !YEAR3_SLUGS.has(course.slug));
  const plans = accessPrices(offer);

  return (
    <Shell>
      <div className="offer-page">
      <section className="hero">
        <h1>
          <span className="offer-title-lead">{t('offer.titleLead')}</span>{' '}
          <BrandMark className="offer-title-brand" />
        </h1>
        <p>{t('offer.subtitle')}</p>
      </section>
      <p className="muted">{t('offer.noGrant')}</p>
      <section className="section-block">
        <div className="offer-includes-row">
          <div className="offer-includes-copy">
            <h2>{t('offer.includes')}</h2>
            <ul className="offer-includes">
              {(offer?.includes ?? ['lesson.video', 'lesson.pdf', 'lesson.test', 'lesson.cases', 'lesson.clinical']).map(
                (key) => (
                  <li key={key}>{t(key)}</li>
                ),
              )}
            </ul>
          </div>
          <img
            className="offer-includes-photo"
            src="/images/offer-study.jpg"
            alt={t('home.photo.alt')}
          />
        </div>
        <p className="muted">{t('offer.deviceNote')}</p>
      </section>
      <section className="section-block">
        <h2>{t('offer.chooseCourse')}</h2>
        {error ? <p className="error">{error}</p> : null}
        <div className="plans">
          {plans.map((price) => (
            <a
              key={price.planCode}
              className={`plan${price.recommended ? ' plan-featured' : ''}`}
              href={`/login?plan=${price.planCode}`}
            >
              {price.recommended ? <span className="plan-badge">{t('offer.recommended')}</span> : null}
              <strong>{planLabel(price.planCode)}</strong>
              <span>{money(price.amountMinor)}</span>
              <em>{t('offer.open')}</em>
            </a>
          ))}
        </div>
        {offer?.year3Bundle ? (
          <article className="card offer-course">
            <h2>{t('offer.year3.title')}</h2>
            <p>{t('offer.year3.onePayment')}</p>
            <ul className="offer-includes">
              {offer.year3Bundle.titles.map((course) => (
                <li key={course.slug}>{pickTitle(course.translations, locale)}</li>
              ))}
            </ul>
          </article>
        ) : extraCourses.map((course) => {
          const title = pickTitle(course.translations, locale) || course.slug;
          return (
            <article className="card offer-course" key={course.id}>
              <h2>{title}</h2>
              <p>{course.translations.find((row) => row.language === locale)?.description
                ?? course.translations.find((row) => row.language === 'ru')?.description}</p>
            </article>
          );
        })}
      </section>
      </div>
    </Shell>
  );
}

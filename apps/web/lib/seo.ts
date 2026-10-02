import type { Metadata } from 'next';
import { translate, type MessageKey } from '@meddonish/localization';

const ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.GITHUB_PAGES === 'true'
    ? 'https://muhayorahimkulzoda-ops.github.io'
    : 'http://localhost:3001')
).replace(/\/$/, '');

export const SITE_BASE_PATH =
  process.env.GITHUB_PAGES === 'true'
    ? (process.env.BASE_PATH || '/MEDdonish').replace(/\/$/, '')
    : '';

export function siteUrl() {
  return `${ORIGIN}${SITE_BASE_PATH}`;
}

export function absoluteUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `${siteUrl()}/`;
  return `${siteUrl()}${normalized}`;
}

export function seoText(key: MessageKey) {
  return translate('tg', key);
}

export function pageMetadata({
  titleKey,
  descriptionKey,
  path,
  index = true,
}: {
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  path: string;
  index?: boolean;
}): Metadata {
  const title = seoText(titleKey);
  const description = seoText(descriptionKey);
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      type: 'website',
      locale: 'tg_TJ',
      alternateLocale: ['ru_RU', 'en_US'],
      url,
      siteName: 'MEDdonish',
      title,
      description,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export function rootMetadata(): Metadata {
  const description = `${seoText('home.app.subtitle')}. ${translate('ru', 'home.app.subtitle')}.`;
  const url = absoluteUrl('/');
  return {
    metadataBase: new URL(ORIGIN),
    title: {
      default: `MEDdonish — ${seoText('home.app.subtitle')}`,
      template: '%s · MEDdonish',
    },
    description,
    applicationName: 'MEDdonish',
    keywords: [
      'MEDdonish',
      seoText('home.headline'),
      seoText('home.track.anatomy'),
      seoText('home.track.pharma'),
      seoText('home.track.pathphys'),
      seoText('home.track.pathanat'),
      seoText('nav.clinical'),
      translate('ru', 'home.headline'),
      translate('ru', 'home.track.anatomy'),
      translate('ru', 'nav.courses'),
    ],
    authors: [{ name: 'MEDdonish' }],
    creator: 'MEDdonish',
    verification: {
      google: '2kRlPH8grZ8J0WhtF7iDMawqnc-W9zdT3HG_Zql27_g',
    },
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: 'tg_TJ',
      alternateLocale: ['ru_RU', 'en_US'],
      url,
      siteName: 'MEDdonish',
      title: 'MEDdonish',
      description,
    },
    twitter: {
      card: 'summary',
      title: 'MEDdonish',
      description,
    },
  };
}

export function websiteJsonLd() {
  const url = absoluteUrl('/');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        name: 'MEDdonish',
        url,
        description: seoText('home.hero.subtitle'),
      },
      {
        '@type': 'WebSite',
        name: 'MEDdonish',
        url,
        inLanguage: ['tg', 'ru', 'en'],
        description: seoText('home.app.subtitle'),
      },
    ],
  };
}

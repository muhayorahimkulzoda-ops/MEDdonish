import type { MetadataRoute } from 'next';
import { SITE_BASE_PATH, siteUrl } from '../lib/seo';

export const dynamic = 'force-static';

const PRIVATE_PATHS = [
  '/login',
  '/register',
  '/signin',
  '/forgot',
  '/profile',
  '/notifications',
  '/checkout',
  '/learn',
];

export default function robots(): MetadataRoute.Robots {
  const prefix = SITE_BASE_PATH;
  return {
    rules: {
      userAgent: '*',
      allow: prefix ? `${prefix}/` : '/',
      disallow: PRIVATE_PATHS.map((path) => `${prefix}${path}`),
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

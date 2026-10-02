import type { MetadataRoute } from 'next';
import { CATALOG_COURSES } from '../lib/catalog-courses';
import { absoluteUrl } from '../lib/seo';

export const dynamic = 'force-static';

const PUBLIC_PATHS = [
  '/',
  '/courses',
  '/anatomy',
  '/clinical',
  '/ai',
  '/library',
  '/offer',
  '/search',
  '/privacy',
  '/terms',
  '/account-deletion',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = [
    ...PUBLIC_PATHS,
    ...CATALOG_COURSES.map((course) => course.href),
  ];
  return paths.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === '/' || path === '/courses' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path.startsWith('/courses') ? 0.8 : 0.6,
  }));
}

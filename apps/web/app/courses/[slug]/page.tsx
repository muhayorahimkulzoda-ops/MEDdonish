import type { Metadata } from 'next';
import { CATALOG_COURSES } from '../../../lib/catalog-courses';
import { pageMetadata } from '../../../lib/seo';
import View from './view';

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { slug: 'anatomy-osteo' },
    { slug: 'pharmacology-y3' },
    { slug: 'pathophysiology-y3' },
    { slug: 'pathanatomy-y3' },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = CATALOG_COURSES.find((item) => item.href === `/courses/${slug}`);
  return pageMetadata({
    titleKey: course?.titleKey ?? 'nav.courses',
    descriptionKey: course?.descriptionKey ?? 'home.app.subtitle',
    path: `/courses/${slug}`,
  });
}

export default function Page() {
  return <View />;
}

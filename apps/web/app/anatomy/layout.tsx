import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'nav.anatomy',
  descriptionKey: 'course.anatomy.lead',
  path: '/anatomy',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

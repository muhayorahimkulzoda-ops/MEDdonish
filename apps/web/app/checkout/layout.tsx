import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'course.buy',
  descriptionKey: 'home.app.subtitle',
  path: '/checkout',
  index: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

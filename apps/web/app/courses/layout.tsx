import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'nav.courses',
  descriptionKey: 'home.app.subtitle',
  path: '/courses',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

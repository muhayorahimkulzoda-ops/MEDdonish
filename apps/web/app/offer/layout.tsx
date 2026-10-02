import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'nav.offer',
  descriptionKey: 'home.app.subtitle',
  path: '/offer',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'nav.learn',
  descriptionKey: 'home.app.subtitle',
  path: '/learn',
  index: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

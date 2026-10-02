import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'nav.library',
  descriptionKey: 'home.app.subtitle',
  path: '/library',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

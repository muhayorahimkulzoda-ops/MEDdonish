import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'nav.profile',
  descriptionKey: 'home.app.subtitle',
  path: '/profile',
  index: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

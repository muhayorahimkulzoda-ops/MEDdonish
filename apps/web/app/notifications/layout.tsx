import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'nav.notifications',
  descriptionKey: 'home.app.subtitle',
  path: '/notifications',
  index: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

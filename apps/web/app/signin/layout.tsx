import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'nav.login',
  descriptionKey: 'home.app.subtitle',
  path: '/signin',
  index: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

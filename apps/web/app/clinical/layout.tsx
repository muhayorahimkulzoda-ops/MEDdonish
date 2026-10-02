import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'nav.clinical',
  descriptionKey: 'home.app.subtitle',
  path: '/clinical',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

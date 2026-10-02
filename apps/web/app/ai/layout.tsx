import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'nav.ai',
  descriptionKey: 'home.app.subtitle',
  path: '/ai',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

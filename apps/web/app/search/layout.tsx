import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'nav.search',
  descriptionKey: 'home.search.placeholder',
  path: '/search',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

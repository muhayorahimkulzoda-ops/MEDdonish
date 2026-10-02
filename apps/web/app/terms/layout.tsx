import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'legal.terms',
  descriptionKey: 'legal.terms.intro',
  path: '/terms',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

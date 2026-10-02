import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'legal.privacy',
  descriptionKey: 'legal.privacy.intro',
  path: '/privacy',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

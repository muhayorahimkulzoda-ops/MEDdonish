import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'legal.accountDeletion',
  descriptionKey: 'legal.accountDeletion.intro',
  path: '/account-deletion',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

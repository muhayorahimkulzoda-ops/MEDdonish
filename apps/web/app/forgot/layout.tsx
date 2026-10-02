import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'auth.forgot.title',
  descriptionKey: 'auth.forgot.hint',
  path: '/forgot',
  index: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import { pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({
  titleKey: 'auth.register',
  descriptionKey: 'home.app.subtitle',
  path: '/register',
  index: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

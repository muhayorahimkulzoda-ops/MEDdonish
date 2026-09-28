import type { Metadata } from 'next';
import { t } from '../lib/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: t('admin.title'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tg">
      <body>{children}</body>
    </html>
  );
}

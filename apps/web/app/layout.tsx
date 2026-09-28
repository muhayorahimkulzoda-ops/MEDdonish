import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { translate } from '@meddonish/localization';
import { OnboardingGate } from '../components/OnboardingGate';
import './globals.css';
import './app-shell.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MEDdonish',
  description: translate('tg', 'home.app.subtitle'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F7F9FC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tg" data-theme="light" className={inter.className}>
      <body>
        <OnboardingGate>{children}</OnboardingGate>
      </body>
    </html>
  );
}

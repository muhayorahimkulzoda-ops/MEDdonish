import type { Viewport } from 'next';
import { Inter } from 'next/font/google';
import { OnboardingGate } from '../components/OnboardingGate';
import { rootMetadata, websiteJsonLd } from '../lib/seo';
import './globals.css';
import './app-shell.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  display: 'swap',
});

export const metadata = rootMetadata();

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
        <OnboardingGate>{children}</OnboardingGate>
      </body>
    </html>
  );
}

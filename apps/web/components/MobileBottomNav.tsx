'use client';

import { BookOpen, Home, Sparkles, Stethoscope, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { t } from '../lib/i18n';

export function MobileBottomNav({ loggedIn }: { loggedIn: boolean; hash: string }) {
  const pathname = usePathname();
  const accountHref = loggedIn ? '/profile' : '/signin';
  const homeActive = pathname === '/';
  const coursesActive =
    pathname.startsWith('/courses') || pathname.startsWith('/learn') || pathname.startsWith('/anatomy') || pathname.startsWith('/library');
  const clinicalActive = pathname.startsWith('/clinical');
  const aiActive = pathname.startsWith('/ai');
  const profileActive =
    pathname.startsWith('/profile') || pathname.startsWith('/signin') || pathname.startsWith('/register') || pathname.startsWith('/forgot');

  return (
    <nav className="md-dock" aria-label={t('nav.home')}>
      <a className={homeActive ? 'active' : undefined} href="/">
        <Home strokeWidth={1.85} aria-hidden="true" />
        {t('nav.home')}
      </a>
      <a className={coursesActive ? 'active' : undefined} href="/courses">
        <BookOpen strokeWidth={1.85} aria-hidden="true" />
        {t('nav.courses')}
      </a>
      <a className={clinicalActive ? 'active' : undefined} href="/clinical">
        <Stethoscope strokeWidth={1.85} aria-hidden="true" />
        {t('nav.clinical')}
      </a>
      <a className={aiActive ? 'active' : undefined} href="/ai">
        <Sparkles strokeWidth={1.85} aria-hidden="true" />
        {t('nav.ai')}
      </a>
      <a className={profileActive ? 'active' : undefined} href={accountHref}>
        <UserRound strokeWidth={1.85} aria-hidden="true" />
        {loggedIn ? t('nav.profile') : t('nav.login')}
      </a>
    </nav>
  );
}

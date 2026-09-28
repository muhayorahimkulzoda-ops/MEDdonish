'use client';

import { Sparkles, UserRound } from 'lucide-react';
import { t } from '../lib/i18n';
import { BrandMark } from './BrandMark';
import { GlobalSearch } from './GlobalSearch';
import { LocaleSwitch } from './LocaleSwitch';
import { ThemeToggle } from './ThemeToggle';

export function AppHeader({
  loggedIn,
  displayName,
  showAdmin,
  adminHref,
  onLogout,
}: {
  loggedIn: boolean;
  displayName: string;
  showAdmin: boolean;
  adminHref: string;
  onLogout: () => void;
}) {
  const accountHref = loggedIn ? '/profile' : '/signin';

  return (
    <header className="md-header">
      <a className="md-brand" href="/">
        <BrandMark />
      </a>
      <nav className="md-nav" aria-label={t('nav.home')}>
        <a href="/">{t('nav.home')}</a>
        <a href="/courses">{t('nav.learn')}</a>
        <a href="/anatomy">{t('nav.anatomy')}</a>
        <a href="/clinical">{t('nav.clinical')}</a>
        <a href="/courses">{t('nav.tests')}</a>
        <a href="/library">{t('nav.library')}</a>
      </nav>
      <div className="md-header-tools">
        <div className="md-header-search">
          <GlobalSearch size="md" />
        </div>
        <a className="md-icon-btn" href="/ai" aria-label={t('nav.ai')} title={t('nav.ai')}>
          <Sparkles strokeWidth={1.85} />
        </a>
        <a className="md-icon-btn" href={accountHref} aria-label={loggedIn ? t('nav.profile') : t('nav.login')}>
          <UserRound strokeWidth={1.85} />
        </a>
        <ThemeToggle />
        <LocaleSwitch className="locale-switch md-locale" />
        {showAdmin ? (
          <a className="md-btn md-btn-secondary md-btn-compact" href={adminHref}>
            {t('nav.admin')}
          </a>
        ) : null}
        {loggedIn ? (
          <button type="button" className="md-text-btn" onClick={onLogout}>
            {t('admin.logout')}
          </button>
        ) : null}
        {loggedIn && displayName ? <span className="md-nav-user">{displayName}</span> : null}
      </div>
    </header>
  );
}

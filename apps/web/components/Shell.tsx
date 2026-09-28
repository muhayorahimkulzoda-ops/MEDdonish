'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { captureAdminGateFromUrl, fetchMe, getAdminOrigin, hasAdminGate, logoutSession } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { hydrateTheme } from '../lib/theme';
import { AppHeader } from './AppHeader';
import { MobileBottomNav } from './MobileBottomNav';

export function Shell({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [hash, setHash] = useState('');

  useEffect(() => {
    hydrateTheme();
    captureAdminGateFromUrl();
    setShowAdmin(hasAdminGate());
    void fetchMe().then((user) => {
      setLoggedIn(Boolean(user));
      const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.displayName || '';
      setDisplayName(name);
    });
  }, [pathname]);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [pathname]);

  const isAuth =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/forgot');

  return (
    <div className={isAuth ? 'shell shell-auth' : 'shell shell-app'} lang={locale}>
      {isAuth ? null : (
        <AppHeader
          loggedIn={loggedIn}
          displayName={displayName}
          showAdmin={showAdmin}
          adminHref={getAdminOrigin()}
          onLogout={() => {
            void logoutSession().then(() => {
              window.location.href = '/';
            });
          }}
        />
      )}
      {children}
      {isAuth ? null : <MobileBottomNav loggedIn={loggedIn} hash={hash} />}
    </div>
  );
}

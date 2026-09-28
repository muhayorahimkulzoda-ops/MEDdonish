'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { t } from '../lib/i18n';
import {
  IconArchive,
  IconBook,
  IconCard,
  IconChart,
  IconChat,
  IconGear,
  IconGrid,
  IconShield,
  IconTag,
  IconUser,
  IconUserCheck,
} from './NavIcons';

type Item = {
  href: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  match?: (path: string) => boolean;
};

function active(path: string, href: string, match?: (path: string) => boolean) {
  if (match) return match(path);
  if (href === '/') return path === '/';
  return path === href || path.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  const primary: Item[] = [
    { href: '/', label: t('admin.nav.dashboard'), icon: <IconGrid /> },
    { href: '/courses', label: t('admin.nav.courses'), icon: <IconBook /> },
  ];

  const students: Item[] = [
    {
      href: '/students/accounts',
      label: t('admin.nav.students.account'),
      hint: t('admin.nav.students.account.hint'),
      icon: <IconUser />,
    },
    {
      href: '/students/access',
      label: t('admin.nav.students.access'),
      hint: t('admin.nav.students.access.hint'),
      icon: <IconUserCheck />,
    },
    {
      href: '/students/archive',
      label: t('admin.nav.archive'),
      hint: t('admin.nav.archive.hint'),
      icon: <IconArchive />,
    },
  ];

  const rest: Item[] = [
    { href: '/payments', label: t('admin.nav.payments'), icon: <IconCard /> },
    { href: '/promos', label: t('admin.nav.promos'), icon: <IconTag /> },
    { href: '/certificates', label: t('admin.nav.certificates'), icon: <IconTag /> },
    { href: '/questions', label: t('admin.nav.questions'), icon: <IconChat /> },
    { href: '/notifications', label: t('admin.nav.mailings'), icon: <IconChat /> },
    { href: '/analytics', label: t('admin.nav.stats'), icon: <IconChart /> },
    { href: '/security', label: t('admin.nav.security'), icon: <IconShield /> },
    { href: '/settings', label: t('admin.nav.settings'), icon: <IconGear /> },
  ];

  return (
    <nav className="admin-nav" aria-label={t('admin.title')}>
      {primary.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
      <p className="admin-nav-section">{t('admin.nav.students')}</p>
      {students.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
      {rest.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

function NavLink({ item, pathname }: { item: Item; pathname: string }) {
  const on = active(pathname, item.href, item.match);
  return (
    <Link href={item.href} className="admin-nav-link" data-active={on} data-hint={item.hint ? 'true' : 'false'}>
      <span className="admin-nav-icon">{item.icon}</span>
      <span className="admin-nav-copy">
        <span className="admin-nav-label">{item.label}</span>
        {item.hint ? <span className="admin-nav-hint">{item.hint}</span> : null}
      </span>
    </Link>
  );
}

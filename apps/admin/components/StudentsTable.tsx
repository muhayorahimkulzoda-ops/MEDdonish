'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { adminRequest, titleOf, type Translation } from '../lib/api';
import { t } from '../lib/i18n';

type UserRow = {
  id: string;
  number: number;
  phone: string | null;
  email: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  activeEntitlements: number;
  paidOrders: number;
  accessExpiresAt: string | null;
};

type UserDetail = UserRow & {
  preferredLanguage: string;
  entitlements: {
    id: string;
    status: string;
    expiresAt: string;
    course?: { translations: Translation[] };
  }[];
  devices: { id: string; deviceId: string; platform: string; isActive: boolean; lastSeenAt: string }[];
};

type Course = { id: string; slug?: string; translations: Translation[] };
type Pack = 'y1' | 'y3' | 'both';

function isYear3(slug?: string) {
  return Boolean(slug?.endsWith('-y3'));
}

function isYear1(slug?: string) {
  if (!slug || isYear3(slug)) return false;
  return slug === 'anatomy-osteo' || slug.includes('y1') || slug.includes('anatomy');
}

function coursesForPack(pack: Pack, courses: Course[]) {
  const year1 = courses.filter((course) => isYear1(course.slug));
  const year3 = courses.filter((course) => isYear3(course.slug));
  if (pack === 'y1') return year1;
  if (pack === 'y3') return year3;
  return [...year1, ...year3];
}

const MONTHS = [
  t('admin.month.jan'),
  t('admin.month.feb'),
  t('admin.month.mar'),
  t('admin.month.apr'),
  t('admin.month.may'),
  t('admin.month.jun'),
  t('admin.month.jul'),
  t('admin.month.aug'),
  t('admin.month.sep'),
  t('admin.month.oct'),
  t('admin.month.nov'),
  t('admin.month.dec'),
] as const;

function formatWhen(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  const dd = date.getDate();
  const month = MONTHS[date.getMonth()] ?? '';
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${dd} ${month} ${yyyy} ${hh}:${mm}`;
}

function formatDay(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  const dd = date.getDate();
  const month = MONTHS[date.getMonth()] ?? '';
  const yyyy = date.getFullYear();
  return `${dd} ${month} ${yyyy}`;
}

function entitlementLabel(status: string) {
  if (status === 'active') return t('admin.entitlement.active');
  if (status === 'expired') return t('admin.entitlement.expired');
  if (status === 'revoked') return t('admin.entitlement.revoked');
  return status;
}

function personName(row: UserRow) {
  const full = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  return full || row.displayName || row.phone || row.email || t('admin.students.noName');
}

export function StudentsTable({
  title,
  mode,
}: {
  title?: string;
  mode: 'accounts' | 'access' | 'archive';
}) {
  const [items, setItems] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [grantFor, setGrantFor] = useState<UserRow | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [pack, setPack] = useState<Pack>('y1');
  const [planCode, setPlanCode] = useState<'month_5' | 'year_1'>('year_1');
  const [grantBusy, setGrantBusy] = useState(false);

  const heading =
    title ??
    (mode === 'access'
      ? t('admin.students.pageAccess')
      : mode === 'archive'
        ? t('admin.students.pageArchive')
        : t('admin.students.pageAccounts'));
  const lead =
    mode === 'access'
      ? t('admin.students.accessLead')
      : mode === 'archive'
        ? t('admin.students.archiveLead')
        : t('admin.students.accountsLead');

  function reload() {
    return adminRequest<{ items: UserRow[] }>('/admin/users?take=2000').then((data) => setItems(data.items));
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    adminRequest<unknown>('/admin/courses')
      .then((payload) => {
        const rows = Array.isArray(payload)
          ? payload
          : payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)
            ? (payload as { items: unknown[] }).items
            : [];
        setCourses(rows as Course[]);
      })
      .catch(() => undefined);
  }, []);

  const pool = useMemo(() => {
    if (mode === 'access') return items.filter((row) => row.activeEntitlements > 0);
    if (mode === 'accounts') return items.filter((row) => row.activeEntitlements === 0);
    return items;
  }, [items, mode]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return pool;
    return pool.filter((row) => {
      const hay = [
        String(row.number),
        personName(row),
        row.phone ?? '',
        row.email ?? '',
        row.firstName ?? '',
        row.lastName ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [pool, query]);

  async function openCrm(id: string) {
    setError('');
    try {
      const row = await adminRequest<UserDetail>(`/admin/users/${id}`);
      setSelected(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.empty'));
    }
  }

  async function patch(id: string, status: 'active' | 'blocked') {
    setError('');
    try {
      await adminRequest(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await reload();
      if (selected?.id === id) await openCrm(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.empty'));
    }
  }

  async function release(id: string) {
    setError('');
    try {
      await adminRequest(`/admin/users/${id}/release-device`, { method: 'POST' });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.empty'));
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t('admin.students.confirmDelete'))) return;
    setError('');
    try {
      await adminRequest(`/admin/users/${id}`, { method: 'DELETE' });
      if (selected?.id === id) setSelected(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.empty'));
    }
  }

  async function grant() {
    if (!grantFor?.phone) {
      setError(t('admin.students.needPhone'));
      return;
    }
    const targets = coursesForPack(pack, courses);
    if (targets.length === 0) {
      setError(t('admin.grant.needCourses'));
      return;
    }
    setError('');
    setGrantBusy(true);
    try {
      for (const course of targets) {
        await adminRequest('/admin/entitlements', {
          method: 'POST',
          body: JSON.stringify({
            phone: grantFor.phone,
            courseId: course.id,
            planCode,
            source: 'admin',
          }),
        });
      }
      setGrantFor(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.empty'));
    } finally {
      setGrantBusy(false);
    }
  }

  return (
    <div className="students-page">
      <section className="students-banner">
        <h1>{heading}</h1>
        <p>{lead}</p>
        <div className="students-links">
          {mode !== 'access' ? (
            <Link href="/students/access">{t('admin.students.openAccess')}</Link>
          ) : (
            <Link href="/students/accounts">{t('admin.students.openAccounts')}</Link>
          )}
          {mode !== 'archive' ? <Link href="/students/archive">{t('admin.students.openArchive')}</Link> : null}
        </div>
      </section>

      {error ? <div className="error">{error}</div> : null}

      <section className="students-search">
        <div className="students-search-head">
          <strong>{t('admin.students.searchTitle')}</strong>
          <span>{t('admin.students.count', { shown: visible.length, total: pool.length })}</span>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin.students.searchPlaceholder')}
        />
      </section>

      <div className="students-list">
        {visible.length === 0 ? <p className="muted">{t('admin.empty')}</p> : null}
        {visible.map((row) => (
          <article className="student-card" key={row.id}>
            <div className="student-card-top">
              <div className="student-id">
                <span>№ {row.number}</span>
                <div>
                  <strong>{personName(row)}</strong>
                  <small>
                    {row.status === 'blocked'
                      ? t('admin.students.blocked')
                      : row.activeEntitlements > 0
                        ? t('admin.students.hasAccess')
                        : t('admin.students.registered')}
                  </small>
                </div>
              </div>
              <em className={row.accessExpiresAt ? 'student-until' : undefined}>
                {row.accessExpiresAt
                  ? t('admin.students.accessUntil', { date: formatDay(row.accessExpiresAt) })
                  : row.activeEntitlements > 0
                    ? t('admin.students.hasAccess')
                    : t('admin.students.noAccess')}
              </em>
            </div>
            <p className="student-meta">
              {t('admin.students.lastLoginAt', { date: formatWhen(row.lastLoginAt) })}
              <br />
              {t('admin.students.registeredAt', {
                date: formatWhen(row.createdAt),
                n: row.paidOrders ?? 0,
              })}
            </p>
            <p className="student-phone">{row.phone ?? row.email ?? '—'}</p>
            <div className="student-actions">
              <button className="student-crm" type="button" onClick={() => void openCrm(row.id)}>
                {t('admin.students.crm')}
              </button>
              <button
                className="student-grant"
                type="button"
                onClick={() => {
                  setPack('y1');
                  setPlanCode('year_1');
                  setGrantFor(row);
                }}
              >
                {t('admin.students.grant')}
              </button>
              {row.status === 'blocked' ? (
                <button type="button" onClick={() => void patch(row.id, 'active')}>
                  {t('admin.unblock')}
                </button>
              ) : (
                <button className="danger" type="button" onClick={() => void patch(row.id, 'blocked')}>
                  {t('admin.block')}
                </button>
              )}
              <button className="secondary" type="button" onClick={() => void release(row.id)}>
                {t('admin.students.resetDevices')}
              </button>
              <button className="student-del" type="button" onClick={() => void remove(row.id)}>
                {t('admin.delete')}
              </button>
            </div>
          </article>
        ))}
      </div>

      {selected ? (
        <div className="card section-block">
          <h2>
            {personName(selected)} · {t('admin.students.crm')}
          </h2>
          <p className="muted">
            {selected.phone ?? selected.email} ·{' '}
            {selected.status === 'blocked' ? t('admin.students.blocked') : t('admin.students.registered')}
          </p>
          <div className="table-wrap section-block">
            <table>
              <thead>
                <tr>
                  <th>{t('admin.subscriptions')}</th>
                  <th>{t('admin.status')}</th>
                </tr>
              </thead>
              <tbody>
                {selected.entitlements.length === 0 ? (
                  <tr>
                    <td colSpan={2}>{t('admin.empty')}</td>
                  </tr>
                ) : (
                  selected.entitlements.map((row) => (
                    <tr key={row.id}>
                      <td>{titleOf(row.course?.translations ?? [])}</td>
                      <td>{entitlementLabel(row.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button className="secondary" type="button" onClick={() => setSelected(null)}>
            {t('admin.cancel')}
          </button>
        </div>
      ) : null}

      {grantFor ? (
        <div className="students-modal" onClick={() => !grantBusy && setGrantFor(null)}>
          <div
            className="students-modal-card grant-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grant-head">
              <h2>{t('admin.students.grant')}</h2>
              <button className="grant-x" type="button" onClick={() => setGrantFor(null)} aria-label={t('admin.cancel')}>
                ×
              </button>
            </div>
            <p className="grant-student">{t('admin.grant.student', { name: personName(grantFor) })}</p>

            <p className="grant-label">{t('admin.grant.pickCourse')}</p>
            <div className="grant-packs">
              <button type="button" data-active={pack === 'y1'} onClick={() => setPack('y1')}>
                <span className="grant-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 5h9v14H5z" />
                    <path d="M14 7h5v12h-5" />
                  </svg>
                </span>
                <strong>{t('admin.grant.year1')}</strong>
                <small>{t('admin.grant.year1desc')}</small>
              </button>
              <button type="button" data-active={pack === 'y3'} onClick={() => setPack('y3')}>
                <span className="grant-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 10 12 6l9 4-9 4-9-4Z" />
                    <path d="M7 12v4c2 1.4 4 2 5 2s3-.6 5-2v-4" />
                  </svg>
                </span>
                <strong>{t('admin.grant.year3')}</strong>
                <small>{t('admin.grant.year3desc')}</small>
              </button>
              <button type="button" data-wide="true" data-active={pack === 'both'} onClick={() => setPack('both')}>
                <span className="grant-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 7h14M5 12h14M5 17h14" />
                  </svg>
                </span>
                <strong>{t('admin.grant.both')}</strong>
                <small>{t('admin.grant.bothDesc')}</small>
              </button>
            </div>

            <p className="grant-label">{t('admin.grant.term')}</p>
            <div className="grant-terms">
              <button type="button" data-active={planCode === 'month_5'} onClick={() => setPlanCode('month_5')}>
                {t('admin.grant.months5')}
              </button>
              <button type="button" data-active={planCode === 'year_1'} onClick={() => setPlanCode('year_1')}>
                {t('admin.grant.months12')}
              </button>
            </div>

            <p className="grant-summary">
              {t('admin.grant.summary', {
                pack: pack === 'y3' ? t('admin.grant.year3') : pack === 'both' ? t('admin.grant.both') : t('admin.grant.year1'),
                term: planCode === 'month_5' ? t('admin.grant.months5') : t('admin.grant.months12'),
              })}
            </p>

            {error ? <div className="error">{error}</div> : null}

            <div className="grant-foot">
              <button className="grant-cancel" type="button" disabled={grantBusy} onClick={() => setGrantFor(null)}>
                {t('admin.cancel')}
              </button>
              <button className="grant-go" type="button" disabled={grantBusy} onClick={() => void grant()}>
                {t('admin.grant.submit')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

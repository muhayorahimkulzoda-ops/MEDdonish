'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, apiForm } from '../../lib/api';
import { isE164, normalizePhone } from '../../lib/phone';
import { setAppLocale, t, useLocale } from '../../lib/i18n';
import { Shell } from '../../components/Shell';
import { BrandMark } from '../../components/BrandMark';

const OWNER_PHONE = '+992-939-55-05';
const OWNER_NAME = 'Рахимқулзода Мухайё';
const PAY_METHOD_KEY = 'meddonish.pay.method';
const METHODS = ['dushanbe_city', 'alif', 'eskhata'] as const;

type Order = {
  id: string;
  status: string;
  reviewStatus?: string | null;
  entitlementActive: boolean;
};

function methodTitle(id: (typeof METHODS)[number]) {
  if (id === 'dushanbe_city') return t('payment.method.dushanbe_city');
  if (id === 'alif') return t('payment.method.alif');
  return t('payment.method.eskhata');
}

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const [method, setMethod] = useState<(typeof METHODS)[number] | null>(null);
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [askLoginPhone, setAskLoginPhone] = useState(false);

  useEffect(() => {
    setAppLocale('tg');
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (!order || order.status === 'paid' || order.status === 'failed') return;
    const timer = window.setInterval(() => {
      api<Order>(`/orders/${order.id}`).then(setOrder).catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [order?.id, order?.status]);

  useEffect(() => {
    if (order?.status === 'paid' && order.entitlementActive) {
      const timer = window.setTimeout(() => router.push('/learn'), 1600);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [order, router]);

  function takeFile(next: File | undefined) {
    if (!next) return;
    if (next.type && !next.type.startsWith('image/')) {
      setError(t('payment.dropCheck'));
      return;
    }
    setFile(next);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(next);
    });
    setError('');
  }

  function chooseMethod(next: (typeof METHODS)[number]) {
    window.localStorage.setItem(PAY_METHOD_KEY, next);
    setMethod((current) => (current === next ? current : next));
    setOrder(null);
    setCopied(false);
    setError('');
    setAskLoginPhone(false);
  }

  async function copyAccount(value: string) {
    if (!value) return;
    const digits = value.replace(/\D/g, '');
    await navigator.clipboard.writeText(digits.startsWith('992') ? `+${digits}` : value.replaceAll(' ', ''));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!method) return;
    setError('');
    setSending(true);
    try {
      if (!file) throw new Error(t('payment.dropCheck'));
      const normalized = phone ? normalizePhone(phone) : '';
      if (!isE164(normalized)) {
        setAskLoginPhone(true);
        setError(t('auth.phoneInvalid'));
        return;
      }
      setPhone(normalized);
      const offer = await api<{
        year3Bundle: { checkoutCourseId: string } | null;
      }>('/public/offer');
      const planParam = new URLSearchParams(window.location.search).get('plan');
      const plan =
        planParam === 'month_5' || planParam === 'year_1' || planParam === 'month_1'
          ? planParam
          : 'month_1';
      const courseId = offer.year3Bundle?.checkoutCourseId;
      if (!courseId) throw new Error(t('offer.chooseCourse'));
      const form = new FormData();
      form.set('phone', normalized);
      form.set('courseId', courseId);
      form.set('planCode', plan);
      form.set('method', method);
      form.set('check', file);
      const next = await apiForm<Order>('/orders/web-receipt', form, { auth: false });
      setOrder(next);
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
      if (code === 'TELEGRAM_NOT_CONFIGURED') setError(t('payment.telegramMissing'));
      else if (code === 'TELEGRAM_SEND_FAILED') setError(t('payment.telegramFailed'));
      else setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSending(false);
    }
  }

  const paid = order?.status === 'paid' && order.entitlementActive;
  const rejected = order?.status === 'failed';
  const waiting = Boolean(order && !paid && !rejected);

  return (
    <Shell>
      <div className="gate gate-inline" data-step="pay">
        <div className="gate-aurora" aria-hidden="true" />
        <div className="gate-orbs" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="login-page login-page-pay">
          <div className="login-frame">
            <div className="login-card">
              <p className="gate-kicker">
                <BrandMark />
              </p>
              <div className="lang-chips">
            <button type="button" className={locale === 'tg' ? 'on' : ''} onClick={() => setAppLocale('tg')}>
              {t('language.tg')}
            </button>
            <button type="button" className={locale === 'ru' ? 'on' : ''} onClick={() => setAppLocale('ru')}>
              {t('language.ru')}
            </button>
          </div>
          <h1 className="gate-title">{t('onboarding.choose')}</h1>
          <p className="gate-hint">{t('onboarding.payHint')}</p>
          {error ? <p className="login-alert">{error}</p> : null}
          <div className="pay-grid">
            {METHODS.map((id) => {
              const open = method === id;
              return (
                <div className={`pay-block${open ? ' open' : ''}`} key={id}>
                  <button
                    type="button"
                    className={`pay-card pay-card-${id}`}
                    aria-expanded={open}
                    onClick={() => chooseMethod(id)}
                  >
                    <strong>{methodTitle(id)}</strong>
                  </button>
                  {open ? (
                    <form className="pay-form" onSubmit={(event) => void submit(event)}>
                      {paid ? (
                        <>
                          <div className="check-ok" aria-hidden="true">✓</div>
                          <p>{t('payment.approved')}</p>
                          <a className="welcome-enter" href="/learn">
                            {t('payment.openCourses')}
                          </a>
                        </>
                      ) : rejected ? (
                        <>
                          <div className="check-no" aria-hidden="true">✕</div>
                          <p>{t('payment.rejected')}</p>
                        </>
                      ) : waiting ? (
                        <p className="gate-waiting">{t('payment.reviewSent')}</p>
                      ) : (
                        <>
                          <p className="pay-to">{t('payment.payToPhone')}</p>
                          <div className="wallet-row wallet-phone">
                            <div className="wallet-phone-text">
                              <span className="wallet-label">{t('payment.walletPhone')}</span>
                              <strong className="wallet-card">{OWNER_PHONE}</strong>
                            </div>
                            <button
                              type="button"
                              className="wallet-copy-icon"
                              aria-label={t('payment.copy')}
                              onClick={() => void copyAccount(OWNER_PHONE)}
                            >
                              {copied ? (
                                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                                  <path
                                    d="M5 13.5 9.5 18 19 7"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                                  <rect
                                    x="9"
                                    y="9"
                                    width="11"
                                    height="11"
                                    rx="2"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  />
                                  <path
                                    d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                          <div className="wallet-row">
                            <span className="wallet-label">{t('payment.holder')}</span>
                            <strong className="wallet-name">{OWNER_NAME}</strong>
                          </div>
                          <label className="pay-label">
                            {t('payment.loginPhone')}
                            <input
                              value={phone}
                              onChange={(event) => setPhone(event.target.value)}
                              autoComplete="tel"
                              inputMode="tel"
                              placeholder="+992..."
                              required
                            />
                          </label>
                          <label
                            className={`check-drop${preview ? ' has-file' : ''}`}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              takeFile(event.dataTransfer.files[0]);
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(event) => takeFile(event.target.files?.[0])}
                            />
                            {preview ? (
                              <img className="check-preview" src={preview} alt={t('payment.checkPreview')} />
                            ) : (
                              <span>{t('payment.dropCheck')}</span>
                            )}
                          </label>
                          <button className="welcome-enter" type="submit" disabled={sending}>
                            {t('payment.sendCheck')}
                          </button>
                        </>
                      )}
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

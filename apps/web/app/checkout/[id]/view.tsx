'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { t } from '../../../lib/i18n';
import { Shell } from '../../../components/Shell';

type Order = {
  id: string;
  status: string;
  amountMinor: number;
  currency: string;
  planCode: string;
  method?: string | null;
  reviewStatus?: string | null;
  course: { title?: string; slug?: string };
  isYear3Bundle?: boolean;
  entitlementActive: boolean;
  grantsAccess: boolean;
  sandboxCompleteEnabled: boolean;
};

type PayMethod = {
  id: string;
  details: string;
  kind?: 'phone' | 'card';
  account?: string;
  cardNumber?: string;
  holderName?: string;
};

function planLabel(code: string) {
  if (code === 'month_1' || code === 'month_5' || code === 'year_1') {
    return t(`course.plans.${code}`);
  }
  return code;
}

function money(amountMinor: number) {
  return t('offer.money', { amount: Math.round(amountMinor / 100) });
}

function methodLabel(method?: string | null) {
  if (method === 'dushanbe_city' || method === 'alif' || method === 'eskhata') {
    return t(`payment.method.${method}`);
  }
  return method ?? '';
}

export default function CheckoutPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [methods, setMethods] = useState<PayMethod[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<Order>(`/orders/${params.id}`).then(setOrder).catch((err: Error) => setError(err.message));
    api<{ methods: PayMethod[] }>('/public/payment-methods').then((row) => setMethods(row.methods)).catch(() => undefined);
  }, [params.id]);

  useEffect(() => {
    if (!order || order.status === 'paid' || order.status === 'failed') return;
    const timer = window.setInterval(() => {
      api<Order>(`/orders/${params.id}`).then(setOrder).catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [order?.status, params.id]);

  useEffect(() => {
    if (order?.status === 'paid' && order.entitlementActive) {
      const timer = window.setTimeout(() => router.push('/learn'), 1200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [order, router]);

  async function sendCheck(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSending(true);
    try {
      const next = await api<Order>(`/orders/${params.id}/receipt`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
      setOrder(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSending(false);
    }
  }

  if (!order) return <Shell>{error || '...'}</Shell>;

  const wallet = methods.find((row) => row.id === order.method);
  const details = [wallet?.account ?? wallet?.cardNumber, wallet?.holderName].filter(Boolean).join(' · ') || wallet?.details;
  const paid = order.status === 'paid' && order.entitlementActive;
  const rejected = order.status === 'failed';

  return (
    <Shell>
      <section className="hero">
        <h1>{order.isYear3Bundle ? t('offer.year3.title') : order.course.title}</h1>
        {order.isYear3Bundle ? <p>{t('offer.year3.onePayment')}</p> : null}
        <p>
          {planLabel(order.planCode)} — {money(order.amountMinor)}
        </p>
      </section>
      <div className="card">
        {error ? <p className="error">{error}</p> : null}
        {order.method ? <p><strong>{methodLabel(order.method)}</strong></p> : null}
        {details ? <p>{details}</p> : null}
        {paid ? (
          <>
            <div className="check-ok" aria-hidden="true">✓</div>
            <p>{t('payment.approved')}</p>
            <a className="button" href="/learn">{t('payment.openCourses')}</a>
          </>
        ) : rejected ? (
          <>
            <div className="check-no" aria-hidden="true">✕</div>
            <p className="error">{t('payment.rejected')}</p>
          </>
        ) : (
          <>
            <p>{order.reviewStatus === 'pending' ? t('payment.reviewSent') : t('payment.waiting')}</p>
            <p className="muted">{t('payment.noGrant')}</p>
            {order.reviewStatus !== 'pending' ? (
              <form className="form" onSubmit={(event) => void sendCheck(event)}>
                <label>
                  {t('payment.note')}
                  <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={280} />
                </label>
                <button className="button" type="submit" disabled={sending}>
                  {t('payment.sendCheck')}
                </button>
              </form>
            ) : null}
          </>
        )}
      </div>
    </Shell>
  );
}

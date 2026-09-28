'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { translate } from '@meddonish/localization';
import { api } from '../../../lib/api';

const locale = 'ru' as const;

type Order = {
  status: string;
  entitlementActive: boolean;
  course: { title?: string };
  isYear3Bundle?: boolean;
};

function SuccessBody() {
  const params = useSearchParams();
  const orderId = params.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let ticks = 0;
    const timer = window.setInterval(() => {
      ticks += 1;
      api<Order>(`/orders/${orderId}`)
        .then(setOrder)
        .catch(() => undefined);
      if (ticks > 15) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [orderId]);

  const ready = order?.status === 'paid' && order.entitlementActive;

  return (
    <div className="shell">
      <section className="hero">
        <h1>{ready ? translate(locale, 'payment.success') : translate(locale, 'payment.waiting')}</h1>
        <p>{order?.isYear3Bundle ? translate(locale, 'offer.year3.title') : order?.course.title}</p>
        {ready ? <a className="button" href="/courses">{translate(locale, 'subscriber.continue')}</a> : null}
      </section>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessBody />
    </Suspense>
  );
}

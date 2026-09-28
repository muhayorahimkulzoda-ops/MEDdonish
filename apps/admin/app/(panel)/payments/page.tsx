'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminRequest, titleOf, type Translation } from '../../../lib/api';
import { t } from '../../../lib/i18n';

type Order = {
  id: string;
  status: string;
  phone: string;
  amountMinor: number;
  currency: string;
  source: string;
  course?: { translations: Translation[] };
  plan?: { code: string };
};

type Entitlement = {
  id: string;
  status: string;
  source: string;
  expiresAt: string;
  user?: { phone: string };
  course?: { translations: Translation[] };
  plan?: { code: string };
};

type Course = { id: string; translations: Translation[] };

export default function PaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');

  function reload() {
    return Promise.all([
      adminRequest<Order[]>('/admin/orders').then(setOrders),
      adminRequest<Entitlement[]>('/admin/entitlements').then(setEntitlements),
    ]);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    adminRequest<Course[]>('/admin/courses').then(setCourses).catch(() => undefined);
  }, []);

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    try {
      await adminRequest('/admin/entitlements', {
        method: 'POST',
        body: JSON.stringify({
          phone: String(data.get('phone')),
          courseId: String(data.get('courseId')),
          planCode: String(data.get('planCode')),
          source: 'admin',
        }),
      });
      form.reset();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function patch(id: string, body: object) {
    await adminRequest(`/admin/entitlements/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    await reload();
  }

  async function review(id: string, decision: 'yes' | 'no') {
    setError('');
    try {
      await adminRequest(`/admin/orders/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <>
      <h1>{t('admin.payments')}</h1>
      {error ? <div className="error">{error}</div> : null}
      <form className="form" onSubmit={grant}>
        <h2>{t('admin.grant')}</h2>
        <label>{t('payment.phone')}<input name="phone" placeholder="+992..." required /></label>
        <label>
          {t('admin.courses')}
          <select name="courseId" required>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{titleOf(course.translations)}</option>
            ))}
          </select>
        </label>
        <label>
          {t('admin.subscriptions')}
          <select name="planCode" defaultValue="month_1">
            <option value="month_1">{t('course.plans.month_1')}</option>
            <option value="month_5">{t('course.plans.month_5')}</option>
            <option value="year_1">{t('course.plans.year_1')}</option>
          </select>
        </label>
        <button type="submit">{t('admin.grant')}</button>
      </form>

      <div className="table-wrap section-block">
        <h2>{t('admin.payments')}</h2>
        <table>
          <thead>
            <tr>
              <th>{t('admin.courses')}</th>
              <th>{t('payment.phone')}</th>
              <th>{t('admin.status')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={4}>{t('admin.empty')}</td></tr>
            ) : orders.map((order) => (
              <tr key={order.id}>
                <td>{titleOf(order.course?.translations)} · {order.plan?.code}</td>
                <td>{order.phone}</td>
                <td><span className="badge">{order.status}</span> {order.amountMinor / 100} {order.currency}</td>
                <td className="actions">
                  {order.status === 'pending' ? (
                    <>
                      <button className="secondary" onClick={() => void review(order.id, 'yes')}>{t('admin.approve')}</button>
                      <button className="danger" onClick={() => void review(order.id, 'no')}>{t('admin.reject')}</button>
                    </>
                  ) : order.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap section-block">
        <h2>{t('admin.subscriptions')}</h2>
        <table>
          <thead>
            <tr>
              <th>{t('admin.users')}</th>
              <th>{t('admin.courses')}</th>
              <th>{t('admin.status')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {entitlements.map((item) => (
              <tr key={item.id}>
                <td>{item.user?.phone}</td>
                <td>{titleOf(item.course?.translations)}</td>
                <td><span className="badge">{item.status}</span> {item.plan?.code}</td>
                <td className="actions">
                  <button className="secondary" onClick={() => void patch(item.id, { extendDays: 30 })}>{t('admin.extend')}</button>
                  <button className="secondary" onClick={() => void patch(item.id, { status: 'suspended' })}>{t('admin.suspend')}</button>
                  <button className="danger" onClick={() => void patch(item.id, { status: 'revoked' })}>{t('admin.revoke')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

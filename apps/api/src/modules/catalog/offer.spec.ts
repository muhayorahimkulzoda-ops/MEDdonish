import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOffer, year3BundleFromOffer } from './offer';

test('offer never grants access and keeps server prices', () => {
  const offer = buildOffer({
    plans: [
      { code: 'month_1', durationDays: 30 },
      { code: 'month_5', durationDays: 150 },
      { code: 'year_1', durationDays: 365 },
    ],
    courses: [
      {
        id: 'c1',
        slug: 'osteology',
        translations: [{ language: 'ru', title: 'Остеология', description: 'Кости' }],
        prices: [
          { amountMinor: 15000, currency: 'TJS', plan: { code: 'month_1', durationDays: 30 } },
          { amountMinor: 50000, currency: 'TJS', plan: { code: 'year_1', durationDays: 365 } },
        ],
      },
    ],
  });

  assert.equal(offer.grantsAccess, false);
  assert.equal(offer.store.grantsAccess, false);
  assert.equal(offer.recommendedPlan, 'year_1');
  assert.equal(offer.courses[0].prices[0].amountMinor, 15000);
  assert.equal(offer.courses[0].prices.find((row) => row.planCode === 'year_1')?.recommended, true);
  assert.equal(offer.store.plans[0].googleSku, 'meddonish.month_1');
});

test('year-3 offer is one paid bundle for three courses', () => {
  const offer = buildOffer({
    plans: [
      { code: 'month_1', durationDays: 30 },
      { code: 'month_5', durationDays: 150 },
      { code: 'year_1', durationDays: 365 },
    ],
    courses: [
      {
        id: 'p1',
        slug: 'pathophysiology-y3',
        translations: [{ language: 'ru', title: 'Патофизиология' }],
        prices: [
          { amountMinor: 20000, currency: 'TJS', plan: { code: 'month_1', durationDays: 30 } },
          { amountMinor: 80000, currency: 'TJS', plan: { code: 'month_5', durationDays: 150 } },
          { amountMinor: 150000, currency: 'TJS', plan: { code: 'year_1', durationDays: 365 } },
        ],
      },
      {
        id: 'p2',
        slug: 'pathanatomy-y3',
        translations: [{ language: 'ru', title: 'Патанатомия' }],
        prices: [
          { amountMinor: 20000, currency: 'TJS', plan: { code: 'month_1', durationDays: 30 } },
          { amountMinor: 80000, currency: 'TJS', plan: { code: 'month_5', durationDays: 150 } },
          { amountMinor: 150000, currency: 'TJS', plan: { code: 'year_1', durationDays: 365 } },
        ],
      },
      {
        id: 'p3',
        slug: 'pharmacology-y3',
        translations: [{ language: 'ru', title: 'Фармакология' }],
        prices: [
          { amountMinor: 20000, currency: 'TJS', plan: { code: 'month_1', durationDays: 30 } },
          { amountMinor: 80000, currency: 'TJS', plan: { code: 'month_5', durationDays: 150 } },
          { amountMinor: 150000, currency: 'TJS', plan: { code: 'year_1', durationDays: 365 } },
        ],
      },
    ],
  });
  const bundle = year3BundleFromOffer(offer.courses);
  assert.ok(bundle);
  assert.equal(bundle.checkoutCourseId, 'p1');
  assert.equal(bundle.titles.length, 3);
  assert.deepEqual(
    bundle.prices.map((row) => row.amountMinor),
    [20000, 80000, 150000],
  );
});

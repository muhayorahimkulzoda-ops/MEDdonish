import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatTajikPhone, isTajikPhone, normalizeTajikPhone } from './phone';

test('normalizes Tajik numbers to +992XXXXXXXXX', () => {
  assert.equal(normalizeTajikPhone('939550598'), '+992939550598');
  assert.equal(normalizeTajikPhone('+992 93 955 05 98'), '+992939550598');
  assert.equal(normalizeTajikPhone('992939550598'), '+992939550598');
  assert.equal(isTajikPhone('+992939550598'), true);
  assert.equal(isTajikPhone('+99293'), false);
  assert.equal(isTajikPhone('+123939550598'), false);
  assert.equal(formatTajikPhone('+992939550598'), '+992 93 955 05 98');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeRequestId } from './request-id';

test('accepts a safe incoming request id', () => {
  assert.equal(sanitizeRequestId('client-req-123456'), 'client-req-123456');
});

test('rejects path-like or short values', () => {
  const generated = sanitizeRequestId('../secret');
  assert.notEqual(generated, '../secret');
  assert.match(generated, /^[0-9a-f-]{36}$/i);
  assert.notEqual(sanitizeRequestId('abc'), 'abc');
});

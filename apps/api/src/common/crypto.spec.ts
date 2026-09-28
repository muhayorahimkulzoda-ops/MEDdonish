import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hmacEquals, hmacHex, maskPhone } from './crypto';

test('maskPhone hides the middle digits', () => {
  assert.equal(maskPhone('+992900000088'), '+992***88');
});

test('hmacEquals accepts a matching signature', () => {
  const body = '{"status":"paid"}';
  const secret = 'webhook-test-secret-value';
  assert.equal(hmacEquals(secret, body, hmacHex(secret, body)), true);
});

test('hmacEquals rejects a different signature', () => {
  assert.equal(hmacEquals('secret-a', 'body', hmacHex('secret-b', 'body')), false);
});

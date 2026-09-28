import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertPassword } from './password';

function codeOf(run: () => void) {
  try {
    run();
    return null;
  } catch (err) {
    return err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : 'UNKNOWN';
  }
}

test('rejects short, mismatched and weak passwords', () => {
  assert.equal(codeOf(() => assertPassword('secret-ok-1', 'other-pass-1')), 'PASSWORD_MISMATCH');
  assert.equal(codeOf(() => assertPassword('short1', 'short1')), 'PASSWORD_TOO_SHORT');
  assert.equal(codeOf(() => assertPassword('12345678', '12345678')), 'PASSWORD_WEAK');
  assert.equal(codeOf(() => assertPassword('onlyletters', 'onlyletters')), 'PASSWORD_WEAK');
  assert.equal(codeOf(() => assertPassword('secret-ok-1', 'secret-ok-1')), null);
});

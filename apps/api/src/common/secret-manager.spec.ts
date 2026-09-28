import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { SecretManager } from './secret-manager';

test('file backend reads a key without exposing it in errors', () => {
  const dir = mkdtempSync(join(tmpdir(), 'meddonish-secret-'));
  writeFileSync(join(dir, 'MEDIA_SIGNING_SECRET'), 'file-backend-secret-value-ok');
  const manager = new SecretManager('file', dir);
  assert.equal(manager.get('MEDIA_SIGNING_SECRET'), 'file-backend-secret-value-ok');
});

test('missing file falls back to env', () => {
  const dir = mkdtempSync(join(tmpdir(), 'meddonish-secret-'));
  const previous = process.env.MEDIA_SIGNING_SECRET;
  process.env.MEDIA_SIGNING_SECRET = 'from-env-only';
  const manager = new SecretManager('file', dir);
  assert.equal(manager.get('MEDIA_SIGNING_SECRET'), 'from-env-only');
  if (previous === undefined) delete process.env.MEDIA_SIGNING_SECRET;
  else process.env.MEDIA_SIGNING_SECRET = previous;
});

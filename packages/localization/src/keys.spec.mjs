import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const ru = JSON.parse(readFileSync(join(dir, 'ru.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8'));
const tg = JSON.parse(readFileSync(join(dir, 'tg.json'), 'utf8'));

test('ru / en / tg expose the same keys', () => {
  const ruKeys = Object.keys(ru).sort();
  assert.deepEqual(Object.keys(en).sort(), ruKeys);
  assert.deepEqual(Object.keys(tg).sort(), ruKeys);
});

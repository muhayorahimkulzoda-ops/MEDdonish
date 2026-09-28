import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSafeHlsName } from './hls-file';

test('allows HLS segment names', () => {
  assert.equal(isSafeHlsName('360.m3u8'), true);
  assert.equal(isSafeHlsName('manifest.mpd'), true);
});

test('rejects path traversal', () => {
  assert.equal(isSafeHlsName('../source/original'), false);
  assert.equal(isSafeHlsName('..'), false);
});

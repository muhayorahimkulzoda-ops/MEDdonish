import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drmSession, mediaPath, publicMediaUrl } from './delivery';

test('local delivery stays on the API path', () => {
  const path = mediaPath('video', 'tok');
  const out = publicMediaUrl(path, 180, {});
  assert.equal(out.url, '/api/v1/media/video/tok');
  assert.equal(out.cdn, false);
});

test('CDN URL never includes a storage key', () => {
  const path = mediaPath('video', 'tok', 'manifest.mpd');
  const out = publicMediaUrl(path, 180, {
    CDN_PUBLIC_BASE: 'https://cdn.example.test',
    CDN_SIGNING_SECRET: 'c'.repeat(32),
  });
  assert.equal(out.cdn, true);
  assert.match(out.url, /^https:\/\/cdn\.example\.test\/api\/v1\/media\/video\/tok\/manifest\.mpd\?/);
  assert.doesNotMatch(out.url, /sourceKey|storageKey|original/);
});

test('license ticket is not a DRM content key', () => {
  const session = drmSession('user-1', 'video-1', 180, {
    LICENSE_SERVER_URL: 'https://license.example.test/widevine',
    LICENSE_SIGNING_SECRET: 'l'.repeat(32),
  });
  assert.equal(session.provider, 'widevine');
  assert.ok(session.licenseUrl?.startsWith('https://license.example.test/widevine?'));
  assert.doesNotMatch(session.licenseUrl ?? '', /kid=|content[_-]?key|pssh/i);
});

test('without license server DRM is none', () => {
  const session = drmSession('user-1', 'video-1', 180, {});
  assert.equal(session.provider, 'none');
  assert.equal(session.licenseUrl, null);
});

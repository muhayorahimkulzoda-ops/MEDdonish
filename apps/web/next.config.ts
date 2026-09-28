import { resolve } from 'path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

loadEnvConfig(resolve(__dirname, '../..'));

const isDev = process.env.NODE_ENV !== 'production';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://accounts.google.com https://appleid.cdn-apple.com"
        : "script-src 'self' 'unsafe-inline' https://accounts.google.com https://appleid.cdn-apple.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob: http://127.0.0.1:3000 http://localhost:3000 https:",
      isDev
        ? "connect-src 'self' http://127.0.0.1:3000 http://localhost:3000 http://127.0.0.1:8081 http://localhost:8081 http://127.0.0.1:8082 http://localhost:8082 https://localhost:8443 ws: wss: https: https://accounts.google.com https://oauth2.googleapis.com https://appleid.apple.com"
        : "connect-src 'self' http://127.0.0.1:3000 http://localhost:3000 https://localhost:8443 https: https://accounts.google.com https://oauth2.googleapis.com https://appleid.apple.com",
      "frame-src 'self' blob: http://127.0.0.1:3000 http://localhost:3000 https://accounts.google.com https://appleid.apple.com",
      "object-src 'none'",
      "worker-src 'self' blob:",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

if (process.env.NODE_ENV === 'production') {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  });
}

const config: NextConfig = {
  poweredByHeader: false,
  transpilePackages: [
    '@meddonish/localization',
    '@meddonish/api-client',
    '@meddonish/shared-types',
    'pdfjs-dist',
  ],
  async rewrites() {
    const api = process.env.API_PUBLIC_URL ?? 'http://127.0.0.1:3000';
    return [{ source: '/api/v1/:path*', destination: `${api}/api/v1/:path*` }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ];
  },
};

export default config;

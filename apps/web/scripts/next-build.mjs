import { spawnSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const middleware = join(appRoot, 'middleware.ts');
const parked = join(appRoot, 'middleware.server.ts');
const pages = process.env.GITHUB_PAGES === 'true';

if (pages && existsSync(middleware)) {
  renameSync(middleware, parked);
}

let status = 1;
try {
  const result = spawnSync('pnpm', ['exec', 'next', 'build'], {
    cwd: appRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  status = result.status ?? 1;
} finally {
  if (pages && existsSync(parked)) {
    renameSync(parked, middleware);
  }
}

process.exit(status);

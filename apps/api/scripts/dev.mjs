import { execSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = join(dirname(fileURLToPath(import.meta.url)), '..');

execSync('pnpm exec tsc -p tsconfig.build.json', { cwd, stdio: 'inherit' });

const tsc = spawn(
  'pnpm',
  ['exec', 'tsc', '-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'],
  { cwd, stdio: 'inherit', shell: true },
);

const app = spawn(process.execPath, ['--watch', 'dist/main.js'], {
  cwd,
  stdio: 'inherit',
  env: process.env,
});

function shutdown() {
  tsc.kill();
  app.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

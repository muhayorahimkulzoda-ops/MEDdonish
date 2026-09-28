import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const local = path.join(root, '.local-pg');
const dataDir = path.join(local, 'data');
const binDir = path.join(local, 'pgsql', 'bin');
mkdirSync(local, { recursive: true });

function run(file, args, extra = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { stdio: 'inherit', windowsHide: true, ...extra });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(file)} exited with ${code}`));
    });
  });
}

if (!existsSync(path.join(binDir, 'pg_ctl.exe'))) {
  const version = '16.8.0';
  const jarName = `embedded-postgres-binaries-windows-amd64-${version}.jar`;
  const url = `https://repo1.maven.org/maven2/io/zonky/test/postgres/embedded-postgres-binaries-windows-amd64/${version}/${jarName}`;
  const jarPath = path.join(local, jarName);
  process.stdout.write(`Downloading Postgres ${version}...\n`);
  await run('curl.exe', ['-fsSL', '-o', jarPath, url]);
  const extractDir = await mkdtemp(path.join(os.tmpdir(), 'meddonish-pg-'));
  await run('tar.exe', ['-xf', jarPath, '-C', extractDir]);
  const txz =
    ['postgres-windows-x86_64.txz', 'postgres-windows-amd64.txz']
      .map((name) => path.join(extractDir, name))
      .find((file) => existsSync(file));
  if (!txz) {
    throw new Error(`Postgres archive missing inside ${jarName}`);
  }
  const pgsqlDest = path.join(local, 'pgsql');
  mkdirSync(pgsqlDest, { recursive: true });
  await run('tar.exe', ['-xf', txz, '-C', pgsqlDest]);
}

const pgCtl = path.join(binDir, 'pg_ctl.exe');
const initdb = path.join(binDir, 'initdb.exe');
const pwFile = path.join(local, 'pwfile');
if (!existsSync(path.join(dataDir, 'PG_VERSION'))) {
  writeFileSync(pwFile, 'meddonish');
  await run(initdb, [
    '-D',
    dataDir,
    '-U',
    'meddonish',
    '-A',
    'password',
    '--pwfile',
    pwFile,
    '-E',
    'UTF8',
    '--locale=C',
    '--no-instructions',
  ]);
}

const logFile = path.join(local, 'postgres.log');
await run(pgCtl, ['-D', dataDir, '-l', logFile, '-o', `-p 5433`, 'start']);

const createdb = path.join(binDir, 'createdb.exe');
try {
  await run(
    createdb,
    ['-h', '127.0.0.1', '-p', '5433', '-U', 'meddonish', 'meddonish'],
    { env: { ...process.env, PGPASSWORD: 'meddonish' } },
  );
} catch {
  // database already exists
}

process.stdout.write('postgres ready on 5433\n');
const stop = () => {
  spawn(pgCtl, ['-D', dataDir, 'stop', '-m', 'fast'], { stdio: 'inherit', windowsHide: true }).on('exit', () => process.exit(0));
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await new Promise(() => {});

import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import EmbeddedPostgres from 'embedded-postgres';

const root = dirname(fileURLToPath(import.meta.url));
const databaseDir = join(root, 'data');
mkdirSync(databaseDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'meddonish',
  password: 'meddonish',
  port: 5433,
  persistent: true,
});

try {
  await pg.initialise();
} catch (error) {
  console.warn('postgres initialise:', String(error));
}

await pg.start();
try {
  await pg.createDatabase('meddonish');
} catch (error) {
  const text = String(error);
  if (!/already exists/i.test(text)) throw error;
}

console.log('postgres ready on 127.0.0.1:5433 database meddonish');
await new Promise(() => undefined);

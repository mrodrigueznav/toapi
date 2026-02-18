/**
 * Custom ESM migration runner. Applies pending migrations from /migrations in filename order.
 */
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from '../src/config/sequelize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

async function ensureMigrationsTable(queryInterface) {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS "migrations" (
      "name" VARCHAR(255) NOT NULL PRIMARY KEY,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT name FROM "migrations" ORDER BY name;',
    { type: 'SELECT' }
  );
  return (rows || []).map(r => r.name);
}

async function recordMigration(queryInterface, name) {
  await queryInterface.sequelize.query(
    'INSERT INTO "migrations" ("name", "createdAt") VALUES ($1, NOW());',
    { bind: [name] }
  );
}

async function removeMigration(queryInterface, name) {
  await queryInterface.sequelize.query('DELETE FROM "migrations" WHERE "name" = $1;', {
    bind: [name],
  });
}

async function run() {
  const files = await readdir(MIGRATIONS_DIR);
  const migrationFiles = files
    .filter(f => f.endsWith('.js'))
    .sort();

  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();
  await ensureMigrationsTable(queryInterface);
  const applied = await getAppliedMigrations(queryInterface);

  for (const file of migrationFiles) {
    const name = file.replace(/\.js$/, '');
    if (applied.includes(name)) continue;
    const path = join(MIGRATIONS_DIR, file);
    const mod = await import(path);
    if (typeof mod.up !== 'function') {
      console.warn(`Skipping ${file}: no up()`);
      continue;
    }
    console.log(`Running migration: ${name}`);
    await mod.up(queryInterface, sequelize.constructor);
    await recordMigration(queryInterface, name);
  }
  console.log('Migrations complete.');
  await sequelize.close();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

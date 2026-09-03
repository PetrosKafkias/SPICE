import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { seedDatabase } from './seed.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations');

export function defaultDatabasePath() {
  if (process.env.VERCEL) return resolve('/tmp', process.env.SPICE_DB_PATH || 'spice.db');
  return resolve(projectRoot, process.env.SPICE_DB_PATH || 'data/spice.db');
}

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').all().map((row) => row.name),
  );

  const migrations = readdirSync(migrationsDirectory)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const name of migrations) {
    if (applied.has(name)) continue;
    const sql = readFileSync(resolve(migrationsDirectory, name), 'utf8');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)')
        .run(name, new Date().toISOString());
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

export async function createDatabase({ databasePath = defaultDatabasePath(), seed = true } = {}) {
  const folder = dirname(databasePath);
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });

  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys = ON');
  // OneDrive-backed workspaces can reject SQLite sidecar WAL files.
  db.exec('PRAGMA journal_mode = DELETE');
  db.exec('PRAGMA busy_timeout = 5000');
  runMigrations(db);
  if (seed) await seedDatabase(db);
  return db;
}

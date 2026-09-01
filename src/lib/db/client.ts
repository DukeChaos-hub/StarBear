import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Vite/Vitest can't resolve `node:sqlite` directly; load via a CJS shim.
import type { DatabaseSync as DatabaseSyncType, StatementSync } from 'node:sqlite';
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('./sqlite-shim.cjs') as {
  DatabaseSync: new (path: string) => DatabaseSyncType;
};

let _db: DatabaseSyncType | null = null;

function dbPath(): string {
  return process.env.STARBEAR_DB ?? resolve(process.cwd(), '.starbear/starbear.sqlite');
}

export function getDb(): DatabaseSyncType {
  if (_db) return _db;
  const p = dbPath();
  mkdirSync(dirname(p), { recursive: true });
  _db = new DatabaseSync(p);
  _db.exec('PRAGMA journal_mode = WAL');
  _db.exec('PRAGMA foreign_keys = ON');
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export function exec(sql: string): void {
  getDb().exec(sql);
}

/** Apply all .sql files in src/lib/db/migrations, in order. */
export function migrate(): void {
  const db = getDb();
  const dir = resolve(process.cwd(), 'src/lib/db/migrations');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of files) {
    const sqlText = readFileSync(join(dir, f), 'utf8');
    const stmts = sqlText
      .split(/-->\s*statement-breakpoint/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    db.exec('BEGIN');
    try {
      for (const s of stmts) db.exec(s);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}

export function prepare(sql: string): StatementSync {
  return getDb().prepare(sql);
}

export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  return prepare(sql).all(...(params as never[])) as T[];
}

export function get<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T | undefined {
  const row = prepare(sql).get(...(params as never[]));
  return row as T | undefined;
}

export function run(
  sql: string,
  params: unknown[] = [],
): { changes: number; lastInsertRowid: number | bigint } {
  const res = prepare(sql).run(...(params as never[]));
  return { changes: Number(res.changes), lastInsertRowid: res.lastInsertRowid };
}

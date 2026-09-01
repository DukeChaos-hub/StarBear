import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { closeDb, all } from '@/lib/db/client';

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-reset-'));
  dbPath = join(dir, 'test.sqlite');
  process.env.STARBEAR_DB = dbPath;
  closeDb();
});

afterAll(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

function runScript(name: string) {
  const r = spawnSync(
    process.execPath,
    [join(process.cwd(), 'node_modules/tsx/dist/cli.mjs'), `scripts/${name}.ts`],
    { env: { ...process.env, STARBEAR_DB: dbPath }, encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`${name} failed: ${r.stderr}`);
  return r.stdout;
}

describe('reset-db script', () => {
  it('wipes a seeded database, leaving an empty schema', () => {
    runScript('migrate');
    runScript('seed');

    expect(all<{ c: number }>(`SELECT COUNT(*) as c FROM environments`)[0]?.c).toBe(1);
    expect(all<{ c: number }>(`SELECT COUNT(*) as c FROM requests`)[0]?.c).toBe(3);

    const out = runScript('reset-db');
    expect(out).toContain('Dropping tables');
    expect(out).toContain('Re-applying migrations');
    expect(out).toContain('Database reset');

    expect(all<{ c: number }>(`SELECT COUNT(*) as c FROM environments`)[0]?.c).toBe(0);
    expect(all<{ c: number }>(`SELECT COUNT(*) as c FROM requests`)[0]?.c).toBe(0);
    // But the table itself still exists (schema intact).
    expect(all<{ c: number }>(`SELECT COUNT(*) as c FROM collections`)[0]?.c).toBe(0);
  });

  it('is a no-op when the file does not exist', () => {
    const out = runScript('reset-db');
    expect(out).toContain('Re-applying migrations');
    // Schema created even if no prior file existed.
    expect(all<{ c: number }>(`SELECT COUNT(*) as c FROM environments`)[0]?.c).toBe(0);
  });
});

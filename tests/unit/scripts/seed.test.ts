import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { closeDb, all } from '@/lib/db/client';

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-seed-'));
  dbPath = join(dir, 'test.sqlite');
  process.env.STARBEAR_DB = dbPath;
  closeDb();

  // 1) migrate
  const mig = spawnSync(
    process.execPath,
    [join(process.cwd(), 'node_modules/tsx/dist/cli.mjs'), 'scripts/migrate.ts'],
    { env: { ...process.env, STARBEAR_DB: dbPath }, encoding: 'utf8' },
  );
  expect(mig.status, mig.stderr).toBe(0);
});

afterAll(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

function runSeed() {
  const r = spawnSync(
    process.execPath,
    [join(process.cwd(), 'node_modules/tsx/dist/cli.mjs'), 'scripts/seed.ts'],
    { env: { ...process.env, STARBEAR_DB: dbPath }, encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`seed failed: ${r.stderr}`);
  return r.stdout;
}

describe('seed script', () => {
  it('populates env, vars, and a collection with 3 requests on first run', () => {
    const out = runSeed();
    expect(out).toContain('environment: dev');
    expect(out).toContain('collection: Sandbox');
    expect(out).toContain('Done.');

    const envs = all<{ name: string; is_active: number }>(`SELECT name, is_active FROM environments`);
    expect(envs.length).toBe(1);
    expect(envs[0]).toMatchObject({ name: 'dev', is_active: 1 });

    const vars = all<{ key: string; value: string; is_secret: number }>(
      `SELECT key, value, is_secret FROM env_variables ORDER BY sort_order`,
    );
    expect(vars.length).toBe(2);
    expect(vars[0]).toMatchObject({ key: 'host', value: 'https://httpbin.org', is_secret: 0 });
    expect(vars[1]).toMatchObject({ key: 'token', is_secret: 1 });

    const reqs = all<{ name: string; method: string; url: string }>(
      `SELECT name, method, url FROM requests ORDER BY sort_order`,
    );
    expect(reqs.length).toBe(3);
    expect(reqs.map((r) => r.method)).toEqual(['GET', 'POST', 'GET']);
    expect(reqs[0]?.url).toBe('{host}/get');
  });

  it('is idempotent — second run does not duplicate data', () => {
    runSeed();
    const out = runSeed();
    expect(out).toContain('already exists, skipping');
    // On idempotent run, the "Done." line is preceded by "skipping" lines, not
    // by "  + environment:" / "  + collection:" insertions.
    expect(out).toMatch(/skipping[\s\S]*Done\./);

    const envs = all<{ c: number }>(`SELECT COUNT(*) as c FROM environments`);
    expect(envs[0]?.c).toBe(1);
    const reqs = all<{ c: number }>(`SELECT COUNT(*) as c FROM requests`);
    expect(reqs[0]?.c).toBe(3);
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate, closeDb } from '@/lib/db/client';
import * as collections from '@/lib/db/repositories/collections';
import * as requests from '@/lib/db/repositories/requests';
import * as envVars from '@/lib/db/repositories/env-variables';
import * as cases from '@/lib/db/repositories/test-cases';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-repo-updates-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();
});
afterAll(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe('repositories — update paths', () => {
  it('collections.update patches individual fields and bumps updated_at', async () => {
    const id = await collections.create({
      name: 'X',
      description: 'old',
      parentId: null,
      sortOrder: 0,
    });
    const before = await collections.getById(id);
    await new Promise((r) => setTimeout(r, 5));
    await collections.update(id, { name: 'Y', description: 'new' });
    const after = await collections.getById(id);
    expect(after?.name).toBe('Y');
    expect(after?.description).toBe('new');
    expect(after?.updated_at).toBeGreaterThan(before?.updated_at ?? 0);
  });

  it('requests.update patches method, url, body, auth', async () => {
    const colId = await collections.create({
      name: 'C',
      description: null,
      parentId: null,
      sortOrder: 0,
    });
    const id = await requests.create({
      collectionId: colId,
      name: 'A',
      method: 'GET',
      url: '/a',
      headers: '[]',
      queryParams: '[]',
      bodyKind: 'none',
      body: null,
      authKind: 'none',
      authConfig: null,
      preScript: null,
      postScript: null,
      sortOrder: 0,
    });
    await requests.update(id, {
      method: 'POST',
      url: '/b',
      bodyKind: 'json',
      body: '{"k":1}',
      authKind: 'bearer',
      authConfig: '{"kind":"bearer","token":"abc"}',
    });
    const r = await requests.getById(id);
    expect(r?.method).toBe('POST');
    expect(r?.url).toBe('/b');
    expect(r?.body_kind).toBe('json');
    expect(r?.body).toBe('{"k":1}');
    expect(r?.auth_kind).toBe('bearer');
  });

  it('env-variables.update patches key, value, isSecret, sortOrder', async () => {
    const envId = (await (await import('@/lib/db/repositories/environments')).create({ name: 'dev' }));
    const v1 = await envVars.create({
      envId,
      key: 'k1',
      value: 'v1',
      isSecret: false,
      sortOrder: 0,
    });
    const v2 = await envVars.create({
      envId,
      key: 'k2',
      value: 'v2',
      isSecret: false,
      sortOrder: 1,
    });
    await envVars.update(v1, { key: 'k1renamed', value: 'v1new', isSecret: true, sortOrder: 5 });
    await envVars.update(v2, { value: 'v2new' });
    const list = await envVars.listByEnv(envId);
    const after1 = list.find((v) => v.id === v1);
    const after2 = list.find((v) => v.id === v2);
    expect(after1?.key).toBe('k1renamed');
    expect(after1?.value).toBe('v1new');
    expect(after1?.is_secret).toBe(1);
    expect(after1?.sort_order).toBe(5);
    expect(after2?.value).toBe('v2new');
    expect(after2?.key).toBe('k2');
  });

  it('test-cases.update patches name, description, assertions, sortOrder', async () => {
    const colId = await collections.create({
      name: 'C',
      description: null,
      parentId: null,
      sortOrder: 0,
    });
    const reqId = await requests.create({
      collectionId: colId,
      name: 'A',
      method: 'GET',
      url: '/a',
      headers: '[]',
      queryParams: '[]',
      bodyKind: 'none',
      body: null,
      authKind: 'none',
      authConfig: null,
      preScript: null,
      postScript: null,
      sortOrder: 0,
    });
    const id = await cases.create({
      requestId: reqId,
      name: 'old',
      description: 'd',
      assertions: '[]',
      sortOrder: 0,
    });
    await cases.update(id, {
      name: 'new',
      description: 'd2',
      assertions: '[{"type":"status","expected":200}]',
      sortOrder: 9,
    });
    const c = await cases.getById(id);
    expect(c?.name).toBe('new');
    expect(c?.description).toBe('d2');
    expect(JSON.parse(c?.assertions ?? '[]')[0]?.type).toBe('status');
    expect(c?.sort_order).toBe(9);
  });
});

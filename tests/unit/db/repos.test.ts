import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDb, migrate } from '@/lib/db/client';
import * as collections from '@/lib/db/repositories/collections';
import * as requests from '@/lib/db/repositories/requests';
import * as envs from '@/lib/db/repositories/environments';
import * as vars from '@/lib/db/repositories/env-variables';
import * as cases from '@/lib/db/repositories/test-cases';
import * as runs from '@/lib/db/repositories/test-runs';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-repos-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();
});
afterAll(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe('repositories', () => {
  it('collections CRUD', async () => {
    const id = await collections.create({
      name: 'Auth',
      description: 'auth tests',
      parentId: null,
      sortOrder: 0,
    });
    expect((await collections.getById(id))?.name).toBe('Auth');
    await collections.update(id, { name: 'Authentication' });
    expect((await collections.getById(id))?.name).toBe('Authentication');
    const list = await collections.list();
    expect(list.length).toBe(1);
    await collections.remove(id);
    expect(await collections.getById(id)).toBeUndefined();
  });

  it('requests CRUD + listByCollection + search', async () => {
    const colId = await collections.create({
      name: 'X',
      description: null,
      parentId: null,
      sortOrder: 0,
    });
    const id = await requests.create({
      collectionId: colId,
      name: 'Login',
      method: 'POST',
      url: '/auth/login',
      headers: '[]',
      queryParams: '[]',
      bodyKind: 'json',
      body: '{}',
      authKind: 'none',
      authConfig: null,
      preScript: null,
      postScript: null,
      sortOrder: 0,
    });
    expect((await requests.getById(id))?.name).toBe('Login');
    expect((await requests.listByCollection(colId)).length).toBe(1);
    const found = await requests.search('login');
    expect(found.length).toBe(1);
    await requests.remove(id);
  });

  it('environments + setActive + variables asMap', async () => {
    const id = await envs.create({ name: 'dev' });
    await envs.setActive(id);
    await vars.create({ envId: id, key: 'host', value: 'api.dev', isSecret: false, sortOrder: 0 });
    await vars.create({ envId: id, key: 'token', value: 'secret', isSecret: true, sortOrder: 1 });
    expect((await envs.getActive())?.name).toBe('dev');
    const map = await vars.asMap(id);
    expect(map).toEqual({ host: 'api.dev', token: 'secret' });
  });

  it('test cases + runs with steps', async () => {
    const colId = await collections.create({
      name: 'T',
      description: null,
      parentId: null,
      sortOrder: 0,
    });
    const reqId = await requests.create({
      collectionId: colId,
      name: 'Login',
      method: 'POST',
      url: '/x',
      headers: '[]',
      queryParams: '[]',
      bodyKind: 'json',
      body: '{}',
      authKind: 'none',
      authConfig: null,
      preScript: null,
      postScript: null,
      sortOrder: 0,
    });
    const caseId = await cases.create({
      requestId: reqId,
      name: 'OK',
      description: null,
      assertions: '[]',
      sortOrder: 0,
    });
    const runId = await runs.create({ scope: 'single', scopeRef: caseId, status: 'running' });
    await runs.addStep({
      runId,
      stepIndex: 0,
      requestId: reqId,
      name: 'OK',
      status: 'passed',
      responseMeta: null,
      error: null,
      assertionsResult: null,
    });
    await runs.finish(runId, 'passed', JSON.stringify({ total: 1, passed: 1, failed: 0 }));
    const full = await runs.getWithSteps(runId);
    expect(full?.run.status).toBe('passed');
    expect(full?.steps.length).toBe(1);
  });
});

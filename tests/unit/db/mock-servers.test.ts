import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate, closeDb } from '@/lib/db/client';
import * as servers from '@/lib/db/repositories/mock-servers';
import * as responses from '@/lib/db/repositories/mock-responses';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-mocks-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();
});
afterAll(() => {
  closeDb();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('mock-servers repo', () => {
  it('creates and fetches a server', async () => {
    const id = await servers.create({
      name: 'users api',
      description: 'Mock for /users',
      basePath: '/users',
      status: 'active',
    });
    const row = await servers.getById(id);
    expect(row).toBeDefined();
    expect(row!.name).toBe('users api');
    expect(row!.base_path).toBe('/users');
    expect(row!.status).toBe('active');
  });

  it('lists servers newest-first', async () => {
    await servers.create({ name: 'first', description: null, basePath: '/a', status: 'active' });
    await new Promise((r) => setTimeout(r, 5));
    await servers.create({ name: 'second', description: null, basePath: '/b', status: 'active' });
    const list = await servers.list();
    expect(list.map((r) => r.name)).toEqual(['second', 'first']);
  });

  it('patches a server', async () => {
    const id = await servers.create({
      name: 'a',
      description: null,
      basePath: '/a',
      status: 'active',
    });
    await servers.update(id, { name: 'renamed', status: 'paused' });
    const after = await servers.getById(id);
    expect(after!.name).toBe('renamed');
    expect(after!.status).toBe('paused');
  });

  it('removes a server and cascades to its responses', async () => {
    const sid = await servers.create({
      name: 'a',
      description: null,
      basePath: '/a',
      status: 'active',
    });
    const rid = await responses.create({
      serverId: sid,
      method: 'GET',
      pathPattern: '/users',
      status: 200,
      headers: null,
      body: '{"ok":true}',
      delayMs: 0,
      sortOrder: 0,
    });
    expect(await responses.getById(rid)).toBeDefined();
    await servers.remove(sid);
    expect(await servers.getById(sid)).toBeUndefined();
    expect(await responses.getById(rid)).toBeUndefined();
  });
});

describe('mock-responses findMatch', () => {
  let sid: string;
  beforeEach(async () => {
    sid = await servers.create({
      name: 'svc',
      description: null,
      basePath: '/svc',
      status: 'active',
    });
  });

  it('returns the response with exact method + path', async () => {
    await responses.create({
      serverId: sid,
      method: 'GET',
      pathPattern: '/users/42',
      status: 200,
      headers: null,
      body: '',
      delayMs: 0,
      sortOrder: 0,
    });
    const m = await responses.findMatch(sid, 'GET', '/users/42');
    expect(m).toBeDefined();
    expect(m!.path_pattern).toBe('/users/42');
  });

  it('matches method case-insensitively', async () => {
    await responses.create({
      serverId: sid,
      method: 'GET',
      pathPattern: '/x',
      status: 200,
      headers: null,
      body: '',
      delayMs: 0,
      sortOrder: 0,
    });
    const m = await responses.findMatch(sid, 'get', '/x');
    expect(m).toBeDefined();
  });

  it('returns undefined when method does not match', async () => {
    await responses.create({
      serverId: sid,
      method: 'GET',
      pathPattern: '/x',
      status: 200,
      headers: null,
      body: '',
      delayMs: 0,
      sortOrder: 0,
    });
    expect(await responses.findMatch(sid, 'POST', '/x')).toBeUndefined();
  });

  it('matches a trailing * wildcard against any suffix', async () => {
    await responses.create({
      serverId: sid,
      method: 'GET',
      pathPattern: '/users/*',
      status: 200,
      headers: null,
      body: '',
      delayMs: 0,
      sortOrder: 0,
    });
    expect(await responses.findMatch(sid, 'GET', '/users/1')).toBeDefined();
    expect(await responses.findMatch(sid, 'GET', '/users/42/edit')).toBeDefined();
  });

  it('does not match a wildcard with a wrong prefix', async () => {
    await responses.create({
      serverId: sid,
      method: 'GET',
      pathPattern: '/users/*',
      status: 200,
      headers: null,
      body: '',
      delayMs: 0,
      sortOrder: 0,
    });
    expect(await responses.findMatch(sid, 'GET', '/projects/1')).toBeUndefined();
  });

  it('returns the lowest sort_order first when multiple match', async () => {
    await responses.create({
      serverId: sid,
      method: 'GET',
      pathPattern: '/x',
      status: 500,
      headers: null,
      body: '',
      delayMs: 0,
      sortOrder: 1,
    });
    await responses.create({
      serverId: sid,
      method: 'GET',
      pathPattern: '/x',
      status: 200,
      headers: null,
      body: 'first',
      delayMs: 0,
      sortOrder: 0,
    });
    const m = await responses.findMatch(sid, 'GET', '/x');
    expect(m!.status).toBe(200);
    expect(m!.body).toBe('first');
  });
});

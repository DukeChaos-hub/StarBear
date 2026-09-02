import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate, closeDb } from '@/lib/db/client';

// Route handlers are imported lazily so STARBEAR_DB is set before they
// touch the DB. We invoke them with NextRequest objects directly.
// `path` is string | string[] to support catch-all routes like
// /api/mock/[id]/[...path] whose params.path is an array of segments.
async function call(
  handler: (
    req: Request,
    ctx: { params: Promise<Record<string, string | string[]>> },
  ) => Promise<Response>,
  url: string,
  init: RequestInit = {},
  params: Record<string, string | string[]> = {},
) {
  const req = new Request(`http://localhost${url}`, init);
  const res = await handler(req as never, { params: Promise.resolve(params) });
  return res;
}

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-mocks-api-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();
});
afterAll(() => {
  closeDb();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('GET/POST /api/mock-servers', () => {
  it('lists empty', async () => {
    const { GET } = await import('@/app/api/mock-servers/route');
    const res = await call(GET as never, '/api/mock-servers');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('creates and lists a server', async () => {
    const { POST, GET } = await import('@/app/api/mock-servers/route');
    const create = await call(POST as never, '/api/mock-servers', {
      method: 'POST',
      body: JSON.stringify({ name: 'svc', basePath: '/svc' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(create.status).toBe(201);
    const { id } = await create.json();
    expect(typeof id).toBe('string');

    const list = await call(GET as never, '/api/mock-servers');
    const arr = await list.json();
    expect(arr).toHaveLength(1);
    expect(arr[0].id).toBe(id);
  });

  it('rejects a basePath without leading slash', async () => {
    const { POST } = await import('@/app/api/mock-servers/route');
    const res = await call(POST as never, '/api/mock-servers', {
      method: 'POST',
      body: JSON.stringify({ name: 'svc', basePath: 'svc' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });
});

describe('GET/PATCH/DELETE /api/mock-servers/[id]', () => {
  async function makeServer() {
    const { POST } = await import('@/app/api/mock-servers/route');
    const res = await call(POST as never, '/api/mock-servers', {
      method: 'POST',
      body: JSON.stringify({ name: 'svc', basePath: '/svc' }),
      headers: { 'content-type': 'application/json' },
    });
    return (await res.json()).id as string;
  }

  it('GETs one by id', async () => {
    const id = await makeServer();
    const { GET } = await import('@/app/api/mock-servers/[id]/route');
    const res = await call(GET as never, `/api/mock-servers/${id}`, {}, { id });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(id);
  });

  it('GETs 404 on unknown id', async () => {
    const { GET } = await import('@/app/api/mock-servers/[id]/route');
    const res = await call(GET as never, '/api/mock-servers/nope', {}, { id: 'nope' });
    expect(res.status).toBe(404);
  });

  it('PATCHes name and status', async () => {
    const id = await makeServer();
    const { PATCH } = await import('@/app/api/mock-servers/[id]/route');
    const res = await call(
      PATCH as never,
      `/api/mock-servers/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'renamed', status: 'paused' }),
        headers: { 'content-type': 'application/json' },
      },
      { id },
    );
    expect(res.status).toBe(200);
    const { GET } = await import('@/app/api/mock-servers/[id]/route');
    const after = await (await call(GET as never, `/api/mock-servers/${id}`, {}, { id })).json();
    expect(after.name).toBe('renamed');
    expect(after.status).toBe('paused');
  });

  it('DELETEs and cascades to responses', async () => {
    const id = await makeServer();
    const { POST: postRes } = await import('@/app/api/mock-servers/[id]/responses/route');
    await call(
      postRes as never,
      `/api/mock-servers/${id}/responses`,
      {
        method: 'POST',
        body: JSON.stringify({ method: 'GET', pathPattern: '/x', status: 200 }),
        headers: { 'content-type': 'application/json' },
      },
      { id },
    );

    const { DELETE } = await import('@/app/api/mock-servers/[id]/route');
    const res = await call(
      DELETE as never,
      `/api/mock-servers/${id}`,
      { method: 'DELETE' },
      { id },
    );
    expect(res.status).toBe(200);

    const { GET } = await import('@/app/api/mock-servers/[id]/route');
    const after = await call(GET as never, `/api/mock-servers/${id}`, {}, { id });
    expect(after.status).toBe(404);
  });
});

describe('POST/GET /api/mock-servers/[id]/responses', () => {
  it('creates and lists responses for a server', async () => {
    const { POST: makeSrv } = await import('@/app/api/mock-servers/route');
    const { id: sid } = await (
      await call(makeSrv as never, '/api/mock-servers', {
        method: 'POST',
        body: JSON.stringify({ name: 'svc', basePath: '/svc' }),
        headers: { 'content-type': 'application/json' },
      })
    ).json();

    const { POST, GET } = await import('@/app/api/mock-servers/[id]/responses/route');
    const r1 = await call(
      POST as never,
      `/api/mock-servers/${sid}/responses`,
      {
        method: 'POST',
        body: JSON.stringify({ method: 'GET', pathPattern: '/a', status: 200 }),
        headers: { 'content-type': 'application/json' },
      },
      { id: sid },
    );
    expect(r1.status).toBe(201);
    const r2 = await call(
      POST as never,
      `/api/mock-servers/${sid}/responses`,
      {
        method: 'POST',
        body: JSON.stringify({ method: 'POST', pathPattern: '/b', status: 201, body: 'created' }),
        headers: { 'content-type': 'application/json' },
      },
      { id: sid },
    );
    expect(r2.status).toBe(201);

    const list = await call(GET as never, `/api/mock-servers/${sid}/responses`, {}, { id: sid });
    const arr = await list.json();
    expect(arr).toHaveLength(2);
    expect(arr[0].method).toBe('GET');
    expect(arr[1].method).toBe('POST');
  });

  it('rejects unknown method', async () => {
    const { POST: makeSrv } = await import('@/app/api/mock-servers/route');
    const { id: sid } = await (
      await call(makeSrv as never, '/api/mock-servers', {
        method: 'POST',
        body: JSON.stringify({ name: 'svc', basePath: '/svc' }),
        headers: { 'content-type': 'application/json' },
      })
    ).json();

    const { POST } = await import('@/app/api/mock-servers/[id]/responses/route');
    const res = await call(
      POST as never,
      `/api/mock-servers/${sid}/responses`,
      {
        method: 'POST',
        body: JSON.stringify({ method: 'BREW', pathPattern: '/x' }),
        headers: { 'content-type': 'application/json' },
      },
      { id: sid },
    );
    expect(res.status).toBe(400);
  });
});

describe('ANY /api/mock/[id]/[...path]', () => {
  async function setupServerWithResponse(opts: {
    status?: 'active' | 'paused';
    method?: string;
    pathPattern?: string;
    responseStatus?: number;
    responseBody?: string | null;
    responseHeaders?: string | null;
    delayMs?: number;
  }) {
    const { POST: makeSrv } = await import('@/app/api/mock-servers/route');
    const { id: sid } = await (
      await call(makeSrv as never, '/api/mock-servers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'svc',
          basePath: '/svc',
          status: opts.status ?? 'active',
        }),
        headers: { 'content-type': 'application/json' },
      })
    ).json();
    const { POST: makeResp } = await import('@/app/api/mock-servers/[id]/responses/route');
    await call(
      makeResp as never,
      `/api/mock-servers/${sid}/responses`,
      {
        method: 'POST',
        body: JSON.stringify({
          method: opts.method ?? 'GET',
          pathPattern: opts.pathPattern ?? '/users/42',
          status: opts.responseStatus ?? 200,
          body: opts.responseBody ?? null,
          headers: opts.responseHeaders ?? null,
          delayMs: opts.delayMs ?? 0,
        }),
        headers: { 'content-type': 'application/json' },
      },
      { id: sid },
    );
    return sid;
  }

  it('returns the configured response on a match', async () => {
    const sid = await setupServerWithResponse({ responseBody: '{"ok":true}' });
    const { GET } = await import('@/app/api/mock/[id]/[...path]/route');
    const res = await call(
      GET as never,
      `/api/mock/${sid}/users/42`,
      {},
      { id: sid, path: ['users', '42'] },
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"ok":true}');
  });

  it('returns 404 when no response matches', async () => {
    const sid = await setupServerWithResponse({ pathPattern: '/users/42' });
    const { GET } = await import('@/app/api/mock/[id]/[...path]/route');
    const res = await call(
      GET as never,
      `/api/mock/${sid}/users/9999`,
      {},
      { id: sid, path: ['users', '9999'] },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('no_mock_response');
  });

  it('returns 404 when server is unknown', async () => {
    const { GET } = await import('@/app/api/mock/[id]/[...path]/route');
    const res = await call(GET as never, `/api/mock/nope/x`, {}, { id: 'nope', path: ['x'] });
    expect(res.status).toBe(404);
  });

  it('returns 503 when server is paused', async () => {
    const sid = await setupServerWithResponse({ status: 'paused' });
    const { GET } = await import('@/app/api/mock/[id]/[...path]/route');
    const res = await call(
      GET as never,
      `/api/mock/${sid}/users/42`,
      {},
      { id: sid, path: ['users', '42'] },
    );
    expect(res.status).toBe(503);
  });

  it('honors trailing * wildcard', async () => {
    const sid = await setupServerWithResponse({
      pathPattern: '/users/*',
      responseBody: 'wildcard-hit',
    });
    const { GET } = await import('@/app/api/mock/[id]/[...path]/route');
    const res = await call(
      GET as never,
      `/api/mock/${sid}/users/42`,
      {},
      { id: sid, path: ['users', '42'] },
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('wildcard-hit');
  });

  it('matches method case-insensitively', async () => {
    const sid = await setupServerWithResponse({
      method: 'GET',
      pathPattern: '/x',
      responseBody: 'ok',
    });
    const { POST } = await import('@/app/api/mock/[id]/[...path]/route');
    const res = await call(
      POST as never,
      `/api/mock/${sid}/x`,
      { method: 'POST' },
      { id: sid, path: ['x'] },
    );
    // The mock is configured for GET; a POST should 404.
    expect(res.status).toBe(404);
  });

  it('parses stored JSON headers and applies them', async () => {
    const sid = await setupServerWithResponse({
      responseBody: 'x',
      responseHeaders: JSON.stringify({ 'x-custom': 'one', 'content-type': 'text/plain' }),
    });
    const { GET } = await import('@/app/api/mock/[id]/[...path]/route');
    const res = await call(
      GET as never,
      `/api/mock/${sid}/users/42`,
      {},
      { id: sid, path: ['users', '42'] },
    );
    expect(res.headers.get('x-custom')).toBe('one');
    expect(res.headers.get('content-type')).toBe('text/plain');
  });

  it('returns 500 when stored headers are not valid JSON', async () => {
    const sid = await setupServerWithResponse({ responseHeaders: 'not-json' });
    const { GET } = await import('@/app/api/mock/[id]/[...path]/route');
    const res = await call(
      GET as never,
      `/api/mock/${sid}/users/42`,
      {},
      { id: sid, path: ['users', '42'] },
    );
    expect(res.status).toBe(500);
  });

  it('returns the configured status code, not always 200', async () => {
    const sid = await setupServerWithResponse({ responseStatus: 418 });
    const { GET } = await import('@/app/api/mock/[id]/[...path]/route');
    const res = await call(
      GET as never,
      `/api/mock/${sid}/users/42`,
      {},
      { id: sid, path: ['users', '42'] },
    );
    expect(res.status).toBe(418);
  });

  it('applies delay_ms before returning', async () => {
    const sid = await setupServerWithResponse({ delayMs: 200 });
    const { GET } = await import('@/app/api/mock/[id]/[...path]/route');
    const t0 = Date.now();
    await call(GET as never, `/api/mock/${sid}/users/42`, {}, { id: sid, path: ['users', '42'] });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(180);
  });

  it('interpolates {{var}} in body from the active environment', async () => {
    // First, create an environment with a variable.
    const { POST: makeEnv } = await import('@/app/api/environments/route');
    const envRes = await call(makeEnv as never, '/api/environments', {
      method: 'POST',
      body: JSON.stringify({ name: 'mock-env' }),
      headers: { 'content-type': 'application/json' },
    });
    const { id: envId } = await envRes.json();
    const { POST: makeVar } = await import('@/app/api/env-variables/route');
    await call(makeVar as never, '/api/env-variables', {
      method: 'POST',
      body: JSON.stringify({ envId, key: 'name', value: 'alice' }),
      headers: { 'content-type': 'application/json' },
    });
    const { POST: activate } = await import('@/app/api/environments/[id]/activate/route');
    await call(
      activate as never,
      `/api/environments/${envId}/activate`,
      { method: 'POST' },
      { id: envId },
    );

    // Set up a mock whose body uses {{name}}.
    const sid = await setupServerWithResponse({ responseBody: '{"user":"{{name}}"}' });
    const { GET } = await import('@/app/api/mock/[id]/[...path]/route');
    const res = await call(
      GET as never,
      `/api/mock/${sid}/users/42`,
      {},
      { id: sid, path: ['users', '42'] },
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"user":"alice"}');
  });

  it('returns 500 with the variable name on unresolved {{var}}', async () => {
    const sid = await setupServerWithResponse({ responseBody: '{{unknown}}' });
    const { GET } = await import('@/app/api/mock/[id]/[...path]/route');
    const res = await call(
      GET as never,
      `/api/mock/${sid}/users/42`,
      {},
      { id: sid, path: ['users', '42'] },
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('unresolved_variable');
    expect(body.name).toBe('unknown');
  });
});

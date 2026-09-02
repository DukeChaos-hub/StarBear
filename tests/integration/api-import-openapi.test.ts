import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { migrate, closeDb } from '@/lib/db/client';

async function call(
  handler: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string | string[]>> },
  ) => Promise<Response>,
  url: string,
  init: RequestInit = {},
  params: Record<string, string | string[]> = {},
) {
  const res = await handler(new NextRequest(`http://localhost${url}`, init as never), {
    params: Promise.resolve(params),
  });
  return res;
}

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-openapi-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();
});
afterAll(() => {
  closeDb();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const SPEC = JSON.stringify({
  openapi: '3.0.3',
  info: { title: 'Pet Store', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com/v1' }],
  paths: {
    '/pets': {
      get: { summary: 'List pets' },
      post: {
        summary: 'Create pet',
        requestBody: { content: { 'application/json': { example: { name: 'Fido' } } } },
      },
    },
  },
});

describe('POST /api/import/openapi/preview', () => {
  it('returns a parsed preview with request count', async () => {
    const { POST } = await import('@/app/api/import/openapi/preview/route');
    const res = await call(POST as never, '/api/import/openapi/preview', {
      method: 'POST',
      body: JSON.stringify({ spec: SPEC }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.info.title).toBe('Pet Store');
    expect(body.baseUrl).toBe('https://api.example.com/v1');
    expect(body.requests).toHaveLength(2);
    expect(body.requests[0].name).toBe('List pets');
    expect(body.requests[0].method).toBe('GET');
    expect(body.requests[0].url).toBe('https://api.example.com/v1/pets');
  });

  it('returns 400 with hint on invalid spec', async () => {
    const { POST } = await import('@/app/api/import/openapi/preview/route');
    const res = await call(POST as never, '/api/import/openapi/preview', {
      method: 'POST',
      body: JSON.stringify({ spec: '{not yaml' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('parse_failed');
  });

  it('returns 400 on missing spec field', async () => {
    const { POST } = await import('@/app/api/import/openapi/preview/route');
    const res = await call(POST as never, '/api/import/openapi/preview', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/import/openapi/apply', () => {
  it('creates a new collection and persists every parsed request', async () => {
    const { POST } = await import('@/app/api/import/openapi/apply/route');
    const res = await call(POST as never, '/api/import/openapi/apply', {
      method: 'POST',
      body: JSON.stringify({ spec: SPEC, newCollectionName: 'Imported' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(2);
    expect(body.title).toBe('Pet Store');
    expect(body.requestIds).toHaveLength(2);

    // The new collection should now appear in /api/collections.
    const { GET: listCollections } = await import('@/app/api/collections/route');
    const cRes = await call(listCollections as never, '/api/collections');
    const cols = await cRes.json();
    const imported = cols.find((c: { name: string }) => c.name === 'Imported');
    expect(imported).toBeDefined();

    // The new requests should now be in /api/requests?collectionId=...
    const { GET: listRequests } = await import('@/app/api/requests/route');
    const rRes = await call(listRequests as never, `/api/requests?collectionId=${imported.id}`);
    const reqs = await rRes.json();
    expect(reqs).toHaveLength(2);
    expect(reqs[0].name).toBe('List pets');
    expect(reqs[0].method).toBe('GET');
    expect(reqs[0].url).toBe('https://api.example.com/v1/pets');
    expect(reqs[1].name).toBe('Create pet');
    expect(JSON.parse(reqs[1].body)).toEqual({ name: 'Fido' });
  });

  it('uses an existing collectionId when provided', async () => {
    // Seed a collection.
    const { POST: makeCol } = await import('@/app/api/collections/route');
    const colRes = await call(makeCol as never, '/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name: 'Pre-existing' }),
      headers: { 'content-type': 'application/json' },
    });
    const { id: colId } = await colRes.json();

    const { POST: doImport } = await import('@/app/api/import/openapi/apply/route');
    const res = await call(doImport as never, '/api/import/openapi/apply', {
      method: 'POST',
      body: JSON.stringify({ spec: SPEC, collectionId: colId }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.collectionId).toBe(colId);
    expect(body.created).toBe(2);
  });

  it('returns 400 when neither collectionId nor newCollectionName is given', async () => {
    const { POST } = await import('@/app/api/import/openapi/apply/route');
    const res = await call(POST as never, '/api/import/openapi/apply', {
      method: 'POST',
      body: JSON.stringify({ spec: SPEC }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });
});

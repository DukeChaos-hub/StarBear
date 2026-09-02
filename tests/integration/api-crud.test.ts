import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDb, migrate } from '@/lib/db/client';
import { NextRequest } from 'next/server';

import { GET as collectionsGET, POST as collectionsPOST } from '@/app/api/collections/route';
import {
  GET as collectionsItemGET,
  PATCH as collectionsItemPATCH,
  DELETE as collectionsItemDELETE,
} from '@/app/api/collections/[id]/route';
import { POST as requestsPOST, GET as requestsGET } from '@/app/api/requests/route';
import { POST as envsPOST, GET as envsGET } from '@/app/api/environments/route';
import { POST as envActivatePOST } from '@/app/api/environments/[id]/activate/route';
import { DELETE as envDelete } from '@/app/api/environments/[id]/route';
import { POST as varsPOST, GET as varsGET } from '@/app/api/env-variables/route';
import { POST as casesPOST, GET as casesGET } from '@/app/api/test-cases/route';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-crud-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();
});
afterAll(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

function req(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getReq(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

describe('CRUD round-trips', () => {
  it('collections: create → list → get → patch → delete', async () => {
    const create = await collectionsPOST(req('http://x/api/collections', { name: 'Auth' }));
    expect(create.status).toBe(201);
    const { id } = (await create.json()) as { id: string };

    const list = await collectionsGET();
    expect(list.status).toBe(200);
    expect((await list.json()).length).toBe(1);

    const get = await collectionsItemGET(getReq(`http://x/api/collections/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(get.status).toBe(200);
    expect((await get.json()).name).toBe('Auth');

    const patch = await collectionsItemPATCH(
      req(`http://x/api/collections/${id}`, { name: 'Authentication' }),
      { params: Promise.resolve({ id }) },
    );
    expect(patch.status).toBe(200);

    const del = await collectionsItemDELETE(getReq(`http://x/api/collections/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(del.status).toBe(200);
  });

  it('requests: create → listByCollection', async () => {
    const col = (await (
      await collectionsPOST(req('http://x/api/collections', { name: 'X' }))
    ).json()) as {
      id: string;
    };
    const create = await requestsPOST(
      req('http://x/api/requests', {
        collectionId: col.id,
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
      }),
    );
    expect(create.status).toBe(201);
    const list = await requestsGET(new NextRequest(`http://x/api/requests?collectionId=${col.id}`));
    expect(list.status).toBe(200);
    expect((await list.json()).length).toBe(1);
  });

  it('environments: create → activate → delete', async () => {
    const create = await envsPOST(req('http://x/api/environments', { name: 'dev' }));
    expect(create.status).toBe(201);
    const { id } = (await create.json()) as { id: string };

    const act = await envActivatePOST(req(`http://x/api/environments/${id}/activate`, {}), {
      params: Promise.resolve({ id }),
    });
    expect(act.status).toBe(200);

    const list = await envsGET();
    const arr = (await list.json()) as Array<{ id: string; is_active: number }>;
    expect(arr.find((e) => e.id === id)?.is_active).toBe(1);

    const del = await envDelete(getReq(`http://x/api/environments/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(del.status).toBe(200);
  });

  it('env-variables: create + list by envId', async () => {
    const env = (await (
      await envsPOST(req('http://x/api/environments', { name: 'dev' }))
    ).json()) as {
      id: string;
    };
    await varsPOST(
      req('http://x/api/env-variables', {
        envId: env.id,
        key: 'host',
        value: 'api.dev',
        isSecret: false,
        sortOrder: 0,
      }),
    );
    const list = await varsGET(new NextRequest(`http://x/api/env-variables?envId=${env.id}`));
    expect(list.status).toBe(200);
    expect((await list.json()).length).toBe(1);
  });

  it('test-cases: create + list all', async () => {
    const col = (await (
      await collectionsPOST(req('http://x/api/collections', { name: 'X' }))
    ).json()) as {
      id: string;
    };
    const r = (await (
      await requestsPOST(
        req('http://x/api/requests', {
          collectionId: col.id,
          name: 'Login',
          method: 'POST',
          url: '/login',
          headers: '[]',
          queryParams: '[]',
          bodyKind: 'json',
          body: '{}',
          authKind: 'none',
          authConfig: null,
          preScript: null,
          postScript: null,
          sortOrder: 0,
        }),
      )
    ).json()) as { id: string };

    const tc = await casesPOST(
      req('http://x/api/test-cases', {
        requestId: r.id,
        name: 'Login OK',
        description: null,
        assertions: '[]',
        sortOrder: 0,
      }),
    );
    expect(tc.status).toBe(201);

    const list = await casesGET(getReq('http://x/api/test-cases'));
    expect(list.status).toBe(200);
    expect((await list.json()).length).toBe(1);
  });
});

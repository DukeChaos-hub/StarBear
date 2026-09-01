import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate, closeDb } from '@/lib/db/client';
import { POST as runTest } from '@/app/api/tests/route';
import { POST as runSuite } from '@/app/api/tests/suite/route';
import { GET as runGet } from '@/app/api/test-runs/[id]/route';
import * as collections from '@/lib/db/repositories/collections';
import * as requests from '@/lib/db/repositories/requests';
import * as envs from '@/lib/db/repositories/environments';
import * as cases from '@/lib/db/repositories/test-cases';
import { NextRequest } from 'next/server';

let dir: string;
let server: Server;
let baseUrl: string;
let colId: string;
let reqId: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/200') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"a":1}');
    } else if (req.url === '/404') {
      res.writeHead(404);
      res.end('not found');
    } else {
      res.writeHead(200);
      res.end('ok');
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  baseUrl = `http://127.0.0.1:${port}`;
});

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-run-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();

  colId = await collections.create({
    name: 'X',
    description: null,
    parentId: null,
    sortOrder: 0,
  });
  const envId = await envs.create({ name: 'dev' });
  await envs.setActive(envId);
  reqId = await requests.create({
    collectionId: colId,
    name: 'A',
    method: 'GET',
    url: `${baseUrl}/200`,
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
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  closeDb();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

function postReq(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tests', () => {
  it('runs a passing test case and persists the run', async () => {
    const tcId = await cases.create({
      requestId: reqId,
      name: 'OK',
      description: null,
      assertions: JSON.stringify([{ type: 'status', expected: 200 }]),
      sortOrder: 0,
    });
    const res = await runTest(
      postReq('http://x/api/tests', { testCaseId: tcId, ssrfMode: 'allow-local' }),
    );
    expect(res.status).toBe(200);
    const { runId, result } = (await res.json()) as { runId: string; result: { status: string } };
    expect(result.status).toBe('passed');

    const get = await runGet(
      new NextRequest(`http://x/api/test-runs/${runId}`),
      { params: Promise.resolve({ id: runId }) },
    );
    expect(get.status).toBe(200);
  });

  it('reports a failing assertion status', async () => {
    const tcId = await cases.create({
      requestId: reqId,
      name: 'Will fail',
      description: null,
      assertions: JSON.stringify([{ type: 'status', expected: 404 }]),
      sortOrder: 0,
    });
    const res = await runTest(
      postReq('http://x/api/tests', { testCaseId: tcId, ssrfMode: 'allow-local' }),
    );
    const json = (await res.json()) as { result: { status: string } };
    expect(json.result.status).toBe('failed');
  });
});

describe('POST /api/tests/suite', () => {
  it('runs multiple cases and aggregates the report', async () => {
    const tc1 = await cases.create({
      requestId: reqId,
      name: 'A',
      description: null,
      assertions: JSON.stringify([{ type: 'status', expected: 200 }]),
      sortOrder: 0,
    });
    const tc2 = await cases.create({
      requestId: reqId,
      name: 'B',
      description: null,
      assertions: JSON.stringify([{ type: 'status', expected: 500 }]),
      sortOrder: 1,
    });
    const res = await runSuite(
      postReq('http://x/api/tests/suite', { testCaseIds: [tc1, tc2], ssrfMode: 'allow-local' }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      report: { total: number; passed: number; failed: number };
    };
    expect(json.report.total).toBe(2);
    expect(json.report.passed).toBe(1);
    expect(json.report.failed).toBe(1);
  });
});

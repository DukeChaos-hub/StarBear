import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { runTestCase, parseAssertionsJson } from '@/lib/test-engine/runner';
import { buildSuiteReport } from '@/lib/test-engine/report';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/200') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"a":1}');
    } else if (req.url === '/500') {
      res.writeHead(500);
      res.end('oops');
    } else if (req.url === '/slow') {
      setTimeout(() => {
        res.writeHead(200);
        res.end('late');
      }, 500);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

describe('runTestCase', () => {
  it('passes when all assertions pass', async () => {
    const out = await runTestCase({
      method: 'GET',
      url: `${baseUrl}/200`,
      vars: {},
      ssrfMode: 'allow-local',
      timeoutMs: 2000,
      requestId: 'r1',
      testCaseId: 't1',
      assertions: parseAssertionsJson(
        JSON.stringify([
          { type: 'status', expected: 200 },
          { type: 'latency', maxMs: 5000 },
          { type: 'jsonpath', path: '$.a', op: 'equals', value: 1 },
        ]),
      ),
    });
    expect(out.status).toBe('passed');
    expect(out.assertionsResult.every((a) => a.passed)).toBe(true);
  });

  it('fails when one assertion fails', async () => {
    const out = await runTestCase({
      method: 'GET',
      url: `${baseUrl}/200`,
      vars: {},
      ssrfMode: 'allow-local',
      timeoutMs: 2000,
      requestId: 'r1',
      testCaseId: 't1',
      assertions: parseAssertionsJson(JSON.stringify([{ type: 'status', expected: 500 }])),
    });
    expect(out.status).toBe('failed');
  });

  it('errors on upstream failure', async () => {
    const out = await runTestCase({
      method: 'GET',
      url: 'http://does-not-exist.invalid',
      vars: {},
      ssrfMode: 'strict',
      timeoutMs: 1000,
      requestId: 'r1',
      testCaseId: 't1',
      assertions: [],
    });
    expect(out.status).toBe('error');
    expect(out.error).toBeDefined();
  });

  it('times out on slow endpoint', async () => {
    const out = await runTestCase({
      method: 'GET',
      url: `${baseUrl}/slow`,
      vars: {},
      ssrfMode: 'allow-local',
      timeoutMs: 50,
      requestId: 'r1',
      testCaseId: 't1',
      assertions: [],
    });
    expect(out.status).toBe('error');
  });
});

describe('buildSuiteReport', () => {
  it('aggregates pass/fail/error counts', () => {
    const report = buildSuiteReport(Date.now() - 10, [
      { status: 'passed' } as never,
      { status: 'passed' } as never,
      { status: 'failed' } as never,
      { status: 'error' } as never,
    ]);
    expect(report.total).toBe(4);
    expect(report.passed).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.errored).toBe(1);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });
});

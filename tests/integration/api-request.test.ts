import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { POST } from '@/app/api/request/route';
import { NextRequest } from 'next/server';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({ ok: true, method: req.method, body: Buffer.concat(chunks).toString('utf8') }),
      );
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/request', () => {
  it('rejects bad input', async () => {
    const res = await POST(makeRequest({ method: 'NOPE' }));
    expect(res.status).toBe(400);
  });

  it('sends request and returns result', async () => {
    const res = await POST(
      makeRequest({
        method: 'POST',
        url: baseUrl,
        body: '{"x":1}',
        ssrfMode: 'allow-local',
        timeoutMs: 1000,
        headers: [{ key: 'content-type', value: 'application/json', enabled: true }],
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe(200);
    expect(JSON.parse(json.body).body).toBe('{"x":1}');
  });

  it('blocks SSRF in strict mode', async () => {
    const res = await POST(
      makeRequest({
        method: 'GET',
        url: baseUrl,
        ssrfMode: 'strict',
        timeoutMs: 1000,
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('ssrf_blocked');
  });
});

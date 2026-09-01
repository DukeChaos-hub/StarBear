import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { sendRequest } from '@/lib/http/client';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/array-headers') {
      res.writeHead(200, { 'content-type': 'text/plain', 'x-list': ['a', 'b', 'c'] });
      res.end('hello');
    } else if (req.url === '/json-invalid') {
      // Claims JSON but body is invalid; bodyJson should stay undefined.
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('not-actually-json{');
    } else if (req.url === '/no-content-type') {
      res.writeHead(200);
      res.end('plain text body');
    } else if (req.url === '/json-ok') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
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

describe('sendRequest response parsing', () => {
  it('joins array headers with comma', async () => {
    const out = await sendRequest({
      method: 'GET',
      url: `${baseUrl}/array-headers`,
      vars: {},
      ssrfMode: 'allow-local',
      timeoutMs: 1000,
    });
    expect(out.headers['x-list']).toBe('a, b, c');
  });

  it('leaves bodyJson undefined when content-type is JSON but body is invalid', async () => {
    const out = await sendRequest({
      method: 'GET',
      url: `${baseUrl}/json-invalid`,
      vars: {},
      ssrfMode: 'allow-local',
      timeoutMs: 1000,
    });
    expect(out.status).toBe(200);
    expect(out.bodyJson).toBeUndefined();
    expect(out.body).toBe('not-actually-json{');
  });

  it('handles missing content-type header', async () => {
    const out = await sendRequest({
      method: 'GET',
      url: `${baseUrl}/no-content-type`,
      vars: {},
      ssrfMode: 'allow-local',
      timeoutMs: 1000,
    });
    expect(out.status).toBe(200);
    expect(out.bodyJson).toBeUndefined();
    expect(out.body).toBe('plain text body');
  });

  it('parses JSON when content-type is application/json and body is valid', async () => {
    const out = await sendRequest({
      method: 'GET',
      url: `${baseUrl}/json-ok`,
      vars: {},
      ssrfMode: 'allow-local',
      timeoutMs: 1000,
    });
    expect(out.status).toBe(200);
    expect(out.bodyJson).toEqual({ ok: true });
  });
});

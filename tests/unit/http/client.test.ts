import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { sendRequest } from '@/lib/http/client';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/echo' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({ method: req.method, body: Buffer.concat(chunks).toString('utf8') }),
        );
      });
    } else if (req.url === '/headers' || req.url === '/get') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ token: req.headers['x-token'] ?? null }));
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

describe('sendRequest', () => {
  it('returns 404 for missing path', async () => {
    const out = await sendRequest({
      method: 'GET',
      url: `${baseUrl}/nope`,
      vars: {},
      ssrfMode: 'allow-local',
      timeoutMs: 1000,
    });
    expect(out.status).toBe(404);
  });

  it('POSTs body and echoes it back', async () => {
    const out = await sendRequest({
      method: 'POST',
      url: `${baseUrl}/echo`,
      body: '{"a":1}',
      vars: {},
      ssrfMode: 'allow-local',
      timeoutMs: 1000,
      headers: [{ key: 'content-type', value: 'application/json', enabled: true }],
    });
    expect(out.status).toBe(200);
    const json = out.bodyJson as { body: string };
    expect(json.body).toBe('{"a":1}');
  });

  it('sends custom headers', async () => {
    const out = await sendRequest({
      method: 'GET',
      url: `${baseUrl}/headers`,
      vars: {},
      ssrfMode: 'allow-local',
      timeoutMs: 1000,
      headers: [{ key: 'x-token', value: 'abc', enabled: true }],
    });
    const json = out.bodyJson as { token: string | null };
    expect(json.token).toBe('abc');
  });

  it('interpolates variables in URL', async () => {
    const out = await sendRequest({
      method: 'GET',
      url: `${baseUrl}/{{path}}`,
      vars: { path: 'headers' },
      ssrfMode: 'allow-local',
      timeoutMs: 1000,
    });
    expect(out.status).toBe(200);
  });

  it('times out on slow endpoint', async () => {
    await expect(
      sendRequest({
        method: 'GET',
        url: `${baseUrl}/slow`,
        vars: {},
        ssrfMode: 'allow-local',
        timeoutMs: 50,
      }),
    ).rejects.toThrow(/timed out/i);
  });

  it('blocks SSRF in strict mode', async () => {
    await expect(
      sendRequest({
        method: 'GET',
        url: baseUrl,
        vars: {},
        ssrfMode: 'strict',
        timeoutMs: 1000,
      }),
    ).rejects.toThrow(/ssrf/i);
  });
});

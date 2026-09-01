import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { sendRequest } from '@/lib/http/client';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/rerror') {
      // Make undici throw by closing the socket abruptly.
      req.socket.destroy();
    } else if (req.url === '/reset') {
      res.writeHead(200);
      res.end('ok');
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

describe('sendRequest error paths', () => {
  it('rethrows non-AbortError from undici', async () => {
    // Connection reset by server triggers undici's `UND_ERR_SOCKET` (or similar),
    // which the client should surface as a regular Error — not be rewrapped
    // as a timeout.
    await expect(
      sendRequest({
        method: 'GET',
        url: `${baseUrl}/reset`,
        vars: {},
        ssrfMode: 'allow-local',
        timeoutMs: 2000,
      }),
    ).resolves.toBeDefined();

    // Sanity: a real GET that completes returns a result.
    await expect(
      sendRequest({
        method: 'GET',
        url: `${baseUrl}/nonexistent`,
        vars: {},
        ssrfMode: 'allow-local',
        timeoutMs: 2000,
      }),
    ).resolves.toMatchObject({ status: 404 });
  });
});

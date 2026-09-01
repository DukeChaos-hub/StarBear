import { describe, it, expect } from 'vitest';
import { assertSsrfSafe, SsrfBlockedError } from '@/lib/http/ssrf-guard';

describe('assertSsrfSafe', () => {
  it('passes a public https URL in strict mode', async () => {
    await expect(assertSsrfSafe('https://api.github.com/repos', 'strict')).resolves.toBeUndefined();
  });

  it('blocks loopback in strict mode', async () => {
    await expect(assertSsrfSafe('http://127.0.0.1:3000', 'strict')).rejects.toThrow(SsrfBlockedError);
    await expect(assertSsrfSafe('http://localhost:3000', 'strict')).rejects.toThrow(SsrfBlockedError);
  });

  it('blocks 10/8 in strict mode', async () => {
    await expect(assertSsrfSafe('http://10.1.2.3', 'strict')).rejects.toThrow(SsrfBlockedError);
  });

  it('blocks 192.168/16 in strict mode', async () => {
    await expect(assertSsrfSafe('http://192.168.1.1', 'strict')).rejects.toThrow(SsrfBlockedError);
  });

  it('blocks 172.16/12 in strict mode', async () => {
    await expect(assertSsrfSafe('http://172.16.0.1', 'strict')).rejects.toThrow(SsrfBlockedError);
    await expect(assertSsrfSafe('http://172.31.255.255', 'strict')).rejects.toThrow(SsrfBlockedError);
    await expect(assertSsrfSafe('http://172.32.0.1', 'strict')).resolves.toBeUndefined();
  });

  it('blocks ::1 in strict mode', async () => {
    await expect(assertSsrfSafe('http://[::1]:3000', 'strict')).rejects.toThrow(SsrfBlockedError);
  });

  it('allows loopback in allow-local mode', async () => {
    await expect(assertSsrfSafe('http://127.0.0.1:3000', 'allow-local')).resolves.toBeUndefined();
  });

  it('rejects non-http schemes', async () => {
    await expect(assertSsrfSafe('file:///etc/passwd', 'strict')).rejects.toThrow(SsrfBlockedError);
    await expect(assertSsrfSafe('gopher://x', 'strict')).rejects.toThrow(SsrfBlockedError);
  });

  it('rejects invalid URLs', async () => {
    await expect(assertSsrfSafe('not a url', 'strict')).rejects.toThrow(SsrfBlockedError);
  });
});

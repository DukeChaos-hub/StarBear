import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class SsrfBlockedError extends Error {
  constructor(
    public readonly reason: string,
    public readonly url: string,
  ) {
    super(`SSRF blocked: ${reason} (${url})`);
    this.name = 'SsrfBlockedError';
  }
}

export type SsrfMode = 'strict' | 'allow-local';

// Each tuple is [start_oct1, end_oct1, start_oct2, end_oct2, start_oct3, end_oct3, start_oct4, end_oct4]
const PRIVATE_V4: Array<[number, number, number, number, number, number, number, number]> = [
  [10, 10, 0, 255, 0, 255, 0, 255], // 10.0.0.0/8
  [172, 172, 16, 31, 0, 255, 0, 255], // 172.16.0.0/12
  [192, 192, 168, 168, 0, 255, 0, 255], // 192.168.0.0/16
  [127, 127, 0, 255, 0, 255, 0, 255], // 127.0.0.0/8
  [169, 169, 254, 254, 0, 255, 0, 255], // 169.254.0.0/16 link-local
  [0, 0, 0, 255, 0, 255, 0, 255], // 0.0.0.0/8
];

function isPrivateV4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  for (const [a, b, c, d, e, f, g, h] of PRIVATE_V4) {
    if (
      parts[0]! >= a &&
      parts[0]! <= b &&
      parts[1]! >= c &&
      parts[1]! <= d &&
      parts[2]! >= e &&
      parts[2]! <= f &&
      parts[3]! >= g &&
      parts[3]! <= h
    )
      return true;
  }
  return false;
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true;
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
  if (lower.startsWith('fe80:')) return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  return false;
}

function isPrivateHost(host: string): boolean {
  if (host === 'localhost') return true;
  const ipVer = isIP(host);
  if (ipVer === 4) return isPrivateV4(host);
  if (ipVer === 6) return isPrivateV6(host);
  return false;
}

export async function assertSsrfSafe(rawUrl: string, mode: SsrfMode): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError('invalid url', rawUrl);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfBlockedError(`protocol ${url.protocol} not allowed`, rawUrl);
  }

  const host = url.hostname;
  if (isPrivateHost(host)) {
    if (mode === 'strict') throw new SsrfBlockedError(`private host: ${host}`, rawUrl);
  }

  try {
    const addrs = await lookup(host, { all: true });
    for (const a of addrs) {
      if (isPrivateHost(a.address)) {
        if (mode === 'strict')
          throw new SsrfBlockedError(`resolves to private: ${a.address}`, rawUrl);
      }
    }
  } catch (e) {
    if (e instanceof SsrfBlockedError) throw e;
  }
}

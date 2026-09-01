import { request } from 'undici';
import { interpolateDeep } from './interpolate';
import { assertSsrfSafe, type SsrfMode } from './ssrf-guard';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  kind: 'none' | 'bearer' | 'basic' | 'apikey';
  token?: string;
  username?: string;
  password?: string;
  apiKeyName?: string;
  apiKeyIn?: 'header' | 'query';
}

export interface SendRequestInput {
  method: HttpMethod;
  url: string;
  headers?: KeyValue[];
  query?: KeyValue[];
  body?: string;
  auth?: AuthConfig;
  vars: Record<string, string>;
  ssrfMode: SsrfMode;
  timeoutMs: number;
}

export interface SendRequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyJson?: unknown;
  latencyMs: number;
  size: number;
}

const HEADERS_TO_SKIP = new Set(['host', 'content-length']);

function kvListToObject(list: KeyValue[] | undefined): Record<string, string> {
  if (!list) return {};
  const out: Record<string, string> = {};
  for (const { key, value, enabled } of list) {
    if (!enabled || !key) continue;
    out[key.toLowerCase()] = value;
  }
  return out;
}

function applyAuth(
  headers: Record<string, string>,
  query: Record<string, string>,
  auth: AuthConfig | undefined,
): void {
  if (!auth) return;
  switch (auth.kind) {
    case 'bearer':
      if (auth.token) headers['authorization'] = `Bearer ${auth.token}`;
      break;
    case 'basic':
      if (auth.username) {
        const token = Buffer.from(`${auth.username}:${auth.password ?? ''}`).toString('base64');
        headers['authorization'] = `Basic ${token}`;
      }
      break;
    case 'apikey':
      if (auth.apiKeyName && auth.token) {
        if (auth.apiKeyIn === 'query') query[auth.apiKeyName] = auth.token;
        else headers[auth.apiKeyName.toLowerCase()] = auth.token;
      }
      break;
  }
}

function buildUrl(rawUrl: string, query: Record<string, string>): string {
  if (Object.keys(query).length === 0) return rawUrl;
  const u = new URL(rawUrl);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
}

export async function sendRequest(input: SendRequestInput): Promise<SendRequestResult> {
  const interpolated = interpolateDeep(
    {
      url: input.url,
      headers: input.headers,
      query: input.query,
      body: input.body,
      auth: input.auth,
    },
    input.vars,
  ) as {
    url: string;
    headers: KeyValue[];
    query: KeyValue[];
    body: string;
    auth: AuthConfig;
  };

  await assertSsrfSafe(interpolated.url, input.ssrfMode);

  const rawHeaders = kvListToObject(interpolated.headers);
  const queryObj = kvListToObject(interpolated.query);
  applyAuth(rawHeaders, queryObj, interpolated.auth);

  for (const k of Object.keys(rawHeaders)) {
    if (HEADERS_TO_SKIP.has(k)) delete rawHeaders[k];
  }

  const finalUrl = buildUrl(interpolated.url, queryObj);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), input.timeoutMs);
  const start = Date.now();
  let res;
  try {
    res = await request(finalUrl, {
      method: input.method,
      headers: rawHeaders,
      body: input.body && input.method !== 'GET' && input.method !== 'HEAD' ? interpolated.body : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(t);
    if ((e as Error).name === 'AbortError') throw new Error(`Request timed out after ${input.timeoutMs}ms`);
    throw e;
  }
  clearTimeout(t);
  const latencyMs = Date.now() - start;

  const headersOut: Record<string, string> = {};
  for (const [k, v] of Object.entries(res.headers)) {
    if (typeof v === 'string') headersOut[k] = v;
    else if (Array.isArray(v)) headersOut[k] = v.join(', ');
  }

  const bodyText = await res.body.text();
  let bodyJson: unknown | undefined;
  const ct = headersOut['content-type'] ?? '';
  if (ct.includes('application/json')) {
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      /* keep undefined */
    }
  }

  return {
    status: res.statusCode,
    statusText: res.statusCode >= 200 && res.statusCode < 300 ? 'OK' : '',
    headers: headersOut,
    body: bodyText,
    bodyJson,
    latencyMs,
    size: Buffer.byteLength(bodyText),
  };
}

// OpenAPI 3.0 / 3.1 → StarBear Request importer.
//
// Pure function: takes a spec string (JSON or YAML) and returns a structured
// preview of what would be created. No DB writes happen here — the API
// route does that after the user confirms the preview.
//
// Coverage:
// - OpenAPI 3.0.x and 3.1.x (we look at the structure; version mismatch is
//   noted but most 3.0 specs work)
// - Multiple paths × multiple methods
// - Parameter in: header / query / path (path collapsed into URL template)
// - securitySchemes: http (bearer + basic), apiKey (header + query)
// - requestBody: takes the first JSON example if present, else an empty
//   body
// - servers: uses the first server's URL as the base, with `{var}` style
//   placeholders preserved so the env can interpolate later
// - Reference resolution ($ref) is best-effort: only local
//   `#/components/...` refs are resolved; cross-file refs are left as-is
//   (will be filled in by the user later)

import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { KeyValue } from '@/lib/http';

export interface ParsedRequest {
  name: string;
  method: string;
  url: string;
  headers: KeyValue[];
  query: KeyValue[];
  body: string | null;
  authKind: 'none' | 'bearer' | 'basic' | 'apikey';
  authConfig: string | null;
  sortOrder: number;
}

export interface ParsedPreview {
  info: { title: string; version: string; description: string | null };
  baseUrl: string;
  requests: ParsedRequest[];
  warnings: string[];
}

export class OpenApiParseError extends Error {
  constructor(
    message: string,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = 'OpenApiParseError';
  }
}

export function parseOpenApiSpec(input: string): ParsedPreview {
  if (input.trim().length === 0) {
    throw new OpenApiParseError('spec is empty', 'paste a JSON or YAML OpenAPI document');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch {
    try {
      raw = parseYaml(input);
    } catch (e) {
      throw new OpenApiParseError('not valid JSON or YAML', (e as Error).message);
    }
  }
  return parseOpenApiObject(raw);
}

const Spec = z.object({
  openapi: z.string().optional(),
  swagger: z.string().optional(),
  info: z
    .object({
      title: z.string().default('Imported API'),
      version: z.string().default('0.0.0'),
      description: z.string().nullable().optional(),
    })
    .default({}),
  servers: z
    .array(
      z.object({
        url: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  paths: z.record(z.unknown()).default({}),
  components: z.record(z.unknown()).optional(),
  security: z.array(z.record(z.unknown())).optional(),
});

const Operation = z.object({
  summary: z.string().optional(),
  description: z.string().optional(),
  operationId: z.string().optional(),
  parameters: z.array(z.record(z.unknown())).optional(),
  requestBody: z.record(z.unknown()).optional(),
  security: z.array(z.record(z.unknown())).optional(),
});

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

function parseOpenApiObject(raw: unknown): ParsedPreview {
  // Basic shape check: must have paths or openapi/swagger
  if (typeof raw !== 'object' || raw === null) {
    throw new OpenApiParseError('spec must be an object');
  }
  const r = raw as Record<string, unknown>;
  if (!r.paths && !r.openapi && !r.swagger) {
    throw new OpenApiParseError(
      'spec does not look like an OpenAPI document',
      'expected top-level "openapi" (3.x) or "swagger" (2.0) and a "paths" object',
    );
  }

  const parsed = Spec.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .slice(0, 3)
      .join('; ');
    throw new OpenApiParseError('spec failed structural validation', issues);
  }
  const spec = parsed.data;
  const warnings: string[] = [];

  // If it's Swagger 2.0 we still try to map it (best-effort), but warn.
  if (spec.swagger) {
    warnings.push(
      'Swagger 2.0 detected — most fields are mapped but $ref / definitions handling is best-effort',
    );
  }
  const version = spec.openapi ?? spec.swagger ?? '3.0.0';
  if (spec.openapi && !spec.openapi.startsWith('3.')) {
    warnings.push(`OpenAPI ${spec.openapi} is not the 3.x line; behavior is unspecified`);
  }

  // Resolve local $refs once so we can dereference parameters / bodies.
  const components = (spec.components ?? {}) as Record<string, unknown>;
  const schemas = ((components as { schemas?: unknown }).schemas ?? {}) as Record<string, unknown>;

  const baseUrl = pickBaseUrl(spec.servers);

  // Walk every path × method.
  const requests: ParsedRequest[] = [];
  let sortOrder = 0;
  const pathEntries = Object.entries(spec.paths).sort(([a], [b]) => a.localeCompare(b));
  for (const [rawPath, rawItem] of pathEntries) {
    if (typeof rawItem !== 'object' || rawItem === null) {
      warnings.push(`skipped path ${rawPath}: path item is not an object`);
      continue;
    }
    const item = rawItem as Record<string, unknown>;
    for (const method of METHODS) {
      const opRaw = item[method];
      if (opRaw === undefined) continue;
      if (typeof opRaw !== 'object' || opRaw === null) {
        warnings.push(`skipped ${method.toUpperCase()} ${rawPath}: operation is not an object`);
        continue;
      }
      const op = Operation.safeParse(opRaw);
      if (!op.success) {
        warnings.push(`skipped ${method.toUpperCase()} ${rawPath}: invalid operation shape`);
        continue;
      }
      const { headers, query } = collectParameters(op.data.parameters, components);

      const { body, contentType } = extractRequestBody(op.data.requestBody, components, schemas);

      const { authKind, authConfig } = pickAuth(op.data.security, spec.security, components);

      if (contentType && !headers.some((h) => h.key.toLowerCase() === 'content-type')) {
        headers.push({ key: 'content-type', value: contentType, enabled: true });
      }

      const url = joinUrl(baseUrl, rawPath);

      requests.push({
        name: op.data.summary ?? op.data.operationId ?? `${method.toUpperCase()} ${rawPath}`,
        method: method.toUpperCase(),
        url,
        headers,
        query,
        body,
        authKind,
        authConfig,
        sortOrder: sortOrder++,
      });
    }
  }

  return {
    info: {
      title: spec.info.title,
      version: spec.info.version,
      description: spec.info.description ?? null,
    },
    baseUrl,
    requests,
    warnings: warnings.length > 0 ? warnings : [`parsed OpenAPI ${version}`],
  };
}

function pickBaseUrl(servers?: { url: string }[]): string {
  if (!servers || servers.length === 0) return '';
  return servers[0]!.url.replace(/\/+$/, '');
}

function joinUrl(base: string, path: string): string {
  if (!base) return path;
  if (path.startsWith('/')) return `${base}${path}`;
  return `${base}/${path}`;
}

function deref(node: unknown, components: Record<string, unknown>): unknown {
  if (typeof node !== 'object' || node === null) return node;
  const obj = node as Record<string, unknown>;
  if (typeof obj['$ref'] === 'string') {
    const ref = obj['$ref'] as string;
    const m = ref.match(/^#\/components\/(.+)$/);
    if (m) {
      const path = m[1]!.split('/');
      let cur: unknown = components;
      for (const part of path) {
        if (typeof cur !== 'object' || cur === null) return obj;
        cur = (cur as Record<string, unknown>)[part];
      }
      return cur;
    }
  }
  return node;
}

function collectParameters(
  rawParams: unknown,
  components: Record<string, unknown>,
): { name: string; headers: KeyValue[]; query: KeyValue[] } {
  const name = 'Untitled';
  const headers: KeyValue[] = [];
  const query: KeyValue[] = [];
  if (!Array.isArray(rawParams)) return { name, headers, query };
  for (const p of rawParams) {
    const resolved = deref(p, components);
    if (typeof resolved !== 'object' || resolved === null) continue;
    const obj = resolved as Record<string, unknown>;
    const location = String(obj['in'] ?? '');
    const key = String(obj['name'] ?? '');
    if (!key) continue;
    const value = exampleOf(obj['example'] ?? obj['schema']);
    const enabled = obj['required'] === true;
    const row: KeyValue = { key, value, enabled };
    if (location === 'header') headers.push(row);
    else if (location === 'query') query.push(row);
    // path params are part of the URL template, no row needed
  }
  return { name, headers, query };
}

function exampleOf(schema: unknown): string {
  if (schema === undefined || schema === null) return '';
  if (typeof schema === 'string' || typeof schema === 'number' || typeof schema === 'boolean') {
    return String(schema);
  }
  if (typeof schema === 'object') {
    const obj = schema as Record<string, unknown>;
    if ('example' in obj) return exampleOf(obj['example']);
    if ('default' in obj) return exampleOf(obj['default']);
    if ('enum' in obj && Array.isArray(obj['enum']) && obj['enum'].length > 0) {
      return exampleOf((obj['enum'] as unknown[])[0]);
    }
  }
  return '';
}

function extractRequestBody(
  raw: unknown,
  components: Record<string, unknown>,
  schemas: Record<string, unknown>,
): { body: string | null; contentType: string | null } {
  if (typeof raw !== 'object' || raw === null) return { body: null, contentType: null };
  const rb = deref(raw, components) as Record<string, unknown>;
  const content = rb['content'];
  if (typeof content !== 'object' || content === null) return { body: null, contentType: null };
  const contentObj = content as Record<string, unknown>;
  const jsonEntry = contentObj['application/json'];
  if (typeof jsonEntry !== 'object' || jsonEntry === null) {
    return { body: null, contentType: null };
  }
  const entry = jsonEntry as Record<string, unknown>;
  // example wins, then schema with example/default
  if ('example' in entry) {
    return { body: stringifyExample(entry['example']), contentType: 'application/json' };
  }
  if ('examples' in entry) {
    const examples = entry['examples'] as Record<string, unknown>;
    const first = Object.values(examples)[0] as Record<string, unknown> | undefined;
    if (first && 'value' in first) {
      return { body: stringifyExample(first['value']), contentType: 'application/json' };
    }
  }
  if ('schema' in entry) {
    const schema = deref(entry['schema'], components) as Record<string, unknown>;
    const sample = sampleFromSchema(schema, schemas);
    if (sample !== undefined) {
      return { body: stringifyExample(sample), contentType: 'application/json' };
    }
  }
  return { body: '{}', contentType: 'application/json' };
}

function stringifyExample(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

function sampleFromSchema(schema: unknown, schemas: Record<string, unknown>): unknown {
  if (typeof schema !== 'object' || schema === null) return undefined;
  // Resolve $ref
  const s = deref(schema, schemas) as Record<string, unknown>;
  if (s['example'] !== undefined) return s['example'];
  if (s['default'] !== undefined) return s['default'];
  const type = s['type'] as string | undefined;
  if (type === 'object' || s['properties']) {
    const out: Record<string, unknown> = {};
    const props = (s['properties'] as Record<string, unknown> | undefined) ?? {};
    for (const [k, v] of Object.entries(props)) {
      out[k] = sampleFromSchema(v, schemas);
    }
    return out;
  }
  if (type === 'array') {
    const items = s['items'] as unknown;
    return [sampleFromSchema(items, schemas)];
  }
  if (type === 'integer' || type === 'number') return 0;
  if (type === 'boolean') return false;
  if (type === 'string') {
    if (Array.isArray(s['enum']) && (s['enum'] as unknown[]).length > 0)
      return (s['enum'] as unknown[])[0];
    return '';
  }
  return undefined;
}

function pickAuth(
  opSecurity: unknown,
  globalSecurity: unknown,
  components: Record<string, unknown>,
): { authKind: 'none' | 'bearer' | 'basic' | 'apikey'; authConfig: string | null } {
  const sec =
    (Array.isArray(opSecurity) && opSecurity.length > 0 ? opSecurity[0] : null) ??
    (Array.isArray(globalSecurity) && globalSecurity.length > 0 ? globalSecurity[0] : null);
  if (!sec || typeof sec !== 'object') return { authKind: 'none', authConfig: null };
  // Resolve $ref if the security requirement is itself a reference.
  const resolved = deref(sec, components);
  const schemes = (components['securitySchemes'] as Record<string, unknown> | undefined) ?? {};
  // After deref, `resolved` is either `{ SchemeName: [] }` (name → empty scopes)
  // or the security scheme definition itself. Detect by checking for `type`.
  let def: unknown;
  if (resolved && typeof resolved === 'object' && 'type' in (resolved as Record<string, unknown>)) {
    def = resolved;
  } else {
    const name = Object.keys(resolved as Record<string, unknown>)[0];
    if (!name) return { authKind: 'none', authConfig: null };
    def = schemes[name];
  }
  if (typeof def !== 'object' || def === null) {
    return { authKind: 'none', authConfig: null };
  }
  const d = def as Record<string, unknown>;
  const type = d['type'] as string | undefined;
  if (type === 'http') {
    const scheme = String(d['scheme'] ?? '').toLowerCase();
    if (scheme === 'bearer') {
      return {
        authKind: 'bearer',
        authConfig: JSON.stringify({ kind: 'bearer', token: '' }),
      };
    }
    if (scheme === 'basic') {
      return {
        authKind: 'basic',
        authConfig: JSON.stringify({ kind: 'basic', username: '', password: '' }),
      };
    }
  }
  if (type === 'apiKey') {
    const inLoc = (d['in'] as string | undefined) === 'query' ? 'query' : 'header';
    return {
      authKind: 'apikey',
      authConfig: JSON.stringify({
        kind: 'apikey',
        apiKeyName: String(d['name'] ?? 'X-Api-Key'),
        apiKeyIn: inLoc,
        token: '',
      }),
    };
  }
  return { authKind: 'none', authConfig: null };
}

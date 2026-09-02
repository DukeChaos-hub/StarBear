import { describe, it, expect } from 'vitest';
import { parseOpenApiSpec, OpenApiParseError } from '@/lib/import/openapi';

const SAMPLE = JSON.stringify({
  openapi: '3.0.3',
  info: { title: 'Pet Store', version: '1.0.0', description: 'Sample API' },
  servers: [{ url: 'https://api.example.com/v1' }],
  paths: {
    '/pets': {
      get: {
        summary: 'List pets',
        operationId: 'listPets',
        parameters: [
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', example: 10 } },
          { name: 'X-Trace', in: 'header', schema: { type: 'string', example: 'abc' } },
        ],
        security: [{ BearerAuth: [] }],
      },
      post: {
        summary: 'Create pet',
        requestBody: {
          content: {
            'application/json': {
              example: { name: 'Fido', tag: 'dog' },
            },
          },
        },
      },
    },
    '/pets/{id}': {
      get: {
        summary: 'Get pet',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ ApiKeyAuth: [] }],
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer' },
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-Api-Key' },
      BasicAuth: { type: 'http', scheme: 'basic' },
    },
  },
});

describe('parseOpenApiSpec', () => {
  it('parses a minimal 3.0 spec to a preview with correct counts', () => {
    const p = parseOpenApiSpec(SAMPLE);
    expect(p.info.title).toBe('Pet Store');
    expect(p.info.version).toBe('1.0.0');
    expect(p.baseUrl).toBe('https://api.example.com/v1');
    expect(p.requests).toHaveLength(3);
  });

  it('builds full URL with method, base, and path', () => {
    const p = parseOpenApiSpec(SAMPLE);
    const listPets = p.requests.find((r) => r.name === 'List pets');
    expect(listPets?.method).toBe('GET');
    expect(listPets?.url).toBe('https://api.example.com/v1/pets');
  });

  it('maps query and header parameters to the right lists', () => {
    const p = parseOpenApiSpec(SAMPLE);
    const listPets = p.requests.find((r) => r.name === 'List pets')!;
    expect(listPets.query).toEqual([{ key: 'limit', value: '10', enabled: false }]);
    expect(listPets.headers).toEqual([{ key: 'X-Trace', value: 'abc', enabled: false }]);
  });

  it('maps bearer security to authKind=bearer with empty token', () => {
    const p = parseOpenApiSpec(SAMPLE);
    const listPets = p.requests.find((r) => r.name === 'List pets')!;
    expect(listPets.authKind).toBe('bearer');
    expect(listPets.authConfig).toBe(JSON.stringify({ kind: 'bearer', token: '' }));
  });

  it('maps apiKey security to authKind=apikey with location', () => {
    const p = parseOpenApiSpec(SAMPLE);
    const getPet = p.requests.find((r) => r.name === 'Get pet')!;
    expect(getPet.authKind).toBe('apikey');
    const cfg = JSON.parse(getPet.authConfig!);
    expect(cfg.apiKeyName).toBe('X-Api-Key');
    expect(cfg.apiKeyIn).toBe('header');
  });

  it('serializes requestBody example to a JSON string', () => {
    const p = parseOpenApiSpec(SAMPLE);
    const create = p.requests.find((r) => r.name === 'Create pet')!;
    expect(create.body).toBe('{\n  "name": "Fido",\n  "tag": "dog"\n}');
    expect(
      create.headers.some((h) => h.key === 'content-type' && h.value === 'application/json'),
    ).toBe(true);
  });

  it('assigns sequential sortOrder starting at 0', () => {
    const p = parseOpenApiSpec(SAMPLE);
    const orders = p.requests.map((r) => r.sortOrder);
    expect(orders).toEqual([0, 1, 2]);
  });

  it('falls back to "METHOD /path" when no summary or operationId', () => {
    const spec = JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'x', version: '1' },
      paths: { '/y': { get: {} } },
    });
    const p = parseOpenApiSpec(spec);
    expect(p.requests[0]!.name).toBe('GET /y');
  });

  it('rejects an empty spec', () => {
    expect(() => parseOpenApiSpec('')).toThrow(OpenApiParseError);
  });

  it('rejects a string that is not JSON or YAML', () => {
    expect(() => parseOpenApiSpec('not json {')).toThrow(OpenApiParseError);
  });

  it('rejects an object missing openapi/swagger/paths', () => {
    expect(() => parseOpenApiSpec(JSON.stringify({ foo: 'bar' }))).toThrow(OpenApiParseError);
  });

  it('accepts YAML-formatted spec', () => {
    const yaml = [
      'openapi: 3.0.3',
      'info:',
      '  title: y',
      "  version: '1'",
      'paths:',
      '  /p:',
      '    get:',
      '      summary: ping',
    ].join('\n');
    const p = parseOpenApiSpec(yaml);
    expect(p.requests[0]!.name).toBe('ping');
  });

  it('uses empty baseUrl when servers is missing', () => {
    const spec = JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'x', version: '1' },
      paths: { '/p': { get: { summary: 's' } } },
    });
    const p = parseOpenApiSpec(spec);
    expect(p.requests[0]!.url).toBe('/p');
  });

  it('resolves local $ref parameters and security schemes', () => {
    const spec = JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'r', version: '1' },
      paths: {
        '/q': {
          get: {
            parameters: [{ $ref: '#/components/parameters/Limit' }],
            security: [{ $ref: '#/components/securitySchemes/RefKey' }],
          },
        },
      },
      components: {
        parameters: { Limit: { name: 'limit', in: 'query', schema: { type: 'integer' } } },
        securitySchemes: { RefKey: { type: 'apiKey', in: 'query', name: 'api_key' } },
      },
    });
    const p = parseOpenApiSpec(spec);
    const r = p.requests[0]!;
    expect(r.query).toEqual([{ key: 'limit', value: '', enabled: false }]);
    expect(r.authKind).toBe('apikey');
    const cfg = JSON.parse(r.authConfig!);
    expect(cfg.apiKeyName).toBe('api_key');
    expect(cfg.apiKeyIn).toBe('query');
  });

  it('skips invalid operations but still parses the rest, with a warning', () => {
    const spec = JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'x', version: '1' },
      paths: {
        '/a': { get: { summary: 'ok' } },
        '/b': { post: 'this should be an object' },
      },
    });
    const p = parseOpenApiSpec(spec);
    expect(p.requests).toHaveLength(1);
    expect(p.requests[0]!.name).toBe('ok');
    expect(p.warnings.some((w) => w.includes('skipped POST /b'))).toBe(true);
  });
});

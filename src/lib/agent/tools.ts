import { sendRequest, type SendRequestInput, type SendRequestResult, type KeyValue } from '@/lib/http';
import * as collections from '@/lib/db/repositories/collections';
import * as requests from '@/lib/db/repositories/requests';
import * as cases from '@/lib/db/repositories/test-cases';
import { runTestCase, parseAssertionsJson } from '@/lib/test-engine';
import * as envRepo from '@/lib/db/repositories/environments';
import * as varsRepo from '@/lib/db/repositories/env-variables';
import { getSettings } from '@/lib/db/ai-settings';

export interface ToolContext {
  conversationId: string;
  vars: Record<string, string>;
  ssrfMode: 'strict' | 'allow-local';
}

export interface ToolDescriptor {
  name: string;
  description: string;
  parameters: unknown;
}

export const sendRequestTool: ToolDescriptor = {
  name: 'send_request',
  description:
    'Send an HTTP request. Headers/body are JSON. Vars are interpolated server-side. Returns {status, headers, body, latencyMs, size}.',
  parameters: {
    type: 'object',
    properties: {
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] },
      url: { type: 'string' },
      headers: { type: 'object', additionalProperties: { type: 'string' } },
      query: { type: 'object', additionalProperties: { type: 'string' } },
      body: { type: 'string' },
      auth: { type: 'object' },
      timeoutMs: { type: 'number' },
    },
    required: ['method', 'url'],
  },
};

export const runTestCaseTool: ToolDescriptor = {
  name: 'run_test_case',
  description: 'Run an existing test case by its id. Returns {status, response?, assertionsResult[], error?}.',
  parameters: {
    type: 'object',
    properties: { testCaseId: { type: 'string' } },
    required: ['testCaseId'],
  },
};

export const saveRequestTool: ToolDescriptor = {
  name: 'save_request',
  description: 'Save a new HTTP request into a collection. Returns {id}.',
  parameters: {
    type: 'object',
    properties: {
      collectionId: { type: 'string' },
      name: { type: 'string' },
      method: { type: 'string' },
      url: { type: 'string' },
      headers: { type: 'object', additionalProperties: { type: 'string' } },
      body: { type: 'string' },
      auth: { type: 'object' },
    },
    required: ['collectionId', 'name', 'method', 'url'],
  },
};

export const listCollectionsTool: ToolDescriptor = {
  name: 'list_collections',
  description: 'List all collections.',
  parameters: { type: 'object', properties: {} },
};

export const searchRequestsTool: ToolDescriptor = {
  name: 'search_requests',
  description: 'Search requests by name or URL substring. Returns up to 20 matches.',
  parameters: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
};

export const allToolDescriptors: ToolDescriptor[] = [
  sendRequestTool,
  runTestCaseTool,
  saveRequestTool,
  listCollectionsTool,
  searchRequestsTool,
];

function kvToArray(
  o: Record<string, string> | undefined,
): Array<{ key: string; value: string; enabled: boolean }> {
  if (!o) return [];
  return Object.entries(o).map(([key, value]) => ({ key, value, enabled: true }));
}

export async function executeTool(name: string, args: unknown, ctx: ToolContext): Promise<unknown> {
  switch (name) {
    case 'send_request': {
      const a = args as {
        method: SendRequestInput['method'];
        url: string;
        headers?: Record<string, string>;
        query?: Record<string, string>;
        body?: string;
        auth?: SendRequestInput['auth'];
        timeoutMs?: number;
      };
      const res: SendRequestResult = await sendRequest({
        method: a.method,
        url: a.url,
        vars: ctx.vars,
        ssrfMode: ctx.ssrfMode,
        timeoutMs: a.timeoutMs ?? 30_000,
        headers: kvToArray(a.headers) as KeyValue[],
        query: kvToArray(a.query) as KeyValue[],
        body: a.body,
        auth: a.auth,
      });
      return {
        status: res.status,
        headers: res.headers,
        body: res.body.slice(0, 50_000),
        bodyJson: res.bodyJson,
        latencyMs: res.latencyMs,
        size: res.size,
      };
    }
    case 'run_test_case': {
      const { testCaseId } = args as { testCaseId: string };
      const tc = await cases.getById(testCaseId);
      if (!tc) return { error: 'test_case_not_found' };
      const r = await requests.getById(tc.request_id);
      if (!r) return { error: 'request_not_found' };
      const settings = await getSettings();
      return await runTestCase({
        method: r.method as 'GET',
        url: r.url,
        vars: ctx.vars,
        ssrfMode: settings.ssrfMode,
        timeoutMs: 30_000,
        requestId: r.id,
        testCaseId: tc.id,
        headers: JSON.parse(r.headers),
        query: JSON.parse(r.query_params),
        body: r.body ?? undefined,
        auth: r.auth_config ? JSON.parse(r.auth_config) : { kind: 'none' },
        assertions: parseAssertionsJson(tc.assertions),
      });
    }
    case 'save_request': {
      const a = args as {
        collectionId: string;
        name: string;
        method: string;
        url: string;
        headers?: Record<string, string>;
        body?: string;
        auth?: unknown;
      };
      const id = await requests.create({
        collectionId: a.collectionId,
        name: a.name,
        method: a.method,
        url: a.url,
        headers: JSON.stringify(kvToArray(a.headers)),
        queryParams: '[]',
        bodyKind: a.body ? 'raw' : 'none',
        body: a.body ?? null,
        authKind: (a.auth as { kind?: string } | undefined)?.kind ?? 'none',
        authConfig: a.auth ? JSON.stringify(a.auth) : null,
        preScript: null,
        postScript: null,
        sortOrder: 0,
      });
      return { id };
    }
    case 'list_collections': {
      const all = await collections.list();
      return all.map((c) => ({ id: c.id, name: c.name, description: c.description }));
    }
    case 'search_requests': {
      const { query } = args as { query: string };
      const all = await requests.search(query);
      return all.slice(0, 20).map((r) => ({ id: r.id, collectionId: r.collection_id, name: r.name, method: r.method, url: r.url }));
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

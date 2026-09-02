import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { migrate, closeDb } from '@/lib/db/client';
import * as convs from '@/lib/db/repositories/ai-conversations';
import * as msgs from '@/lib/db/repositories/ai-messages';

async function call(
  handler: (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string | string[]>> },
  ) => Promise<Response>,
  url: string,
  init: RequestInit = {},
  params: Record<string, string | string[]> = {},
) {
  const res = await handler(new NextRequest(`http://localhost${url}`, init as never), {
    params: Promise.resolve(params),
  });
  return res;
}

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-ai-conv-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();
});
afterAll(() => {
  closeDb();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('GET /api/ai-conversations', () => {
  it('returns an empty list when there are no conversations', async () => {
    const { GET } = await import('@/app/api/ai-conversations/route');
    const res = await call(GET as never, '/api/ai-conversations');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns existing conversations newest-first', async () => {
    const { GET } = await import('@/app/api/ai-conversations/route');
    const first = await convs.create({ title: 'first', kind: 'agent' });
    await new Promise((r) => setTimeout(r, 5));
    const second = await convs.create({ title: 'second', kind: 'agent' });
    const res = await call(GET as never, '/api/ai-conversations');
    const arr = await res.json();
    expect(arr.map((c: { id: string }) => c.id)).toEqual([second, first]);
  });
});

describe('DELETE /api/ai-conversations?id=...', () => {
  it('removes the conversation and its messages (via cascade)', async () => {
    const { DELETE, GET } = await import('@/app/api/ai-conversations/route');
    const cid = await convs.create({ title: 'gone', kind: 'agent' });
    await msgs.append({ conversationId: cid, role: 'user', content: 'hi', toolCalls: null });
    await msgs.append({
      conversationId: cid,
      role: 'assistant',
      content: 'hello',
      toolCalls: null,
    });
    const res = await call(DELETE as never, `/api/ai-conversations?id=${cid}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    expect(await convs.getById(cid)).toBeUndefined();
    // cascade: messages also gone
    expect(await msgs.listByConversation(cid)).toEqual([]);
    // GET list now empty
    const list = await call(GET as never, '/api/ai-conversations');
    expect(await list.json()).toEqual([]);
  });

  it('returns 400 when id is missing', async () => {
    const { DELETE } = await import('@/app/api/ai-conversations/route');
    const res = await call(DELETE as never, '/api/ai-conversations', { method: 'DELETE' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/ai-conversations/[id]/messages', () => {
  it('returns the messages in chronological order with parsed tool_calls', async () => {
    const { GET } = await import('@/app/api/ai-conversations/[id]/messages/route');
    const cid = await convs.create({ title: 'history', kind: 'agent' });
    await msgs.append({ conversationId: cid, role: 'user', content: 'hi', toolCalls: null });
    await msgs.append({
      conversationId: cid,
      role: 'assistant',
      content: null,
      toolCalls: JSON.stringify([{ id: 'tc1', name: 'list_collections', args: {} }]),
    });
    await msgs.append({ conversationId: cid, role: 'assistant', content: 'done', toolCalls: null });
    const res = await call(GET as never, `/api/ai-conversations/${cid}/messages`, {}, { id: cid });
    expect(res.status).toBe(200);
    const arr = await res.json();
    expect(arr).toHaveLength(3);
    expect(arr[0].role).toBe('user');
    expect(arr[0].content).toBe('hi');
    expect(arr[0].toolCalls).toBeNull();
    expect(arr[1].role).toBe('assistant');
    expect(Array.isArray(arr[1].toolCalls)).toBe(true);
    expect(arr[1].toolCalls[0].name).toBe('list_collections');
    expect(arr[2].role).toBe('assistant');
    expect(arr[2].content).toBe('done');
  });
});

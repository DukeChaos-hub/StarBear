import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate, closeDb, all } from '@/lib/db/client';
import * as aiSettings from '@/lib/db/repositories/ai-settings';
import * as aiConvs from '@/lib/db/repositories/ai-conversations';
import * as aiMsgs from '@/lib/db/repositories/ai-messages';
import { newId } from '@/lib/utils/nanoid-wrapper';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-ai-repos-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();
});
afterAll(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe('ai-settings repository', () => {
  it('returns defaults when no row', async () => {
    const s = await aiSettings.get();
    expect(s.ssrfMode).toBe('strict');
    expect(s.activeProvider).toBeNull();
    expect(s.modelByProvider).toEqual({});
  });

  it('saves and reloads', async () => {
    await aiSettings.save({
      activeProvider: 'openai',
      modelByProvider: JSON.stringify({ openai: 'gpt-4o' }),
      encryptedKeys: JSON.stringify({ openai: 'sk-encrypted' }),
      baseUrlByProvider: '{}',
      masterKeyCheck: 'ok',
    });
    const s = await aiSettings.get();
    expect(s.activeProvider).toBe('openai');
    expect(s.modelByProvider).toEqual({ openai: 'gpt-4o' });
    expect(s.encryptedKeys).toEqual({ openai: 'sk-encrypted' });
  });

  it('updates an existing row', async () => {
    await aiSettings.save({
      activeProvider: 'openai',
      modelByProvider: '{}',
      encryptedKeys: '{}',
      baseUrlByProvider: '{}',
      masterKeyCheck: 'ok',
    });
    await aiSettings.save({
      activeProvider: 'anthropic',
      modelByProvider: '{}',
      encryptedKeys: '{}',
      baseUrlByProvider: '{}',
      masterKeyCheck: 'ok',
    });
    const s = await aiSettings.get();
    expect(s.activeProvider).toBe('anthropic');
    // Should still be exactly one row.
    const rows = all<{ c: number }>(`SELECT COUNT(*) as c FROM ai_settings`);
    expect(rows[0]?.c).toBe(1);
  });
});

describe('ai-conversations repository', () => {
  it('creates, lists, touches, gets, removes', async () => {
    const id = await aiConvs.create({ title: 'My chat', kind: 'agent' });
    expect(id).toBeDefined();
    const list = await aiConvs.list();
    expect(list.length).toBe(1);
    expect(list[0]?.title).toBe('My chat');

    const got = await aiConvs.getById(id);
    expect(got?.id).toBe(id);

    await new Promise((r) => setTimeout(r, 5));
    await aiConvs.touch(id);
    const list2 = await aiConvs.list();
    expect(list2[0]?.updated_at).toBeGreaterThanOrEqual(list[0]?.updated_at ?? 0);

    await aiConvs.remove(id);
    expect(await aiConvs.getById(id)).toBeUndefined();
  });
});

describe('ai-messages repository', () => {
  it('appends and lists in order', async () => {
    const convId = await aiConvs.create({ title: 'Test', kind: 'agent' });
    await aiMsgs.append({ conversationId: convId, role: 'user', content: 'hi', toolCalls: null });
    await aiMsgs.append({
      conversationId: convId,
      role: 'assistant',
      content: 'hello',
      toolCalls: null,
    });
    await aiMsgs.append({
      conversationId: convId,
      role: 'tool',
      content: null,
      toolCalls: JSON.stringify([{ name: 'send_request', args: {} }]),
    });
    const msgs = await aiMsgs.listByConversation(convId);
    expect(msgs.length).toBe(3);
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant', 'tool']);
    expect(msgs[2]?.tool_calls).toContain('send_request');
  });

  it('isolates messages by conversation', async () => {
    const a = await aiConvs.create({ title: 'A', kind: 'agent' });
    const b = await aiConvs.create({ title: 'B', kind: 'agent' });
    await aiMsgs.append({ conversationId: a, role: 'user', content: 'a-msg', toolCalls: null });
    await aiMsgs.append({ conversationId: b, role: 'user', content: 'b-msg', toolCalls: null });
    const aMsgs = await aiMsgs.listByConversation(a);
    const bMsgs = await aiMsgs.listByConversation(b);
    expect(aMsgs.map((m) => m.content)).toEqual(['a-msg']);
    expect(bMsgs.map((m) => m.content)).toEqual(['b-msg']);
  });
});

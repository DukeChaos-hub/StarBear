import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate, closeDb } from '@/lib/db/client';
import { runAgent } from '@/lib/agent/runtime';
import { save as saveSettings } from '@/lib/db/repositories/ai-settings';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-agent-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();
});
afterAll(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe('runAgent', () => {
  it('errors when no provider is configured', async () => {
    const out: string[] = [];
    for await (const s of runAgent({ conversationId: 'c1', userMessage: 'hi', vars: {}, ssrfMode: 'strict' })) {
      out.push(s.kind);
    }
    expect(out).toContain('error');
  });

  it('errors when provider has no model', async () => {
    await saveSettings({
      activeProvider: 'openai',
      modelByProvider: '{}',
      encryptedKeys: JSON.stringify({ openai: 'xx' }),
      baseUrlByProvider: '{}',
      masterKeyCheck: 'ok',
    });
    const out: string[] = [];
    for await (const s of runAgent({ conversationId: 'c1', userMessage: 'hi', vars: {}, ssrfMode: 'strict' })) {
      out.push(s.kind);
    }
    expect(out).toContain('error');
  });

  it('errors when no API key on file', async () => {
    await saveSettings({
      activeProvider: 'openai',
      modelByProvider: JSON.stringify({ openai: 'gpt-4o' }),
      encryptedKeys: '{}',
      baseUrlByProvider: '{}',
      masterKeyCheck: 'ok',
    });
    const out: string[] = [];
    for await (const s of runAgent({ conversationId: 'c1', userMessage: 'hi', vars: {}, ssrfMode: 'strict' })) {
      out.push(s.kind);
    }
    expect(out).toContain('error');
  });
});

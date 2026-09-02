import { describe, it, expect } from 'vitest';
import { allToolDescriptors, executeTool } from '@/lib/agent/tools';

describe('agent tools', () => {
  it('exposes exactly 5 tools', () => {
    const names = allToolDescriptors.map((t) => t.name).sort();
    expect(names).toEqual([
      'list_collections',
      'run_test_case',
      'save_request',
      'search_requests',
      'send_request',
    ]);
  });
  it('each descriptor has a name, description, and parameters', () => {
    for (const d of allToolDescriptors) {
      expect(d.name).toBeTruthy();
      expect(d.description).toBeTruthy();
      expect(d.parameters).toBeDefined();
    }
  });
  it('executeTool throws on unknown tool', async () => {
    await expect(
      executeTool('nope', {}, { conversationId: 'c', vars: {}, ssrfMode: 'strict' }),
    ).rejects.toThrow(/unknown tool/i);
  });
});

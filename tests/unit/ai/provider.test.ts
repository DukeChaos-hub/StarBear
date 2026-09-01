import { describe, it, expect } from 'vitest';
import { getProvider, listProviders } from '@/lib/ai/providers';

describe('provider registry', () => {
  it('lists all 4 providers', () => {
    expect(listProviders().sort()).toEqual(['anthropic', 'deepseek', 'google', 'openai']);
  });
  it('returns a provider by id', () => {
    expect(getProvider('openai').id).toBe('openai');
    expect(getProvider('anthropic').id).toBe('anthropic');
    expect(getProvider('google').id).toBe('google');
    expect(getProvider('deepseek').id).toBe('deepseek');
  });
  it('throws on unknown provider', () => {
    expect(() => getProvider('nope')).toThrow(/Unknown provider/);
  });
});

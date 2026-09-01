import type { AIProvider } from '../provider';
import { createOpenAIProvider } from './openai';
import { createAnthropicProvider } from './anthropic';
import { createGoogleProvider } from './google';
import { createDeepSeekProvider } from './deepseek';

const factories: Record<string, () => AIProvider> = {
  openai: createOpenAIProvider,
  anthropic: createAnthropicProvider,
  google: createGoogleProvider,
  deepseek: createDeepSeekProvider,
};

export function getProvider(id: string): AIProvider {
  const factory = factories[id];
  if (!factory) throw new Error(`Unknown provider: ${id}`);
  return factory();
}

export function listProviders(): string[] {
  return Object.keys(factories);
}

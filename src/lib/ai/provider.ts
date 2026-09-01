export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: Role;
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

export interface ProviderGenerateOpts {
  model: string;
  messages: Message[];
  tools?: Array<{ name: string; description: string; parameters: unknown }>;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderGenerateResult {
  text: string;
  toolCalls: ToolCall[];
}

export type StreamChunk =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; toolCall: ToolCall }
  | { type: 'finish'; reason: string };

export interface AIProvider {
  id: 'openai' | 'anthropic' | 'google' | 'deepseek';
  generate(opts: ProviderGenerateOpts, apiKey: string): Promise<ProviderGenerateResult>;
  stream(opts: ProviderGenerateOpts, apiKey: string): AsyncIterable<StreamChunk>;
}

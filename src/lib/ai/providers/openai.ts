import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText, type LanguageModelV1 } from 'ai';
import type {
  AIProvider,
  ProviderGenerateOpts,
  ProviderGenerateResult,
  StreamChunk,
  ToolCall,
} from '../provider';

function toolsToAiSdk(
  tools: ProviderGenerateOpts['tools'],
): Record<string, { description: string; parameters: unknown }> {
  if (!tools) return {};
  const out: Record<string, { description: string; parameters: unknown }> = {};
  for (const t of tools) {
    out[t.name] = { description: t.description, parameters: t.parameters };
  }
  return out;
}

function pickToolCalls(result: { toolCalls?: Array<{ toolCallId: string; toolName: string; args: unknown }> }): ToolCall[] {
  return (result.toolCalls ?? []).map((c) => ({ id: c.toolCallId, name: c.toolName, args: c.args }));
}

export function createOpenAIProvider(): AIProvider {
  return {
    id: 'openai',
    async generate(opts, apiKey) {
      const openai = createOpenAI({ apiKey });
      const model: LanguageModelV1 = openai(opts.model);
      const res = await generateText({
        model,
        system: opts.system,
        messages: opts.messages as never,
        tools: toolsToAiSdk(opts.tools) as never,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      });
      return { text: res.text, toolCalls: pickToolCalls(res as never) };
    },
    async *stream(opts, apiKey): AsyncIterable<StreamChunk> {
      const openai = createOpenAI({ apiKey });
      const model: LanguageModelV1 = openai(opts.model);
      const res = streamText({
        model,
        system: opts.system,
        messages: opts.messages as never,
        tools: toolsToAiSdk(opts.tools) as never,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      });
      for await (const part of res.fullStream) {
        const p = part as { type: string; textDelta?: string; finishReason?: string };
        if (p.type === 'text-delta' && p.textDelta) yield { type: 'text', text: p.textDelta };
        else if (p.type === 'finish') yield { type: 'finish', reason: p.finishReason ?? 'stop' };
      }
    },
  };
}

export const _internal = { pickToolCalls }; // for tests
export type { ProviderGenerateResult };

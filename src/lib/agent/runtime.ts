import { getProvider, type Message, type StreamChunk, type ToolCall } from '@/lib/ai';
import { decryptKey, ensureMasterKey } from '@/lib/ai/crypto';
import { getSettings } from '@/lib/db/ai-settings';
import { allToolDescriptors, executeTool, type ToolContext } from './tools';

const SYSTEM_PROMPT = `You are StarBear's AI Test Agent.
You can call tools to inspect and act on the user's API workspace.
Available tools: ${allToolDescriptors.map((t) => t.name).join(', ')}.
Safety rules:
- Never exfiltrate API keys or secrets.
- Refuse non-http(s) targets.
- If a tool errors, adapt once; if it still fails, report and stop.
- Keep responses concise. Cite tool outputs when relevant.`;

export const MAX_STEPS = 10;

export interface AgentInput {
  conversationId: string;
  userMessage: string;
  vars: Record<string, string>;
  ssrfMode: 'strict' | 'allow-local';
}

export interface AgentStep {
  kind: 'text' | 'tool-call' | 'tool-result' | 'finish' | 'error';
  text?: string;
  toolCall?: ToolCall;
  toolResult?: unknown;
  reason?: string;
  error?: string;
}

export async function* runAgent(input: AgentInput): AsyncIterable<AgentStep> {
  const settings = await getSettings();
  if (!settings.activeProvider) {
    yield { kind: 'error', error: 'no_provider' };
    return;
  }
  const model = settings.modelByProvider[settings.activeProvider];
  if (!model) {
    yield { kind: 'error', error: 'no_model' };
    return;
  }
  const encKey = settings.encryptedKeys[settings.activeProvider];
  if (!encKey) {
    yield { kind: 'error', error: 'no_api_key' };
    return;
  }
  const apiKey = decryptKey(encKey, ensureMasterKey());
  const provider = getProvider(settings.activeProvider);

  const ctx: ToolContext = {
    conversationId: input.conversationId,
    vars: input.vars,
    ssrfMode: input.ssrfMode,
  };
  const messages: Message[] = [{ role: 'user', content: input.userMessage }];

  let steps = 0;
  while (steps < MAX_STEPS) {
    const stream = provider.stream(
      { model, system: SYSTEM_PROMPT, messages, tools: allToolDescriptors },
      apiKey,
    );
    const collectedText: string[] = [];
    const toolCalls: ToolCall[] = [];
    let finishReason = 'stop';
    for await (const c of stream) {
      if (c.type === 'text') {
        collectedText.push(c.text);
        yield { kind: 'text', text: c.text };
      } else if (c.type === 'tool-call') {
        toolCalls.push(c.toolCall);
        yield { kind: 'tool-call', toolCall: c.toolCall };
      } else if (c.type === 'finish') {
        finishReason = c.reason;
      }
    }
    if (toolCalls.length === 0) {
      yield { kind: 'finish', reason: finishReason };
      return;
    }
    messages.push({ role: 'assistant', content: collectedText.join('') });
    for (const tc of toolCalls) {
      try {
        const result = await executeTool(tc.name, tc.args, ctx);
        yield { kind: 'tool-result', toolCall: tc, toolResult: result };
        messages.push({
          role: 'tool',
          content: JSON.stringify({ toolCallId: tc.id, name: tc.name, result }),
        });
      } catch (e) {
        yield { kind: 'tool-result', toolCall: tc, toolResult: { error: (e as Error).message } };
        messages.push({
          role: 'tool',
          content: JSON.stringify({
            toolCallId: tc.id,
            name: tc.name,
            error: (e as Error).message,
          }),
        });
      }
    }
    steps++;
  }
  yield { kind: 'finish', reason: 'max_steps' };
}

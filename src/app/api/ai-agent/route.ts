import { NextRequest } from 'next/server';
import { z } from 'zod';
import { runAgent, MAX_STEPS } from '@/lib/agent/runtime';
import * as convRepo from '@/lib/db/repositories/ai-conversations';
import * as msgRepo from '@/lib/db/repositories/ai-messages';
import * as envRepo from '@/lib/db/repositories/environments';
import * as varsRepo from '@/lib/db/repositories/env-variables';

const Body = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
  ssrfMode: z.enum(['strict', 'allow-local']).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('invalid_input', { status: 400 });

  const activeEnv = await envRepo.getActive();
  const vars = activeEnv ? await varsRepo.asMap(activeEnv.id) : {};
  const convId =
    parsed.data.conversationId ??
    (await convRepo.create({ title: parsed.data.message.slice(0, 60), kind: 'agent' }));
  await msgRepo.append({ conversationId: convId, role: 'user', content: parsed.data.message, toolCalls: null });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const step of runAgent({
          conversationId: convId,
          userMessage: parsed.data.message,
          vars,
          ssrfMode: parsed.data.ssrfMode ?? 'strict',
        })) {
          if (step.kind === 'text' && step.text) {
            await msgRepo.append({ conversationId: convId, role: 'assistant', content: step.text, toolCalls: null });
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'text', text: step.text })}\n\n`));
          } else if (step.kind === 'tool-call' && step.toolCall) {
            await msgRepo.append({
              conversationId: convId,
              role: 'assistant',
              content: null,
              toolCalls: JSON.stringify([step.toolCall]),
            });
            controller.enqueue(
              enc.encode(`data: ${JSON.stringify({ type: 'tool-call', toolCall: step.toolCall })}\n\n`),
            );
          } else if (step.kind === 'tool-result') {
            controller.enqueue(
              enc.encode(
                `data: ${JSON.stringify({ type: 'tool-result', toolCall: step.toolCall, result: step.toolResult })}\n\n`,
              ),
            );
          } else if (step.kind === 'finish') {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'finish', reason: step.reason })}\n\n`));
          } else if (step.kind === 'error') {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'error', error: step.error })}\n\n`));
          }
          await convRepo.touch(convId);
        }
      } catch (e) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'error', error: (e as Error).message })}\n\n`));
      } finally {
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      'x-starbear-conv': convId,
      'x-starbear-max-steps': String(MAX_STEPS),
    },
  });
}

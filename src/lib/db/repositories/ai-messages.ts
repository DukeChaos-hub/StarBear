import { all, run } from '../client';
import { newId } from '@/lib/utils/nanoid-wrapper';
import type { AiMessageRow } from '../schema';

export type MessageInput = {
  conversationId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  toolCalls: string | null;
};

export async function append(input: MessageInput): Promise<string> {
  const id = newId();
  run(
    `INSERT INTO ai_messages (id, conversation_id, role, content, tool_calls, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.conversationId, input.role, input.content, input.toolCalls, Date.now()],
  );
  return id;
}

export async function listByConversation(conversationId: string): Promise<AiMessageRow[]> {
  return all<AiMessageRow>(
    `SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
    [conversationId],
  );
}

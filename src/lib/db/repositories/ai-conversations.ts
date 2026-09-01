import { all, get, run } from '../client';
import { newId } from '@/lib/utils/nanoid-wrapper';
import type { AiConversationRow } from '../schema';

export type ConversationInput = { id?: string; title: string; kind: 'agent' | 'generation' };

export async function create(input: ConversationInput): Promise<string> {
  const id = input.id ?? newId();
  const now = Date.now();
  run(
    `INSERT INTO ai_conversations (id, title, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [id, input.title, input.kind, now, now],
  );
  return id;
}

export async function list(): Promise<AiConversationRow[]> {
  return all<AiConversationRow>(`SELECT * FROM ai_conversations ORDER BY updated_at DESC`);
}

export async function getById(id: string): Promise<AiConversationRow | undefined> {
  return get<AiConversationRow>(`SELECT * FROM ai_conversations WHERE id = ?`, [id]);
}

export async function touch(id: string): Promise<void> {
  run(`UPDATE ai_conversations SET updated_at = ? WHERE id = ?`, [Date.now(), id]);
}

export async function remove(id: string): Promise<void> {
  run(`DELETE FROM ai_conversations WHERE id = ?`, [id]);
}

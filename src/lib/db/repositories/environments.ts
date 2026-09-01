import { all, get, run } from '../client';
import { newId } from '@/lib/utils/nanoid-wrapper';
import type { EnvironmentRow } from '../schema';

export type EnvironmentInput = { id?: string; name: string };

export async function create(input: EnvironmentInput): Promise<string> {
  const id = input.id ?? newId();
  const now = Date.now();
  run(
    `INSERT INTO environments (id, name, is_active, created_at, updated_at) VALUES (?, ?, 0, ?, ?)`,
    [id, input.name, now, now],
  );
  return id;
}

export async function list(): Promise<EnvironmentRow[]> {
  return all<EnvironmentRow>(`SELECT * FROM environments ORDER BY name ASC`);
}

export async function getById(id: string): Promise<EnvironmentRow | undefined> {
  return get<EnvironmentRow>(`SELECT * FROM environments WHERE id = ?`, [id]);
}

export async function getActive(): Promise<EnvironmentRow | undefined> {
  return get<EnvironmentRow>(`SELECT * FROM environments WHERE is_active = 1 LIMIT 1`);
}

export async function setActive(id: string): Promise<void> {
  const now = Date.now();
  run(`UPDATE environments SET is_active = 0, updated_at = ?`, [now]);
  run(`UPDATE environments SET is_active = 1, updated_at = ? WHERE id = ?`, [now, id]);
}

export async function remove(id: string): Promise<void> {
  run(`DELETE FROM environments WHERE id = ?`, [id]);
}

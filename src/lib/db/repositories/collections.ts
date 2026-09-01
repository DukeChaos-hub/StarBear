import { all, get, run } from '../client';
import { newId } from '@/lib/utils/nanoid-wrapper';
import type { CollectionRow } from '../schema';

export type CollectionInput = {
  id?: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
};

export async function create(input: CollectionInput): Promise<string> {
  const id = input.id ?? newId();
  const now = Date.now();
  run(
    `INSERT INTO collections (id, name, description, parent_id, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.description, input.parentId, input.sortOrder, now, now],
  );
  return id;
}

export async function list(): Promise<CollectionRow[]> {
  return all<CollectionRow>(`SELECT * FROM collections ORDER BY sort_order ASC`);
}

export async function getById(id: string): Promise<CollectionRow | undefined> {
  return get<CollectionRow>(`SELECT * FROM collections WHERE id = ?`, [id]);
}

export async function update(id: string, patch: Partial<CollectionInput>): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) {
    fields.push('name = ?');
    values.push(patch.name);
  }
  if (patch.description !== undefined) {
    fields.push('description = ?');
    values.push(patch.description);
  }
  if (patch.parentId !== undefined) {
    fields.push('parent_id = ?');
    values.push(patch.parentId);
  }
  if (patch.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    values.push(patch.sortOrder);
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);
  run(`UPDATE collections SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function remove(id: string): Promise<void> {
  run(`DELETE FROM collections WHERE id = ?`, [id]);
}

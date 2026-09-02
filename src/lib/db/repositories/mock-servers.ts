import { all, get, run } from '../client';
import { newId } from '@/lib/utils/nanoid-wrapper';
import type { MockServerRow } from '../schema';

export type MockServerInput = {
  id?: string;
  name: string;
  description: string | null;
  basePath: string;
  status: string;
};

export async function create(input: MockServerInput): Promise<string> {
  const id = input.id ?? newId();
  const now = Date.now();
  run(
    `INSERT INTO mock_servers (id, name, description, base_path, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.description, input.basePath, input.status, now, now],
  );
  return id;
}

export async function list(): Promise<MockServerRow[]> {
  return all<MockServerRow>(`SELECT * FROM mock_servers ORDER BY created_at DESC`);
}

export async function getById(id: string): Promise<MockServerRow | undefined> {
  return get<MockServerRow>(`SELECT * FROM mock_servers WHERE id = ?`, [id]);
}

export async function update(id: string, patch: Partial<MockServerInput>): Promise<void> {
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
  if (patch.basePath !== undefined) {
    fields.push('base_path = ?');
    values.push(patch.basePath);
  }
  if (patch.status !== undefined) {
    fields.push('status = ?');
    values.push(patch.status);
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);
  run(`UPDATE mock_servers SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function remove(id: string): Promise<void> {
  // mock_responses rows are removed by ON DELETE CASCADE on the FK.
  run(`DELETE FROM mock_servers WHERE id = ?`, [id]);
}

import { all, get, run } from '../client';
import { newId } from '@/lib/utils/nanoid-wrapper';
import type { TestCaseRow } from '../schema';

export type TestCaseInput = {
  id?: string;
  requestId: string;
  name: string;
  description: string | null;
  assertions: string;
  sortOrder: number;
};

export async function create(input: TestCaseInput): Promise<string> {
  const id = input.id ?? newId();
  const now = Date.now();
  run(
    `INSERT INTO test_cases (id, request_id, name, description, assertions, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.requestId,
      input.name,
      input.description,
      input.assertions,
      input.sortOrder,
      now,
      now,
    ],
  );
  return id;
}

export async function getById(id: string): Promise<TestCaseRow | undefined> {
  return get<TestCaseRow>(`SELECT * FROM test_cases WHERE id = ?`, [id]);
}

export async function listByRequest(requestId: string): Promise<TestCaseRow[]> {
  return all<TestCaseRow>(`SELECT * FROM test_cases WHERE request_id = ? ORDER BY sort_order ASC`, [
    requestId,
  ]);
}

export async function listAll(): Promise<TestCaseRow[]> {
  return all<TestCaseRow>(`SELECT * FROM test_cases`);
}

export async function update(id: string, patch: Partial<TestCaseInput>): Promise<void> {
  const map: Record<string, string> = {
    name: 'name',
    description: 'description',
    assertions: 'assertions',
    sortOrder: 'sort_order',
    requestId: 'request_id',
  };
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if ((patch as Record<string, unknown>)[k] !== undefined) {
      fields.push(`${col} = ?`);
      values.push((patch as Record<string, unknown>)[k]);
    }
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);
  run(`UPDATE test_cases SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function remove(id: string): Promise<void> {
  run(`DELETE FROM test_cases WHERE id = ?`, [id]);
}

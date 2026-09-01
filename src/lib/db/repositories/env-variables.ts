import { all, get, run } from '../client';
import { newId } from '@/lib/utils/nanoid-wrapper';
import type { EnvVariableRow } from '../schema';

export type EnvVarInput = {
  envId: string;
  key: string;
  value: string;
  isSecret: boolean;
  sortOrder: number;
};

export async function create(input: EnvVarInput): Promise<string> {
  const id = newId();
  run(
    `INSERT INTO env_variables (id, env_id, key, value, is_secret, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.envId, input.key, input.value, input.isSecret ? 1 : 0, input.sortOrder],
  );
  return id;
}

export async function update(id: string, patch: Partial<EnvVarInput>): Promise<void> {
  const map: Record<string, string> = {
    key: 'key',
    value: 'value',
    sortOrder: 'sort_order',
  };
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if ((patch as Record<string, unknown>)[k] !== undefined) {
      fields.push(`${col} = ?`);
      values.push((patch as Record<string, unknown>)[k]);
    }
  }
  if (patch.isSecret !== undefined) {
    fields.push('is_secret = ?');
    values.push(patch.isSecret ? 1 : 0);
  }
  if (fields.length === 0) return;
  values.push(id);
  run(`UPDATE env_variables SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function remove(id: string): Promise<void> {
  run(`DELETE FROM env_variables WHERE id = ?`, [id]);
}

export async function listByEnv(envId: string): Promise<EnvVariableRow[]> {
  return all<EnvVariableRow>(
    `SELECT * FROM env_variables WHERE env_id = ? ORDER BY sort_order ASC`,
    [envId],
  );
}

export async function asMap(envId: string): Promise<Record<string, string>> {
  const rows = await listByEnv(envId);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function getById(id: string): Promise<EnvVariableRow | undefined> {
  return get<EnvVariableRow>(`SELECT * FROM env_variables WHERE id = ?`, [id]);
}

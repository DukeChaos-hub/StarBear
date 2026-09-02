import { all, get, run } from '../client';
import { newId } from '@/lib/utils/nanoid-wrapper';
import type { MockResponseRow } from '../schema';

export type MockResponseInput = {
  id?: string;
  serverId: string;
  method: string;
  pathPattern: string;
  status: number;
  headers: string | null;
  body: string | null;
  delayMs: number;
  sortOrder: number;
};

export async function create(input: MockResponseInput): Promise<string> {
  const id = input.id ?? newId();
  const now = Date.now();
  run(
    `INSERT INTO mock_responses (id, server_id, method, path_pattern, status, headers, body, delay_ms, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.serverId,
      input.method.toUpperCase(),
      input.pathPattern,
      input.status,
      input.headers,
      input.body,
      input.delayMs,
      input.sortOrder,
      now,
      now,
    ],
  );
  return id;
}

export async function listByServer(serverId: string): Promise<MockResponseRow[]> {
  return all<MockResponseRow>(
    `SELECT * FROM mock_responses WHERE server_id = ? ORDER BY sort_order ASC, created_at ASC`,
    [serverId],
  );
}

export async function getById(id: string): Promise<MockResponseRow | undefined> {
  return get<MockResponseRow>(`SELECT * FROM mock_responses WHERE id = ?`, [id]);
}

/**
 * Look up the first matching response for a (serverId, method, path) tuple.
 * Match rule: exact method (case-insensitive) + exact path OR path with a
 * trailing `*` wildcard (e.g. `/users/*` matches `/users/42`).
 * Returns undefined if no match.
 */
export async function findMatch(
  serverId: string,
  method: string,
  path: string,
): Promise<MockResponseRow | undefined> {
  const candidates = all<MockResponseRow>(
    `SELECT * FROM mock_responses WHERE server_id = ? AND UPPER(method) = ? ORDER BY sort_order ASC, created_at ASC`,
    [serverId, method.toUpperCase()],
  );
  for (const row of candidates) {
    if (matchesPath(row.path_pattern, path)) return row;
  }
  return undefined;
}

function matchesPath(pattern: string, path: string): boolean {
  if (pattern === path) return true;
  if (!pattern.endsWith('*')) return false;
  const prefix = pattern.slice(0, -1);
  return path === prefix.slice(0, -1) || path.startsWith(prefix);
}

export async function update(id: string, patch: Partial<MockResponseInput>): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  if (patch.method !== undefined) {
    fields.push('method = ?');
    values.push(patch.method.toUpperCase());
  }
  if (patch.pathPattern !== undefined) {
    fields.push('path_pattern = ?');
    values.push(patch.pathPattern);
  }
  if (patch.status !== undefined) {
    fields.push('status = ?');
    values.push(patch.status);
  }
  if (patch.headers !== undefined) {
    fields.push('headers = ?');
    values.push(patch.headers);
  }
  if (patch.body !== undefined) {
    fields.push('body = ?');
    values.push(patch.body);
  }
  if (patch.delayMs !== undefined) {
    fields.push('delay_ms = ?');
    values.push(patch.delayMs);
  }
  if (patch.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    values.push(patch.sortOrder);
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);
  run(`UPDATE mock_responses SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function remove(id: string): Promise<void> {
  run(`DELETE FROM mock_responses WHERE id = ?`, [id]);
}

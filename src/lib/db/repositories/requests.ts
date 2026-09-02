import { all, get, run } from '../client';
import { newId } from '@/lib/utils/nanoid-wrapper';
import type { RequestRow } from '../schema';

export type RequestInput = {
  id?: string;
  collectionId: string;
  name: string;
  method: string;
  url: string;
  headers: string;
  queryParams: string;
  bodyKind: string;
  body: string | null;
  authKind: string;
  authConfig: string | null;
  preScript: string | null;
  postScript: string | null;
  sortOrder: number;
};

export async function create(input: RequestInput): Promise<string> {
  const id = input.id ?? newId();
  const now = Date.now();
  run(
    `INSERT INTO requests (id, collection_id, name, method, url, headers, query_params,
       body_kind, body, auth_kind, auth_config, pre_script, post_script,
       sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.collectionId,
      input.name,
      input.method,
      input.url,
      input.headers,
      input.queryParams,
      input.bodyKind,
      input.body,
      input.authKind,
      input.authConfig,
      input.preScript,
      input.postScript,
      input.sortOrder,
      now,
      now,
    ],
  );
  return id;
}

export async function getById(id: string): Promise<RequestRow | undefined> {
  return get<RequestRow>(`SELECT * FROM requests WHERE id = ?`, [id]);
}

export async function listByCollection(collectionId: string): Promise<RequestRow[]> {
  return all<RequestRow>(`SELECT * FROM requests WHERE collection_id = ? ORDER BY sort_order ASC`, [
    collectionId,
  ]);
}

export async function update(id: string, patch: Partial<RequestInput>): Promise<void> {
  const map: Record<string, string> = {
    name: 'name',
    method: 'method',
    url: 'url',
    headers: 'headers',
    queryParams: 'query_params',
    bodyKind: 'body_kind',
    body: 'body',
    authKind: 'auth_kind',
    authConfig: 'auth_config',
    preScript: 'pre_script',
    postScript: 'post_script',
    sortOrder: 'sort_order',
    collectionId: 'collection_id',
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
  run(`UPDATE requests SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function remove(id: string): Promise<void> {
  run(`DELETE FROM requests WHERE id = ?`, [id]);
}

export async function search(query: string): Promise<RequestRow[]> {
  const pattern = `%${query}%`;
  return all<RequestRow>(`SELECT * FROM requests WHERE name LIKE ? OR url LIKE ?`, [
    pattern,
    pattern,
  ]);
}

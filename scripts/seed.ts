/**
 * Populate the StarBear database with sample data so a fresh clone has
 * something to look at. Safe to run multiple times — checks before inserting.
 *
 * Run: pnpm db:seed
 */
import { closeDb, run, all } from '../src/lib/db/client';
import { newId } from '../src/lib/utils/nanoid-wrapper';

function rowExists(table: string, where: string, value: string): boolean {
  const r = all<{ c: number }>(`SELECT COUNT(*) as c FROM ${table} WHERE ${where} = ?`, [value]);
  return (r[0]?.c ?? 0) > 0;
}

console.log('Seeding StarBear with sample data…');

// 1. Environment
if (!rowExists('environments', 'name', 'dev')) {
  const envId = newId();
  const now = Date.now();
  run(
    `INSERT INTO environments (id, name, is_active, created_at, updated_at) VALUES (?, 'dev', 1, ?, ?)`,
    [envId, now, now],
  );
  const vars = [
    { key: 'host', value: 'https://httpbin.org', secret: 0 },
    { key: 'token', value: 'demo-token-replace-me', secret: 1 },
  ];
  for (const [i, v] of vars.entries()) {
    run(
      `INSERT INTO env_variables (id, env_id, key, value, is_secret, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [newId(), envId, v.key, v.value, v.secret, i],
    );
  }
  console.log('  + environment: dev (active) with host + token');
} else {
  console.log('  · environment dev already exists, skipping');
}

// 2. Sample collection
if (!rowExists('collections', 'name', 'Sandbox')) {
  const colId = newId();
  const now = Date.now();
  run(
    `INSERT INTO collections (id, name, description, parent_id, sort_order, created_at, updated_at)
     VALUES (?, 'Sandbox', 'Try requests against httpbin. Replace {host} via the env.', NULL, 0, ?, ?)`,
    [colId, now, now],
  );
  type Req = {
    name: string;
    method: string;
    url: string;
    authKind: string;
    authConfig: string | null;
  };
  const requests: Req[] = [
    { name: 'GET /get', method: 'GET', url: '{host}/get', authKind: 'none', authConfig: null },
    {
      name: 'POST /post (json body)',
      method: 'POST',
      url: '{host}/post',
      authKind: 'none',
      authConfig: null,
    },
    {
      name: 'Auth example (with bearer)',
      method: 'GET',
      url: '{host}/bearer',
      authKind: 'bearer',
      authConfig: JSON.stringify({ kind: 'bearer', token: '{token}' }),
    },
  ];
  for (const [i, r] of requests.entries()) {
    run(
      `INSERT INTO requests (id, collection_id, name, method, url, headers, query_params,
         body_kind, body, auth_kind, auth_config, pre_script, post_script,
         sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '[]', '[]', 'none', NULL, ?, ?, NULL, NULL, ?, ?, ?)`,
      [newId(), colId, r.name, r.method, r.url, r.authKind, r.authConfig, i, now, now],
    );
  }
  console.log(`  + collection: Sandbox with ${requests.length} requests`);
} else {
  console.log('  · collection Sandbox already exists, skipping');
}

console.log('Done.');
closeDb();

/**
 * Reset the local StarBear database to an empty schema.
 * Run: pnpm db:reset
 *
 * Strategy: drop every table, then re-apply migrations. This avoids the
 * EBUSY issue you would hit trying to unlink the SQLite file while
 * another process (e.g. the running dev server) still has it open.
 */
import { exec, migrate, closeDb } from '../src/lib/db/client';

const DROP_ORDER = [
  'mock_responses',
  'mock_servers',
  'test_run_steps',
  'test_runs',
  'ai_messages',
  'ai_conversations',
  'test_cases',
  'env_variables',
  'environments',
  'requests',
  'collections',
  'ai_settings',
];

console.log('Dropping tables…');
for (const t of DROP_ORDER) {
  exec(`DROP TABLE IF EXISTS ${t}`);
}

console.log('Re-applying migrations…');
migrate();
closeDb();
console.log('Database reset. Run `pnpm db:seed` to populate it.');

import { all, get, run } from '../client';
import { newId } from '@/lib/utils/nanoid-wrapper';
import type { ScheduledJobRow } from '../schema';

export type { ScheduledJobRow } from '../schema';
export type IntervalKind = 'minutes' | 'hours' | 'days' | 'weeks';

export interface ScheduledJobInput {
  id?: string;
  name: string;
  testCaseIds: string[];
  intervalKind: IntervalKind;
  intervalValue: number;
  timeOfDay: string | null;
  weekday: number | null;
  enabled: boolean;
  nextRunAt: number;
}

function encodeIds(ids: string[]): string {
  return JSON.stringify(ids);
}

function decodeIds(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function create(input: ScheduledJobInput): Promise<string> {
  const id = input.id ?? newId();
  const now = Date.now();
  run(
    `INSERT INTO scheduled_jobs (
      id, name, test_case_ids, interval_kind, interval_value, time_of_day, weekday,
      enabled, next_run_at, last_run_at, last_run_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
    [
      id,
      input.name,
      encodeIds(input.testCaseIds),
      input.intervalKind,
      input.intervalValue,
      input.timeOfDay,
      input.weekday,
      input.enabled ? 1 : 0,
      input.nextRunAt,
      now,
      now,
    ],
  );
  return id;
}

export async function list(): Promise<ScheduledJobRow[]> {
  return all<ScheduledJobRow>(`SELECT * FROM scheduled_jobs ORDER BY next_run_at ASC`);
}

export async function getById(id: string): Promise<ScheduledJobRow | undefined> {
  return get<ScheduledJobRow>(`SELECT * FROM scheduled_jobs WHERE id = ?`, [id]);
}

export async function listDue(now: number): Promise<ScheduledJobRow[]> {
  return all<ScheduledJobRow>(
    `SELECT * FROM scheduled_jobs WHERE enabled = 1 AND next_run_at <= ? ORDER BY next_run_at ASC`,
    [now],
  );
}

export async function update(id: string, patch: Partial<ScheduledJobInput>): Promise<void> {
  const map: Record<string, string> = {
    name: 'name',
    testCaseIds: 'test_case_ids',
    intervalKind: 'interval_kind',
    intervalValue: 'interval_value',
    timeOfDay: 'time_of_day',
    weekday: 'weekday',
    enabled: 'enabled',
    nextRunAt: 'next_run_at',
  };
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    const v = (patch as Record<string, unknown>)[k];
    if (v === undefined) continue;
    if (k === 'testCaseIds' && Array.isArray(v)) {
      fields.push(`${col} = ?`);
      values.push(encodeIds(v as string[]));
    } else if (k === 'enabled' && typeof v === 'boolean') {
      fields.push(`${col} = ?`);
      values.push(v ? 1 : 0);
    } else {
      fields.push(`${col} = ?`);
      values.push(v);
    }
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);
  run(`UPDATE scheduled_jobs SET ${fields.join(', ')} WHERE id = ?`, values);
}

/**
 * Mark a job as having been executed right now, link the resulting run id,
 * and bump the schedule to the next computed time. Returns the row so the
 * caller can read the new `next_run_at` without a second query.
 */
export async function markRun(id: string, runId: string, nextRunAt: number): Promise<void> {
  const now = Date.now();
  run(
    `UPDATE scheduled_jobs
       SET last_run_at = ?, last_run_id = ?, next_run_at = ?, updated_at = ?
       WHERE id = ?`,
    [now, runId, nextRunAt, now, id],
  );
}

export async function remove(id: string): Promise<void> {
  run(`DELETE FROM scheduled_jobs WHERE id = ?`, [id]);
}

export { decodeIds };

import { runSuite } from '@/lib/test-engine';
import * as jobs from '@/lib/db/repositories/scheduled-jobs';
import type { ScheduledJobRow } from '@/lib/db/repositories/scheduled-jobs';
import { nextRunAt } from './next-run';

export interface TickDeps {
  now: () => Date;
  listDue: (now: number) => Promise<ScheduledJobRow[]>;
  runJob: (job: ScheduledJobRow) => Promise<{ runId: string }>;
  markRun: (id: string, runId: string, nextRunAt: number) => Promise<void>;
}

export interface TickResult {
  scanned: number;
  executed: number;
  errors: number;
  erroredJobs: string[];
}

const inFlight = new Set<string>();

/**
 * Default tick. Loads all jobs whose `next_run_at <= now`, runs each
 * through `runSuite`, then records the run + advances the schedule.
 * Skips any job that's already running so a long test suite doesn't
 * get re-entered while still executing.
 */
export async function tick(
  deps: TickDeps = {
    now: () => new Date(),
    listDue: jobs.listDue,
    runJob: defaultRunJob,
    markRun: jobs.markRun,
  },
): Promise<TickResult> {
  const nowDate = deps.now();
  const now = nowDate.getTime();
  const due = await deps.listDue(now);
  const erroredJobs: string[] = [];
  let executed = 0;

  for (const job of due) {
    if (inFlight.has(job.id)) continue;
    inFlight.add(job.id);
    try {
      const result = await deps.runJob(job);
      const next = computeNext(job, nowDate);
      await deps.markRun(job.id, result.runId, next);
      executed += 1;
    } catch {
      erroredJobs.push(job.id);
      // Still bump the schedule so a broken job doesn't run every 30s.
      try {
        await deps.markRun(job.id, '', computeNext(job, nowDate));
      } catch {
        /* swallow */
      }
    } finally {
      inFlight.delete(job.id);
    }
  }

  return { scanned: due.length, executed, errors: erroredJobs.length, erroredJobs };
}

async function defaultRunJob(row: ScheduledJobRow): Promise<{ runId: string }> {
  const ids = decodeIds(row.test_case_ids);
  if (ids.length === 0) return { runId: '' };
  const result = await runSuite({
    testCaseIds: ids,
    scope: 'schedule',
    scopeRef: row.id,
  });
  return { runId: result.runId };
}

function decodeIds(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function computeNext(row: ScheduledJobRow, from: Date): number {
  return nextRunAt({
    kind: row.interval_kind as 'minutes' | 'hours' | 'days' | 'weeks',
    value: row.interval_value,
    timeOfDay: row.time_of_day,
    weekday: row.weekday,
    from,
  });
}

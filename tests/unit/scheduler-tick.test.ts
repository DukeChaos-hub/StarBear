import { describe, expect, it, vi } from 'vitest';
import { tick } from '@/lib/scheduler';
import type { ScheduledJobRow } from '@/lib/db/repositories/scheduled-jobs';

function makeRow(overrides: Partial<ScheduledJobRow> = {}): ScheduledJobRow {
  return {
    id: 'job1',
    name: 'Test job',
    test_case_ids: '[]',
    interval_kind: 'minutes',
    interval_value: 5,
    time_of_day: null,
    weekday: null,
    enabled: 1,
    next_run_at: 0,
    last_run_at: null,
    last_run_id: null,
    created_at: 0,
    updated_at: 0,
    ...overrides,
  };
}

describe('tick', () => {
  it('runs all due jobs and records next_run_at', async () => {
    const listDue = vi.fn().mockResolvedValue([
      makeRow({ id: 'a', next_run_at: 100, interval_value: 5 }),
      makeRow({ id: 'b', next_run_at: 200, interval_value: 10 }),
    ]);
    const runJob = vi.fn().mockResolvedValue({ runId: 'run-1' });
    const markRun = vi.fn().mockResolvedValue(undefined);

    const result = await tick({
      now: () => new Date(1000),
      listDue,
      runJob,
      markRun,
    });

    expect(result.scanned).toBe(2);
    expect(result.executed).toBe(2);
    expect(result.errors).toBe(0);
    expect(runJob).toHaveBeenCalledTimes(2);
    expect(markRun).toHaveBeenCalledTimes(2);
    // next_run_at for the minutes job: from=1000 (the "now" used as base for nextRunAt)
    expect(markRun).toHaveBeenNthCalledWith(1, 'a', 'run-1', 1000 + 5 * 60_000);
    expect(markRun).toHaveBeenNthCalledWith(2, 'b', 'run-1', 1000 + 10 * 60_000);
  });

  it('skips jobs that throw and bumps their schedule', async () => {
    const listDue = vi.fn().mockResolvedValue([
      makeRow({ id: 'broken' }),
      makeRow({ id: 'ok', interval_value: 5 }),
    ]);
    const runJob = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new Error('downstream failure');
      })
      .mockResolvedValueOnce({ runId: 'run-2' });
    const markRun = vi.fn().mockResolvedValue(undefined);

    const result = await tick({
      now: () => new Date(5000),
      listDue,
      runJob,
      markRun,
    });

    expect(result.executed).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.erroredJobs).toEqual(['broken']);
    expect(markRun).toHaveBeenCalledTimes(2);
    // broken job gets a next-run bump with empty runId so it doesn't re-fire immediately
    expect(markRun).toHaveBeenCalledWith('broken', '', 5000 + 5 * 60_000);
  });

  it('passes through the job row so runJob can read test_case_ids', async () => {
    const row = makeRow({ test_case_ids: '["c1","c2"]' });
    const listDue = vi.fn().mockResolvedValue([row]);
    const runJob = vi.fn().mockResolvedValue({ runId: 'r' });
    const markRun = vi.fn().mockResolvedValue(undefined);

    await tick({
      now: () => new Date(0),
      listDue,
      runJob,
      markRun,
    });

    expect(runJob).toHaveBeenCalledWith(row);
  });

  it('returns zero counts when nothing is due', async () => {
    const listDue = vi.fn().mockResolvedValue([]);
    const runJob = vi.fn();
    const markRun = vi.fn();
    const result = await tick({
      now: () => new Date(0),
      listDue,
      runJob,
      markRun,
    });
    expect(result).toEqual({ scanned: 0, executed: 0, errors: 0, erroredJobs: [] });
    expect(runJob).not.toHaveBeenCalled();
    expect(markRun).not.toHaveBeenCalled();
  });
});

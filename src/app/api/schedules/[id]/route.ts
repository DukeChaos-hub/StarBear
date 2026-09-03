import { NextRequest, NextResponse } from 'next/server';
import { createResourceRouter, parseJson, notFound } from '@/lib/api/route-helpers';
import * as jobs from '@/lib/db/repositories/scheduled-jobs';
import { ScheduledJobPatchZ } from '@/lib/scheduler/schedule-input';
import { nextRunAt } from '@/lib/scheduler/next-run';
import { decodeIds } from '@/lib/db/repositories/scheduled-jobs';

const base = createResourceRouter({
  repo: {
    getById: jobs.getById,
    update: async (id, patch) => {
      // Allow PATCH to also recompute next_run_at when interval fields change.
      const { nextRunAt: _omit, ...rest } = patch as Record<string, unknown> & {
        nextRunAt?: number;
      };
      void _omit;
      await jobs.update(id, rest);
    },
    remove: jobs.remove,
  },
  patchSchema: ScheduledJobPatchZ,
});

export const { DELETE } = base;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await jobs.getById(id);
  if (!row) return notFound();
  return NextResponse.json({ ...row, testCaseIds: decodeIds(row.test_case_ids) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = await parseJson(req, ScheduledJobPatchZ);
  if (!parsed.ok) return parsed.res;
  const existing = await jobs.getById(id);
  if (!existing) return notFound();
  const data = parsed.data;
  // When the schedule knobs change, recompute next_run_at. If the user is
  // not in a backoff window we anchor on `from = now`; otherwise we keep
  // the existing next_run_at so a paused job doesn't immediately fire on
  // resume. Disabled jobs do not need a recompute.
  const intervalChanged =
    data.intervalKind !== undefined ||
    data.intervalValue !== undefined ||
    data.timeOfDay !== undefined ||
    data.weekday !== undefined;
  const willBeEnabled = data.enabled === undefined ? Boolean(existing.enabled) : data.enabled;
  let nextRunAtValue: number | undefined;
  if (intervalChanged && willBeEnabled) {
    nextRunAtValue = nextRunAt({
      kind: data.intervalKind ?? (existing.interval_kind as 'minutes' | 'hours' | 'days' | 'weeks'),
      value: data.intervalValue ?? existing.interval_value,
      timeOfDay: data.timeOfDay !== undefined ? data.timeOfDay : existing.time_of_day,
      weekday: data.weekday !== undefined ? data.weekday : existing.weekday,
      from: new Date(),
    });
  }
  await jobs.update(id, {
    ...data,
    ...(nextRunAtValue !== undefined ? { nextRunAt: nextRunAtValue } : {}),
  });
  const updated = await jobs.getById(id);
  return NextResponse.json({ ...updated!, testCaseIds: decodeIds(updated!.test_case_ids) });
}

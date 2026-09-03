import { NextRequest, NextResponse } from 'next/server';
import { notFound, parseJson } from '@/lib/api/route-helpers';
import { z } from 'zod';
import * as jobs from '@/lib/db/repositories/scheduled-jobs';
import { runSuite } from '@/lib/test-engine';
import { nextRunAt } from '@/lib/scheduler/next-run';
import { decodeIds } from '@/lib/db/repositories/scheduled-jobs';

const Body = z
  .object({
    ssrfMode: z.enum(['strict', 'allow-local']).optional(),
  })
  .optional();

/**
 * Manual run trigger. Resolves the job, runs the suite once, links the
 * resulting run, and advances next_run_at as if the scheduler itself
 * had fired the job. Differs from the tick in that the response is
 * returned to the caller (so the UI can show the report) and the
 * "in-flight" dedupe is intentionally bypassed. Accepts an optional
 * `ssrfMode` body for ad-hoc local-dev runs; defaults to whatever the
 * settings singleton says.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = await jobs.getById(id);
  if (!job) return notFound();

  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.res;

  const ids = decodeIds(job.test_case_ids);
  if (ids.length === 0) {
    return NextResponse.json({ error: 'no_test_cases' }, { status: 400 });
  }

  const result = await runSuite({
    testCaseIds: ids,
    scope: 'schedule',
    scopeRef: job.id,
    ssrfMode: parsed.data?.ssrfMode,
  });
  const next = nextRunAt({
    kind: job.interval_kind as 'minutes' | 'hours' | 'days' | 'weeks',
    value: job.interval_value,
    timeOfDay: job.time_of_day,
    weekday: job.weekday,
    from: new Date(),
  });
  await jobs.markRun(job.id, result.runId, next);
  return NextResponse.json({ runId: result.runId, report: result.report });
}

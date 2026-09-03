import { NextRequest, NextResponse } from 'next/server';
import { parseJson } from '@/lib/api/route-helpers';
import * as jobs from '@/lib/db/repositories/scheduled-jobs';
import { ScheduledJobInputZ } from '@/lib/scheduler/schedule-input';
import { nextRunAt } from '@/lib/scheduler/next-run';
import { decodeIds } from '@/lib/db/repositories/scheduled-jobs';

export async function GET() {
  const rows = await jobs.list();
  return NextResponse.json(rows.map(serialize));
}

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, ScheduledJobInputZ);
  if (!parsed.ok) return parsed.res;
  const data = parsed.data;
  const next = nextRunAt({
    kind: data.intervalKind,
    value: data.intervalValue,
    timeOfDay: data.timeOfDay,
    weekday: data.weekday,
    from: new Date(),
  });
  const id = await jobs.create({
    name: data.name,
    testCaseIds: data.testCaseIds,
    intervalKind: data.intervalKind,
    intervalValue: data.intervalValue,
    timeOfDay: data.timeOfDay,
    weekday: data.weekday,
    enabled: data.enabled,
    nextRunAt: next,
  });
  const row = await jobs.getById(id);
  return NextResponse.json(serialize(row!), { status: 201 });
}

function serialize(row: import('@/lib/db/repositories/scheduled-jobs').ScheduledJobRow) {
  return {
    ...row,
    testCaseIds: decodeIds(row.test_case_ids),
  };
}

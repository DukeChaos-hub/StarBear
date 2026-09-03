import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runSuite } from '@/lib/test-engine';
import { parseJson } from '@/lib/api/route-helpers';

const Body = z.object({
  testCaseIds: z.array(z.string()).min(1),
  ssrfMode: z.enum(['strict', 'allow-local']).optional(),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.res;

  const result = await runSuite({
    testCaseIds: parsed.data.testCaseIds,
    scope: 'suite',
    scopeRef: 'adhoc',
    ssrfMode: parsed.data.ssrfMode,
    timeoutMs: parsed.data.timeoutMs,
  });
  if (result.empty) {
    return NextResponse.json({ error: 'no_valid_cases' }, { status: 400 });
  }
  return NextResponse.json({ runId: result.runId, report: result.report });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runTestCase, parseAssertionsJson, buildSuiteReport } from '@/lib/test-engine';
import * as reqRepo from '@/lib/db/repositories/requests';
import * as caseRepo from '@/lib/db/repositories/test-cases';
import * as runRepo from '@/lib/db/repositories/test-runs';
import * as envRepo from '@/lib/db/repositories/environments';
import * as varsRepo from '@/lib/db/repositories/env-variables';
import { getSettings } from '@/lib/db/ai-settings';

const Body = z.object({
  testCaseIds: z.array(z.string()).min(1),
  ssrfMode: z.enum(['strict', 'allow-local']).optional(),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const start = Date.now();
  const cases = await Promise.all(parsed.data.testCaseIds.map((id) => caseRepo.getById(id)));
  const valid = cases.filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (valid.length === 0) return NextResponse.json({ error: 'no_valid_cases' }, { status: 400 });

  const runId = await runRepo.create({ scope: 'suite', scopeRef: 'adhoc', status: 'running' });
  const activeEnv = await envRepo.getActive();
  const vars = activeEnv ? await varsRepo.asMap(activeEnv.id) : {};
  const settings = await getSettings();
  const ssrfMode = parsed.data.ssrfMode ?? settings.ssrfMode;
  const timeoutMs = parsed.data.timeoutMs ?? 30_000;

  const results = [];
  for (let i = 0; i < valid.length; i++) {
    const tc = valid[i]!;
    const r = await reqRepo.getById(tc.request_id);
    if (!r) continue;
    const res = await runTestCase({
      method: r.method as 'GET',
      url: r.url,
      vars,
      ssrfMode,
      timeoutMs,
      requestId: r.id,
      testCaseId: tc.id,
      headers: JSON.parse(r.headers),
      query: JSON.parse(r.query_params),
      body: r.body ?? undefined,
      auth: r.auth_config ? JSON.parse(r.auth_config) : { kind: 'none' },
      assertions: parseAssertionsJson(tc.assertions),
    });
    await runRepo.addStep({
      runId,
      stepIndex: i,
      requestId: r.id,
      name: tc.name,
      status: res.status,
      responseMeta: res.response
        ? JSON.stringify({
            status: res.response.status,
            latency_ms: res.response.latencyMs,
            size: res.response.size,
          })
        : null,
      error: res.error ?? null,
      assertionsResult: JSON.stringify(res.assertionsResult),
    });
    results.push(res);
  }

  const report = buildSuiteReport(start, results);
  const status = report.failed + report.errored === 0 ? 'passed' : 'failed';
  await runRepo.finish(
    runId,
    status,
    JSON.stringify({
      total: report.total,
      passed: report.passed,
      failed: report.failed,
      errored: report.errored,
      duration_ms: report.durationMs,
    }),
  );

  return NextResponse.json({ runId, report });
}

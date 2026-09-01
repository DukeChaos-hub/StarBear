import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runTestCase, parseAssertionsJson } from '@/lib/test-engine';
import * as reqRepo from '@/lib/db/repositories/requests';
import * as caseRepo from '@/lib/db/repositories/test-cases';
import * as runRepo from '@/lib/db/repositories/test-runs';
import * as envRepo from '@/lib/db/repositories/environments';
import * as varsRepo from '@/lib/db/repositories/env-variables';
import { getSettings } from '@/lib/db/ai-settings';

const Body = z.object({
  testCaseId: z.string(),
  ssrfMode: z.enum(['strict', 'allow-local']).optional(),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const tc = await caseRepo.getById(parsed.data.testCaseId);
  if (!tc) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const r = await reqRepo.getById(tc.request_id);
  if (!r) return NextResponse.json({ error: 'request_not_found' }, { status: 404 });

  const activeEnv = await envRepo.getActive();
  const vars = activeEnv ? await varsRepo.asMap(activeEnv.id) : {};
  const settings = await getSettings();
  // Allow per-call SSRF override (e.g. for local dev / test environments).
  const ssrfMode = parsed.data.ssrfMode ?? settings.ssrfMode;
  const timeoutMs = parsed.data.timeoutMs ?? 30_000;

  const start = Date.now();
  const runId = await runRepo.create({ scope: 'single', scopeRef: tc.id, status: 'running' });

  const result = await runTestCase({
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
    stepIndex: 0,
    requestId: r.id,
    name: tc.name,
    status: result.status,
    responseMeta: result.response
      ? JSON.stringify({
          status: result.response.status,
          latency_ms: result.response.latencyMs,
          size: result.response.size,
        })
      : null,
    error: result.error ?? null,
    assertionsResult: JSON.stringify(result.assertionsResult),
  });
  await runRepo.finish(
    runId,
    result.status,
    JSON.stringify({
      total: 1,
      passed: result.status === 'passed' ? 1 : 0,
      failed: result.status === 'failed' ? 1 : 0,
      errored: result.status === 'error' ? 1 : 0,
      duration_ms: Date.now() - start,
    }),
  );

  return NextResponse.json({ runId, result });
}

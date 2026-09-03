import { runTestCase, parseAssertionsJson } from './runner';
import { buildSuiteReport, type SuiteReport } from './report';
import * as reqRepo from '@/lib/db/repositories/requests';
import * as caseRepo from '@/lib/db/repositories/test-cases';
import * as runRepo from '@/lib/db/repositories/test-runs';
import * as envRepo from '@/lib/db/repositories/environments';
import * as varsRepo from '@/lib/db/repositories/env-variables';
import { getSettings } from '@/lib/db/ai-settings';

export interface RunSuiteInput {
  testCaseIds: string[];
  /** Persisted-run scope label, e.g. 'suite' or 'schedule'. */
  scope: 'suite' | 'schedule';
  /** Persisted-run scope_ref, e.g. 'adhoc' or a schedule id. */
  scopeRef: string;
  ssrfMode?: 'strict' | 'allow-local';
  timeoutMs?: number;
}

export interface RunSuiteOutput {
  runId: string;
  report: SuiteReport;
  /** True if the test-case list was empty or every request was missing. */
  empty: boolean;
}

/**
 * Resolve env vars + settings, iterate the supplied test cases, persist a
 * single `test_runs` row + N `test_run_steps`, and return a structured
 * report. Shared by the user-facing /api/tests/suite route and the
 * background scheduler so behaviour stays identical between the two.
 */
export async function runSuite(input: RunSuiteInput): Promise<RunSuiteOutput> {
  const cases = await Promise.all(input.testCaseIds.map((id) => caseRepo.getById(id)));
  const valid = cases.filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (valid.length === 0) {
    return { runId: '', report: emptyReport(), empty: true };
  }

  const activeEnv = await envRepo.getActive();
  const vars = activeEnv ? await varsRepo.asMap(activeEnv.id) : {};
  const settings = await getSettings();
  const ssrfMode = input.ssrfMode ?? settings.ssrfMode;
  const timeoutMs = input.timeoutMs ?? 30_000;

  const start = Date.now();
  const runId = await runRepo.create({
    scope: input.scope,
    scopeRef: input.scopeRef,
    status: 'running',
  });

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

  return { runId, report, empty: false };
}

function emptyReport(): SuiteReport {
  return {
    total: 0,
    passed: 0,
    failed: 0,
    errored: 0,
    durationMs: 0,
    steps: [],
  };
}

import type { RunTestCaseOutput } from './runner';

export interface SuiteReport {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  durationMs: number;
  steps: RunTestCaseOutput[];
}

export function buildSuiteReport(startMs: number, steps: RunTestCaseOutput[]): SuiteReport {
  return {
    total: steps.length,
    passed: steps.filter((s) => s.status === 'passed').length,
    failed: steps.filter((s) => s.status === 'failed').length,
    errored: steps.filter((s) => s.status === 'error').length,
    durationMs: Date.now() - startMs,
    steps,
  };
}

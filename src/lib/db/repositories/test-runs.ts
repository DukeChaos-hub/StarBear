import { all, get, run } from '../client';
import { newId } from '@/lib/utils/nanoid-wrapper';
import type { TestRunRow, TestRunStepRow } from '../schema';

export type CreateRunInput = { scope: string; scopeRef: string | null; status: string };
export type StepInput = {
  runId: string;
  stepIndex: number;
  requestId: string | null;
  name: string;
  status: string;
  responseMeta: string | null;
  error: string | null;
  assertionsResult: string | null;
};

export interface RunWithSteps {
  run: TestRunRow;
  steps: TestRunStepRow[];
}

export async function create(input: CreateRunInput): Promise<string> {
  const id = newId();
  run(
    `INSERT INTO test_runs (id, scope, scope_ref, started_at, finished_at, status, summary)
     VALUES (?, ?, ?, ?, NULL, ?, NULL)`,
    [id, input.scope, input.scopeRef, Date.now(), input.status],
  );
  return id;
}

export async function addStep(input: StepInput): Promise<void> {
  run(
    `INSERT INTO test_run_steps (id, run_id, step_index, request_id, name, status, response_meta, error, assertions_result)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId(),
      input.runId,
      input.stepIndex,
      input.requestId,
      input.name,
      input.status,
      input.responseMeta,
      input.error,
      input.assertionsResult,
    ],
  );
}

export async function finish(id: string, status: string, summary: string): Promise<void> {
  run(`UPDATE test_runs SET status = ?, summary = ?, finished_at = ? WHERE id = ?`, [
    status,
    summary,
    Date.now(),
    id,
  ]);
}

export async function getById(id: string): Promise<TestRunRow | undefined> {
  return get<TestRunRow>(`SELECT * FROM test_runs WHERE id = ?`, [id]);
}

export async function getWithSteps(id: string): Promise<RunWithSteps | undefined> {
  const run = await getById(id);
  if (!run) return undefined;
  const steps = all<TestRunStepRow>(
    `SELECT * FROM test_run_steps WHERE run_id = ? ORDER BY step_index ASC`,
    [id],
  );
  return { run, steps };
}

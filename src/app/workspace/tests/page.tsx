'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

interface TestCase {
  id: string;
  request_id: string;
  name: string;
  description: string | null;
  assertions: string;
  sort_order: number;
}

interface Request {
  id: string;
  name: string;
  method: string;
  url: string;
  collection_id: string;
}

interface Assertion {
  type: 'status' | 'latency' | 'header' | 'jsonpath' | 'schema' | 'script';
  [k: string]: unknown;
}

interface RunResult {
  status: 'passed' | 'failed' | 'error' | 'running';
  error?: string;
  response?: { status: number; latencyMs: number; size: number };
  assertionsResult?: { type: string; passed: boolean; message: string }[];
}

export default function TestsPage() {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selected, setSelected] = useState<TestCase | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');

  const refresh = useCallback(async () => {
    const [casesRaw, collections] = await Promise.all([
      fetch('/api/test-cases').then((r) => r.json()),
      fetch('/api/collections').then((r) => r.json()),
    ]);
    setCases(casesRaw);
    const reqs: Request[] = [];
    for (const c of collections) {
      const list: Request[] = await fetch(`/api/requests?collectionId=${c.id}`).then((r) =>
        r.json(),
      );
      reqs.push(...list);
    }
    setRequests(reqs);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCase = async () => {
    if (!newName || requests.length === 0) return;
    const first = requests[0]!;
    const body = {
      requestId: first.id,
      name: newName,
      description: null,
      assertions: JSON.stringify([{ type: 'status', expected: 200 }] satisfies Assertion[]),
    };
    const res = await fetch('/api/test-cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const { id } = await res.json();
    setNewName('');
    await refresh();
    const c = cases.find((x) => x.id === id);
    if (c) setSelected(c);
  };

  const runCase = async (id: string) => {
    setBusy(true);
    setRunResult({ status: 'running' });
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ testCaseId: id, ssrfMode: 'allow-local' }),
      });
      const json = await res.json();
      setRunResult({
        status: json.result?.status ?? 'error',
        error: json.result?.error,
        response: json.result?.response,
        assertionsResult: json.result?.assertionsResult,
      });
    } catch (e) {
      setRunResult({ status: 'error', error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const runAll = async () => {
    if (cases.length === 0) return;
    setBusy(true);
    setRunResult({ status: 'running' });
    try {
      const res = await fetch('/api/tests/suite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ testCaseIds: cases.map((c) => c.id), ssrfMode: 'allow-local' }),
      });
      const json = await res.json();
      setRunResult({
        status: json.report.failed + json.report.errored === 0 ? 'passed' : 'failed',
        assertionsResult: [
          {
            type: 'suite',
            passed: json.report.failed + json.report.errored === 0,
            message: `${json.report.passed}/${json.report.total} passed in ${json.report.durationMs}ms`,
          },
        ],
      });
    } catch (e) {
      setRunResult({ status: 'error', error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const saveAssertions = async (tc: TestCase, list: Assertion[]) => {
    await fetch(`/api/test-cases/${tc.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requestId: tc.request_id,
        name: tc.name,
        description: tc.description,
        assertions: JSON.stringify(list),
        sortOrder: tc.sort_order,
      }),
    });
    await refresh();
  };

  const deleteCase = async (id: string) => {
    if (!confirm('Delete this test case?')) return;
    await fetch(`/api/test-cases/${id}`, { method: 'DELETE' });
    if (selected?.id === id) setSelected(null);
    await refresh();
  };

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="flex w-72 flex-col border-r bg-muted/30">
        <div className="border-b p-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Test cases</p>
          <div className="flex gap-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New case name"
              onKeyDown={(e) => e.key === 'Enter' && void createCase()}
            />
            <Button
              size="icon"
              onClick={createCase}
              disabled={!newName || requests.length === 0}
              aria-label="Create"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {requests.length === 0 && (
            <p className="mt-1 text-[10px] text-amber-600">
              Save a request first (no saved requests yet).
            </p>
          )}
        </div>
        <div className="flex-1 overflow-auto p-2">
          {cases.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">No test cases yet.</p>
          )}
          {cases.map((c) => (
            <div
              key={c.id}
              className={cn(
                'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60',
                selected?.id === c.id && 'bg-accent',
              )}
            >
              <button onClick={() => setSelected(c)} className="flex-1 truncate text-left">
                {c.name}
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => void runCase(c.id)}
                disabled={busy}
                aria-label="Run"
              >
                <Play className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => void deleteCase(c.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        <div className="border-t p-2">
          <Button
            onClick={runAll}
            disabled={busy || cases.length === 0}
            className="w-full"
            size="sm"
          >
            <Play className="h-3.5 w-3.5" /> Run all ({cases.length})
          </Button>
        </div>
      </aside>
      <section className="flex flex-1 flex-col overflow-hidden">
        {selected ? (
          <TestCaseDetail
            tc={selected}
            requests={requests}
            runResult={runResult}
            onSaveAssertions={saveAssertions}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a test case on the left.
          </div>
        )}
      </section>
    </div>
  );
}

function TestCaseDetail({
  tc,
  requests,
  runResult,
  onSaveAssertions,
}: {
  tc: TestCase;
  requests: Request[];
  runResult: RunResult | null;
  onSaveAssertions: (tc: TestCase, list: Assertion[]) => Promise<void>;
}) {
  const [assertions, setAssertions] = useState<Assertion[]>(() => {
    try {
      return JSON.parse(tc.assertions);
    } catch {
      return [];
    }
  });
  const [requestId, setRequestId] = useState(tc.request_id);

  const update = (i: number, patch: Partial<Assertion>) => {
    setAssertions((list) => list.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };
  const remove = (i: number) => setAssertions((list) => list.filter((_, idx) => idx !== i));
  const append = (type: Assertion['type']) =>
    setAssertions((list) => [...list, defaultAssertion(type)]);

  const saveRequestBinding = async () => {
    await fetch(`/api/test-cases/${tc.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requestId,
        name: tc.name,
        description: tc.description,
        assertions: JSON.stringify(assertions),
        sortOrder: tc.sort_order,
      }),
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <h2 className="text-sm font-semibold">{tc.name}</h2>
        <span className="text-xs text-muted-foreground">→</span>
        <select
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          onBlur={saveRequestBinding}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs"
        >
          {requests.map((r) => (
            <option key={r.id} value={r.id}>
              [{r.method}] {r.name}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={() => onSaveAssertions(tc, assertions)}>
          Save assertions
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {assertions.map((a, i) => (
          <AssertionRow
            key={i}
            assertion={a}
            onChange={(p) => update(i, p)}
            onRemove={() => remove(i)}
          />
        ))}
        <div className="flex flex-wrap gap-1">
          {(['status', 'latency', 'header', 'jsonpath', 'schema', 'script'] as const).map((t) => (
            <Button key={t} variant="outline" size="sm" onClick={() => append(t)}>
              + {t}
            </Button>
          ))}
        </div>
      </div>

      {runResult && (
        <div className="border-t p-3 text-xs" data-testid="run-result">
          <div className="mb-1 flex items-center gap-2">
            <Badge
              variant={
                runResult.status === 'passed'
                  ? 'success'
                  : runResult.status === 'running'
                    ? 'secondary'
                    : 'danger'
              }
            >
              {runResult.status}
            </Badge>
            {runResult.response && (
              <span className="text-muted-foreground">
                {runResult.response.status} · {runResult.response.latencyMs}ms ·{' '}
                {runResult.response.size}B
              </span>
            )}
            {runResult.error && <span className="text-destructive">{runResult.error}</span>}
          </div>
          {runResult.assertionsResult && runResult.assertionsResult.length > 0 && (
            <ul className="space-y-0.5">
              {runResult.assertionsResult.map((a, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={a.passed ? 'text-emerald-600' : 'text-rose-600'}>
                    {a.passed ? '✓' : '✕'}
                  </span>
                  <span className="text-muted-foreground">[{a.type}]</span>
                  <span>{a.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function AssertionRow({
  assertion,
  onChange,
  onRemove,
}: {
  assertion: Assertion;
  onChange: (patch: Partial<Assertion>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono uppercase">
          {assertion.type}
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          aria-label="Remove assertion"
          className="ml-auto h-6 w-6"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <AssertionFields assertion={assertion} onChange={onChange} />
    </div>
  );
}

function AssertionFields({
  assertion,
  onChange,
}: {
  assertion: Assertion;
  onChange: (patch: Partial<Assertion>) => void;
}) {
  switch (assertion.type) {
    case 'status':
      return (
        <Input
          value={String(assertion.expected ?? 200)}
          onChange={(e) => onChange({ expected: Number(e.target.value) || 0 })}
          placeholder="200"
        />
      );
    case 'latency':
      return (
        <Input
          value={String(assertion.maxMs ?? 1000)}
          onChange={(e) => onChange({ maxMs: Number(e.target.value) || 0 })}
          placeholder="max ms"
        />
      );
    case 'header':
      return (
        <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-1">
          <Input
            value={String(assertion.name ?? '')}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Header-Name"
          />
          <select
            value={String(assertion.match ?? 'equals')}
            onChange={(e) => onChange({ match: e.target.value })}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="equals">equals</option>
            <option value="contains">contains</option>
            <option value="regex">regex</option>
          </select>
          <Input
            value={String(assertion.value ?? '')}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="value"
          />
          <label className="flex items-center gap-1 text-[10px]">
            <input
              type="checkbox"
              checked={Boolean(assertion.ignoreCase)}
              onChange={(e) => onChange({ ignoreCase: e.target.checked })}
            />
            i
          </label>
        </div>
      );
    case 'jsonpath':
      return (
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-1">
          <Input
            value={String(assertion.path ?? '$')}
            onChange={(e) => onChange({ path: e.target.value })}
            placeholder="$.user.id"
          />
          <select
            value={String(assertion.op ?? 'equals')}
            onChange={(e) => onChange({ op: e.target.value })}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {['equals', 'notEquals', 'contains', 'regex', 'exists', 'notExists'].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <Input
            value={String(assertion.value ?? '')}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="expected"
          />
        </div>
      );
    case 'schema':
      return (
        <Textarea
          value={JSON.stringify(assertion.schema ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ schema: JSON.parse(e.target.value) });
            } catch {
              /* keep typing */
            }
          }}
          placeholder="JSON schema object"
          className="min-h-[100px]"
        />
      );
    case 'script':
      return (
        <Textarea
          value={String(assertion.source ?? '')}
          onChange={(e) => onChange({ source: e.target.value })}
          placeholder="// has access to: status, headers, body, json"
          className="min-h-[100px]"
        />
      );
    default:
      return null;
  }
}

function defaultAssertion(type: Assertion['type']): Assertion {
  switch (type) {
    case 'status':
      return { type, expected: 200 };
    case 'latency':
      return { type, maxMs: 1000 };
    case 'header':
      return { type, name: '', match: 'equals', value: '', ignoreCase: false };
    case 'jsonpath':
      return { type, path: '$', op: 'equals', value: '' };
    case 'schema':
      return { type, schema: {} };
    case 'script':
      return { type, source: '// return true to pass' };
  }
}

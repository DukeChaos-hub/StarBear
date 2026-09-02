'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Plus, Server, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils/cn';

interface MockServer {
  id: string;
  name: string;
  description: string | null;
  base_path: string;
  status: string;
  created_at: number;
  updated_at: number;
}

interface MockResponse {
  id: string;
  server_id: string;
  method: string;
  path_pattern: string;
  status: number;
  headers: string | null;
  body: string | null;
  delay_ms: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
type Method = (typeof METHODS)[number];

interface TestResult {
  ok: boolean;
  status: number;
  body: string;
  headers: Record<string, string>;
}

export default function MocksPage() {
  const [servers, setServers] = useState<MockServer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [responses, setResponses] = useState<MockResponse[]>([]);
  const [newName, setNewName] = useState('');
  const [newBase, setNewBase] = useState('/');
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const refresh = useCallback(async () => {
    const list: MockServer[] = await fetch('/api/mock-servers').then((r) => r.json());
    setServers(list);
    if (list.length > 0 && !selectedId) setSelectedId(list[0]!.id);
  }, [selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setResponses([]);
      return;
    }
    fetch(`/api/mock-servers/${selectedId}/responses`)
      .then((r) => r.json())
      .then(setResponses);
  }, [selectedId]);

  const createServer = async () => {
    if (!newName || !newBase) return;
    setBusy(true);
    const res = await fetch('/api/mock-servers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName, basePath: newBase }),
    });
    setBusy(false);
    if (res.ok) {
      setNewName('');
      setNewBase('/');
      await refresh();
    }
  };

  const deleteServer = async (id: string) => {
    await fetch(`/api/mock-servers/${id}`, { method: 'DELETE' });
    if (selectedId === id) setSelectedId(null);
    await refresh();
  };

  const deleteResponse = async (rid: string) => {
    if (!selectedId) return;
    await fetch(`/api/mock-servers/${selectedId}/responses/${rid}`, { method: 'DELETE' });
    setResponses((r) => r.filter((x) => x.id !== rid));
  };

  const selected = servers.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="flex w-72 flex-col border-r bg-muted/30">
        <div className="border-b p-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Mock servers</p>
          <div className="space-y-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Server name"
            />
            <div className="flex gap-1">
              <Input
                value={newBase}
                onChange={(e) => setNewBase(e.target.value)}
                placeholder="/base/path"
                className="font-mono"
                onKeyDown={(e) => e.key === 'Enter' && void createServer()}
              />
              <Button
                size="icon"
                onClick={createServer}
                disabled={busy || !newName || !newBase}
                aria-label="Create"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {servers.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">No mock servers yet.</p>
          )}
          {servers.map((s) => (
            <div
              key={s.id}
              className={cn(
                'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60',
                selectedId === s.id && 'bg-accent',
              )}
            >
              <button onClick={() => setSelectedId(s.id)} className="flex-1 truncate text-left">
                <div className="flex items-center gap-1">
                  <Server className="h-3 w-3 shrink-0" />
                  <span className="truncate font-medium">{s.name}</span>
                </div>
                <div className="ml-4 truncate font-mono text-[10px] text-muted-foreground">
                  {s.base_path}
                </div>
              </button>
              <Badge
                variant={s.status === 'active' ? 'success' : 'secondary'}
                className="px-1 py-0 text-[10px]"
              >
                {s.status}
              </Badge>
              <ConfirmDialog
                title="Delete mock server?"
                description={`"${s.name}" and all its responses will be permanently removed.`}
                onConfirm={() => deleteServer(s.id)}
                trigger={(open) => (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={open}
                    aria-label="Delete server"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              />
            </div>
          ))}
        </div>
      </aside>

      <section className="flex flex-1 flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <h2 className="text-sm font-semibold">{selected.name}</h2>
              <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                {selected.base_path}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const url = `${window.location.origin}/api/mock/${selected.id}`;
                  void navigator.clipboard.writeText(url);
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy base URL
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {responses.length} response{responses.length === 1 ? '' : 's'}
              </span>
            </div>

            <TestRow serverId={selected.id} result={testResult} onResult={setTestResult} />

            <div className="flex-1 overflow-auto p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Responses
              </h3>
              {responses.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No responses configured. Add one below to start mocking this server.
                </p>
              )}
              {responses.map((r) => (
                <ResponseCard key={r.id} response={r} onDelete={() => void deleteResponse(r.id)} />
              ))}
            </div>

            <div className="border-t p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Add response
              </h3>
              <NewResponseForm
                serverId={selected.id}
                onCreated={() => {
                  fetch(`/api/mock-servers/${selected.id}/responses`)
                    .then((r) => r.json())
                    .then(setResponses);
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a mock server on the left, or create one to get started.
          </div>
        )}
      </section>
    </div>
  );
}

function ResponseCard({ response, onDelete }: { response: MockResponse; onDelete: () => void }) {
  return (
    <div className="mb-2 rounded-md border bg-card p-2">
      <div className="flex items-center gap-2">
        <Badge variant={methodColor(response.method)} className="px-1.5 text-[10px]">
          {response.method}
        </Badge>
        <code className="flex-1 truncate font-mono text-xs">{response.path_pattern}</code>
        <Badge variant="secondary" className="px-1.5 text-[10px]">
          {response.status}
        </Badge>
        {response.delay_ms > 0 && (
          <span className="text-[10px] text-muted-foreground">{response.delay_ms}ms</span>
        )}
        <ConfirmDialog
          title="Delete response?"
          description={`${response.method} ${response.path_pattern} will be removed.`}
          onConfirm={onDelete}
          trigger={(open) => (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={open}
              aria-label="Delete response"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        />
      </div>
      {response.body && (
        <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted/50 p-1.5 font-mono text-[10px]">
          {response.body}
        </pre>
      )}
    </div>
  );
}

function NewResponseForm({ serverId, onCreated }: { serverId: string; onCreated: () => void }) {
  const [method, setMethod] = useState<Method>('GET');
  const [path, setPath] = useState('/');
  const [status, setStatus] = useState(200);
  const [body, setBody] = useState('');
  const [headers, setHeaders] = useState('');
  const [delay, setDelay] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/mock-servers/${serverId}/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method,
        pathPattern: path,
        status,
        body: body || null,
        headers: headers || null,
        delayMs: delay,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? `HTTP ${res.status}`);
      return;
    }
    setPath('/');
    setBody('');
    setHeaders('');
    setDelay(0);
    onCreated();
  };

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[100px_1fr_80px_80px] gap-1.5">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <Input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/path/pattern (use * for wildcard)"
          className="font-mono"
        />
        <Input
          type="number"
          value={status}
          onChange={(e) => setStatus(Number(e.target.value) || 200)}
          placeholder="status"
        />
        <Input
          type="number"
          value={delay}
          onChange={(e) => setDelay(Number(e.target.value) || 0)}
          placeholder="delay ms"
        />
      </div>
      <Textarea
        value={headers}
        onChange={(e) => setHeaders(e.target.value)}
        placeholder='Response headers as JSON, e.g. {"content-type":"application/json"}'
        className="min-h-[40px] text-xs"
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Response body (supports {{var}} interpolation)"
        className="min-h-[60px] text-xs"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={submit} disabled={busy || !path}>
          <Plus className="h-3.5 w-3.5" /> Add response
        </Button>
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>
    </div>
  );
}

function TestRow({
  serverId,
  result,
  onResult,
}: {
  serverId: string;
  result: TestResult | null;
  onResult: (r: TestResult | null) => void;
}) {
  const [path, setPath] = useState('/');
  const [method, setMethod] = useState<Method>('GET');
  const [busy, setBusy] = useState(false);

  const fire = async () => {
    setBusy(true);
    onResult(null);
    try {
      const res = await fetch(`/api/mock/${serverId}${path}`, { method });
      const body = await res.text();
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headers[k] = v;
      });
      onResult({ ok: res.ok, status: res.status, body, headers });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b bg-muted/20 px-3 py-2">
      <div className="mb-1 flex items-center gap-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Test</p>
        <span className="text-[10px] text-muted-foreground">
          Fires a real request to the mock dispatcher.
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <Input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/sample/path"
          className="h-7 flex-1 font-mono text-xs"
        />
        <Button size="sm" onClick={fire} disabled={busy}>
          {busy ? 'Sending…' : 'Send'}
        </Button>
      </div>
      {result && (
        <div className="mt-1.5 rounded border bg-background p-1.5 text-[10px]">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant={result.ok ? 'success' : 'danger'} className="px-1.5 text-[10px]">
              {result.status}
            </Badge>
            <span className="text-muted-foreground">
              {Object.keys(result.headers).length} headers
            </span>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono">
            {result.body || '(empty body)'}
          </pre>
        </div>
      )}
    </div>
  );
}

function methodColor(method: string): 'success' | 'secondary' | 'warning' | 'danger' | 'default' {
  switch (method) {
    case 'GET':
      return 'success';
    case 'POST':
      return 'default';
    case 'PUT':
      return 'warning';
    case 'PATCH':
      return 'secondary';
    case 'DELETE':
      return 'danger';
    default:
      return 'secondary';
  }
}

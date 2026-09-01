'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils/cn';

export type ResponseState =
  | { kind: 'loading' }
  | { kind: 'ok'; result: { status: number; statusText: string; latencyMs: number; size: number; body: string; bodyJson?: unknown; headers: Record<string, string> } }
  | { kind: 'error'; status: number; body: { error?: string; message?: string; reason?: string; name?: string } };

function statusVariant(status: number): 'success' | 'warning' | 'danger' | 'secondary' {
  if (status === 0) return 'danger';
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'warning';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500) return 'danger';
  return 'secondary';
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function formatJson(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function ResponseViewer({ state }: { state: ResponseState | null }) {
  if (!state) {
    return (
      <div
        className="flex h-32 items-center justify-center border-t text-xs text-muted-foreground"
        data-testid="response-empty"
      >
        Send a request to see the response.
      </div>
    );
  }
  if (state.kind === 'loading') {
    return (
      <div className="flex h-32 items-center justify-center gap-2 border-t text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Sending…
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div className="border-t p-3" data-testid="response-error">
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(state.status)}>ERR {state.status || '—'}</Badge>
          <span className="text-sm font-medium">{state.body.error ?? 'error'}</span>
        </div>
        {state.body.message && (
          <p className="mt-1 text-xs text-muted-foreground">{state.body.message}</p>
        )}
        {state.body.reason && (
          <p className="mt-1 text-xs text-muted-foreground">SSRF: {state.body.reason}</p>
        )}
        {state.body.name && (
          <p className="mt-1 text-xs text-muted-foreground">Unresolved variable: {state.body.name}</p>
        )}
      </div>
    );
  }
  const r = state.result;
  return (
    <div className="flex h-1/2 min-h-[200px] flex-col border-t" data-testid="response-ok">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-3 py-2 text-xs">
        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
        <span className="font-mono">{r.statusText}</span>
        <span className="text-muted-foreground">⏱ {r.latencyMs} ms</span>
        <span className="text-muted-foreground">⛁ {formatBytes(r.size)}</span>
      </div>
      <Tabs defaultValue="body" className="flex-1 overflow-hidden">
        <TabsList className="rounded-none">
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="headers">Headers ({Object.keys(r.headers).length})</TabsTrigger>
        </TabsList>
        <TabsContent value="body" className="bg-muted/10 p-0">
          <BodyPretty body={r.body} />
        </TabsContent>
        <TabsContent value="headers" className="p-0">
          <HeadersList headers={r.headers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BodyPretty({ body }: { body: string }) {
  const [mode, setMode] = useState<'pretty' | 'raw' | 'preview'>(
    body.trim().startsWith('{') || body.trim().startsWith('[') ? 'pretty' : 'raw',
  );
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b bg-background px-2 py-1 text-[10px]">
        {(['pretty', 'raw', 'preview'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded px-2 py-0.5 uppercase',
              mode === m ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60',
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <pre className="flex-1 overflow-auto bg-muted/10 p-3 font-mono text-xs leading-relaxed">
        {mode === 'pretty' ? formatJson(body) : body}
      </pre>
    </div>
  );
}

function HeadersList({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    return <p className="p-3 text-xs text-muted-foreground">No response headers.</p>;
  }
  return (
    <table className="w-full text-xs">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} className="border-b last:border-0">
            <td className="w-1/3 px-3 py-1.5 font-mono text-muted-foreground">{k}</td>
            <td className="px-3 py-1.5 font-mono break-all">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

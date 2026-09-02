'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileUp, Loader2, Upload, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Collection {
  id: string;
  name: string;
  description: string | null;
}

interface ParsedRequest {
  name: string;
  method: string;
  url: string;
}

interface Preview {
  info: { title: string; version: string; description: string | null };
  baseUrl: string;
  requests: ParsedRequest[];
  warnings: string[];
}

interface ApplyResult {
  collectionId: string;
  created: number;
  requestIds: string[];
  title: string;
  version: string;
}

const SAMPLE = `{
  "openapi": "3.0.3",
  "info": { "title": "Pet Store", "version": "1.0.0" },
  "servers": [{ "url": "https://api.example.com/v1" }],
  "paths": {
    "/pets": {
      "get": { "summary": "List pets" },
      "post": { "summary": "Create pet" }
    },
    "/pets/{id}": {
      "get": { "summary": "Get pet" }
    }
  }
}`;

export default function ImportPage() {
  const router = useRouter();
  const [spec, setSpec] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [collectionId, setCollectionId] = useState<string>('');
  const [newName, setNewName] = useState('Imported API');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);

  useEffect(() => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((rows: Collection[]) => {
        setCollections(rows);
        if (rows.length > 0) setCollectionId(rows[0]!.id);
      });
  }, []);

  const doPreview = async () => {
    setBusy('preview');
    setParseErr(null);
    setPreview(null);
    setResult(null);
    try {
      const res = await fetch('/api/import/openapi/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setParseErr(`${j.error ?? 'error'}: ${j.message ?? j.hint ?? ''}`);
        return;
      }
      setPreview((await res.json()) as Preview);
    } finally {
      setBusy(null);
    }
  };

  const doApply = async () => {
    setBusy('apply');
    try {
      const body =
        mode === 'existing' ? { spec, collectionId } : { spec, newCollectionName: newName };
      const res = await fetch('/api/import/openapi/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setParseErr(`${j.error ?? 'error'}: ${j.message ?? j.hint ?? ''}`);
        return;
      }
      setResult((await res.json()) as ApplyResult);
    } finally {
      setBusy(null);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-lg border bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-3 text-lg font-semibold">Imported {result.created} requests</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.title} {result.version}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => router.push('/workspace/tests')}>
              Open Tests (to add assertions)
            </Button>
            <Button variant="outline" onClick={() => router.push('/workspace')}>
              Back to Workspace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <FileUp className="h-5 w-5" /> Import OpenAPI spec
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste an OpenAPI 3.x spec (JSON or YAML) to bulk-create a collection of requests. Each
          path × method becomes one request. The <code>{'{{var}}'}</code> syntax in the spec is
          preserved so the active environment can interpolate.
        </p>
      </header>

      <Textarea
        value={spec}
        onChange={(e) => setSpec(e.target.value)}
        placeholder={SAMPLE}
        className="min-h-[260px] font-mono text-xs"
      />
      <div className="flex items-center gap-2">
        <Button onClick={doPreview} disabled={!spec.trim() || busy === 'preview'}>
          {busy === 'preview' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Preview
        </Button>
        <Button variant="ghost" onClick={() => setSpec(SAMPLE)}>
          Load sample
        </Button>
        <Button variant="ghost" onClick={() => setSpec('')}>
          Clear
        </Button>
      </div>

      {parseErr && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Parse failed</div>
            <div className="text-xs">{parseErr}</div>
          </div>
        </div>
      )}

      {preview && (
        <div className="space-y-3 rounded-md border bg-card p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">{preview.info.title}</h3>
            <Badge variant="secondary" className="text-[10px]">
              {preview.info.version}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              base URL: <code className="font-mono">{preview.baseUrl || '(relative)'}</code>
            </span>
          </div>
          {preview.info.description && (
            <p className="text-xs text-muted-foreground">{preview.info.description}</p>
          )}
          <p className="text-xs">
            {preview.requests.length} request{preview.requests.length === 1 ? '' : 's'} will be
            created.
          </p>
          {preview.warnings.length > 0 && (
            <ul className="space-y-0.5 text-[11px] text-amber-700 dark:text-amber-400">
              {preview.warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}
          <div className="max-h-48 overflow-auto rounded border bg-muted/30 p-2 text-[11px] font-mono">
            {preview.requests.map((r, i) => (
              <div key={i} className="flex gap-2">
                <span className="w-12 text-right text-muted-foreground">{r.method}</span>
                <span className="flex-1 truncate">{r.name}</span>
                <span className="hidden truncate text-muted-foreground md:block">{r.url}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium">Target collection</p>
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1">
                <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} />
                Create new
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={mode === 'existing'}
                  onChange={() => setMode('existing')}
                  disabled={collections.length === 0}
                />
                Add to existing
              </label>
            </div>
            {mode === 'new' ? (
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name"
              />
            ) : (
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <Button onClick={doApply} disabled={busy === 'apply' || preview.requests.length === 0}>
              {busy === 'apply' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Upload className="h-3.5 w-3.5" /> Import {preview.requests.length} request
              {preview.requests.length === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

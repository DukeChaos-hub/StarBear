'use client';

import { useState } from 'react';
import { Play, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { MethodSelect, HTTP_METHODS, type HttpMethodChoice } from './method-select';
import { KvTable, type KeyValueRow } from './kv-table';
import { SaveDialog } from './save-dialog';
import { ResponseViewer, type ResponseState } from '@/components/response-viewer/response-viewer';

type BodyKind = 'none' | 'json' | 'form' | 'raw';
type AuthKind = 'none' | 'bearer' | 'basic' | 'apikey';

interface AuthState {
  kind: AuthKind;
  token: string;
  username: string;
  password: string;
  apiKeyName: string;
  apiKeyIn: 'header' | 'query';
}

export interface RequestEditorProps {
  initialMethod?: HttpMethodChoice;
  initialUrl?: string;
  initialBody?: string;
  initialBodyKind?: BodyKind;
  initialHeaders?: KeyValueRow[];
  initialQuery?: KeyValueRow[];
  initialAuth?: AuthState;
}

const DEFAULT_AUTH: AuthState = {
  kind: 'none',
  token: '',
  username: '',
  password: '',
  apiKeyName: '',
  apiKeyIn: 'header',
};

export function RequestEditor(props: RequestEditorProps) {
  const [method, setMethod] = useState<HttpMethodChoice>(props.initialMethod ?? 'GET');
  const [url, setUrl] = useState(props.initialUrl ?? 'https://httpbin.org/get');
  const [headers, setHeaders] = useState<KeyValueRow[]>(props.initialHeaders ?? []);
  const [query, setQuery] = useState<KeyValueRow[]>(props.initialQuery ?? []);
  const [bodyKind, setBodyKind] = useState<BodyKind>(props.initialBodyKind ?? 'none');
  const [body, setBody] = useState(props.initialBody ?? '');
  const [auth, setAuth] = useState<AuthState>(props.initialAuth ?? DEFAULT_AUTH);

  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [tab, setTab] = useState('params');
  const [saveOpen, setSaveOpen] = useState(false);

  const send = async () => {
    setSending(true);
    setResponse({ kind: 'loading' });
    try {
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          method,
          url,
          headers,
          query,
          body: bodyKind === 'none' ? undefined : body,
          auth: auth.kind === 'none' ? undefined : auth,
          vars: {},
          ssrfMode: 'allow-local', // dev default — server should be running on local
          timeoutMs: 30_000,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResponse({ kind: 'error', status: res.status, body: json });
        return;
      }
      setResponse({ kind: 'ok', result: json });
    } catch (e) {
      setResponse({
        kind: 'error',
        status: 0,
        body: { error: 'network', message: (e as Error).message },
      });
    } finally {
      setSending(false);
    }
  };

  const updateAuth = (patch: Partial<AuthState>) => setAuth((a) => ({ ...a, ...patch }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* URL bar */}
      <div className="flex items-center gap-2 border-b bg-background px-3 py-2">
        <MethodSelect value={method} onChange={setMethod} />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/v1/{{path}}"
          className="flex-1 font-mono"
          aria-label="Request URL"
        />
        <Button onClick={send} disabled={sending || !url} className="min-w-[80px]">
          <Play className="h-3.5 w-3.5" /> {sending ? 'Sending…' : 'Send'}
        </Button>
        <Button variant="outline" onClick={() => setSaveOpen(true)} disabled={!url}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </div>

      {/* Request tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden">
        <TabsList className="rounded-none">
          <TabsTrigger value="params">Params ({query.length})</TabsTrigger>
          <TabsTrigger value="headers">Headers ({headers.length})</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="auth">Auth</TabsTrigger>
        </TabsList>
        <TabsContent value="params" className="space-y-2">
          <KvTable
            rows={query}
            onChange={setQuery}
            keyPlaceholder="param"
            valuePlaceholder="value"
            testId="query-table"
          />
        </TabsContent>
        <TabsContent value="headers" className="space-y-2">
          <KvTable
            rows={headers}
            onChange={setHeaders}
            keyPlaceholder="Header-Name"
            valuePlaceholder="value"
            testId="headers-table"
          />
        </TabsContent>
        <TabsContent value="body" className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Kind</label>
            <select
              value={bodyKind}
              onChange={(e) => setBodyKind(e.target.value as BodyKind)}
              className="h-7 rounded border border-input bg-background px-2 text-xs"
            >
              <option value="none">none</option>
              <option value="json">json</option>
              <option value="form">form-urlencoded</option>
              <option value="raw">raw</option>
            </select>
          </div>
          {bodyKind !== 'none' && (
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={bodyKind === 'json' ? '{\n  "key": "value"\n}' : 'key=value&foo=bar'}
              className="min-h-[200px]"
              aria-label="Request body"
            />
          )}
        </TabsContent>
        <TabsContent value="auth" className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Type</label>
            <select
              value={auth.kind}
              onChange={(e) => updateAuth({ kind: e.target.value as AuthKind })}
              className="h-7 rounded border border-input bg-background px-2 text-xs"
            >
              <option value="none">No Auth</option>
              <option value="bearer">Bearer</option>
              <option value="basic">Basic</option>
              <option value="apikey">API Key</option>
            </select>
          </div>
          {auth.kind === 'bearer' && (
            <Input
              value={auth.token}
              onChange={(e) => updateAuth({ token: e.target.value })}
              placeholder="Token"
              className="font-mono"
            />
          )}
          {auth.kind === 'basic' && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={auth.username}
                onChange={(e) => updateAuth({ username: e.target.value })}
                placeholder="username"
              />
              <Input
                type="password"
                value={auth.password}
                onChange={(e) => updateAuth({ password: e.target.value })}
                placeholder="password"
              />
            </div>
          )}
          {auth.kind === 'apikey' && (
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                value={auth.apiKeyName}
                onChange={(e) => updateAuth({ apiKeyName: e.target.value })}
                placeholder="X-Api-Key"
              />
              <Input
                value={auth.token}
                onChange={(e) => updateAuth({ token: e.target.value })}
                placeholder="value"
                className="font-mono"
              />
              <select
                value={auth.apiKeyIn}
                onChange={(e) => updateAuth({ apiKeyIn: e.target.value as 'header' | 'query' })}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="header">in header</option>
                <option value="query">in query</option>
              </select>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SaveDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        method={method}
        url={url}
        headers={headers}
        query={query}
        bodyKind={bodyKind}
        body={body}
        auth={auth}
      />

      <ResponseViewer state={response} />
    </div>
  );
}

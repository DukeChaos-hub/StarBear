'use client';

import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Key, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

const PROVIDERS = ['openai', 'anthropic', 'google', 'deepseek'] as const;
type Provider = (typeof PROVIDERS)[number];

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-latest',
  google: 'gemini-1.5-pro',
  deepseek: 'deepseek-chat',
};

const DEFAULT_BASE_URLS: Record<Provider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com',
  deepseek: 'https://api.deepseek.com',
};

interface AiSettingsResponse {
  activeProvider: string | null;
  modelByProvider: Record<string, string>;
  baseUrlByProvider: Record<string, string>;
  keySetByProvider: Record<string, boolean>;
}

export default function SettingsPage() {
  const [active, setActive] = useState<Provider | ''>('');
  const [models, setModels] = useState<Record<string, string>>({ ...DEFAULT_MODELS });
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(
    Object.fromEntries(PROVIDERS.map((p) => [p, ''])),
  );
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({ ...DEFAULT_BASE_URLS });
  const [keySet, setKeySet] = useState<Record<string, boolean>>(
    Object.fromEntries(PROVIDERS.map((p) => [p, false])),
  );
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/settings/ai')
      .then((r) => r.json())
      .then((d: AiSettingsResponse) => {
        setActive((d.activeProvider as Provider) ?? '');
        setModels({ ...DEFAULT_MODELS, ...d.modelByProvider });
        setBaseUrls({ ...DEFAULT_BASE_URLS, ...d.baseUrlByProvider });
        setKeySet({ ...keySet, ...d.keySetByProvider });
        setLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/settings/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        activeProvider: active || null,
        models,
        apiKeys,
        baseUrls,
      }),
    });
    if (res.ok) {
      // Re-fetch to refresh "keySet" booleans.
      const after = (await (await fetch('/api/settings/ai')).json()) as AiSettingsResponse;
      setKeySet(after.keySetByProvider);
      // Clear the local API key inputs (server has them now).
      setApiKeys(Object.fromEntries(PROVIDERS.map((p) => [p, ''])));
      setMsg({ kind: 'ok', text: 'Saved.' });
    } else {
      const err = await res.json().catch(() => ({}));
      setMsg({ kind: 'err', text: err.error ?? 'Save failed.' });
    }
    setBusy(false);
  }

  async function clearKey(p: Provider) {
    setApiKeys((prev) => ({ ...prev, [p]: '' }));
    // Persist the empty string immediately so the server removes it.
    const res = await fetch('/api/settings/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        activeProvider: active || null,
        models,
        apiKeys: { [p]: '' },
        baseUrls,
      }),
    });
    if (res.ok) {
      setKeySet((s) => ({ ...s, [p]: false }));
      setMsg({ kind: 'ok', text: `${p} key cleared.` });
    } else {
      setMsg({ kind: 'err', text: 'Clear failed.' });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          AI provider keys are encrypted at rest (AES-256-GCM) with the server master key
          (<code>STARBEAR_MASTER_KEY</code>). Plaintext keys are never returned to the client.
        </p>
      </div>

      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-semibold">Active provider</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={active || 'none'}
            onChange={(e) => setActive(e.target.value === 'none' ? '' : (e.target.value as Provider))}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            disabled={!loaded}
          >
            <option value="none">(none)</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {active && <Badge variant="secondary">using {models[active] ?? DEFAULT_MODELS[active]}</Badge>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Providers</h2>
        {PROVIDERS.map((p) => {
          const isActive = active === p;
          const configured = keySet[p] === true;
          return (
            <div
              key={p}
              className={cn(
                'rounded-md border bg-card p-4 transition-colors',
                isActive && 'border-primary/40 bg-primary/5',
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold">{p}</span>
                {isActive && <Badge variant="default">active</Badge>}
                {configured ? (
                  <Badge variant="success">
                    <Key className="mr-1 h-2.5 w-2.5" /> key set
                  </Badge>
                ) : (
                  <Badge variant="outline">no key</Badge>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] uppercase text-muted-foreground">Model</label>
                  <Input
                    value={models[p] ?? DEFAULT_MODELS[p]}
                    onChange={(e) => setModels({ ...models, [p]: e.target.value })}
                    placeholder={DEFAULT_MODELS[p]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase text-muted-foreground">Base URL</label>
                  <Input
                    value={baseUrls[p] ?? DEFAULT_BASE_URLS[p]}
                    onChange={(e) => setBaseUrls({ ...baseUrls, [p]: e.target.value })}
                    placeholder={DEFAULT_BASE_URLS[p]}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="mb-1 block text-[10px] uppercase text-muted-foreground">API key</label>
                <ApiKeyField
                  value={apiKeys[p] ?? ''}
                  configured={configured}
                  onChange={(v) => setApiKeys({ ...apiKeys, [p]: v })}
                  onClear={() => void clearKey(p)}
                />
              </div>
            </div>
          );
        })}
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {busy ? 'Saving…' : 'Save all'}
        </Button>
        {msg && (
          <span
            className={cn('text-xs', msg.kind === 'ok' ? 'text-emerald-600' : 'text-destructive')}
          >
            {msg.kind === 'ok' && <Check className="mr-1 inline h-3 w-3" />}
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

function ApiKeyField({
  value,
  configured,
  onChange,
  onClear,
}: {
  value: string;
  configured: boolean;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const [reveal, setReveal] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <div className="relative flex-1">
        <Input
          type={reveal ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={configured ? '••••••••  (leave blank to keep)' : 'paste key here'}
          className="pr-9 font-mono"
        />
        <button
          type="button"
          aria-label={reveal ? 'Hide' : 'Reveal'}
          onClick={() => setReveal((r) => !r)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {configured && (
        <Button variant="outline" size="sm" onClick={onClear} type="button">
          Clear
        </Button>
      )}
    </div>
  );
}

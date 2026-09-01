'use client';
import { useEffect, useState } from 'react';

interface AiSettings {
  activeProvider: string | null;
  modelByProvider: Record<string, string>;
}

const PROVIDERS = ['openai', 'anthropic', 'google', 'deepseek'] as const;
type Provider = (typeof PROVIDERS)[number];
const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-latest',
  google: 'gemini-1.5-pro',
  deepseek: 'deepseek-chat',
};

export default function SettingsPage() {
  const [active, setActive] = useState<Provider | ''>('');
  const [models, setModels] = useState<Record<string, string>>({ ...DEFAULT_MODELS });
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(
    Object.fromEntries(PROVIDERS.map((p) => [p, ''])),
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/settings/ai')
      .then((r) => r.json())
      .then((d: AiSettings) => {
        setActive((d.activeProvider as Provider) ?? '');
        setModels({ ...DEFAULT_MODELS, ...d.modelByProvider });
      });
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    const body = { activeProvider: active || null, models, apiKeys, baseUrls: {} };
    const res = await fetch('/api/settings/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setMsg(res.ok ? 'Saved.' : 'Save failed.');
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-sm font-semibold">AI Provider</h2>
        <div>
          <label className="text-sm">Active provider</label>
          <select
            value={active || 'none'}
            onChange={(e) => setActive(e.target.value === 'none' ? '' : (e.target.value as Provider))}
            className="ml-2 rounded border bg-background px-2 py-1 text-sm"
          >
            <option value="none">(none)</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {PROVIDERS.map((p) => (
          <div key={p} className="grid grid-cols-[100px_1fr_1fr] items-center gap-2">
            <span className="text-sm font-medium">{p}</span>
            <input
              className="rounded border bg-background px-2 py-1 text-sm"
              placeholder="Model"
              value={models[p] ?? DEFAULT_MODELS[p]}
              onChange={(e) => setModels({ ...models, [p]: e.target.value })}
            />
            <input
              type="password"
              className="rounded border bg-background px-2 py-1 text-sm"
              placeholder="API key"
              value={apiKeys[p] ?? ''}
              onChange={(e) => setApiKeys({ ...apiKeys, [p]: e.target.value })}
            />
          </div>
        ))}
        <button
          onClick={save}
          disabled={busy}
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        {msg && <div className="text-sm text-muted-foreground">{msg}</div>}
      </section>
    </div>
  );
}

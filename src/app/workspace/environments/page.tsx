'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Plus, Star, StarOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

interface Environment {
  id: string;
  name: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

interface EnvVariable {
  id: string;
  env_id: string;
  key: string;
  value: string;
  is_secret: number;
  sort_order: number;
}

export default function EnvironmentsPage() {
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vars, setVars] = useState<EnvVariable[]>([]);
  const [newEnvName, setNewEnvName] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshEnvs = useCallback(async () => {
    const rows: Environment[] = await fetch('/api/environments').then((r) => r.json());
    setEnvs(rows);
    if (rows.length > 0 && !selectedId) {
      const active = rows.find((e) => e.is_active === 1) ?? rows[0]!;
      setSelectedId(active.id);
    }
  }, [selectedId]);

  useEffect(() => {
    void refreshEnvs();
  }, [refreshEnvs]);

  useEffect(() => {
    if (!selectedId) {
      setVars([]);
      return;
    }
    fetch(`/api/env-variables?envId=${selectedId}`)
      .then((r) => r.json())
      .then(setVars);
  }, [selectedId]);

  const createEnv = async () => {
    if (!newEnvName) return;
    setBusy(true);
    await fetch('/api/environments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newEnvName }),
    });
    setNewEnvName('');
    await refreshEnvs();
    setBusy(false);
  };

  const activate = async (id: string) => {
    await fetch(`/api/environments/${id}/activate`, { method: 'POST' });
    await refreshEnvs();
  };

  const addVar = async () => {
    if (!selectedId) return;
    const res = await fetch('/api/env-variables', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ envId: selectedId, key: '', value: '', isSecret: false, sortOrder: vars.length }),
    });
    const { id } = await res.json();
    setVars((v) => [...v, { id, env_id: selectedId, key: '', value: '', is_secret: 0, sort_order: v.length }]);
  };

  const saveVar = async (id: string, patch: Partial<EnvVariable>) => {
    setVars((v) => v.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    const v = vars.find((r) => r.id === id);
    if (!v) return;
    await fetch(`/api/env-variables/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        envId: v.env_id,
        key: patch.key ?? v.key,
        value: patch.value ?? v.value,
        isSecret: (patch.is_secret ?? v.is_secret) === 1,
        sortOrder: v.sort_order,
      }),
    });
  };

  const removeVar = async (id: string) => {
    await fetch(`/api/env-variables/${id}`, { method: 'DELETE' });
    setVars((v) => v.filter((r) => r.id !== id));
  };

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="flex w-64 flex-col border-r bg-muted/30">
        <div className="border-b p-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Environments</p>
          <div className="flex gap-1">
            <Input
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              placeholder="New env name"
              onKeyDown={(e) => e.key === 'Enter' && void createEnv()}
            />
            <Button size="icon" onClick={createEnv} disabled={busy || !newEnvName} aria-label="Create env">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {envs.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No environments yet.</p>}
          {envs.map((e) => (
            <div
              key={e.id}
              className={cn(
                'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60',
                selectedId === e.id && 'bg-accent',
              )}
            >
              <button onClick={() => setSelectedId(e.id)} className="flex-1 text-left">
                <span className="font-medium">{e.name}</span>
              </button>
              {e.is_active === 1 ? (
                <Badge variant="success" className="px-1 py-0 text-[10px]">active</Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => void activate(e.id)}
                  aria-label="Activate"
                >
                  <StarOff className="h-3 w-3" />
                </Button>
              )}
              {e.is_active === 1 && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
            </div>
          ))}
        </div>
      </aside>
      <section className="flex flex-1 flex-col overflow-hidden">
        {selectedId ? (
          <>
            <div className="flex items-center justify-between border-b px-3 py-2">
              <h2 className="text-sm font-semibold">
                Variables{' '}
                <span className="text-xs font-normal text-muted-foreground">({vars.length})</span>
              </h2>
              <Button size="sm" variant="outline" onClick={addVar}>
                <Plus className="h-3.5 w-3.5" /> Add variable
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <div className="mb-1 grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-1 px-1 text-[10px] uppercase text-muted-foreground">
                <span>Key</span>
                <span>Value</span>
                <span className="w-8">Secret</span>
                <span className="w-8">Save</span>
                <span className="w-8" />
              </div>
              {vars.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">No variables. Click Add variable.</p>
              )}
              {vars.map((v) => (
                <div
                  key={v.id}
                  className="mb-1 grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-1"
                >
                  <Input
                    value={v.key}
                    onChange={(e) => setVars((rows) => rows.map((r) => (r.id === v.id ? { ...r, key: e.target.value } : r)))}
                    onBlur={() => void saveVar(v.id, { key: v.key })}
                    placeholder="key"
                    className="font-mono"
                  />
                  <SecretInput
                    value={v.value}
                    isSecret={v.is_secret === 1}
                    onChange={(val) => setVars((rows) => rows.map((r) => (r.id === v.id ? { ...r, value: val } : r)))}
                    onBlur={() => void saveVar(v.id, { value: v.value })}
                  />
                  <input
                    type="checkbox"
                    checked={v.is_secret === 1}
                    onChange={(e) => void saveVar(v.id, { is_secret: e.target.checked ? 1 : 0 })}
                    className="h-4 w-4"
                    aria-label="Is secret"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void saveVar(v.id, {})}
                    aria-label="Save"
                    className="h-8 w-8"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void removeVar(v.id)}
                    aria-label="Delete"
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select an environment on the left.
          </div>
        )}
      </section>
    </div>
  );
}

function SecretInput({
  value,
  isSecret,
  onChange,
  onBlur,
}: {
  value: string;
  isSecret: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const [reveal, setReveal] = useState(false);
  if (isSecret && !reveal) {
    return (
      <div className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2">
        <span className="flex-1 font-mono text-sm">••••••••</span>
        <button type="button" onClick={() => setReveal(true)} aria-label="Reveal">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Input
        type={isSecret ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="value"
        className="font-mono"
      />
      {isSecret && (
        <button type="button" onClick={() => setReveal(false)} aria-label="Hide">
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

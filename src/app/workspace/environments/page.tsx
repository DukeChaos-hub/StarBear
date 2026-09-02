'use client';

import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Plus, Star, StarOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { useFetch, useApiCall } from '@/lib/hooks/use-fetch';

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
  const envs = useFetch<Environment[]>('/api/environments');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const vars = useFetch<EnvVariable[]>(
    selectedId ? `/api/env-variables?envId=${selectedId}` : null,
  );
  const [newEnvName, setNewEnvName] = useState('');
  const create = useApiCall('/api/environments', 'POST');
  const activate = useApiCall('/api/environments', 'POST');
  const addVar = useApiCall('/api/env-variables', 'POST');

  // Default to selecting the active env on first load.
  useEffect(() => {
    if (selectedId || !envs.data) return;
    const active = envs.data.find((e) => e.is_active === 1) ?? envs.data[0];
    if (active) setSelectedId(active.id);
  }, [envs.data, selectedId]);

  const createEnv = async () => {
    if (!newEnvName) return;
    const r = (await create.call({ body: { name: newEnvName } })) as { id: string } | null;
    if (r?.id) {
      setNewEnvName('');
      envs.refresh();
    }
  };

  const activateEnv = async (id: string) => {
    await activate.call({ url: `/api/environments/${id}/activate` });
    envs.refresh();
  };

  const addOneVar = async () => {
    if (!selectedId) return;
    await addVar.call({
      body: { envId: selectedId, key: '', value: '', isSecret: false, sortOrder: 0 },
    });
    vars.refresh();
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
            <Button
              size="icon"
              onClick={createEnv}
              disabled={create.busy || !newEnvName}
              aria-label="Create env"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {envs.data?.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">No environments yet.</p>
          )}
          {envs.data?.map((e) => (
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
                <Badge variant="success" className="px-1 py-0 text-[10px]">
                  active
                </Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => void activateEnv(e.id)}
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
                <span className="text-xs font-normal text-muted-foreground">
                  ({vars.data?.length ?? 0})
                </span>
              </h2>
              <Button size="sm" variant="outline" onClick={addOneVar}>
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
              {vars.data?.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  No variables. Click Add variable.
                </p>
              )}
              {vars.data?.map((v) => (
                <VariableRow
                  key={v.id}
                  v={v}
                  onSaved={() => vars.refresh()}
                  onDeleted={() => vars.refresh()}
                />
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

function VariableRow({
  v,
  onSaved,
  onDeleted,
}: {
  v: EnvVariable;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const save = useApiCall(`/api/env-variables/${v.id}`, 'PATCH');
  const del = useApiCall(`/api/env-variables/${v.id}`, 'DELETE');

  const onSave = async (patch: { key?: string; value?: string; is_secret?: number }) => {
    const ok = await save.call({
      body: {
        key: patch.key ?? v.key,
        value: patch.value ?? v.value,
        isSecret: (patch.is_secret ?? v.is_secret) === 1,
        sortOrder: v.sort_order,
      },
    });
    if (ok !== null) onSaved();
  };

  const onDelete = async () => {
    const ok = await del.call();
    if (ok !== null) onDeleted();
  };

  return (
    <div className="mb-1 grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-1">
      <Input
        defaultValue={v.key}
        onBlur={(e) => onSave({ key: e.target.value })}
        placeholder="key"
        className="font-mono"
      />
      <SecretInput
        defaultValue={v.value}
        isSecret={v.is_secret === 1}
        onBlur={(val) => onSave({ value: val })}
      />
      <input
        type="checkbox"
        defaultChecked={v.is_secret === 1}
        onChange={(e) => onSave({ is_secret: e.target.checked ? 1 : 0 })}
        className="h-4 w-4"
        aria-label="Is secret"
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={() => void onSave({})}
        aria-label="Save"
        className="h-8 w-8"
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => void onDelete()}
        aria-label="Delete"
        className="h-8 w-8"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function SecretInput({
  defaultValue,
  isSecret,
  onBlur,
}: {
  defaultValue: string;
  isSecret: boolean;
  onBlur: (v: string) => void;
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
        defaultValue={defaultValue}
        onBlur={(e) => onBlur(e.target.value)}
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

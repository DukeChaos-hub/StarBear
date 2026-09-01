'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { KeyValueRow } from './kv-table';
import type { HttpMethodChoice } from './method-select';

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

interface SaveDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  method: HttpMethodChoice;
  url: string;
  headers: KeyValueRow[];
  query: KeyValueRow[];
  bodyKind: BodyKind;
  body: string;
  auth: AuthState;
}

export function SaveDialog(props: SaveDialogProps) {
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [collectionId, setCollectionId] = useState<string>('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    setError(null);
    setOk(false);
    setName('');
    fetch('/api/collections')
      .then((r) => r.json())
      .then((rows) => {
        setCollections(rows);
        if (rows.length > 0) setCollectionId(rows[0].id);
      })
      .catch((e) => setError((e as Error).message));
  }, [props.open]);

  const save = async () => {
    if (!collectionId || !name) return;
    setSaving(true);
    setError(null);
    try {
      const authConfig =
        props.auth.kind === 'none'
          ? null
          : JSON.stringify({
              kind: props.auth.kind,
              token: props.auth.token,
              username: props.auth.username,
              password: props.auth.password,
              apiKeyName: props.auth.apiKeyName,
              apiKeyIn: props.auth.apiKeyIn,
            });
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          name,
          method: props.method,
          url: props.url,
          headers: JSON.stringify(props.headers),
          queryParams: JSON.stringify(props.query),
          bodyKind: props.bodyKind,
          body: props.bodyKind === 'none' ? null : props.body,
          authKind: props.auth.kind,
          authConfig,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'save failed');
      setOk(true);
      setTimeout(() => props.onOpenChange(false), 600);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Save request</DialogTitle>
          <DialogDescription>
            {props.method} {props.url || '(empty url)'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Get current user"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Collection</label>
            {collections.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No collections yet. Create one first (or use the env editor to bootstrap).
              </p>
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
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {ok && <p className="text-xs text-emerald-600">Saved ✓</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !name || !collectionId}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export interface KeyValueRow {
  key: string;
  value: string;
  enabled: boolean;
}

interface KvTableProps {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  testId?: string;
}

export function KvTable({
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  testId,
}: KvTableProps) {
  const update = (i: number, patch: Partial<KeyValueRow>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next);
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const append = () => onChange([...rows, { key: '', value: '', enabled: true }]);

  return (
    <div className="flex flex-col gap-1" data-testid={testId}>
      <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-1 px-1 text-[10px] uppercase text-muted-foreground">
        <span className="w-6" />
        <span>Key</span>
        <span>Value</span>
        <span className="w-8" />
      </div>
      {rows.length === 0 && (
        <p className="px-1 py-3 text-center text-xs text-muted-foreground">No entries yet.</p>
      )}
      {rows.map((r, i) => (
        <div
          key={i}
          className={cn(
            'grid grid-cols-[auto_1fr_1fr_auto] items-center gap-1 rounded-sm',
            !r.enabled && 'opacity-50',
          )}
        >
          <input
            type="checkbox"
            checked={r.enabled}
            onChange={(e) => update(i, { enabled: e.target.checked })}
            aria-label="Enabled"
            className="h-4 w-4"
          />
          <Input
            value={r.key}
            placeholder={keyPlaceholder ?? 'key'}
            onChange={(e) => update(i, { key: e.target.value })}
          />
          <Input
            value={r.value}
            placeholder={valuePlaceholder ?? 'value'}
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            aria-label="Remove row"
            className="h-8 w-8"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="mt-1 w-fit" onClick={append}>
        + Add row
      </Button>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

type IntervalKind = 'minutes' | 'hours' | 'days' | 'weeks';

interface TestCase {
  id: string;
  name: string;
  request_id: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export default function NewSchedulePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<IntervalKind>('minutes');
  const [value, setValue] = useState(5);
  const [timeOfDay, setTimeOfDay] = useState('09:00');
  const [weekday, setWeekday] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/test-cases')
      .then((r) => r.json())
      .then(setCases)
      .catch(() => setCases([]));
  }, []);

  const toggleCase = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = useCallback(async () => {
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (selected.size === 0) {
      setError('Pick at least one test case');
      return;
    }
    setBusy(true);
    const body = {
      name: name.trim(),
      testCaseIds: Array.from(selected),
      intervalKind: kind,
      intervalValue: value,
      timeOfDay: kind === 'minutes' || kind === 'hours' ? null : timeOfDay,
      weekday: kind === 'weeks' ? weekday : null,
      enabled: true,
    };
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string; issues?: unknown };
      setError(json.error ?? 'Failed to create schedule');
      return;
    }
    const created = (await res.json()) as { id: string };
    router.push(`/workspace/schedules/${created.id}`);
  }, [name, selected, kind, value, timeOfDay, weekday, router]);

  const needsTimeOfDay = kind === 'days' || kind === 'weeks';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Link
          href="/workspace/schedules"
          className={cn(buttonVariants({ size: 'icon', variant: 'ghost' }), 'h-6 w-6')}
          aria-label="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
        <h1 className="text-sm font-semibold">New schedule</h1>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-2xl space-y-4 text-sm">
          <section>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nightly smoke tests"
            />
          </section>

          <section>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Interval
            </label>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <div className="flex gap-1">
                {(['minutes', 'hours', 'days', 'weeks'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      'flex-1 rounded-md border px-2 py-1.5 text-xs',
                      kind === k
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-input hover:bg-accent/40',
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min={1}
                max={60}
                value={value}
                onChange={(e) => setValue(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
              />
            </div>
            {needsTimeOfDay && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground">Time of day</label>
                  <Input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                  />
                </div>
                {kind === 'weeks' && (
                  <div>
                    <label className="mb-1 block text-[10px] text-muted-foreground">Weekday</label>
                    <select
                      value={weekday}
                      onChange={(e) => setWeekday(Number(e.target.value))}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {WEEKDAYS.map((w, i) => (
                        <option key={i} value={i}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Test cases ({selected.size} selected)
            </label>
            <div className="max-h-80 overflow-auto rounded-md border">
              {cases.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">
                  No test cases yet. Create some on the Tests page first.
                </p>
              )}
              {cases.map((c) => {
                const checked = selected.has(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-xs last:border-b-0 hover:bg-accent/30"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCase(c.id)}
                    />
                    <span className="flex-1 truncate">{c.name}</span>
                  </label>
                );
              })}
            </div>
          </section>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href="/workspace/schedules"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            >
              Cancel
            </Link>
            <Button onClick={submit} disabled={busy} size="sm">
              <Save className="h-3.5 w-3.5" /> Create
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

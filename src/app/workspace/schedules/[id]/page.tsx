'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Play, Save, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils/cn';
import { formatSchedule, formatDateTime, formatRelative } from '../_format';
import type { ScheduledJob } from '../_types';

interface TestCase {
  id: string;
  name: string;
  request_id: string;
}

interface RunRow {
  id: string;
  started_at: number;
  finished_at: number | null;
  status: string;
  summary: { total: number; passed: number; failed: number; errored: number; duration_ms: number } | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export default function ScheduleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [job, setJob] = useState<ScheduledJob | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ScheduledJob['intervalKind']>('minutes');
  const [value, setValue] = useState(5);
  const [timeOfDay, setTimeOfDay] = useState('09:00');
  const [weekday, setWeekday] = useState(1);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [jobRes, casesRes, runsRes] = await Promise.all([
        fetch(`/api/schedules/${id}`),
        fetch('/api/test-cases'),
        fetch(`/api/schedules/${id}/runs`),
      ]);
      if (cancelled) return;
      if (jobRes.status === 404) {
        setNotFound(true);
        return;
      }
      const j = (await jobRes.json()) as ScheduledJob;
      const cs = (await casesRes.json()) as TestCase[];
      const rs = (await runsRes.json()) as RunRow[];
      setJob(j);
      setSelected(new Set(j.testCaseIds));
      setName(j.name);
      setKind(j.intervalKind);
      setValue(j.intervalValue);
      setTimeOfDay(j.timeOfDay ?? '09:00');
      setWeekday(j.weekday ?? 1);
      setCases(cs);
      setRuns(rs);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);

  const save = useCallback(async () => {
    if (!job) return;
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
    };
    const res = await fetch(`/api/schedules/${job.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? 'Failed to save');
      return;
    }
    const updated = (await res.json()) as ScheduledJob;
    setJob(updated);
  }, [job, name, selected, kind, value, timeOfDay, weekday]);

  const remove = useCallback(async () => {
    if (!job) return;
    setBusy(true);
    const res = await fetch(`/api/schedules/${job.id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) router.push('/workspace/schedules');
  }, [job, router]);

  const runNow = useCallback(async () => {
    if (!job) return;
    setBusy(true);
    try {
      await fetch(`/api/schedules/${job.id}/run`, { method: 'POST' });
      const r = await fetch(`/api/schedules/${job.id}/runs`);
      if (r.ok) setRuns((await r.json()) as RunRow[]);
    } finally {
      setBusy(false);
    }
  }, [job]);

  if (notFound) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Schedule not found.{' '}
        <Link href="/workspace/schedules" className="ml-2 underline">
          Back
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Loading…
      </div>
    );
  }

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
        <h1 className="text-sm font-semibold">{job.name}</h1>
        <span className="text-xs text-muted-foreground">
          {formatSchedule(job)} · next {formatRelative(job.next_run_at, now)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={runNow} disabled={busy}>
            <Play className="h-3.5 w-3.5" /> Run now
          </Button>
          <Button size="sm" onClick={save} disabled={busy}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
          <ConfirmDialog
            title="Delete schedule?"
            description={`"${job.name}" will be removed. This cannot be undone.`}
            onConfirm={remove}
            trigger={(open) => (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={open} aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          <div className="mx-auto max-w-2xl space-y-4 text-sm">
            <section>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
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
                  onChange={(e) =>
                    setValue(Math.max(1, Math.min(60, Number(e.target.value) || 1)))
                  }
                />
              </div>
              {needsTimeOfDay && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] text-muted-foreground">
                      Time of day
                    </label>
                    <Input
                      type="time"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value)}
                    />
                  </div>
                  {kind === 'weeks' && (
                    <div>
                      <label className="mb-1 block text-[10px] text-muted-foreground">
                        Weekday
                      </label>
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
                        onChange={() =>
                          setSelected((s) => {
                            const next = new Set(s);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            return next;
                          })
                        }
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
          </div>
        </div>

        <aside className="w-80 border-l bg-muted/30 overflow-auto p-3 text-xs">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Recent runs</p>
          {runs.length === 0 && (
            <p className="text-muted-foreground/70">No runs yet. Hit “Run now” to test.</p>
          )}
          {runs.map((r) => (
            <Link
              key={r.id}
              href={`/workspace/tests/runs/${r.id}`}
              className="block border-b py-2 last:border-b-0 hover:bg-accent/30"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
                    r.status === 'passed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : r.status === 'failed'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-zinc-200 text-zinc-700',
                  )}
                >
                  {r.status}
                </span>
                <span className="text-muted-foreground">{formatDateTime(r.started_at)}</span>
              </div>
              {r.summary && (
                <p className="mt-1 text-muted-foreground">
                  {r.summary.passed}/{r.summary.total} passed · {r.summary.duration_ms}ms
                </p>
              )}
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}

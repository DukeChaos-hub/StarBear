'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Play, Plus, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useFetch } from '@/lib/hooks/use-fetch';
import { cn } from '@/lib/utils/cn';
import { formatSchedule, formatRelative } from './_format';
import type { ScheduledJob } from './_types';

export default function SchedulesPage() {
  const { data, loading, refresh } = useFetch<ScheduledJob[]>('/api/schedules');
  const [now, setNow] = useState<number>(() => Date.now());
  const [runningId, setRunningId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);

  const deleteJob = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      if (res.ok) refresh();
    },
    [refresh],
  );

  const toggleEnabled = useCallback(
    async (job: ScheduledJob) => {
      const res = await fetch(`/api/schedules/${job.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: !job.enabled }),
      });
      if (res.ok) refresh();
    },
    [refresh],
  );

  const runNow = useCallback(
    async (id: string) => {
      setRunningId(id);
      try {
        await fetch(`/api/schedules/${id}/run`, { method: 'POST' });
        refresh();
      } finally {
        setRunningId(null);
      }
    },
    [refresh],
  );

  const jobs = data ?? [];
  const empty = !loading && jobs.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <h1 className="text-sm font-semibold">Schedules</h1>
        <span className="text-xs text-muted-foreground">
          {jobs.length} job{jobs.length === 1 ? '' : 's'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/workspace/schedules/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="h-3.5 w-3.5" /> New schedule
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {loading && <p className="p-4 text-xs text-muted-foreground">Loading…</p>}
        {empty && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <p>No schedules yet.</p>
            <p className="text-xs">
              Create a schedule to run a set of test cases on a recurring interval.
            </p>
            <Link
              href="/workspace/schedules/new"
              className={cn(buttonVariants({ size: 'sm' }), 'mt-2')}
            >
              <Plus className="h-3.5 w-3.5" /> New schedule
            </Link>
          </div>
        )}
        {jobs.length > 0 && (
          <table className="w-full text-xs">
            <thead className="sticky top-0 border-b bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Interval</th>
                <th className="px-3 py-2 font-medium">Cases</th>
                <th className="px-3 py-2 font-medium">Last run</th>
                <th className="px-3 py-2 font-medium">Next run</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b last:border-b-0 hover:bg-accent/30"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/workspace/schedules/${job.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {job.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatSchedule(job)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {job.testCaseIds.length}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {job.last_run_at ? (
                      <Link
                        href={`/workspace/tests/runs/${job.last_run_id ?? ''}`}
                        className="hover:underline"
                      >
                        {formatRelative(job.last_run_at, now)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground/60">never</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatRelative(job.next_run_at, now)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleEnabled(job)}
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                        job.enabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-zinc-200 text-zinc-700',
                      )}
                    >
                      {job.enabled ? 'enabled' : 'disabled'}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => runNow(job.id)}
                        disabled={runningId !== null}
                        aria-label="Run now"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <ConfirmDialog
                        title="Delete schedule?"
                        description={`"${job.name}" will be removed. This cannot be undone.`}
                        onConfirm={() => deleteJob(job.id)}
                        trigger={(open) => (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={open}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

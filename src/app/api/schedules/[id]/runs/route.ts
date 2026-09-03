import { NextRequest, NextResponse } from 'next/server';
import { all } from '@/lib/db/client';

/**
 * Return the test runs triggered by this schedule, newest first. Joins
 * against the `test_runs` table using the scope/scope_ref convention
 * established in v0.2 — `scope = 'schedule'` and `scope_ref = <jobId>`.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rows = all<{
    id: string;
    started_at: number;
    finished_at: number | null;
    status: string;
    summary: string | null;
  }>(
    `SELECT id, started_at, finished_at, status, summary
       FROM test_runs
       WHERE scope = 'schedule' AND scope_ref = ?
       ORDER BY started_at DESC
       LIMIT 100`,
    [id],
  );
  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      summary: r.summary ? JSON.parse(r.summary) : null,
    })),
  );
}

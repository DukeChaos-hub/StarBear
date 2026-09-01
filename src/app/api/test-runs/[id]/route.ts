import { NextRequest, NextResponse } from 'next/server';
import * as runs from '@/lib/db/repositories/test-runs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const full = await runs.getWithSteps(id);
  if (!full) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    run: full.run,
    steps: full.steps.map((s) => ({
      ...s,
      responseMeta: s.response_meta ? JSON.parse(s.response_meta) : null,
      assertionsResult: s.assertions_result ? JSON.parse(s.assertions_result) : null,
    })),
  });
}

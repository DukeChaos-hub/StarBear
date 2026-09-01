import { NextRequest, NextResponse } from 'next/server';
import * as envs from '@/lib/db/repositories/environments';

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await envs.remove(id);
  return NextResponse.json({ ok: true });
}

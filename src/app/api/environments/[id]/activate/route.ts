import { NextRequest, NextResponse } from 'next/server';
import * as envs from '@/lib/db/repositories/environments';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await envs.setActive(id);
  return NextResponse.json({ ok: true });
}

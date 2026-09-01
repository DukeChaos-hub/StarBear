import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as vars from '@/lib/db/repositories/env-variables';

const PatchInput = z.object({
  key: z.string().optional(),
  value: z.string().optional(),
  isSecret: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = PatchInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  await vars.update(id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await vars.remove(id);
  return NextResponse.json({ ok: true });
}

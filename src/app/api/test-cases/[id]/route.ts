import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as cases from '@/lib/db/repositories/test-cases';

const PatchInput = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  assertions: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await cases.getById(id);
  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(c);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = PatchInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  await cases.update(id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await cases.remove(id);
  return NextResponse.json({ ok: true });
}

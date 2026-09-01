import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as collections from '@/lib/db/repositories/collections';

const PatchInput = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await collections.getById(id);
  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(c);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = PatchInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  await collections.update(id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await collections.remove(id);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as servers from '@/lib/db/repositories/mock-servers';

const Patch = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  basePath: z.string().min(1).regex(/^\//).optional(),
  status: z.enum(['active', 'paused']).optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await servers.getById(id);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const existing = await servers.getById(id);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await servers.update(id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = await servers.getById(id);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await servers.remove(id);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as responses from '@/lib/db/repositories/mock-responses';

const Patch = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional(),
  pathPattern: z.string().min(1).regex(/^\//).optional(),
  status: z.number().int().min(100).max(599).optional(),
  headers: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  delayMs: z.number().int().min(0).max(60_000).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; rid: string }> },
) {
  const { rid } = await ctx.params;
  const row = await responses.getById(rid);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; rid: string }> },
) {
  const { rid } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const existing = await responses.getById(rid);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await responses.update(rid, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; rid: string }> },
) {
  const { rid } = await ctx.params;
  const existing = await responses.getById(rid);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await responses.remove(rid);
  return NextResponse.json({ ok: true });
}

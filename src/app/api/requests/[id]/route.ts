import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as requests from '@/lib/db/repositories/requests';

const PatchInput = z.object({
  name: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional(),
  url: z.string().optional(),
  headers: z.string().optional(),
  queryParams: z.string().optional(),
  bodyKind: z.enum(['none', 'json', 'form', 'raw', 'binary']).optional(),
  body: z.string().nullable().optional(),
  authKind: z.enum(['none', 'bearer', 'basic', 'apikey']).optional(),
  authConfig: z.string().nullable().optional(),
  preScript: z.string().nullable().optional(),
  postScript: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requests.getById(id);
  if (!r) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(r);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = PatchInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  await requests.update(id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await requests.remove(id);
  return NextResponse.json({ ok: true });
}

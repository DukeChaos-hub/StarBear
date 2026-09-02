import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as servers from '@/lib/db/repositories/mock-servers';
import * as responses from '@/lib/db/repositories/mock-responses';

const Input = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  pathPattern: z.string().min(1).regex(/^\//, 'pathPattern must start with /'),
  status: z.number().int().min(100).max(599).default(200),
  headers: z.string().nullable().default(null),
  body: z.string().nullable().default(null),
  delayMs: z.number().int().min(0).max(60_000).default(0),
  sortOrder: z.number().int().default(0),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const server = await servers.getById(id);
  if (!server) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(await responses.listByServer(id));
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const server = await servers.getById(id);
  if (!server) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const newId = await responses.create({ serverId: id, ...parsed.data });
  return NextResponse.json({ id: newId }, { status: 201 });
}

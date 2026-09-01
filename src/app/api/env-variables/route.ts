import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as vars from '@/lib/db/repositories/env-variables';

const Input = z.object({
  envId: z.string(),
  key: z.string().min(1),
  value: z.string(),
  isSecret: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  const envId = req.nextUrl.searchParams.get('envId');
  if (!envId) return NextResponse.json({ error: 'envId required' }, { status: 400 });
  return NextResponse.json(await vars.listByEnv(envId));
}

export async function POST(req: NextRequest) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 });
  const id = await vars.create(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}

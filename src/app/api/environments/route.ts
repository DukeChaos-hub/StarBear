import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as envs from '@/lib/db/repositories/environments';

const Input = z.object({ name: z.string().min(1) });

export async function GET() {
  return NextResponse.json(await envs.list());
}

export async function POST(req: NextRequest) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const id = await envs.create(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}

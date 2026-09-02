import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as cases from '@/lib/db/repositories/test-cases';

const Input = z.object({
  requestId: z.string(),
  name: z.string().min(1),
  description: z.string().nullable().default(null),
  assertions: z.string(),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get('requestId');
  if (requestId) return NextResponse.json(await cases.listByRequest(requestId));
  return NextResponse.json(await cases.listAll());
}

export async function POST(req: NextRequest) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  const id = await cases.create(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}

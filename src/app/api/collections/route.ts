import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as collections from '@/lib/db/repositories/collections';

const CollectionInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable().default(null),
  parentId: z.string().nullable().default(null),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  return NextResponse.json(await collections.list());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CollectionInput.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  const id = await collections.create(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}

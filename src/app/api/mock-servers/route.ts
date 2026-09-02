import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as servers from '@/lib/db/repositories/mock-servers';

const Input = z.object({
  name: z.string().min(1),
  description: z.string().nullable().default(null),
  basePath: z.string().min(1).regex(/^\//, 'basePath must start with /'),
  status: z.enum(['active', 'paused']).default('active'),
});

export async function GET() {
  return NextResponse.json(await servers.list());
}

export async function POST(req: NextRequest) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const id = await servers.create({
    name: parsed.data.name,
    description: parsed.data.description,
    basePath: parsed.data.basePath,
    status: parsed.data.status,
  });
  return NextResponse.json({ id }, { status: 201 });
}

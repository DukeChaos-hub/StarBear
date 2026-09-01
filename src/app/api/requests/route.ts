import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as requests from '@/lib/db/repositories/requests';

const RequestInput = z.object({
  collectionId: z.string(),
  name: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  url: z.string(),
  headers: z.string().default('[]'),
  queryParams: z.string().default('[]'),
  bodyKind: z.enum(['none', 'json', 'form', 'raw', 'binary']).default('none'),
  body: z.string().nullable().default(null),
  authKind: z.enum(['none', 'bearer', 'basic', 'apikey']).default('none'),
  authConfig: z.string().nullable().default(null),
  preScript: z.string().nullable().default(null),
  postScript: z.string().nullable().default(null),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  const collectionId = req.nextUrl.searchParams.get('collectionId');
  if (!collectionId)
    return NextResponse.json({ error: 'collectionId required' }, { status: 400 });
  return NextResponse.json(await requests.listByCollection(collectionId));
}

export async function POST(req: NextRequest) {
  const parsed = RequestInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 });
  const id = await requests.create(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}

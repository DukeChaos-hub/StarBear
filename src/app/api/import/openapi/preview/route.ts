import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseOpenApiSpec, OpenApiParseError } from '@/lib/import/openapi';

const Body = z.object({ spec: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    const preview = parseOpenApiSpec(parsed.data.spec);
    return NextResponse.json(preview);
  } catch (e) {
    if (e instanceof OpenApiParseError) {
      return NextResponse.json(
        { error: 'parse_failed', message: e.message, hint: e.hint },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'unexpected', message: (e as Error).message },
      { status: 500 },
    );
  }
}

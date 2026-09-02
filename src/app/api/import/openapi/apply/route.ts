import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseOpenApiSpec, OpenApiParseError } from '@/lib/import/openapi';
import * as collections from '@/lib/db/repositories/collections';
import * as requests from '@/lib/db/repositories/requests';

const Body = z.object({
  spec: z.string().min(1),
  // Either pick an existing collection, or create a new one with this name.
  collectionId: z.string().optional(),
  newCollectionName: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  if (!parsed.data.collectionId && !parsed.data.newCollectionName) {
    return NextResponse.json(
      { error: 'invalid_input', message: 'collectionId or newCollectionName is required' },
      { status: 400 },
    );
  }

  let preview;
  try {
    preview = parseOpenApiSpec(parsed.data.spec);
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

  // Resolve target collection.
  const collectionId =
    parsed.data.collectionId ??
    (await collections.create({
      name: parsed.data.newCollectionName!,
      description: preview.info.description,
      parentId: null,
      sortOrder: 0,
    }));

  // Persist each parsed request.
  const createdIds: string[] = [];
  for (const r of preview.requests) {
    const id = await requests.create({
      collectionId,
      name: r.name,
      method: r.method as 'GET',
      url: r.url,
      headers: JSON.stringify(r.headers),
      queryParams: JSON.stringify(r.query),
      bodyKind: r.body ? 'json' : 'none',
      body: r.body,
      authKind: r.authKind,
      authConfig: r.authConfig,
      preScript: null,
      postScript: null,
      sortOrder: r.sortOrder,
    });
    createdIds.push(id);
  }

  return NextResponse.json({
    collectionId,
    created: createdIds.length,
    requestIds: createdIds,
    title: preview.info.title,
    version: preview.info.version,
  });
}

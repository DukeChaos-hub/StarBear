import { NextResponse } from 'next/server';
import * as conversations from '@/lib/db/repositories/ai-conversations';

export async function GET() {
  return NextResponse.json(await conversations.list());
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  await conversations.remove(id);
  return NextResponse.json({ ok: true });
}

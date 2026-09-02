import { NextRequest, NextResponse } from 'next/server';
import * as messages from '@/lib/db/repositories/ai-messages';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rows = await messages.listByConversation(id);
  // Parse the stored tool_calls JSON into structured tool-call / tool-result
  // entries that the UI can render directly.
  const wire = rows.map((m) => {
    let toolCalls: unknown = null;
    if (m.tool_calls) {
      try {
        toolCalls = JSON.parse(m.tool_calls);
      } catch {
        /* leave as null */
      }
    }
    return {
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls,
      createdAt: m.created_at,
    };
  });
  return NextResponse.json(wire);
}

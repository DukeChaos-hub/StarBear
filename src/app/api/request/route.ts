import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendRequest, SsrfBlockedError, UnresolvedVariableError } from '@/lib/http';
import { getSettings } from '@/lib/db/ai-settings';

const SendRequestBody = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  url: z.string().min(1),
  headers: z
    .array(z.object({ key: z.string(), value: z.string(), enabled: z.boolean() }))
    .optional(),
  query: z
    .array(z.object({ key: z.string(), value: z.string(), enabled: z.boolean() }))
    .optional(),
  body: z.string().optional(),
  auth: z
    .object({
      kind: z.enum(['none', 'bearer', 'basic', 'apikey']),
      token: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      apiKeyName: z.string().optional(),
      apiKeyIn: z.enum(['header', 'query']).optional(),
    })
    .optional(),
  vars: z.record(z.string(), z.string()).default({}),
  ssrfMode: z.enum(['strict', 'allow-local']).default('strict'),
  timeoutMs: z.number().int().positive().max(120_000).default(30_000),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = SendRequestBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  // ssrfMode comes from request (UI passes the user's setting; default 'strict').
  // getSettings() is reserved for future per-user policy enforcement.
  void (await getSettings());
  try {
    const result = await sendRequest(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof SsrfBlockedError) {
      return NextResponse.json({ error: 'ssrf_blocked', reason: e.reason }, { status: 400 });
    }
    if (e instanceof UnresolvedVariableError) {
      return NextResponse.json({ error: 'unresolved_variable', name: e.variableName }, { status: 400 });
    }
    if ((e as Error).message.startsWith('Request timed out')) {
      return NextResponse.json({ error: 'timeout', message: (e as Error).message }, { status: 504 });
    }
    return NextResponse.json({ error: 'upstream', message: (e as Error).message }, { status: 502 });
  }
}

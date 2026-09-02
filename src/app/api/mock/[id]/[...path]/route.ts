import { NextRequest, NextResponse } from 'next/server';
import * as servers from '@/lib/db/repositories/mock-servers';
import * as responses from '@/lib/db/repositories/mock-responses';
import * as envRepo from '@/lib/db/repositories/environments';
import * as varsRepo from '@/lib/db/repositories/env-variables';
import { interpolate } from '@/lib/http/interpolate';

/**
 * Catch-all mock server route. URL shape: /api/mock/{serverId}/{...path}
 * Accepts ANY HTTP method (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS).
 *
 * Match rule (MVP): pick the first response whose method (case-insensitive)
 * matches the request method AND whose path_pattern equals the request path
 * or starts with a `*` wildcard suffix. Responses are ordered by sort_order.
 *
 * Response body and headers support `{{var}}` interpolation against the
 * active environment's variables. Unresolved variables yield a 500 with
 * the variable name (callers should ensure all `{{var}}` are defined).
 */
async function handle(req: NextRequest, ctx: { params: Promise<{ id: string; path?: string[] }> }) {
  const { id, path = [] } = await ctx.params;
  const server = await servers.getById(id);
  if (!server) {
    return NextResponse.json({ error: 'mock_server_not_found' }, { status: 404 });
  }
  if (server.status !== 'active') {
    return NextResponse.json({ error: 'mock_server_paused' }, { status: 503 });
  }

  const fullPath = '/' + path.join('/');
  const match = await responses.findMatch(id, req.method, fullPath);
  if (!match) {
    return NextResponse.json(
      { error: 'no_mock_response', method: req.method, path: fullPath },
      { status: 404 },
    );
  }

  // Pull active env's vars for interpolation.
  const activeEnv = await envRepo.getActive();
  const vars = activeEnv ? await varsRepo.asMap(activeEnv.id) : {};

  // Apply optional delay.
  if (match.delay_ms > 0) {
    await new Promise((r) => setTimeout(r, match.delay_ms));
  }

  // Parse stored headers, interpolate each value, build response Headers.
  // Any unresolved variable in either headers or body surfaces as a 500
  // with the offending variable name so callers know what to fix in their
  // mock configuration.
  function unresolved(name: string) {
    return NextResponse.json({ error: 'unresolved_variable', name }, { status: 500 });
  }

  const outHeaders = new Headers();
  if (match.headers) {
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(match.headers);
    } catch {
      return NextResponse.json({ error: 'invalid_headers_json', id: match.id }, { status: 500 });
    }
    for (const [k, v] of Object.entries(parsed)) {
      try {
        outHeaders.set(k, interpolate(v, vars));
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Unresolved variable: ')) {
          return unresolved(e.message.replace('Unresolved variable: ', ''));
        }
        throw e;
      }
    }
  }

  let body = '';
  if (match.body) {
    try {
      body = interpolate(match.body, vars);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Unresolved variable: ')) {
        return unresolved(e.message.replace('Unresolved variable: ', ''));
      }
      throw e;
    }
  }
  return new NextResponse(body, { status: match.status, headers: outHeaders });
}

// Next.js App Router requires explicit method exports. We dispatch every
// method that a real HTTP client might send, including the uncommonly-used
// HEAD and OPTIONS so a mock of an OPTIONS preflight works.
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodTypeAny } from 'zod';

/**
 * Parse a JSON body against a Zod schema.
 * Returns either `{ ok: true, data }` or `{ ok: false, res }` where `res` is
 * a ready-to-return 400 response with Zod issues attached. Callers should
 * early-return `res` when `ok` is false.
 */
export async function parseJson<S extends ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; res: NextResponse }> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    /* fall through with body = null */
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'invalid_input', issues: parsed.error.issues },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

/** Standard 404 JSON body. */
export function notFound(error = 'not_found'): NextResponse {
  return NextResponse.json({ error }, { status: 404 });
}

/** Standard 200 JSON `{ ok: true }` body. */
export const ok = (): NextResponse => NextResponse.json({ ok: true });

/**
 * Minimal repository surface that a resource router needs. Every
 * repository in `src/lib/db/repositories/*` already satisfies this.
 */
export interface ResourceRepo {
  getById: (id: string) => Promise<unknown>;
  update: (id: string, patch: Record<string, unknown>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export interface ResourceConfig<TPatch extends ZodTypeAny> {
  repo: ResourceRepo;
  patchSchema: TPatch;
  /**
   * Name of the URL param that holds the resource id. Default: 'id'.
   * Use 'rid' for nested routes like /api/x/[id]/[sub]/[rid].
   */
  idParam?: string;
  /**
   * Whether to pre-flight `getById` before PATCH and DELETE so that
   * missing rows return 404 instead of silently no-op'ing. Default: true.
   * Pass `false` for sub-resources where remove() is idempotent or the
   * caller wants the fastest path.
   */
  checkExistence?: boolean;
  /**
   * Whether to also export a GET handler. Default: true. Pass true to
   * skip it (e.g. for a route that only mutates).
   */
  includeGet?: boolean;
}

type Ctx = { params: Promise<Record<string, string | string[]>> };

/**
 * Create the standard { GET, PATCH, DELETE } handler set for a single
 * resource route. Use like:
 *
 *   const handlers = createResourceRouter({
 *     repo: collections,
 *     patchSchema: PatchInput,
 *   });
 *   export const { GET, PATCH, DELETE } = handlers;
 *
 * The PATCH body is validated with `patchSchema`; PATCH/DELETE do a
 * `getById` pre-flight by default so the caller can distinguish 404
 * (not found) from 200 (mutated) without inspecting logs.
 */
export function createResourceRouter<TPatch extends ZodTypeAny>(
  config: ResourceConfig<TPatch>,
): {
  GET: (req: NextRequest, ctx: Ctx) => Promise<NextResponse>;
  PATCH: (req: NextRequest, ctx: Ctx) => Promise<NextResponse>;
  DELETE: (req: NextRequest, ctx: Ctx) => Promise<NextResponse>;
} {
  const idParam = config.idParam ?? 'id';
  const checkExistence = config.checkExistence ?? true;
  const includeGet = config.includeGet ?? true;

  const resolveId = async (ctx: Ctx): Promise<string> => {
    const params = await ctx.params;
    const raw = params[idParam];
    return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  };

  const notSupported = async (): Promise<NextResponse> =>
    NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });

  const getHandler: (req: NextRequest, ctx: Ctx) => Promise<NextResponse> = includeGet
    ? async (_req, ctx) => {
        const id = await resolveId(ctx);
        const row = await config.repo.getById(id);
        if (!row) return notFound();
        return NextResponse.json(row);
      }
    : notSupported;

  return {
    GET: getHandler,
    PATCH: async (req, ctx) => {
      const id = await resolveId(ctx);
      const parsed = await parseJson(req, config.patchSchema);
      if (!parsed.ok) return parsed.res;
      if (checkExistence) {
        const row = await config.repo.getById(id);
        if (!row) return notFound();
      }
      await config.repo.update(id, parsed.data as Record<string, unknown>);
      return ok();
    },
    DELETE: async (_req, ctx) => {
      const id = await resolveId(ctx);
      if (checkExistence) {
        const row = await config.repo.getById(id);
        if (!row) return notFound();
      }
      await config.repo.remove(id);
      return ok();
    },
  };
}

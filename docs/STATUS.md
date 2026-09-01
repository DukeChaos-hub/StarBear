# StarBear — Session Status

**Last update:** 2026-09-01
**Branch:** `main`
**Working tree:** clean (8 commits)

## TL;DR

3.8 out of 13 plan phases complete. Backend CRUD layer is fully functional
(42 tests pass, 14 API routes). The plan + design spec live in
`docs/superpowers/`. Architecture pivoted from `better-sqlite3` (native
binding issues on Node 24 + Windows) to Node 24's built-in `node:sqlite`.

## Git log

```
aca7c49 feat(api): phase 2.8 CRUD API routes (collections, requests, environments, env-vars, test-cases, test-runs)
32f671c feat(db): phase 2 data layer (sqlite via node:sqlite, 9 repos, drizzle schema-as-types)
5dfa8c0 feat(http): client wrapper + /api/request route + integration tests
ad55bb1 feat(http): variable interpolation (deep), SSRF guard with strict + allow-local modes
5026304 feat: phase 0 foundation (next 15, react 19, ts strict, vitest, shadcn, ci, tailwind, prettier, eslint)
464a459 chore: initialize project (node 20+, pnpm 10, ts strict, MIT)
2424026 docs: add StarBear v1 implementation plan (13 phases, ~100 tasks)
81552d0 docs: add StarBear v1 design spec
```

## Phase status

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 0 | Project Foundation | ✅ done | Next 15, React 19, TS strict, Vitest, shadcn/ui, CI workflow, Tailwind, Prettier, ESLint |
| 1 | Core HTTP Engine | ✅ done | `{{var}}` interpolate (deep), SSRF guard, undici client (auth/timeout), `/api/request` route |
| 2 | Data Layer | ✅ done | 10 tables, 9 repos (raw SQL via `node:sqlite`), Drizzle Kit for migration generation only |
| 2.8 | CRUD API Routes | ✅ done | 14 endpoints: collections, requests, environments, env-variables, test-cases, test-runs |
| 3 | Test Engine | ⏳ next | 6 assertion types, runner, report, `/api/tests` + `/api/tests/suite` |
| 4 | AI Provider Layer | ❌ | 4 adapters (OpenAI / Anthropic / Google / DeepSeek) + AES-256-GCM key encryption |
| 5 | AI Agent | ❌ | 5 tool descriptors, bounded runtime loop, SSE streaming, `/api/ai-agent` |
| 6 | UI Foundation | ❌ | App shell, theme, sidebar, topbar, env switcher, command palette |
| 7 | Request Editor UI | ❌ | URL bar, tabs, body editor, auth form, response viewer |
| 8 | Environments + Tests + AI gen UI | ❌ | List pages, run button, AI generation button |
| 9 | AI Chat UI | ❌ | Streaming thread, tool call cards |
| 10 | Settings + Data I/O UI | ❌ | AI provider config, theme, import/export |
| 11 | Documentation | ❌ | user guide, AI agent integration, architecture, development |
| 12 | E2E + GitHub push | ❌ | Playwright critical paths, clean-clone smoke, push to `DukeChaos/StarBear` |

## Architecture decisions worth knowing

1. **`node:sqlite` instead of `better-sqlite3`**
   - Reason: better-sqlite3 v12 prebuilt download failed (network), node-gyp
     rebuild failed (no Python on Windows). Node 24 has `node:sqlite` built-in
     and stable.
   - Implementation: `src/lib/db/sqlite-shim.cjs` is a CJS shim loaded via
     `createRequire`, because Vitest/Vite's import resolver does not understand
     the `node:sqlite` protocol.
   - Migration generation still uses `drizzle-kit` (writes `0000_*.sql`).
     Repositories use raw SQL via the `all() / get() / run()` helpers in
     `src/lib/db/client.ts`.

2. **Drizzle schema is type-only**
   - `src/lib/db/schema.ts` exports TypeScript interfaces (e.g. `CollectionRow`)
     but no `sqliteTable` definitions. Repositories use raw SQL parameterized
     queries with these row types for return values.

3. **BYOK is the only AI mode**
   - No backend proxy. The user's AI provider key is encrypted with
     AES-256-GCM using a per-install master key (file `~/.starbear/master.key`,
     chmod 600). The key is decrypted only inside server-side tool executors
     and never logged.

4. **Local-first by default**
   - SQLite file at `.starbear/starbear.sqlite` (overridable via
     `STARBEAR_DB` env). All data is local; no network calls except the
     user-requested API calls + the user's own LLM provider.

5. **No Drizzle transactions used**
   - Single-statement writes are atomic; for compound updates we use SQLite
     `BEGIN` / `COMMIT` directly in the client (e.g. `setActive`).

## How to verify the current state

```bash
cd "D:/Minimax total project/starbear"
pnpm install
pnpm typecheck          # tsc --noEmit, should be silent
pnpm test               # 42/42 should pass
pnpm build              # Next.js production build, 14 API routes registered
pnpm dev                # http://localhost:3000 (landing page only; UI comes in Phase 6)
```

Smoke-test the API with `curl` (server must be running):

```bash
curl http://localhost:3000/api/collections
curl -X POST http://localhost:3000/api/collections \
  -H "content-type: application/json" \
  -d '{"name":"Sandbox"}'
curl -X POST http://localhost:3000/api/environments \
  -H "content-type: application/json" \
  -d '{"name":"dev"}'
```

## What's blocking Phase 3+

Nothing. The foundation is stable. Continue with Phase 3 by re-reading
`docs/superpowers/plans/2026-09-01-starbear-v1.md` Phase 3 section and
executing the tasks in order. The plan uses strict TDD; follow the
test-first steps exactly.

### Caveats for the next executor

- `node:sqlite` requires Node 22.5+; the project requires Node 20+. This
  is a real conflict in the plan. The actual environment is Node 24, so
  this works, but anyone trying to run on Node 20.x will get an import
  error. Either bump `.nvmrc` to 24 or pin to 22.5+ — not the spec's 20.
- `next lint` is currently disabled in `next.config.ts` because ESLint 9
  + Next 15's `eslint-config-next` patcher is broken on this platform.
  CI runs `pnpm lint` separately; investigate the patcher when you have
  time, or pin ESLint to a working version.
- The `node_modules` directory was built with `--frozen-lockfile=false`
  to handle the better-sqlite3 → node:sqlite pivot; the lockfile is
  current as of `32f671c`. A clean `pnpm install --frozen-lockfile`
  should work on a sibling Node 24 machine.
- The `drizzle-kit generate` step in the plan (`pnpm db:generate`)
  currently does nothing useful because the schema is type-only. It
  could be removed, or it could be used to generate future migrations
  once we add a `sqliteTable` definition.

## Open user-facing decisions (still pending)

None blocking. All defaults from the design spec were used. If the user
wants different license / repo name / default AI provider ordering, edit
`README.md` and `src/lib/ai/providers/index.ts`.

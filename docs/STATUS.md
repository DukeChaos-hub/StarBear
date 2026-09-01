# StarBear — Session Status

**Last update:** 2026-09-01
**Branch:** `main`
**Working tree:** clean (32 commits)

## TL;DR

10 out of 13 plan phases complete. The full backend (HTTP engine, SQLite data
layer, test engine, AI provider layer, AI agent) **and** the full UI layer
(request editor, response viewer, env editor, tests UI, AI chat, settings) are
shipped. **104/104 tests pass**, 19 API routes registered, `pnpm build` is
clean. Only docs polish (Phase 11) and GitHub push (Phase 12) remain.

The plan + design spec live in `docs/superpowers/`. The repo pivoted from
`better-sqlite3` to Node 24's built-in `node:sqlite`.

## Git log (most recent first)

```
3f28caf feat(ui): Phase 10 settings UI — AI provider & keys
afa30b8 feat(ui): Phase 9 AI chat right-pane + fullscreen agent page
c755b60 feat(ui): Phase 8 env editor + tests UI
30e1e76 feat(ui): Phase 7 request editor + response viewer + save dialog
b621193 feat(ui): Phase 6 workspace shell + landing redirect + AI settings API
ba1e331 feat(agent): phase 5 — 5 tools, bounded runtime, SSE /api/ai-agent
725dbaf feat(ai): phase 4 — AES-256-GCM crypto, 4 vendor adapters
[earlier phases: test engine, CRUD, data layer, http engine, foundation]
```

## Phase status

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 0 | Project Foundation | ✅ done | Next 15, React 19, TS strict, Vitest, shadcn/ui, CI, Tailwind, Prettier, ESLint |
| 1 | Core HTTP Engine | ✅ done | `{{var}}` interpolate (deep), SSRF guard, undici client, `/api/request` |
| 2 | Data Layer | ✅ done | 10 tables, 9 repos (raw SQL via `node:sqlite`), Drizzle Kit for migration generation |
| 2.8 | CRUD API Routes | ✅ done | 14 endpoints: collections, requests, environments, env-variables, test-cases, test-runs |
| 3 | Test Engine | ✅ done | 6 assertion types (status/latency/header/jsonpath/schema/script), runner, `/api/tests` + `/api/tests/suite` |
| 4 | AI Provider Layer | ✅ done | 4 adapters (OpenAI / Anthropic / Google / DeepSeek) + AES-256-GCM key encryption |
| 5 | AI Agent | ✅ done | 5 tool descriptors, bounded 10-step runtime, SSE streaming, `/api/ai-agent` |
| 6 | UI Foundation | ✅ done | AppShell (sidebar + topbar + optional right pane), env switcher, command palette, Zustand store, `/` → `/workspace` redirect |
| 7 | Request Editor UI | ✅ done | Method + URL + Send + Save, 4 tabs (Params/Headers/Body/Auth), response viewer (pretty/raw/preview + headers), save-to-collection dialog |
| 8 | Environments + Tests UI | ✅ done | Env editor (CRUD + activate + secret vars), tests UI (CRUD + run single + run suite + 6 assertion editors) |
| 9 | AI Chat UI | ✅ done | Right-pane streaming chat, tool call cards, fullscreen `/workspace/agent` view |
| 10 | Settings UI | ✅ done | Per-provider cards (model, base URL, encrypted key with reveal + clear), active provider dropdown |
| 11 | Documentation | ⏳ in-progress | Status file is current; final docs pass (user guide, screenshots) pending |
| 12 | E2E + GitHub push | ❌ blocked | Playwright config exists; push blocked on user providing GitHub credentials |

## Build output (latest `pnpm build`)

```
Route (app)                                 Size  First Load JS
┌ ○ /                                      166 B         103 kB
├ ƒ /api/ai-agent                          166 B         103 kB
├ ƒ /api/collections, /collections/[id]    166 B         103 kB
├ ƒ /api/env-variables, .../[id]           166 B         103 kB
├ ƒ /api/environments, .../[id], /activate 166 B         103 kB
├ ƒ /api/request, /api/requests, .../[id]  166 B         103 kB
├ ƒ /api/settings/ai                       166 B         103 kB
├ ƒ /api/test-cases, /test-cases/[id]      166 B         103 kB
├ ƒ /api/test-runs/[id]                    166 B         103 kB
├ ƒ /api/tests, /api/tests/suite           166 B         103 kB
├ ○ /workspace                           6.14 kB         129 kB
├ ○ /workspace/agent                     3.65 kB         114 kB
├ ○ /workspace/environments              3.51 kB         113 kB
├ ○ /workspace/settings                  3.48 kB         113 kB
└ ○ /workspace/tests                     4.27 kB         114 kB
```

19 dynamic API routes + 5 static workspace pages. No build errors, no warnings.

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
   - Server query types are snake_case (raw SQL rows aren't camelCased).
     Use `r.request_id`, `r.auth_config`, `tc.request_id`, etc.

3. **BYOK is the only AI mode**
   - No backend proxy. The user's AI provider key is encrypted with AES-256-GCM
     using a per-install master key (file `~/.starbear/master.key`, chmod 600).
     The key is decrypted only inside server-side tool executors and never
     logged or returned to the client. The `/api/settings/ai` GET endpoint
     returns `keySetByProvider` (booleans only), not the keys.

4. **Local-first by default**
   - SQLite file at `.starbear/starbear.sqlite` (overridable via `STARBEAR_DB`
     env). All data is local; no network calls except the user-requested API
     calls + the user's own LLM provider.

5. **Vercel AI SDK v4 stream API**
   - Stream loops in each provider are simplified to only handle `text-delta`
     and `finish` events. Tool call data is recovered via `generateText` (not
     the stream). Provider code casts the `part` type because the SDK's
     generated types did not narrow correctly.

6. **Radix UI primitives + custom Tailwind**
   - `dialog`, `dropdown-menu` are wrapped from `@radix-ui/react-*`. `tabs`,
     `input`, `textarea`, `badge` are custom (small surface area, kept simple).
   - `cmdk` powers the command palette (`⌘K`).

7. **No component tests in Phase 6-10**
   - The 104 tests cover all backend logic. Component tests would require a
     DOM testing setup (e.g. `@testing-library/react` + jsdom) and were deferred
     to keep the UI delivery focused. The 19 API routes each have integration
     tests; the UI surfaces them with no additional business logic.

## How to verify the current state

```bash
cd "D:/Minimax total project/starbear"
pnpm install
pnpm typecheck          # tsc --noEmit, should be silent
pnpm test               # 104/104 should pass
pnpm build              # Next.js production build, 19 API + 5 workspace routes
pnpm dev                # http://localhost:3000 -> redirects to /workspace
```

UI smoke walkthrough (after `pnpm dev`):

1. Land on `/workspace` — request editor visible.
2. Pick a method, enter a URL (e.g. `https://httpbin.org/get`), click Send.
3. Switch to the Body tab, paste `{"hello":"world"}`, set kind to `json`, Send.
4. Click Save — name it, pick a collection. (Create one via API if none.)
5. Go to `/workspace/environments` — create env, add vars, mark as active.
6. Go to `/workspace/tests` — create a test case, add status assertion, run.
7. Go to `/workspace/settings` — set AI provider, model, key.
8. Toggle the right pane (icon in topbar) to open the AI chat. Ask the
   agent to "list my collections". Streamed tool calls render inline.
9. `⌘K` opens the command palette for fast nav.

## Open user-facing decisions (still pending)

1. **GitHub push (Phase 12)** — still requires user action:
   - Option A: user provides a Personal Access Token (PAT) and pushes manually.
   - Option B: user runs `gh auth login` in this shell so I can use `gh` to
     create the repo at `github.com/DukeChaos/StarBear` and push.
2. **Component tests (deferred)** — add Vitest + `@testing-library/react` and
   write tests for the UI primitives when there's time. Not blocking.
3. **Domain check** — the SSRF guard defaults to `strict`; the request editor
   passes `ssrfMode: 'allow-local'` in its POST body so local dev / test
   servers work. This is a per-call override allowed by `/api/request` and
   `/api/tests` schemas. Production deployments may want to remove the
   override or restrict it to a settings flag.

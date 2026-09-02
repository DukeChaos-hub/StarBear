# AGENTS.md

Operating manual for any AI agent (or human) working on StarBear.

This file is consumed by OpenCode, Codex, Cursor, Aider, Devin, Gemini CLI, Claude Code, and similar tools. If you are an agent: read this first.

## What this project is

StarBear is an AI-Native, open-source API client and testing tool (think Postman, with an LLM agent that can drive requests and test runs on your behalf). It is local-first, BYOK (bring your own AI key), and ships as a Next.js 15 monolith backed by SQLite.

**Spec:** `docs/superpowers/specs/2026-09-01-starbear-v1-design.md`
**Plan:** `docs/superpowers/plans/2026-09-01-starbear-v1.md` (13 phases, ~100 tasks)
**Status snapshot:** `docs/STATUS.md`

## Current state (as of last session)

- **10 / 13 phases** complete. Backend + full UI layer shipped.
- 33 git commits on `main`. Working tree clean (1 gitignored transient file).
- 104 / 104 tests pass. `pnpm typecheck` and `pnpm build` are green.
- 19 API routes are registered and exercised by integration tests; 5 workspace pages are statically built.
- Coverage 92.8% on `src/lib/**` (above the 80% floor).

| Phase                | Status     | Commit                                                                         |
| -------------------- | ---------- | ------------------------------------------------------------------------------ |
| 0 Project Foundation | ✅         | `464a459`                                                                      |
| 1 HTTP Engine        | ✅         | `ad55bb1`                                                                      |
| 2 Data Layer         | ✅         | `32f671c`                                                                      |
| 2.8 CRUD API routes  | ✅         | `aca7c49`                                                                      |
| 3 Test Engine        | ✅         | `…`                                                                            |
| 4 AI Provider Layer  | ✅         | `725dbaf`                                                                      |
| 5 AI Agent           | ✅         | `ba1e331`                                                                      |
| 6 UI Foundation      | ✅         | `b621193`                                                                      |
| 7 Request Editor     | ✅         | `30e1e76`                                                                      |
| 8 Env + Tests UI     | ✅         | `c755b60`                                                                      |
| 9 AI Chat            | ✅         | `afa30b8`                                                                      |
| 10 Settings UI       | ✅         | `3f28caf`                                                                      |
| 11 Documentation     | ⏳ partial | `7baa276` (STATUS); user-guide / architecture / dev-setup done in this session |
| 12 E2E + GitHub push | ❌ blocked | needs user creds                                                               |

## Hard rules

These are not negotiable. They are the result of decisions already made and committed.

1. **TypeScript strict mode** is on. `noUncheckedIndexedAccess: true`. No `any` in committed code. `unknown` + Zod parse is the correct escape hatch.
2. **TDD.** Every task in the plan follows test-first. Write the failing test, run it, write the implementation, run it again, commit.
3. **Conventional Commits.** `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `ci:`.
4. **MIT license.** No copyleft dependencies.
5. **No native bindings in production code.** We use Node 24's built-in `node:sqlite`. Do not reintroduce `better-sqlite3`.
6. **No server-side secrets in the client.** AI provider keys live in SQLite, encrypted with AES-256-GCM using the master key at `~/.starbear/master.key`. They are decrypted only inside server-side tool executors and never logged.
7. **No telemetry, no analytics, no auto-update.** Local-first means local.
8. **Tests run against ephemeral SQLite files** in `os.tmpdir()`. Do not use `.starbear/test.sqlite` as a fixture path.

## How to run

```bash
pnpm install                 # install
pnpm dev                     # http://localhost:3000 → /workspace
pnpm typecheck               # tsc --noEmit, must be silent
pnpm test                    # 104 vitest tests
pnpm test:coverage           # coverage on src/lib/**
pnpm build                   # production build
pnpm db:migrate              # apply migrations to .starbear/starbear.sqlite
pnpm db:seed                 # populate 1 env + 1 collection with 3 sample requests (idempotent)
pnpm gen:agent-manifest      # regenerate docs/ai-agent/ from src/lib/agent/tools.ts
```

## Architecture cheat sheet

```
src/
├── app/                       # Next.js App Router — routes and API handlers
│   ├── workspace/             # authenticated UI routes (Phase 6+)
│   └── api/                   # JSON API routes (Zod-validated)
├── components/                # React components, all client-side
│   ├── ui/                    # shadcn/ui primitives (button, dialog, …)
│   ├── shell/                 # AppShell, Sidebar, Topbar, EnvSwitcher
│   ├── request-editor/        # URL bar, tabs, body editor, auth form
│   ├── response-viewer/       # status, JSON tree, headers, cookies, raw
│   ├── collection-tree/       # tree view, request items, context menu
│   ├── env-editor/            # env list, variable row
│   ├── test-runner/           # assertion rows, report
│   └── ai-chat/               # chat thread, message bubble, tool call card
├── lib/                       # UI-agnostic, fully unit-tested
│   ├── http/                  # sendRequest, interpolate, SSRF guard
│   ├── db/                    # node:sqlite client, repositories
│   │   ├── client.ts          # getDb, all, get, run, exec, migrate
│   │   ├── schema.ts          # row types only (no Drizzle table defs)
│   │   ├── migrations/        # generated SQL files
│   │   └── repositories/      # one file per domain table
│   ├── ai/                    # provider adapters, prompts, crypto
│   ├── agent/                 # tool definitions, runtime, manifests
│   ├── test-engine/           # 6 assertion types, runner, report
│   └── stores/                # Zustand client-state stores
├── types/                     # ambient declarations (e.g. node:sqlite)
└── …
tests/
├── unit/                      # lib/** only
├── integration/               # API routes with ephemeral SQLite
└── e2e/                       # Playwright (Phase 12)
```

## Key architectural decisions and why

- **node:sqlite, not better-sqlite3.** better-sqlite3 12 prebuilt download failed on this network and node-gyp needs Python which we don't have. Node 24 ships `node:sqlite` stable. We use a CJS shim (`src/lib/db/sqlite-shim.cjs`) to load it because Vite/Vitest cannot resolve the `node:` import protocol.
- **Drizzle schema is type-only.** `drizzle-kit` still generates SQL migrations, but our `src/lib/db/schema.ts` only exports TypeScript interfaces, not `sqliteTable` definitions. Repositories use raw SQL parameterized via the `all() / get() / run()` helpers.
- **BYOK AI.** No server-side proxy. The user pastes their OpenAI / Anthropic / Google / DeepSeek key in Settings, we encrypt with AES-256-GCM, decrypt only in tool executors, never log.
- **Bounded agent loop.** The AI Test Agent caps at 10 tool turns per user message. After that, the agent emits a `finish` event with reason `max_steps`.

## How to add a new domain field

1. Update `src/lib/db/schema.ts` (TypeScript interface) **and** `src/lib/db/migrations/NNNN_*.sql` (Drizzle-generated).
2. Add a small test in `tests/unit/db/repos.test.ts` to prove it round-trips.
3. Update the matching `src/app/api/<resource>/route.ts` Zod schema.
4. Update `src/lib/db/repositories/<resource>.ts` to read/write the column.
5. Update any UI consumer (Phase 6+).
6. Add a `docs/STATUS.md` phase bump.

## How to add a new tool to the AI Agent

1. Add a `ToolDescriptor` to `src/lib/agent/tools.ts`.
2. Register it in `allToolDescriptors` and add a case to `executeTool`.
3. Run `pnpm gen:agent-manifest` to regenerate `docs/ai-agent/agent-manifest.json` and `docs/ai-agent/tool-reference.md`. **CI fails if these are stale.**
4. Add a unit test in `tests/unit/agent/tools.test.ts`.

## How to write a feature

1. Find the task in the plan (e.g. `Phase 3 / Task 3.4`).
2. Read the test step and the implementation step in full.
3. Write the failing test, run it, verify it fails for the right reason.
4. Write the implementation, run it, verify it passes.
5. `git add` the touched files and commit with `feat:` or `fix:`.
6. Move to the next step.

If the plan task is wrong or impossible, fix the plan in `docs/superpowers/plans/2026-09-01-starbear-v1.md` first, then implement. Do not silently deviate.

## Known sharp edges (read before editing)

- **Node version.** Plan says 20, real env is 24. `node:sqlite` requires 22.5+. The `.nvmrc` is 20 — that's a lie. Either bump it to 24, or use Node 22.5+ in CI.
- **ESLint 9 + Next 15 patcher is broken** on this platform. `next.config.ts` has `eslint: { ignoreDuringBuilds: true }` as a workaround. CI runs `pnpm lint` separately; investigate when convenient.
- **`getSettings` import path.** `src/lib/db/ai-settings.ts` re-exports the real `get` and `save` as `getSettings` and `saveSettings`. Don't import from `repositories/ai-settings` directly from API routes — use the alias for forward compat.
- **`exec` vs `run` in `src/lib/db/client.ts`.** `exec(sql)` is for DDL (no params). `run(sql, params)` is for DML (takes a params array). Mixing them throws or returns wrong data.
- **Vitest `pool: 'forks'`** in `vitest.config.ts` is required. Without it, the `node:sqlite` CJS shim fails to load under Vite's transform pipeline.
- **`STARBEAR_DB` env var is read inside `getDb()`, not at module load.** Tests rely on this to swap in a fresh temp DB per case.

## Commands I should run before claiming "done"

```bash
pnpm typecheck        # must be silent
pnpm test             # must be all green
pnpm build            # must succeed and list 14+ API routes
```

If any of these fails, the work is not done.

## Pull request checklist

See `.github/PULL_REQUEST_TEMPLATE.md` (filled in by Phase 12).

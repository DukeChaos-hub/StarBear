# Changelog

All notable changes to StarBear are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-02

First public release. **35 commits on `main`**, **127/127 tests pass** (104 unit/integration + 23 component), **6/6 Playwright E2E pass**, **TypeScript strict + noUncheckedIndexedAccess**, **Node 24 / `node:sqlite` / MIT licensed**.

### Highlights

- **HTTP engine** — `{{var}}` interpolation (deep), SSRF guard (`strict` / `allow-local`), undici-backed `sendRequest` with bearer / basic / apikey auth, 30 s default timeout.
- **Data layer** — 10 tables, 9 repositories, raw SQL via Node 24's built-in `node:sqlite`, Drizzle Kit for migration generation only.
- **19 API routes** — collections, requests, environments, env-variables, test-cases, test-runs, the live `/api/request` executor, `/api/tests` and `/api/tests/suite`, and `/api/ai-agent` for SSE streaming.
- **Test engine** — 6 assertion types (`status` / `latency` / `header` / `jsonpath` / `schema` / `script`), runner, suite report, persisted run history.
- **AI provider layer** — AES-256-GCM key encryption (per-install master key at `~/.starbear/master.key` or `STARBEAR_MASTER_KEY`), 4 vendor adapters (OpenAI / Anthropic / Google / DeepSeek) on the Vercel AI SDK v4.
- **AI agent** — 5 tools (`list_collections`, `search_requests`, `send_request`, `run_test_case`, `save_request`), bounded 10-step runtime, SSE streaming endpoint.
- **Complete UI** at `/workspace` — AppShell with collapsible sidebar, env switcher, `⌘K` command palette, request editor (4 tabs), response viewer (pretty / raw / preview + headers), environments editor, tests UI with 6 assertion editors, AI chat right-pane with tool-call cards, fullscreen `/workspace/agent`, per-provider settings UI.
- **Tests** — 104 backend (Vitest, `pool: 'forks'` for `node:sqlite` shim), 23 component (`@testing-library/react` + jsdom), 6 E2E (Playwright + Chromium).
- **Docs** — `docs/user-guide.md`, `docs/architecture.md`, `docs/development/setup.md`, refreshed `README.md` / `AGENTS.md` / `CONTRIBUTING.md` / `docs/STATUS.md`.

### Known sharp edges

- Plan says Node 20; the project is on **Node 24** (required for `node:sqlite` ≥ 22.5). `.nvmrc` is at 24.
- `next lint` is disabled in `next.config.ts` because ESLint 9 + Next 15's `eslint-config-next` patcher is broken on Windows. CI runs `pnpm lint` separately.
- `pool: 'forks'` is required in `vitest.config.ts`; without it the CJS shim fails to load under Vite.
- Component tests require `esbuild.jsx: 'automatic'` in `vitest.config.ts` (Next uses `jsx: 'preserve'` in `tsconfig.json`).
- The AI chat UI keeps conversation history in component state; reloading `/workspace/agent` starts a new thread. Server-side history is stored but not yet surfaced.

### Out of scope (deferred)

- Native desktop packaging
- Response chaining
- Team workspaces, shareable collection links

See the full per-phase history below in [Unreleased] and the [Unreleased] section will be cleared on the next release prep.

## [Unreleased]

### Added

- **`pnpm db:seed` populates a sample `dev` environment and `Sandbox` collection with 3 requests.**
- **`pnpm db:reset` drops all tables and re-applies migrations.**
- `AGENTS.md` operating manual.
- `docs/STATUS.md` session handoff.
- `docs/development/last-smoke.md` last smoke run record.
- `.env.example` documents `STARBEAR_DB` / `STARBEAR_MASTER_KEY` / `PORT`.

### Added (Phase 3 — Test Engine, 2026-09-01)

- 6 assertion types: `status`, `latency`, `header`, `jsonpath`, `schema`, `script`.
- `runTestCase` executor + `buildSuiteReport` aggregate, both unit-tested.
- `POST /api/tests` and `POST /api/tests/suite` with Zod validation; both accept `ssrfMode` per-call override.
- `test_runs` and `test_run_steps` repositories + `GET /api/test-runs/[id]`.

### Added (Phase 4 — AI Provider Layer, 2026-09-01)

- AES-256-GCM key crypto at `src/lib/ai/crypto.ts`; master key in `~/.starbear/master.key` (chmod 600) or `STARBEAR_MASTER_KEY` env.
- Unified `AIProvider` interface and 4 vendor adapters (OpenAI, Anthropic, Google, DeepSeek) over the Vercel AI SDK v4.
- `GET`/`POST /api/settings/ai` with key encryption-on-save and `keySetByProvider` booleans on read.

### Added (Phase 5 — AI Agent, 2026-09-01)

- 5 tool descriptors and executors: `list_collections`, `search_requests`, `send_request`, `run_test_case`, `save_request`.
- Bounded 10-step agent runtime (`src/lib/agent/runtime.ts`) that yields `text` / `tool-call` / `tool-result` / `finish` / `error` events.
- `POST /api/ai-agent` SSE streaming endpoint with `x-starbear-conv` and `x-starbear-max-steps` headers.
- `pnpm gen:agent-manifest` regenerates `docs/ai-agent/agent-manifest.json` and `docs/ai-agent/tool-reference.md` from the code.

### Added (Phase 6 — UI Foundation, 2026-09-01)

- `AppShell` (sidebar + topbar + optional right pane), `Sidebar` with 5 nav targets, `Topbar` with env switcher, ⌘K, and right-pane toggle.
- `CommandPalette` (cmdk + Radix dialog) for fast navigation.
- `EnvSwitcher` (Radix dropdown-menu) hitting `/api/environments`.
- `useWorkspace` Zustand store (`rightPaneOpen`, `sidebarCollapsed`).
- Five workspace routes: `/workspace`, `/workspace/environments`, `/workspace/tests`, `/workspace/agent`, `/workspace/settings`.
- `/` server-redirects to `/workspace`.
- New Radix wrappers: `dropdown-menu`, `dialog`; new lightweight `tabs` (controlled + uncontrolled).

### Added (Phase 7 — Request Editor, 2026-09-01)

- `RequestEditor` with method select, URL bar, Send + Save buttons.
- 4 tabs: Params, Headers, Body, Auth. `Body` supports `none` / `json` / `form` / `raw` kinds. `Auth` supports `none` / `bearer` / `basic` / `apikey` (header or query).
- `ResponseViewer`: status badge, latency, size; body in `pretty` / `raw` / `preview`; full headers table.
- `SaveDialog` to name a request and pick a collection, persisting to `/api/requests`.
- New UI primitives: `Input`, `Textarea`, `Badge`.

### Added (Phase 8 — Environments + Tests UI, 2026-09-01)

- `/workspace/environments` full editor: left list with create + activate; right KV editor with secret toggle, reveal/hide, save-on-blur.
- `/workspace/tests` full editor: left list with create/run/delete and "Run all"; right detail with request-binding dropdown and 6 per-type assertion editors.

### Added (Phase 9 — AI Chat, 2026-09-01)

- `AgentChat` streams text deltas into a single growing assistant bubble, tool calls into inline cards (name + arg summary + ok/err after result), errors as red banners.
- Captures `x-starbear-conv` and re-sends on follow-up turns.
- `/workspace/agent` is a dedicated fullscreen version with a tip card.

### Added (Phase 10 — Settings UI, 2026-09-01)

- Per-provider cards (openai / anthropic / google / deepseek) with model, base URL, encrypted API key.
- Active-provider dropdown highlights the chosen card.
- `GET /api/settings/ai` now returns `keySetByProvider` (booleans only).
- `POST` treats empty string as "clear this provider's key" — clears from the existing encrypted map and persists.
- Password input with reveal/hide toggle and explicit Clear button when set.

### Added (Phase 11 — Documentation, 2026-09-01)

- `docs/user-guide.md` — UI walkthrough with ASCII diagrams.
- `docs/architecture.md` — system design, data model, AI agent pipeline, crypto, test architecture, extension guide.
- `docs/development/setup.md` — prerequisites, install, configure, run, verify, troubleshooting.
- `docs/development/index.md` — dev topic index.
- README upgrade: feature parity with the actual surface, links to the new docs.

### Added (Phase 12 — Component Tests + E2E, 2026-09-01)

- 8 new `@testing-library/react` component tests for `RequestEditor`, `SaveDialog`, `ResponseViewer`, `Topbar` (totals 31).
- 6 Playwright E2E specs under `tests/e2e/` covering shell navigation, the editor save flow, the env editor, the test runner, AI chat streaming, and the settings panel.

### Added (v0.2.1 — Mock Server Backend, 2026-09-02)

- `mock_servers` + `mock_responses` tables and their repositories.
- Catch-all route `/api/mock/[id]/[...path]` with `{{var}}` interpolation, `delay_ms` support, and per-server base-path prefixing.
- CRUD for `/api/mock-servers` and `/api/mock-servers/[id]/responses` (via `createResourceRouter`).
- Fix for a real security bug: `node:dns` lookup errors were being swallowed by the SSRF guard, letting requests through to IPv6-only loopback aliases. The guard now fails closed.

### Added (v0.2.2 — Mocks UI, 2026-09-02)

- `/workspace/mocks` page with left list, response CRUD, and a live "Test" panel that hits the mock endpoint and shows the response.
- New `Sidebar` entry pointing at `/workspace/mocks`.

### Added (v0.2.3 — OpenAPI Import, 2026-09-02)

- 3.0 / 3.1 spec parser in `src/lib/import/openapi.ts` (pure function, fully unit-tested) handling `$ref` resolution and 6 security schemes.
- `POST /api/import/openapi/preview` and `/apply` routes.
- `/workspace/import` page: paste a spec (or fetch by URL), see the parsed tree, choose target collection, click Import.
- Re-uses the existing `requests` and `collections` tables — no new DB tables needed.

### Added (v0.2.4 — AI Conversation History UI, 2026-09-02)

- `GET /api/ai-conversations` (list), `DELETE /api/ai-conversations?id=…`, and `GET /api/ai-conversations/[id]/messages` (with parsed `toolCalls`).
- `AgentChat` rewritten with `useFetch`: top-bar dropdown switches into past conversations; "New" button clears; `ConfirmDialog` for delete. Persisted messages re-render correctly (assistant text + `tool_calls` as separate bubbles).

### Refactored (R1–R5, 2026-09-02)

- **R1 — `createResourceRouter({ repo, patchSchema, idParam?, checkExistence?, includeGet? })`** factory in `src/lib/api/route-helpers.ts`. 7 `[id]/route.ts` files collapsed from 30–50 lines of boilerplate each to 4–7 line factory calls (~180 lines deleted). New `update()` method added to `environments` repo.
- **R2 — `useFetch<T>(url|null)` and `useApiCall(url, method)`** hooks in `src/lib/hooks/use-fetch.ts` with `AbortController` and per-call `url` / `method` / `body` override. `/workspace/environments` and `/workspace/agent` now use them.
- **R3 — `ConfirmDialog`** (render-prop trigger, busy state) in `src/components/ui/confirm-dialog.tsx`. Replaced 3 `window.confirm()` sites (1 in `/workspace/tests`, 2 in `/workspace/mocks`).
- **R4 — `runSuite()` extracted to `src/lib/test-engine/suite-runner.ts`** so the API and the background scheduler can call the same code path with no duplication.
- **R5 — dead code cleanup**, fixed `useFetch` so its `refresh` callback no longer causes a `react-hooks/refs` warning.

### Added (v0.2.5 — Scheduled Test Runs, 2026-09-03)

- `scheduled_jobs` table + repository with `listDue(now)` and `markRun()`.
- `src/lib/scheduler/{next-run,tick,boot}.ts` — pure `nextRunAt()` (minutes / hours / days-at-HH:MM / weeks-on-weekday-at-HH:MM), `tick()` that runs due jobs and bumps the schedule, idempotent `ensureSchedulerStarted()` singleton.
- `src/instrumentation.ts` Next.js startup hook that calls `ensureSchedulerStarted()` on the Node runtime (no custom server needed).
- `GET/POST /api/schedules`, `GET/PATCH/DELETE /api/schedules/[id]`, `POST /api/schedules/[id]/run`, `GET /api/schedules/[id]/runs`. PATCH recomputes `next_run_at` when the interval knobs change.
- `/workspace/schedules` list (with enabled toggle, manual "Run now", delete, last/next-run indicators), `/workspace/schedules/new` create form (test-case multi-select + interval picker), `/workspace/schedules/[id]` detail/edit with right-side "Recent runs" panel.
- New `Sidebar` entry "Schedules".
- 24 new unit tests (20 for `nextRunAt`, 4 for `tick`) and 11 new integration tests covering full CRUD + manual run + run history.
- Total: **42+ commits**, **227/227 tests pass** (was 192), typecheck / lint / build clean.

### Fixed

- `app-shell.tsx` import paths for `sidebar` and `env-switcher` after the Phase 6 batch.
- `route.ts` (settings/ai) uses the correct `getSettings` / `saveSettings` aliases from `@/lib/db/ai-settings`.

## [0.1.0] - 2026-09-01

### Added

- Project foundation: Next.js 15, React 19, TypeScript strict, shadcn/ui, Tailwind v4, Vitest, Playwright config, ESLint, Prettier, GitHub Actions CI.
- HTTP engine (`src/lib/http/`):
  - `{{var}}` string interpolation with deep object/array support.
  - SSRF guard with `strict` and `allow-local` modes (IPv4 + IPv6 private ranges, DNS-rebinding check, non-http schemes blocked).
  - undici-backed `sendRequest` with Bearer / Basic / API-Key auth, request timeout, JSON body parsing.
  - `POST /api/request` route with Zod validation and typed error responses (`ssrf_blocked`, `unresolved_variable`, `timeout`, `upstream`).
- Data layer (`src/lib/db/`):
  - 10 tables (collections, requests, environments, env_variables, test_cases, test_runs, test_run_steps, ai_conversations, ai_messages, ai_settings) with Drizzle Kit migration generation, executed via Node 24's built-in `node:sqlite`.
  - 9 repositories with raw SQL (Drizzle schema-as-types).
  - 14 CRUD API routes covering all tables.
- Tests: 46 tests passing across unit, integration, and end-to-end smoke. Coverage thresholds set to 80% on `src/lib/**`.

### Architecture decisions

- **node:sqlite, not better-sqlite3.** better-sqlite3 12 prebuilt download failed on this network; node-gyp rebuild failed (no Python on Windows). Node 24 ships `node:sqlite` stable. A CJS shim (`src/lib/db/sqlite-shim.cjs`) is used to bypass Vite/Vitest's import resolver.
- **Drizzle schema is type-only.** `drizzle-kit` generates SQL migrations; repositories use raw SQL parameterized via helpers in `client.ts`.
- **BYOK AI** (planned for Phase 4). No server-side proxy; AI provider keys are encrypted with AES-256-GCM at rest.

### Known sharp edges

- Plan says Node 20; actual environment is Node 24 (required for `node:sqlite`). Bump `.nvmrc` to 24 before tagging a release.
- `next lint` is disabled in `next.config.ts` because ESLint 9 + Next 15's `eslint-config-next` patcher is broken on this platform. CI runs `pnpm lint` separately.
- `pool: 'forks'` is required in `vitest.config.ts`; without it, the CJS shim fails to load under Vite.

### Out of scope (deferred to v0.2+)

- Mock server, team collaboration, API documentation site, OpenAPI import.
- CI/CD integration, scheduled runs.
- Native desktop packaging (Tauri / Electron).
- AI Test Agent, AI Test Generation, AI Settings UI (Phase 4-10).
- E2E Playwright suite and GitHub push (Phase 12).

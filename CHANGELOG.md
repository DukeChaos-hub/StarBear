# Changelog

All notable changes to StarBear are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `pnpm db:seed` populates a sample `dev` environment and `Sandbox` collection with 3 requests.
- `pnpm db:reset` drops all tables and re-applies migrations.
- `AGENTS.md` operating manual.
- `docs/STATUS.md` session handoff.
- `docs/development/last-smoke.md` last smoke run record.
- `.env.example` documents `STARBEAR_DB` / `STARBEAR_MASTER_KEY` / `PORT`.

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

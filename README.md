# StarBear

> **AI-Native, open-source API client and testing tool.**

![StarBear logo](./public/logo.svg)

[Quick start →](#quick-start) · [Architecture →](./docs/superpowers/specs/2026-09-01-starbear-v1-design.md) · [Roadmap](#roadmap) · [AGENTS.md](./AGENTS.md) (for AI agents and contributors)

## What it is

StarBear is a local-first tool for designing, testing, and automating HTTP APIs. The **AI Test Agent** can inspect your collections, run requests, and execute test suites with a natural-language goal.

It is not a clone of Postman / Apifox / Apipost — those are mature products built by 30–100+ engineer teams over 5–10 years. StarBear focuses on the developer-daily workflow with an opinionated, fast UI and an AI surface that is actually useful, not a bolted-on chatbot.

## Why

Existing tools are powerful but heavy. StarBear is local-first, BYOK, MIT-licensed, and built to be readable and modifiable by a single contributor.

## Quick start

Requires **Node 22.5+** (the project uses Node 24's `node:sqlite`) and **pnpm 10+**.

```bash
git clone https://github.com/DukeChaos/StarBear
cd StarBear
pnpm install
pnpm db:migrate
pnpm db:seed        # optional: sample data
pnpm dev
```

Then open <http://localhost:3000>. The landing page is in place; UI for the request editor is planned for Phase 6.

### Smoke-test the API right now

```bash
curl http://localhost:3000/api/collections
curl -X POST http://localhost:3000/api/collections \
  -H "content-type: application/json" \
  -d '{"name":"Sandbox"}'

curl -X POST http://localhost:3000/api/environments \
  -H "content-type: application/json" \
  -d '{"name":"dev"}'

curl -X POST http://localhost:3000/api/environments/<id>/activate

# Send a real request through the SSRF-guarded, var-interpolating client
curl -X POST http://localhost:3000/api/request \
  -H "content-type: application/json" \
  -d '{"method":"GET","url":"https://httpbin.org/get","ssrfMode":"strict","timeoutMs":10000,"vars":{}}'
```

## Features (v0.1.0)

- ✅ HTTP client with all methods, headers, params, body, auth, `{{var}}` interpolation
- ✅ SSRF guard (strict / allow-local modes)
- ✅ Collections, environments, env-var-as-map
- ✅ Test cases + test runs persistence (runner comes in v0.2)
- ✅ 14 CRUD API routes with Zod validation
- ❌ AI Test Generation, AI Test Agent, AI provider config (planned v0.2)
- ❌ Web UI for request editor, env editor, tests, AI chat (planned v0.2)
- ❌ Mock server, OpenAPI import, CI integration, scheduled runs (v0.3+)

## Architecture

| Layer | Stack |
|-------|-------|
| Framework | Next.js 15 + React 19 + TypeScript 5 (strict) |
| UI | shadcn/ui + Tailwind v4 |
| Database | SQLite via Node 24's built-in `node:sqlite` |
| ORM | Drizzle Kit (migration generation only; raw SQL for repos) |
| AI | Vercel AI SDK v5 (planned for v0.2) |
| Tests | Vitest (unit/integration) + Playwright (E2E, planned for v0.2) |

See [docs/superpowers/specs/2026-09-01-starbear-v1-design.md](./docs/superpowers/specs/2026-09-01-starbear-v1-design.md) for the full design.

## Development

```bash
pnpm dev          # next dev
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
pnpm test:coverage  # v8 coverage on src/lib/**
pnpm lint         # eslint
pnpm build        # production build
pnpm db:migrate   # apply schema to .starbear/starbear.sqlite
pnpm db:seed      # populate 1 env + 1 collection with 3 requests (idempotent)
pnpm db:reset     # drop all tables + re-migrate
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [AGENTS.md](./AGENTS.md).

## Documentation

- [docs/README.md](./docs/README.md) — index
- [docs/STATUS.md](./docs/STATUS.md) — current progress and known sharp edges
- [docs/superpowers/specs/](./docs/superpowers/specs/) — design spec
- [docs/superpowers/plans/](./docs/superpowers/plans/) — implementation plan
- [docs/development/last-smoke.md](./docs/development/last-smoke.md) — last smoke run record

## Roadmap

- **v0.1.x** — backend CRUD layer (delivered), Test Engine (assertions + runner), E2E tests
- **v0.2** — AI Test Agent (5 tools, bounded loop, SSE streaming), AI provider adapters (OpenAI / Anthropic / Google / DeepSeek), request editor UI, response viewer UI
- **v0.3** — Mock server, scheduled runs, response chaining
- **v1.0** — stable, documented, daily-driver grade

## License

[MIT](./LICENSE) © 2026 DukeChaos

## Acknowledgements

Built with: Next.js, React, Vercel AI SDK, shadcn/ui, Tailwind, Drizzle, Vitest, Playwright, Node 24.

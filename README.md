# StarBear

> **AI-Native, open-source API client and testing tool.**

![StarBear logo](./public/logo.svg)

[**Quick start**](#quick-start) · [**User guide**](./docs/user-guide.md) · [**Architecture**](./docs/architecture.md) · [**Roadmap**](#roadmap) · [**AGENTS.md**](./AGENTS.md) (for AI agents and contributors)

## What it is

StarBear is a local-first tool for designing, testing, and automating HTTP APIs. The **AI Test Agent** can inspect your collections, run requests, and execute test suites from a natural-language goal.

It is not a clone of Postman / Apifox / Apipost — those are mature products built by 30–100+ engineer teams over 5–10 years. StarBear focuses on the developer-daily workflow with an opinionated, fast UI and an AI surface that is actually useful, not a bolted-on chatbot.

## Why

Existing tools are powerful but heavy. StarBear is local-first, BYOK, MIT-licensed, and built to be readable and modifiable by a single contributor. **Your data never leaves your machine unless you ask it to.**

## Features (v0.1.x)

**Backend**

- ✅ HTTP client — all methods, headers, params, body, auth, `{{var}}` interpolation
- ✅ SSRF guard (`strict` / `allow-local` modes)
- ✅ Collections, environments, env-var-as-map
- ✅ 6 assertion types (status / latency / header / jsonpath / schema / script) + test runner + suite
- ✅ 19 API routes with Zod validation, all covered by integration tests
- ✅ BYOK AI: 4 vendor adapters (OpenAI / Anthropic / Google / DeepSeek), AES-256-GCM at rest
- ✅ AI agent: 5 tools (list_collections, search_requests, send_request, run_test_case, save_request), bounded 10-step runtime, SSE streaming
- ✅ Auto-generated agent manifest + tool reference for external SDK consumers

**Frontend** (`/workspace`)

- ✅ App shell with collapsible sidebar, topbar env switcher, ⌘K command palette
- ✅ Request editor — method + URL + 4 tabs (Params / Headers / Body / Auth) + Save
- ✅ Response viewer — status badge, latency, size, pretty/raw/preview body, headers table
- ✅ Environments editor — list + activate + secret variables
- ✅ Tests UI — bind cases to requests, edit all 6 assertion types, run single or suite
- ✅ AI chat — streaming right-pane + fullscreen `/workspace/agent` with tool-call cards
- ✅ Settings — per-provider cards (model, base URL, encrypted key with reveal/clear)

**Quality**

- ✅ TypeScript strict + `noUncheckedIndexedAccess`
- ✅ 104 / 104 tests pass, 92.8% line coverage on `src/lib/**`
- ✅ Conventional Commits, MIT license

## Quick start

Requires **Node 22.5+** (the project is tested on **Node 24**'s `node:sqlite`) and **pnpm 10+**.

```bash
git clone https://github.com/DukeChaos/StarBear
cd StarBear
pnpm install
cp .env.example .env.local      # optional; defaults work
pnpm db:migrate
pnpm db:seed                    # optional: 1 env + 1 collection + 3 requests
pnpm dev
```

Then open <http://localhost:3000> — it redirects to `/workspace`, the request editor. See [**docs/user-guide.md**](./docs/user-guide.md) for the full walkthrough.

### API smoke test

```bash
# List collections
curl http://localhost:3000/api/collections

# Create one
curl -X POST http://localhost:3000/api/collections \
  -H "content-type: application/json" \
  -d '{"name":"Sandbox"}'

# Create an env
curl -X POST http://localhost:3000/api/environments \
  -H "content-type: application/json" \
  -d '{"name":"dev"}'

# Activate it (replace <id> with the one from the response)
curl -X POST http://localhost:3000/api/environments/<id>/activate

# Send a request through the SSRF-guarded client
curl -X POST http://localhost:3000/api/request \
  -H "content-type: application/json" \
  -d '{"method":"GET","url":"https://httpbin.org/get","ssrfMode":"strict","timeoutMs":10000,"vars":{}}'
```

## Architecture

| Layer         | Stack                                                      |
| ------------- | ---------------------------------------------------------- |
| Framework     | Next.js 15 + React 19 + TypeScript 5 (strict)              |
| UI primitives | shadcn-style on Radix UI + custom Tailwind                 |
| Database      | SQLite via Node 24's built-in `node:sqlite`                |
| Migrations    | Drizzle Kit (generation only; raw SQL in repos)            |
| AI            | Vercel AI SDK v4 + 4 vendor adapters                       |
| Agent         | 5 tools, bounded 10-step runtime, SSE streaming            |
| Tests         | Vitest (unit/integration) + Playwright (E2E, config ready) |

See [**docs/architecture.md**](./docs/architecture.md) for the full design.

## Development

```bash
pnpm dev              # next dev
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest run (104 tests)
pnpm test:coverage    # v8 coverage on src/lib/**
pnpm lint             # eslint
pnpm build            # production build
pnpm db:migrate       # apply schema
pnpm db:seed          # populate 1 env + 1 collection (idempotent)
pnpm db:reset         # drop all + re-migrate (destructive)
pnpm gen:agent-manifest   # regenerate docs/ai-agent/ from the code
```

See [**docs/development/setup.md**](./docs/development/setup.md) for prerequisites and troubleshooting.

## Documentation

- [**docs/user-guide.md**](./docs/user-guide.md) — UI walkthrough
- [**docs/architecture.md**](./docs/architecture.md) — system design, data flow, AI agent pipeline
- [**docs/development/**](./docs/development/) — setup, smoke records, dev workflow
- [**docs/ai-agent/**](./docs/ai-agent/) — agent manifest + tool reference (auto-generated)
- [**docs/STATUS.md**](./docs/STATUS.md) — current progress and known sharp edges
- [**docs/superpowers/specs/**](./docs/superpowers/specs/) — design spec
- [**docs/superpowers/plans/**](./docs/superpowers/plans/) — 13-phase implementation plan

## Roadmap

- **v0.1.x (current)** — backend (HTTP engine, data layer, test engine, AI provider, AI agent) + complete UI (shell, request editor, response viewer, env editor, tests UI, AI chat, settings)
- **v0.2** — component tests (Vitest + @testing-library/react), Playwright E2E, **AI conversation history**, mock server
- **v0.3** — OpenAPI import, scheduled runs, response chaining, schema generation
- **v1.0** — stable, daily-driver grade, packaged binary for non-dev users

## License

[MIT](./LICENSE) © 2026 DukeChaos

## Acknowledgements

Built with: Next.js, React, Vercel AI SDK, Radix UI, cmdk, Tailwind, Drizzle, Vitest, Playwright, Node 24.

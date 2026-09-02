# StarBear v1 — Design Spec

**Date:** 2026-09-01
**Status:** Draft — pending user review
**Author:** Mavis (brainstorming session with DukeChaos)

---

## 1. Vision & Positioning

**StarBear** is an **AI-Native, open-source API client and testing tool** with a relentless focus on developer ergonomics and AI-driven automation.

It is not a feature-for-feature copy of Postman or any other incumbent API tooling. Those products are mature, built by 30–100+ engineer teams over 5–10 years. StarBear's v1 commits to a smaller, sharply defined surface area that a solo or small-team contributor can ship, maintain, and evolve.

### 1.1 The one-line pitch

> "An AI-Native API client where you can describe a test in plain English, watch the agent run it, and get a structured report — without leaving the keyboard."

### 1.2 Why "AI-Native" matters here

"AI-Native" does **not** mean "tacked-on chatbox with a GPT button". In StarBear v1, AI is a first-class actor in the workspace:

- The **AI Test Agent** has read/write access to collections, requests, environments, and test results via typed tool calls.
- The agent can plan a multi-step verification (e.g. "log in → capture token → use token in user profile call → assert 200 and matching id") and execute it autonomously, with full visual traceability.
- The agent's tool surface is documented as a stable, machine-readable contract in `docs/ai-agent/`, so external agents (Claude Code, Cursor, custom bots) can also drive StarBear.

### 1.3 v1 scope (in / out)

**In scope (v1 ships these):**

- API client: HTTP request editor + response viewer
- Collections & folders (tree, CRUD, drag-to-reorder)
- Environments & variable substitution (`{{var}}`)
- Test cases: assertions on status / JSON path / header / schema / latency
- Test runs: run single or suite, structured report
- AI Test Generation: natural language → test assertions
- AI Test Agent: chat-driven, tool-using, streaming, step-bounded agent loop
- AI provider configuration for OpenAI, Anthropic, Google, DeepSeek
- Settings, theme (light/dark), data export/import (JSON)
- Full local-only deployment (SQLite file, BYOK for AI)

**Out of scope (v1 explicitly defers — listed in roadmap):**

- Mock server, team collaboration, shared workspaces
- API documentation site, OpenAPI full import/export
- CI/CD integration, scheduled runs
- Native desktop packaging (Tauri/Electron)
- Cloud hosting, billing, accounts
- Plugin system (v2+)

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 15** (App Router) + **React 19** + **TypeScript 5** | Single deployable, server + client in one, AI ecosystem richest here |
| UI components | **shadcn/ui** (Radix + Tailwind), **Lucide React** icons | Copy-paste components, fully owned, beautiful by default |
| Styling | **Tailwind CSS v4** | Co-located with shadcn/ui |
| Client state | **Zustand** | Tiny, no boilerplate, devtools-friendly |
| Server state | **TanStack Query** (only for server-rendered fetches where useful) | Most state is local; only the AI streaming and test-run progress need it |
| Database | **SQLite** via **better-sqlite3** | Single-file, zero-config, perfect for local-first |
| ORM | **Drizzle ORM** | Type-safe, SQL-first, minimal magic |
| AI SDK | **Vercel AI SDK v5** + AI Gateway | Unified interface for OpenAI, Anthropic, Google; DeepSeek via OpenAI-compatible |
| HTTP client | **undici** (Node native fetch super-set) | High performance, no third-party HTTP deps |
| Validation | **Zod** | Shared schema between client and server |
| Forms | **react-hook-form** + Zod resolver | Standard pairing |
| Unit/integration tests | **Vitest** | Fast, ESM-native, watch mode |
| E2E tests | **Playwright** | Multi-browser, auto-waits, great DX |
| Package manager | **pnpm** | Fast, deterministic, workspace-friendly (future-proof) |
| Node | **Node.js 20 LTS** | Stable, Vercel AI SDK compatible |

**Principles:**

- **No bespoke framework.** Every choice above is the de-facto default of its category.
- **Reuse over reinvention.** Use mature libraries; only write code that is genuinely product-specific.
- **Type safety end-to-end.** TypeScript + Zod contracts from DB to UI.

---

## 3. Project Structure

```
starbear/
├── src/
│   ├── app/                                # Next.js App Router
│   │   ├── layout.tsx                      # Root layout (theme, providers)
│   │   ├── page.tsx                        # Redirect to /workspace
│   │   ├── workspace/
│   │   │   ├── layout.tsx                  # 3-pane shell
│   │   │   ├── page.tsx                    # Welcome / last-opened
│   │   │   ├── collections/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx            # Collection detail (request list)
│   │   │   │       └── request/[reqId]/page.tsx
│   │   │   ├── environments/page.tsx
│   │   │   ├── tests/
│   │   │   │   ├── page.tsx                # Test cases list
│   │   │   │   ├── [id]/page.tsx           # Test case detail
│   │   │   │   └── runs/[runId]/page.tsx   # Run report
│   │   │   ├── agent/page.tsx              # AI Agent chat
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── request/route.ts            # POST: send HTTP request
│   │       ├── tests/
│   │       │   ├── route.ts                # POST: run test case
│   │       │   └── suite/route.ts          # POST: run a test suite
│   │       ├── ai/
│   │       │   ├── generate/route.ts       # POST: NL → assertions
│   │       │   └── chat/route.ts           # POST: streaming chat (no tools)
│   │       ├── ai-agent/route.ts           # POST: streaming agent loop with tools
│   │       ├── collections/route.ts
│   │       ├── environments/route.ts
│   │       ├── tests/route.ts
│   │       └── settings/route.ts
│   ├── components/
│   │   ├── ui/                             # shadcn/ui primitives
│   │   ├── shell/                          # AppShell, Sidebar, TopBar, EnvSwitcher
│   │   ├── collection-tree/                # TreeView, FolderItem, RequestItem
│   │   ├── request-editor/                 # MethodPicker, UrlBar, HeadersTable, BodyEditor, AuthForm
│   │   ├── response-viewer/                # StatusBadge, JsonViewer, HeadersTable, CookiesTable, RawView
│   │   ├── env-editor/                     # EnvList, VariableRow
│   │   ├── test-runner/                    # AssertionRow, RunButton, ReportTable
│   │   └── ai-chat/                        # MessageList, MessageBubble, ToolCallCard, InputBox
│   ├── lib/                                # Domain logic (UI-agnostic, fully testable)
│   │   ├── db/
│   │   │   ├── client.ts                   # Drizzle client
│   │   │   ├── schema.ts                   # Tables
│   │   │   ├── migrations/                 # SQL files
│   │   │   └── repositories/               # One repo per table
│   │   ├── http/
│   │   │   ├── client.ts                   # send() — wraps undici
│   │   │   ├── interpolate.ts              # {{var}} substitution
│   │   │   ├── scripts.ts                  # pre/post script runner (sandboxed subset)
│   │   │   └── auth.ts                     # Bearer / Basic / API Key helpers
│   │   ├── ai/
│   │   │   ├── provider.ts                 # Unified provider interface
│   │   │   ├── providers/                  # One adapter per vendor
│   │   │   │   ├── openai.ts
│   │   │   │   ├── anthropic.ts
│   │   │   │   ├── google.ts
│   │   │   │   └── deepseek.ts
│   │   │   ├── prompts.ts                  # Centralized prompt templates
│   │   │   └── crypto.ts                   # API key encryption (AES-256-GCM)
│   │   ├── agent/
│   │   │   ├── tools.ts                    # tool() definitions
│   │   │   ├── runtime.ts                  # Agent loop (bounded, streamable)
│   │   │   ├── manifests.ts                # Machine-readable tool manifest
│   │   │   └── trace.ts                    # Persist tool-call trace
│   │   ├── test-engine/
│   │   │   ├── assertions.ts               # Each assertion type
│   │   │   ├── runner.ts                   # Run a test case
│   │   │   └── report.ts                   # Build structured report
│   │   ├── stores/                         # Zustand stores
│   │   │   ├── workspace.ts
│   │   │   ├── active-request.ts
│   │   │   ├── environment.ts
│   │   │   └── agent.ts
│   │   └── utils/                          # cn(), formatters, etc.
│   └── types/
│       ├── api.ts                          # API DTOs
│       └── index.ts
├── docs/                                   # All documentation (see §8)
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
├── scripts/
│   ├── seed.ts                             # Populate demo data
│   └── reset-db.ts
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                          # lint + typecheck + test on PR
│   │   └── release.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug.md
│   │   └── feature.md
│   └── PULL_REQUEST_TEMPLATE.md
├── .vscode/
│   └── settings.json
├── public/
│   ├── logo.svg
│   └── favicon.ico
├── README.md
├── LICENSE                                 # MIT
├── CONTRIBUTING.md
├── CHANGELOG.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── .env.example                            # ANTHROPIC_API_KEY=, OPENAI_API_KEY=, ...
├── .gitignore
└── .nvmrc                                  # 20
```

---

## 4. Data Model (Drizzle Schema)

SQLite tables (snake_case columns, Drizzle generates migrations):

### 4.1 Core domain

```ts
// collections
{
  id: text pk,
  name: text not null,
  description: text,
  parent_id: text null,           // self-FK for folders
  sort_order: integer not null default 0,
  created_at: integer not null,   // unix ms
  updated_at: integer not null,
}

// requests
{
  id: text pk,
  collection_id: text not null fk -> collections.id,
  name: text not null,
  method: text not null,          // GET POST PUT PATCH DELETE HEAD OPTIONS
  url: text not null,
  headers: text not null default '[]',     // JSON: [{key,value,enabled}]
  query_params: text not null default '[]',
  body_kind: text not null default 'none', // none | json | form | raw | binary
  body: text,
  auth_kind: text not null default 'none',// none | bearer | basic | apikey
  auth_config: text,                       // JSON
  pre_script: text,                        // JS source (sandboxed)
  post_script: text,
  sort_order: integer not null default 0,
  created_at: integer not null,
  updated_at: integer not null,
}

// environments
{
  id: text pk,
  name: text not null unique,
  is_active: integer not null default 0,    // boolean (SQLite has no bool)
  created_at: integer not null,
  updated_at: integer not null,
}

// env_variables
{
  id: text pk,
  env_id: text not null fk -> environments.id on delete cascade,
  key: text not null,
  value: text not null,
  is_secret: integer not null default 0,
  sort_order: integer not null default 0,
  unique(env_id, key),
}
```

### 4.2 Testing

```ts
// test_cases
{
  id: text pk,
  request_id: text not null fk -> requests.id on delete cascade,
  name: text not null,
  description: text,
  assertions: text not null,               // JSON: Assertion[]
  sort_order: integer not null default 0,
  created_at: integer not null,
  updated_at: integer not null,
}

// Assertion (JSON in test_cases.assertions)
// type: "status" | "latency" | "jsonpath" | "header" | "schema" | "script"
// ... plus type-specific fields

// test_runs
{
  id: text pk,
  scope: text not null,                    // 'single' | 'suite' | 'agent'
  scope_ref: text,                         // test_case_id or suite id or 'agent:<conv_id>'
  started_at: integer not null,
  finished_at: integer,
  status: text not null,                   // 'running' | 'passed' | 'failed' | 'error'
  summary: text,                           // JSON: { total, passed, failed, duration_ms }
}

// test_run_steps
{
  id: text pk,
  run_id: text not null fk -> test_runs.id on delete cascade,
  step_index: integer not null,
  request_id: text fk,                     // null for agent steps
  name: text not null,
  status: text not null,                   // 'passed' | 'failed' | 'errored' | 'skipped'
  response_meta: text,                     // JSON: { status, latency_ms, size }
  error: text,
  assertions_result: text,                 // JSON: per-assertion outcome
}
```

### 4.3 AI

```ts
// ai_conversations
{
  id: text pk,
  title: text not null,
  kind: text not null,                     // 'agent' | 'generation'
  created_at: integer not null,
  updated_at: integer not null,
}

// ai_messages
{
  id: text pk,
  conversation_id: text not null fk -> ai_conversations.id on delete cascade,
  role: text not null,                     // 'system' | 'user' | 'assistant' | 'tool'
  content: text,                           // text content
  tool_calls: text,                        // JSON: [{name, args, result}]
  created_at: integer not null,
}

// ai_settings  (singleton row, id='singleton')
{
  id: text pk,                             // always 'singleton'
  active_provider: text,                   // 'openai' | 'anthropic' | 'google' | 'deepseek'
  model_by_provider: text,                 // JSON: { openai: 'gpt-4o', ... }
  encrypted_keys: text,                    // JSON: { openai: 'base64', ... }  (AES-256-GCM)
  base_url_by_provider: text,              // JSON for self-host / proxy
  master_key_check: text,                  // small marker to detect missing master key
  updated_at: integer not null,
}
```

### 4.4 ID strategy

Use `nanoid` (21-char URL-safe) for all primary keys. Avoids integer collision, lets us generate IDs client-side optimistically.

### 4.5 Encryption

AI API keys are encrypted at rest with AES-256-GCM. Master key comes from `STARBEAR_MASTER_KEY` env var; if absent at startup, the app prompts the user on first run to set one and persists to `~/.starbear/master.key` (chmod 600). The `master_key_check` field in `ai_settings` lets us detect "key was set but lost" scenarios gracefully.

---

## 5. Core Feature Specification

### 5.1 HTTP Request Editor (P0)

- **Layout:** vertical stack — URL bar (method dropdown + URL input + Send button) on top; below it a tab strip: Params / Headers / Body / Auth / Pre-script / Post-script / Tests.
- **Variables:** live substitution as the user types; unresolved `{{var}}` highlighted in red.
- **Response panel:** below the request; status, latency, size, JSON tree (collapsible), Headers, Cookies, Raw.
- **History:** every send is logged in the active request's run history (capped at last 50; persist to DB in v1.x).
- **Keyboard:** `Cmd/Ctrl+Enter` sends, `Cmd/Ctrl+S` saves.

### 5.2 Collections & Folders (P0)

- **Tree view** on the left rail.
- **CRUD:** right-click for context menu (New Request, New Folder, Rename, Duplicate, Delete).
- **Drag-to-reorder** within a parent; drop across parents moves.
- **Search** box at top of tree (filters by name and URL substring).
- **Persistence:** optimistic UI with server reconciliation; offline-safe (writes queue when API unreachable — v1.x).

### 5.3 Environments (P0 + P1)

- **CRUD** on `/workspace/environments`.
- **Active env** shown in top bar; clicking opens switcher.
- **Variable scopes (v1.x):** global + per-env. v1 ships per-env only.
- **Substitution:** `{{var}}` in URL, headers, params, body, auth config, scripts. Substitution happens at request-send time on the server (so secrets never reach the client).

### 5.4 Test Cases (P0 + P1)

- **Assertion types v1 supports:**
  - `status` — expected HTTP status (exact or one-of)
  - `latency` — max ms
  - `header` — header name + value match (exact or regex)
  - `jsonpath` — JSONPath + expected value (with `==`, `!=`, `contains`, `regex`)
  - `schema` — JSON Schema validation of response body
  - `script` — small JS expression returning truthy/falsy (sandboxed subset, no network)
- **Run modes:** single (from request detail) | suite (from test cases list, run all in order).
- **Report:** step list with status pill, expandable to show request/response/assertion details.

### 5.5 AI Test Generation (P1)

- **UX:** in the request editor's "Tests" tab, a "Generate with AI" button opens a small dialog with a textarea.
- **Flow:** user types intent → POST `/api/ai/generate` → AI returns suggested `Assertion[]` → user previews, edits inline, "Apply" merges into the test case.
- **Prompt:** system prompt + serialized request + env schema + the user's intent. Output is constrained JSON via Zod schema.

### 5.6 AI Test Agent (P0 — differentiator)

- **Entry point:** `/workspace/agent`; can also be invoked inline from any request.
- **Conversation UX:** chat thread on the right, main content area shows live "tool execution" cards as the agent acts. Linear / Vercel / Cursor aesthetic — not a generic chat.
- **Streaming:** server-sent events via Vercel AI SDK's `streamText` + `toolCalls`. Each tool invocation is rendered as it completes.
- **Tools (v1 set):**
  1. `send_request({ method, url, headers, body, auth? })` — runs the HTTP call server-side, returns `{status, headers, body, latency_ms}`. **No env var substitution in tool args** (the agent must use already-substituted URLs); the runtime calls `interpolate()` first.
  2. `run_test_case({ test_case_id })` — runs an existing test case.
  3. `save_request({ collection_id, name, method, url, headers, body, auth })` — persists a new request.
  4. `list_collections({})` — returns collection tree.
  5. `search_requests({ query })` — fuzzy search by name/URL.
- **Step bound:** max 10 tool turns per user message; user can "Continue" to extend.
- **Persistence:** every conversation and tool call is stored in `ai_conversations` / `ai_messages`, replayable in UI.
- **Failure handling:** if a tool errors, the error is returned to the model so it can adapt (e.g. "got 401, let me add the auth header").

### 5.7 AI Provider Layer (P0)

- **Unified interface:**

  ```ts
  interface AIProvider {
    id: 'openai' | 'anthropic' | 'google' | 'deepseek';
    chat(req: ChatRequest): Promise<ChatResponse>;
    stream(req: ChatRequest): AsyncIterable<StreamChunk>;
  }
  ```

- **Adapter per vendor** in `src/lib/ai/providers/`. DeepSeek is OpenAI-compatible so its adapter is ~10 lines.
- **Settings UX:** `/workspace/settings` — provider dropdown, model dropdown (fetched from provider's models API on first configure), API key input (masked), "Test connection" button.
- **Encrypted storage** as described in §4.5.

### 5.8 Settings & Data (P1 / P2)

- **Theme:** light / dark / system. shadcn/ui `next-themes` integration.
- **Import/Export:** JSON dump of all collections + envs (no test runs, no AI conversations) — download and re-upload. Useful for backup and sharing.
- **Reset workspace:** wipes SQLite, reseeds demo data.

---

## 6. UI / UX

### 6.1 Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ▌StarBear  [Workspace ▾]   [Env: dev ▾]   ● AI: Claude   ⚙      │ ← Top bar 48px
├──────────┬────────────────────────────────────────┬──────────────┤
│          │  ┌──────────────────────────────────┐   │              │
│ 🔍 Search│  │ POST ▾  {{base}}/auth/login  [Send]│   │   AI Agent   │
│          │  ├──────────────────────────────────┤   │              │
│ 📁 Auth  │  │ Params │ Headers │ Body │ Auth │  │   │  Test login: │
│  📄 Login│  ├──────────────────────────────────┤   │  1) 200 +     │
│  📄 Refresh│ │ Response  200  ·  156ms  · 1.2KB │   │     has token │
│ 📁 User  │  │ JSON │ Headers │ Cookies │ Raw   │   │  2) wrong pw  │
│  📄 Get  │  │ { "token": "eyJhbGciOiJI..." }   │   │     → 401     │
│  📄 List │  └──────────────────────────────────┘   │              │
│          │  [Tests tab: 2 assertions ✓ Run]       │  [Sending...] │
│ ⚙ Env   │                                        │   │              │
│ 📋 Tests │                                        │   │  [Type here] │
│ 🤖 Agent │                                        │   │              │
│          │                                        │   │              │
└──────────┴────────────────────────────────────────┴──────────────┘
   240px              flex                          320px (collapsible)
```

### 6.2 Design principles

- **Density > breathing room.** Linear-style, info-rich.
- **Keyboard-first.** Cmd+K command palette, `g c` go to collections, `g a` go to agent, `?` shortcut overlay.
- **Streaming > waiting.** AI responses stream; tool calls appear as they complete.
- **Optimistic UI.** State updates instantly; server reconciles in background.
- **Forgiving errors.** Inline validation, never a modal for a missing field.

### 6.3 Component inventory (shadcn/ui primitives)

button, input, textarea, select, tabs, dropdown-menu, dialog, sheet, tooltip, popover, command (palette), toast, scroll-area, separator, switch, badge, skeleton, collapsible, resizable (for panes).

---

## 7. AI Agent Design (Differentiator Deep-Dive)

### 7.1 Tool contract

Each tool is defined via Vercel AI SDK's `tool({ description, parameters: z.ZodObject, execute })`. The `execute` runs server-side; tools never receive secrets directly — they read from active env via `interpolate()`.

### 7.2 Manifest

`src/lib/agent/manifests.ts` exports a JSON object mirroring every tool:

```json
{
  "version": "1.0.0",
  "tools": [
    {
      "name": "send_request",
      "description": "Send an HTTP request and return the response.",
      "parameters": {
        "type": "object",
        "properties": {
          "method": {"type": "string", "enum": ["GET","POST","PUT","PATCH","DELETE"]},
          "url": {"type": "string"},
          "headers": {"type": "object", "additionalProperties": {"type":"string"}},
          "body": {"type": ["string","object","null"]}
        },
        "required": ["method", "url"]
      }
    },
    ...
  ]
}
```

This is also written to `docs/ai-agent/tool-reference.md` and `docs/ai-agent/agent-manifest.json` for external consumption.

### 7.3 Prompt

System prompt includes:

- StarBear's purpose (1 short paragraph)
- Available tools (rendered from manifest)
- Output format expectations
- Safety guardrails: "Do not exfiltrate secrets", "Refuse to send requests to non-HTTP(S) URLs", "If a tool returns an error, try once more with adaptation, then report and stop"

### 7.4 Runtime loop

```ts
async function* agentLoop(messages, tools) {
  let steps = 0;
  let currentMessages = messages;
  while (steps < MAX_STEPS) {
    const stream = streamText({
      model: getModel(),
      messages: currentMessages,
      tools,
      onFinish: persistMessage,
    });
    let toolCalls = [];
    for await (const chunk of stream) {
      if (chunk.type === 'tool-call') toolCalls.push(chunk);
      yield chunk; // forward to client
    }
    if (toolCalls.length === 0) return;
    const toolResults = await Promise.all(toolCalls.map(executeTool));
    currentMessages = [...currentMessages, ...formatResults(toolResults)];
    steps++;
  }
  yield { type: 'final', text: 'Reached step limit. Continue?' };
}
```

### 7.5 Security

- Tool execution runs in the same Node process as the API route. Sandboxing (isolated-vm or worker_threads with restricted globals) is **v1.x**; v1 relies on Zod input validation + the curated tool set.
- Outbound URLs are validated: only `http:` and `https:`; block private IP ranges (10/8, 172.16/12, 192.168/16, 127/8, ::1) by default to prevent SSRF against local services. **Toggle** in settings to allow (developers testing local APIs need this).
- AI provider keys never appear in tool args or conversation history.

---

## 8. Documentation Plan

Documentation is a first-class deliverable — the user explicitly called this out. All docs live under `docs/`.

### 8.1 Layout

```
docs/
├── README.md                                # Index / map of docs
├── getting-started/
│   ├── installation.md
│   ├── quick-start.md
│   └── ai-configuration.md
├── user-guide/
│   ├── api-client.md
│   ├── collections.md
│   ├── environments.md
│   ├── variables-and-scripts.md
│   ├── test-cases.md
│   ├── ai-test-generation.md
│   └── ai-agent.md
├── ai-agent/                                # Machine-friendly, stable contract
│   ├── README.md                            # How external agents integrate
│   ├── tool-reference.md                    # Human-readable, mirrors manifests.ts
│   ├── agent-manifest.json                  # Machine-readable, versioned
│   ├── conversation-format.md               # DB schema for ai_conversations / ai_messages
│   └── extending-agent.md                   # How to add a new tool
├── architecture/
│   ├── overview.md
│   ├── data-model.md
│   ├── http-engine.md
│   ├── ai-provider-layer.md
│   ├── agent-runtime.md
│   └── security.md
├── development/
│   ├── setup.md
│   ├── contributing.md
│   ├── testing.md
│   ├── coding-conventions.md
│   └── release.md
└── superpowers/
    └── specs/
        └── 2026-09-01-starbear-v1-design.md   # This file
```

### 8.2 Standards

- **One topic per file.** Long files split into a folder.
- **Each file has a "Last updated" stamp and "Tested with: StarBear vX.Y.Z" footer.**
- **Code samples must run.** Verified by CI in `docs-test` workflow (extract code blocks, smoke-run the importable ones).
- **Internal links relative.** Images in `docs/assets/`.

### 8.3 `docs/ai-agent/` is the AI-facing contract

It mirrors `src/lib/agent/manifests.ts` and is **regenerated by a build step** (`pnpm gen:agent-manifest`) so docs and code can't drift. CI fails if a `git diff` shows the manifest changed but the JSON file didn't.

---

## 9. Testing Strategy

### 9.1 Pyramid

```
        ┌────────────────┐
        │   E2E (10)     │  Playwright — critical user paths
        ├────────────────┤
        │  Integration   │  Vitest + test SQLite — API routes
        │     (40)       │
        ├────────────────┤
        │    Unit        │  Vitest — lib/* (http, ai, agent, test-engine)
        │    (150)       │
        └────────────────┘
```

### 9.2 Coverage targets

- `src/lib/**` ≥ 80% line coverage (Vitest with `c8`).
- Every API route has at least one happy-path and one error-path integration test.
- Every agent tool has a unit test for its executor and an integration test for end-to-end agent loop (using a mock provider).

### 9.3 Critical E2E scenarios (Playwright)

1. First-run: open app → seed data appears → click a request → Send → see response.
2. Create collection → add request → save → reload → still there.
3. Set up env with `{{base}}` variable → use in request URL → send → see substituted URL in history.
4. Create test case → Run → see pass.
5. Open AI Agent → "Test login" → see tool calls stream → see structured report.
6. Settings: enter fake OpenAI key → see validation error → correct key → "Connection OK" badge.

### 9.4 Manual smoke

`docs/getting-started/quick-start.md` doubles as a manual smoke script. The contributor who finishes a feature must run through quick-start on a clean clone.

### 9.5 Per-feature "multiple rounds of testing" gate

The plan (§10) bakes in a "test round" task after each major feature:

1. Implement
2. Unit + integration tests for the feature
3. Re-run full Vitest + Playwright suites
4. Manual smoke per quick-start
5. Only then mark the feature done

---

## 10. Delivery & GitHub

### 10.1 Repository

- **Owner:** `DukeChaos` (confirm before pushing)
- **Name:** `StarBear`
- **Visibility:** public
- **License:** MIT
- **Description:** "AI-Native API client and testing tool. Type, test, automate — with an agent that actually understands your APIs."

### 10.2 Initial files at repo root

- `README.md` — what it is, why, demo GIF placeholder, quick start, roadmap, contributing
- `LICENSE` (MIT)
- `CONTRIBUTING.md` — how to set up, coding style, PR process
- `CHANGELOG.md` — keep-a-changelog format
- `.github/workflows/ci.yml` — lint + typecheck + Vitest + Playwright on PR
- `.github/workflows/docs.yml` — verify doc code samples
- `.github/ISSUE_TEMPLATE/{bug,feature}.md`
- `.github/PULL_REQUEST_TEMPLATE.md`

### 10.3 First commit & push

```
git init
git add .
git commit -m "feat: initial StarBear v1 scaffold"
gh repo create StarBear --public --source=. --push --description "AI-Native API client and testing tool"
```

If `gh` CLI is not authenticated, fall back to: create the repo via GitHub web UI, then `git remote add origin git@github.com:DukeChaos/StarBear.git && git push -u origin main`.

### 10.4 CI minimum

- Node 20
- `pnpm install --frozen-lockfile`
- `pnpm lint` (ESLint + Prettier check)
- `pnpm typecheck` (tsc --noEmit)
- `pnpm test` (Vitest)
- `pnpm test:e2e` (Playwright, headless)
- `pnpm gen:agent-manifest` must produce no diff

---

## 11. Open Questions (to confirm with user before plan)

1. **GitHub username:** `DukeChaos` — confirm or correct.
2. **Repository name:** `StarBear` — confirm.
3. **License:** MIT — confirm.
4. **Out-of-scope items** (mock server, team collab, etc.) — confirm deferral is OK.
5. **Sandboxing for agent scripts** — v1 defers, v1.x adds. Confirm OK.
6. **SSRF block list** — default-on with toggle. Confirm.

---

## 12. Success Criteria for v1

A v1 release is "done" when all of these are true:

- [ ] `pnpm install && pnpm dev` brings up the app on `http://localhost:3000` with zero errors.
- [ ] A new user can complete the `docs/getting-started/quick-start.md` walkthrough in <5 minutes.
- [ ] All P0 features from §5 are functional and have unit + integration tests passing.
- [ ] All P1 features are functional (may be lighter on tests).
- [ ] P2 features are present as stubs or partial.
- [ ] Vitest line coverage on `src/lib/**` ≥ 80%.
- [ ] Playwright E2E covers the 6 critical scenarios in §9.3.
- [ ] All four AI providers (OpenAI, Anthropic, Google, DeepSeek) work end-to-end against their real APIs (smoke-tested with the user's own keys).
- [ ] `docs/ai-agent/agent-manifest.json` is generated and committed; `docs/ai-agent/tool-reference.md` is in sync.
- [ ] README, LICENSE, CONTRIBUTING, CHANGELOG all present.
- [ ] CI green on the main branch.
- [ ] Repo pushed to `github.com/DukeChaos/StarBear` (or confirmed-corrected destination).
- [ ] At least one full end-to-end manual run-through recorded as a session note in `docs/development/`.

---

*End of spec — please review and flag anything to change.*

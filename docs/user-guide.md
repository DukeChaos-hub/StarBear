# StarBear — User Guide

How to drive the StarBear workspace day-to-day. This guide assumes you have already
run `pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev` (see
[development/setup.md](./development/setup.md)).

> Verified against: **v0.1.x** (Phase 6–10 UI shipped).
> Tested with: Node 24.19, pnpm 10.34, Chromium 138.

---

## 0. Layout

The whole product lives at **`/workspace`**. The landing route `/` redirects to it.

```
┌───────────────────────────────────────────────────────────────────────┐
│ ★ StarBear      [Env: dev ▾]               [⌘K]   [Right pane ⇄]      │  ← topbar
├──────────┬────────────────────────────────────────────┬───────────────┤
│ Overview │                                            │               │
│ Envs     │                                            │  AI Agent     │  ← right pane
│ Tests    │             main content                   │  (collapsible)│
│ AI Agent │                                            │               │
│ Settings │                                            │               │
│          │                                            │               │
│ ★ v0.1   │                                            │               │
└──────────┴────────────────────────────────────────────┴───────────────┘
  sidebar          (request editor / env editor / tests / …)
```

Top-right toggles:

- `⌘K` (or the search button) opens the **Command Palette** — fast nav.
- The right-pane icon shows or hides the **AI Agent** chat (the same chat
  appears fullscreen at `/workspace/agent`).

---

## 1. Send a request

Path: **`/workspace`**.

```
┌────────────────────────────────────────────────────────────────┐
│ [GET ▾]  https://httpbin.org/get                       [Send] │
├────────────────────────────────────────────────────────────────┤
│ Params (0) | Headers (0) | Body | Auth                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Add query params here. Each row has a checkbox (enabled),     │
│  key, value, and a trash icon.                                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

1. Pick a **method** (GET / POST / PUT / PATCH / DELETE / HEAD / OPTIONS).
2. Type the **URL**. `{{var}}` placeholders are interpolated against the
   active environment's variables.
3. Use the **Params** tab to add query strings.
4. Use the **Headers** tab for custom headers.
5. Use the **Body** tab to set kind (`none` / `json` / `form-urlencoded` /
   `raw`) and the body text.
6. Use the **Auth** tab for Bearer / Basic / API-Key.
7. Click **Send**.

The response renders below the request pane:

```
┌────────────────────────────────────────────────────────────────┐
│ 200  OK       ⏱ 152 ms   ⛁ 1.2 KB                              │
├────────────────────────────────────────────────────────────────┤
│ [Body]  [Headers (12)]                                         │
├────────────────────────────────────────────────────────────────┤
│ pretty | raw | preview                                         │
│ {                                                              │
│   "args": {},                                                  │
│   "headers": { "Accept": "*/*", … },                           │
│   "origin": "1.2.3.4",                                         │
│   "url": "https://httpbin.org/get"                             │
│ }                                                              │
└────────────────────────────────────────────────────────────────┘
```

- **pretty** tries to JSON-format; falls back to raw.
- **preview** is a placeholder for future HTML/Image rendering.
- **Headers** tab shows all response headers.

### Save a request

Click **Save** in the top-right of the editor. A dialog asks for:

- A **name** (e.g. `Get current user`).
- A **collection** (one must exist; create one via the API or the env
  editor's "create env" pattern if you want a placeholder).

Saved requests appear in `/workspace/tests` when you attach a test case to
them.

### SSRF mode

The request editor sends `ssrfMode: 'allow-local'` by default so you can
poke at `http://localhost:3000` and other dev targets. Change it via the
`/api/request` body for stricter production use. See
[architecture.md](./architecture.md#ssrf-guard) for what the guard blocks.

---

## 2. Environments

Path: **`/workspace/environments`**.

```
┌──────────────────┬────────────────────────────────────────────┐
│ Environments     │ Variables (4)              [ + Add var ]   │
│ ┌──────────────┐ │                                            │
│ │ dev   ★      │ │ Key      Value              Secret  Save  ⌫ │
│ │ prod         │ │ base     http://localhost:3000   ☐   ✓   ⌫ │
│ │ staging      │ │ token    ••••••••             ☑   ✓   ⌫ │
│ └──────────────┘ │ user     alice                 ☐   ✓   ⌫ │
│ [+ New env]      │ timeout  5000                 ☐   ✓   ⌫ │
└──────────────────┴────────────────────────────────────────────┘
```

- The **left column** lists environments. Click the **star** icon to make
  one active (only one is active at a time).
- The **right column** is a key/value editor. Mark a row as **Secret** to
  mask the value; the input becomes a password field with a reveal
  toggle.
- Changes save on **blur** of the field, or with the **✓** button per row.
- An active environment is what the AI Agent uses for `{{var}}` expansion
  in its tool calls.

---

## 3. Tests

Path: **`/workspace/tests`**.

```
┌──────────────────┬────────────────────────────────────────────┐
│ Test cases       │  status 200 OK              ← assertions  │
│ ▶ Get current    │  ┌──────────────────────────────────┐    │
│   user   [▶][⌫]  │  │ [STATUS] [200]                   │ ⌫  │
│ ▶ Login happy    │  └──────────────────────────────────┘    │
│   path   [▶][⌫]  │  + status + latency + header + jsonpath    │
│                  │    + schema + script                        │
│ [▶ Run all (2)]  │                                            │
└──────────────────┴────────────────────────────────────────────┘
```

- **Create** a test case from the left input. You need at least one
  saved request (the page lists collections, fetches each one's
  requests, and pre-selects the first one as the binding).
- **Bind** a test case to a request via the dropdown in the detail
  pane.
- **Add assertions** with the 6 buttons at the bottom:
  - `status` — `200` (or `[200, 204]` for "one of these")
  - `latency` — `maxMs: 1000`
  - `header` — name, match (`equals` / `contains` / `regex`), value
  - `jsonpath` — path like `$.user.id`, op, expected value
  - `schema` — JSON Schema object (paste)
  - `script` — JavaScript expression that returns truthy to pass
- **Run** a single case with the per-row play button, or **Run all**
  to execute a suite (`POST /api/tests/suite`).
- The result panel at the bottom shows status badge, response meta,
  and per-assertion ✓/✕.

---

## 4. AI Agent

Path: **`/workspace/agent`** (fullscreen) **or** the right-pane toggle
in the topbar (when on any workspace page).

```
┌────────────────────────────────────┐
│ 🤖 AI Agent          conv: abc12…  │
├────────────────────────────────────┤
│                                    │
│  👤 list my collections            │
│  🤖 You have one collection:       │
│     Sandbox. It contains 3 requests│
│     including…                     │
│  🔧 list_collections  []    ok     │
│                                    │
│  ● thinking…                       │
├────────────────────────────────────┤
│ ┌──────────────────────────┐  ➤   │
│ │ Ask the agent…           │      │
│ └──────────────────────────┘      │
└────────────────────────────────────┘
```

The agent has access to **5 tools**:

| Tool               | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `list_collections` | Lists all collections with counts                         |
| `search_requests`  | Searches requests by name/URL substring                   |
| `send_request`     | Sends a request with the active env's vars (SSRF-guarded) |
| `run_test_case`    | Runs a test case and returns the outcome                  |
| `save_request`     | Creates or updates a request in a collection              |

**Try these prompts:**

- _"List my collections and tell me how many requests each has."_
- _"Send a GET to {{base}}/users/1 and show the JSONPath `$.id`."_
- _"Find every request whose URL contains `/admin/` and tell me their methods."_
- _"Run all test cases."_

The chat is **stateless across page reloads** for now — the server
persists messages, but the UI keeps the conversation in component state.
Reopening `/workspace/agent` starts a fresh thread. (History loading
is on the roadmap.)

---

## 5. Settings

Path: **`/workspace/settings`**.

```
┌─ Active provider ─────────────────────────────────────────────┐
│ [anthropic ▾]   using claude-3-5-sonnet-latest                │
└───────────────────────────────────────────────────────────────┘

┌─ openai ─────────────────────────────────────────────────────┐
│ Model     [gpt-4o                       ]                    │
│ Base URL  [https://api.openai.com/v1   ]                    │
│ API key   [••••••••    ] [👁]            [Clear]              │
│                              key set                         │
└───────────────────────────────────────────────────────────────┘

┌─ anthropic ──────[active]──[key set]────────────────────────┐
│ Model     [claude-3-5-sonnet-latest        ]                  │
│ Base URL  [https://api.anthropic.com      ]                  │
│ API key   [••••••••    ] [👁]            [Clear]              │
└───────────────────────────────────────────────────────────────┘
```

- Pick the **active provider** from the dropdown at the top. Only one
  provider is used at a time.
- For each provider, set the **model** name and an optional **base URL**
  (override the vendor's default).
- Paste the **API key** (or `Clear` to remove the stored one).
- Keys are **encrypted at rest** with AES-256-GCM using the server
  master key (`STARBEAR_MASTER_KEY` env). The UI never sees them
  after save.

> If you forget your master key, the saved AI keys are unrecoverable —
> delete the old key, paste a new one. The master key lives at
> `~/.starbear/master.key` with `chmod 600`.

---

## 6. Keyboard shortcuts

| Key                     | Action               |
| ----------------------- | -------------------- |
| `⌘K` / `Ctrl+K`         | Open command palette |
| `Enter` (in chat)       | Send message         |
| `Shift+Enter` (in chat) | Newline              |
| `Enter` (in URL bar)    | Send the request     |
| `Tab` (anywhere)        | Move focus           |
| `Esc` (in dialog)       | Close dialog         |

---

## 7. Troubleshooting

- **"ssrf_blocked"** — the URL points at a private IP (10.x, 192.168.x,
  127.x, …). Pass `ssrfMode: 'allow-local'` in the API body to allow
  localhost during development.
- **"unresolved_variable"** — the URL or a header contains `{{foo}}`
  but the active environment has no `foo` variable.
- **"no_provider" / "no_model" / "no_api_key"** — open
  `/workspace/settings`, pick a provider, set a model, paste a key.
- **"timeout"** — increase `timeoutMs` in the request body
  (default 30 s, max 120 s).
- **Right-pane chat is empty** — toggle it on with the topbar icon, or
  visit `/workspace/agent` directly.

For deeper setup help, see [development/setup.md](./development/setup.md).
For data model and API contracts, see [architecture.md](./architecture.md).

# Development — Setup

Get StarBear running on a fresh Windows / macOS / Linux machine in ~5 minutes.

> Last verified: 2026-09-01.

## 1. Prerequisites

| Tool    | Version                                 | Why                                                     |
| ------- | --------------------------------------- | ------------------------------------------------------- |
| Node.js | **22.5+** (project tested on **24.19**) | `node:sqlite` requires 22.5; project's `.nvmrc` pins 24 |
| pnpm    | **10+**                                 | `packageManager` in `package.json` is `pnpm@10.0.0`     |
| Git     | 2.30+                                   | Conventional Commits lints in CI                        |
| OS      | Windows / macOS / Linux                 | Windows requires PowerShell 5.1+ (already on Win10/11)  |

Optional:

- **Playwright browsers** — only if you intend to run E2E tests
  (`pnpm test:e2e`).
- **VS Code** with the recommended extensions (see
  `.vscode/extensions.json`).

## 2. Clone and install

```bash
git clone https://github.com/DukeChaos/StarBear.git
cd StarBear
pnpm install
```

The install is hermetic: no global tools required, no Python, no
native build (because we use `node:sqlite` instead of
`better-sqlite3`).

## 3. Configure the environment

The repo ships an `.env.example` — copy it to `.env.local` (Next reads
`.env.local` automatically; it's gitignored):

```bash
cp .env.example .env.local
```

Variables:

| Name                  | Default                                        | Purpose                                   |
| --------------------- | ---------------------------------------------- | ----------------------------------------- |
| `STARBEAR_DB`         | `.starbear/starbear.sqlite`                    | SQLite file path. Tests override this.    |
| `STARBEAR_MASTER_KEY` | _(auto-generated at `~/.starbear/master.key`)_ | Base64 of 32 bytes. Set explicitly in CI. |
| `PORT`                | `3000`                                         | Next dev port.                            |
| `NODE_ENV`            | `development`                                  | Standard.                                 |

> If you lose `STARBEAR_MASTER_KEY`, your saved AI provider keys are
> unrecoverable. Delete them and re-paste.

## 4. Initialize the database

```bash
pnpm db:migrate   # apply schema to $STARBEAR_DB
pnpm db:seed      # optional: 1 dev env, 1 Sandbox collection, 3 requests
pnpm db:reset     # destructive: drop all tables and re-migrate
```

The seed script is **idempotent** — running it twice does not duplicate
rows. `db:reset` is the escape hatch when you want a clean slate.

## 5. Run

```bash
pnpm dev
```

Then open <http://localhost:3000>. The landing route redirects to
`/workspace`, the request editor. See
[../user-guide.md](../user-guide.md) for the UI walkthrough.

## 6. Verify

A clean machine should pass all of these:

```bash
pnpm typecheck    # tsc --noEmit, expect silence
pnpm test         # 104 tests, expect 104 passed
pnpm build        # Next build, expect "Compiled successfully"
```

If any of these fail, check [troubleshooting](#troubleshooting).

## 7. Common dev tasks

| Task                      | Command                                                   |
| ------------------------- | --------------------------------------------------------- |
| Run a single test file    | `pnpm exec vitest run tests/unit/http/ssrf-guard.test.ts` |
| Watch tests               | `pnpm test:watch`                                         |
| Coverage                  | `pnpm test:coverage` (writes `coverage/`)                 |
| Lint                      | `pnpm lint` (or `pnpm exec eslint src/`)                  |
| Format                    | `pnpm format` (writes) or `pnpm format:check` (CI)        |
| Regenerate agent manifest | `pnpm gen:agent-manifest`                                 |

## 8. Troubleshooting

### `node:sqlite` import fails with `ERR_UNKNOWN_BUILTIN`

You're on Node < 22.5. Install Node 24 (`nvm install 24 && nvm use 24`)
or pin the project to 22.5+ (`.nvmrc` already does this).

### `vitest` hangs on the first test

You're hitting the CJS-shim-loaded-twice race. The fix is already in
`vitest.config.ts` (`pool: 'forks'`). Make sure no local override
disables it.

### `next lint` errors with `Cannot find module 'eslint-config-next'`

Known platform issue: ESLint 9 + Next 15's `eslint-config-next` patcher
is broken on some setups. We've disabled `next lint` in `next.config.ts`
and run `pnpm lint` (which uses raw `eslint`) instead. If you need
`next lint` back, pin `eslint-config-next` to a working version.

### `pnpm install` complains about peer deps

Most are warnings. The two you'll see:

- `cmdk` and `next-themes` want React 18, we have React 19. They work
  fine; ignore.
- `@types/node` is pinned to 20. The project is on Node 24 but the
  types are backward-compatible.

If `pnpm install` actually fails, run with `pnpm install --no-frozen-lockfile`
once to regenerate, then commit the new `pnpm-lock.yaml`.

### DB lock errors

Two processes are trying to write the same SQLite file. Stop the dev
server before running scripts that write (`db:reset`, `db:seed`); or
run them under a separate `STARBEAR_DB` path.

### AI keys not visible after paste

The settings UI shows "key set" but never the plaintext. That's by
design. To verify the key is actually stored, hit
`/api/settings/ai` and look at the `keySetByProvider` booleans.

## 9. Editor setup (VS Code)

Recommended extensions (auto-suggested by `.vscode/extensions.json`):

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **Vitest** (`vitest.explorer`)

Workspace settings (`.vscode/settings.json`):

- Format on save: Prettier.
- ESLint: typecheck-aware; reports on save.

## 10. What to read next

- [user-guide.md](../user-guide.md) — UI walkthrough
- [architecture.md](../architecture.md) — system design
- [../../AGENTS.md](../../AGENTS.md) — operating manual for AI agents
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md) — how to send a PR

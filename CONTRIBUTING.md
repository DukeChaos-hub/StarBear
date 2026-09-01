# Contributing to StarBear

Thanks for your interest in StarBear. This is a small project so the bar to contribute is low, but a few rules keep things sane.

## Code of conduct

Be kind. Disagreement is fine; personal attacks are not. Assume good faith.

## Where to start

- Read [`AGENTS.md`](./AGENTS.md) — the operating manual for any contributor (human or AI).
- Read [`docs/STATUS.md`](./docs/STATUS.md) — what's done and what's next.
- Look at the [`Phase 3+ tasks`](./docs/superpowers/plans/2026-09-01-starbear-v1.md) if you want something to pick up.

## Local setup

Requires **Node 22.5+** (the project uses Node 24's `node:sqlite` built-in) and **pnpm 10+**.

```bash
git clone https://github.com/DukeChaos/StarBear
cd StarBear
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm test
pnpm dev    # http://localhost:3000
```

## Development rules

These are non-negotiable. They are also listed in `AGENTS.md`.

1. **TypeScript strict.** No `any` in committed code. `unknown` + Zod parse is the escape hatch.
2. **TDD.** Failing test first, then implementation, then commit.
3. **Conventional Commits.** `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `ci:`.
4. **MIT license.** No copyleft dependencies.
5. **Local-first.** No telemetry, no analytics, no auto-update.
6. **BYOK AI.** Never add code that requires the project to hold user AI keys in plaintext, or that sends them anywhere outside the user's own provider.

## Pull request process

1. Fork the repo and create a feature branch.
2. Run the gate suite locally:
   ```bash
   pnpm typecheck
   pnpm test
   pnpm build
   ```
   All three must be silent / green.
3. Open a PR. The template will guide you through the rest.
4. CI must be green. A maintainer will review within 7 days.

## Adding a new domain field, agent tool, or feature

See the "How to add" sections in [`AGENTS.md`](./AGENTS.md).

## Reporting bugs

Open a GitHub issue with the **bug** template. Include:

- StarBear version (`pnpm test` output or `git rev-parse HEAD`)
- OS, Node version, pnpm version
- Reproduction steps (what you ran, what you expected, what happened)
- Relevant log output

## Suggesting features

Open a GitHub issue with the **feature** template. Tell us what problem you're trying to solve, not just the API you want.

## Out of scope (for now)

- Cloud sync / multi-device
- Team workspaces / sharing
- OpenAPI full import / export
- Plugin / extension system
- Native desktop packaging

If your idea falls in one of these, file an issue anyway. v2 might pick it up.

## License

By contributing, you agree your contributions are licensed under the project's [MIT License](./LICENSE).

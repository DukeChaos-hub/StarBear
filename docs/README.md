# StarBear Documentation

Welcome. Start with [Getting Started →](./development/setup.md) (or the top-level [README](../README.md) if you have not seen it yet).

> Last updated: 2026-09-01. Tested with: StarBear v0.1.0.

## Index

| Section                 | Purpose                                                                   | Where to start                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status & handoff**    | Where the project is right now and what is next                           | [STATUS.md](./STATUS.md)                                                                                                                    |
| **Design spec**         | What we are building and why (architecture, data model, AI agent surface) | [superpowers/specs/2026-09-01-starbear-v1-design.md](./superpowers/specs/2026-09-01-starbear-v1-design.md)                                  |
| **Implementation plan** | The 13-phase, ~100-task execution plan with TDD steps                     | [superpowers/plans/2026-09-01-starbear-v1.md](./superpowers/plans/2026-09-01-starbear-v1.md)                                                |
| **Development**         | Setup, contribution rules, last smoke run                                 | [development/](./development/)                                                                                                              |
| **Top-level**           | Project README, AGENTS.md, CONTRIBUTING, CHANGELOG                        | [../README.md](../README.md) · [../AGENTS.md](../AGENTS.md) · [../CONTRIBUTING.md](../CONTRIBUTING.md) · [../CHANGELOG.md](../CHANGELOG.md) |

## Roadmap snapshot

The full roadmap is in the design spec. Current state:

- ✅ **v0.1.0 (2026-09-01)** — Project foundation, HTTP engine, data layer, 14 CRUD API routes. Backend is fully functional and smoke-tested.
- ⏳ **Test Engine** — 6 assertion types, runner, report.
- ❌ **AI Provider Layer** — 4 vendor adapters, BYOK encryption.
- ❌ **AI Agent** — 5 tools, bounded runtime, SSE streaming.
- ❌ **UI** — request editor, response viewer, env editor, tests UI, AI chat.
- ❌ **Polish** — E2E tests, GitHub push, more docs.

See [STATUS.md](./STATUS.md) for the per-phase progress table.

## Conventions

- File names: `kebab-case.{ts,tsx,md}`
- Component names: `PascalCase`
- Functions and variables: `camelCase`
- Database columns: `snake_case` (mapped in TypeScript to `camelCase` fields)
- Commit messages: [Conventional Commits](https://www.conventionalcommits.org/)
- Spec: `MIT` (see [LICENSE](../LICENSE))

## Who is this for?

- **You are about to write code:** read [AGENTS.md](../AGENTS.md) first.
- **You are reviewing or planning the project:** start with [STATUS.md](./STATUS.md) then the [spec](./superpowers/specs/2026-09-01-starbear-v1-design.md).
- **You want to run it:** [README.md](../README.md) quick start, then [development/setup.md](./development/setup.md) for details.

# Development

Everything you need to work on StarBear.

## Topics

| Topic                                                   | Where to start                                                                                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **First-time setup**                                    | [setup.md](./setup.md)                                                                                                              |
| **Last smoke test record**                              | [last-smoke.md](./last-smoke.md)                                                                                                    |
| **AI agent contract** (external agents / SDK consumers) | [../ai-agent/agent-manifest.json](../ai-agent/agent-manifest.json) · [../ai-agent/tool-reference.md](../ai-agent/tool-reference.md) |
| **Design spec**                                         | [../superpowers/specs/2026-09-01-starbear-v1-design.md](../superpowers/specs/2026-09-01-starbear-v1-design.md)                      |
| **Implementation plan**                                 | [../superpowers/plans/2026-09-01-starbear-v1.md](../superpowers/plans/2026-09-01-starbear-v1.md)                                    |
| **Top-level operating manual**                          | [../../AGENTS.md](../../AGENTS.md)                                                                                                  |
| **Contributing**                                        | [../../CONTRIBUTING.md](../../CONTRIBUTING.md)                                                                                      |
| **Changelog**                                           | [../../CHANGELOG.md](../../CHANGELOG.md)                                                                                            |
| **Project status**                                      | [../STATUS.md](../STATUS.md)                                                                                                        |

## Quick reference

```bash
pnpm install            # one-time
pnpm db:migrate         # apply schema
pnpm db:seed            # sample data (idempotent)
pnpm dev                # http://localhost:3000

pnpm typecheck          # tsc --noEmit
pnpm test               # 104 tests
pnpm test:coverage      # coverage report
pnpm lint               # eslint
pnpm build              # next build

pnpm db:reset           # drop all + re-migrate (destructive)
pnpm gen:agent-manifest # regenerate docs/ai-agent/ files
```

See [setup.md](./setup.md) for prerequisites and troubleshooting.

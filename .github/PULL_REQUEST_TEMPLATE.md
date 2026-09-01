## What

<!-- One sentence describing the change. -->

## Why

<!-- The user problem this solves. -->

## How

<!-- Implementation notes worth flagging (e.g. breaking change, new env var). -->

## Checklist

- [ ] Tests added or updated
- [ ] Docs updated (if user-facing behavior changed)
- [ ] `pnpm gen:agent-manifest` run (if `src/lib/agent/tools.ts` changed)
- [ ] `pnpm typecheck` is silent
- [ ] `pnpm test` is all green
- [ ] `pnpm build` succeeds
- [ ] No new `any` in `src/lib/**`
- [ ] No secrets logged or sent outside the user's own provider

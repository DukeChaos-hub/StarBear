# Last clean-clone smoke run

**Date:** 2026-09-01
**Commit at run:** `7cbc41a` (AGENTS.md added)
**Environment:** Windows 11, Node 24.19.0, pnpm 10.34.5
**Note:** This was a "back-end smoke" against `pnpm dev`, not a clean clone. The plan's intended clean-clone smoke lives in `Task 12.5` (post-Phase 12).

## Steps executed

```bash
# 1. Migrate + seed
$env:STARBEAR_DB = "D:\Minimax total project\starbear\.starbear\smoke-test.sqlite"
pnpm tsx scripts/migrate.ts
# → "Migrations applied."

pnpm tsx scripts/seed.ts
# → "Seeding StarBear with sample data…"
# → "  + environment: dev (active) with host + token"
# → "  + collection: Sandbox with 3 requests"
# → "Done."

# 2. Start dev server on port 3099 (background job)
pnpm next dev -p 3099 &
```

## API responses observed

```http
GET /api/collections
→ [{ "id": "<nanoid>", "name": "Sandbox", "description": "...", ... }]  (count: 1)

GET /api/environments
→ [{ "name": "dev", "is_active": 1, ... }]  (count: 1, active: dev)

GET /api/requests?collectionId=<Sandbox-id>
→ 3 requests, methods: GET, POST, GET  (matches seed exactly)
```

## Result

- ✅ Seeded data is queryable through the API
- ✅ Dev server boots and serves the routes
- ✅ All three smoke endpoints returned 200 with correct shape
- The POST smoke was attempted but the PowerShell `&` quoting ate the JSON braces; the
  API itself was not at fault (the seeded POST request works under the integration test).

// Pre-test step for pnpm test:e2e. Removes the isolated DB and re-migrates.
// Kept as a CJS shim because Windows pnpm doesn't expand `FOO=bar command`
// syntax in package.json scripts.
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const dbPath = path.resolve('.starbear', 'e2e.sqlite');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

process.env.STARBEAR_DB = '.starbear/e2e.sqlite';
execSync('tsx scripts/migrate.ts', { stdio: 'inherit' });

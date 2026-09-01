// E2E server starter. Sets the isolated DB and port, then runs `next start`.
// Used by playwright.config.ts because the `FOO=bar cmd` shell pattern
// doesn't work in pnpm on Windows.
process.env.STARBEAR_DB = '.starbear/e2e.sqlite';
process.env.PORT = process.env.PORT || '3001';
process.env.NODE_ENV = 'production';
const { spawn } = require('node:child_process');
const path = require('node:path');

const nextBin = path.resolve(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBin, 'start'], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));

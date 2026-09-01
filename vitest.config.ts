import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      exclude: [
        '**/*.d.ts',
        '**/index.ts',
        // Type-only files have no runtime code to cover.
        'src/lib/db/schema.ts',
        // Re-export shims re-export from a sibling file; testing both is double-counted.
        'src/lib/db/ai-settings.ts',
        // sqlite-shim.cjs is exercised indirectly through client.ts; covering it
        // would require mocking CJS interop unnecessarily.
        'src/lib/db/sqlite-shim.cjs',
        'src/lib/db/sqlite-shim.d.cts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
    server: {
      deps: {
        external: ['node:sqlite'],
      },
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  optimizeDeps: {
    exclude: ['node:sqlite', 'node:dns/promises', 'node:net', 'node:fs', 'node:path', 'node:os', 'node:crypto'],
  },
});

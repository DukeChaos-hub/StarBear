import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  // tsconfig.json uses "jsx": "preserve" (Next compiles the JSX). For Vitest
  // we need esbuild to apply the automatic runtime, otherwise test files
  // would need to `import React from 'react'` in every test.
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: false,
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/component/**/*.test.tsx',
    ],
    // Component tests need a DOM. Unit + integration stay on node for speed.
    environmentMatchGlobs: [
      ['tests/component/**', 'jsdom'],
    ],
    // jsdom needs setup; we extend with @testing-library/jest-dom matchers.
    setupFiles: ['tests/component/setup.ts'],
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

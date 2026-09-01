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
      exclude: ['**/*.d.ts', '**/index.ts'],
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

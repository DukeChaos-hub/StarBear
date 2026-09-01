import { defineConfig, devices } from '@playwright/test';

// StarBear E2E — Playwright smoke tests.
//
// The tests start a Next dev server on port 3001 (away from the human-facing
// 3000) with an isolated DB. They exercise the user-visible flows:
//   - Landing redirect to /workspace
//   - Request editor: method + URL + Send -> 200 OK
//   - Environment editor: create env, add var, activate
//   - Test runner: create case, run, see assertions outcome
//   - Settings: load page, see provider cards
//   - AI chat: open right-pane, type a message (without an actual LLM roundtrip)
//
// We do NOT depend on a real LLM — the AI agent will surface "no_provider"
// and the UI handles that. The goal is to prove the wire-up, not the model.

const PORT = Number(process.env.E2E_PORT ?? 3001);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // SQLite single-writer
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node scripts/start-e2e.cjs',
    url: BASE_URL,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      STARBEAR_DB: '.starbear/e2e.sqlite',
      PORT: String(PORT),
    },
  },
});

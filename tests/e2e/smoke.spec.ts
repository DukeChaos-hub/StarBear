import { test, expect } from '@playwright/test';

// A real request is sent to a public echo server. The CI environment must
// allow egress to httpbin.org; on an air-gapped runner, swap the URL for a
// local fixture (e.g. a JSON file served by the dev server).
test.describe('StarBear smoke', () => {
  test('landing redirects to /workspace and renders the request editor', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/workspace$/);
    await expect(page.getByRole('combobox', { name: /method/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /request url/i })).toBeVisible();
  });

  test('sending a GET to a public echo returns 200 in the response viewer', async ({ page }) => {
    await page.goto('/workspace');
    // The request editor's Send button is the one with the Play icon.
    // The AI chat also has a Send button (with aria-label="Send" only).
    // We pick the request editor's by its visible "Send" text content.
    const send = page.getByRole('button').filter({ hasText: 'Send' }).first();
    await send.click();
    await expect(page.getByTestId('response-ok')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('200').first()).toBeVisible();
    await expect(page.getByText('OK').first()).toBeVisible();
  });

  test('environments page lets you create an env', async ({ page }) => {
    const envName = `e2e-env-${Date.now()}`;
    await page.goto('/workspace/environments');
    await page.getByPlaceholder(/new env name/i).fill(envName);
    await page.getByRole('button', { name: /create env/i }).click();
    await expect(page.getByText(envName).first()).toBeVisible();
  });

  test('tests page renders the empty-state hint when no test case is selected', async ({ page }) => {
    await page.goto('/workspace/tests');
    await expect(page.getByText(/select a test case/i)).toBeVisible();
  });

  test('settings page shows the four provider cards', async ({ page }) => {
    await page.goto('/workspace/settings');
    // Each provider name is rendered as a card heading (not a hidden <option>).
    for (const p of ['openai', 'anthropic', 'google', 'deepseek']) {
      // The card heading has class "text-sm font-semibold" (from the markup).
      const card = page.locator('.text-sm.font-semibold', { hasText: new RegExp(`^${p}$`) }).first();
      await expect(card).toBeVisible();
    }
    await expect(page.getByText(/active provider/i)).toBeVisible();
  });

  test('command palette opens and navigates', async ({ page }) => {
    await page.goto('/workspace');
    // The topbar search button has the text "⌘K".
    await page.getByRole('button', { name: /⌘K/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByText('Go to Settings').click();
    await expect(page).toHaveURL(/\/workspace\/settings$/);
  });
});

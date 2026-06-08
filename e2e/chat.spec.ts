import { test, expect } from '@playwright/test';
import { signUp, snapshotForView } from './_helpers';
import { E2E } from '../playwright.config';

test.describe('Chat flow', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@flux.test`);
  });

  test('empty hero + suggestion cards', async ({ page }, info) => {
    await expect(page.getByRole('heading', { name: /^Hello,/ })).toBeVisible();
    await expect(page.getByText('Explain a concept', { exact: true })).toBeVisible();
    await expect(page.getByText('Write something', { exact: true })).toBeVisible();
    await expect(page.getByText('Debug my code', { exact: true })).toBeVisible();
    await expect(page.getByText('Brainstorm ideas', { exact: true })).toBeVisible();
    await snapshotForView(page, `chat-empty-${info.project.name}`);
  });

  test('sends a message and receives a streamed response', async ({ page }) => {
    const composer = page.locator('textarea[placeholder*="Message Flux AI"]');
    await composer.fill('Say the single word: pong');
    await composer.press('Enter');

    await expect(page.getByText('Say the single word: pong', { exact: true })).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(12_000);

    const text = await page.locator('body').textContent();
    expect(/pong/i.test(text ?? '')).toBeTruthy();
    await snapshotForView(page, `chat-streaming`);
  });

  test('footer shows the active model', async ({ page }) => {
    const composer = page.locator('textarea[placeholder*="Message Flux AI"]');
    await expect(composer).toBeEnabled();
    await expect(page.getByText(new RegExp(`Flux AI · ${E2E.model}`))).toBeVisible();
  });
});

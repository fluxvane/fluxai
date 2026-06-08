import { type Page } from '@playwright/test';
import { E2E } from '../playwright.config';

async function clearSession(page: Page) {
  await page.context().clearCookies();
}

/**
 * Registers a fresh account, completes proxy config, and lands on /chat.
 * Each run uses a unique email so register succeeds against the database.
 */
export async function signUp(page: Page, email = E2E.email) {
  await clearSession(page);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  // Switch to the Register tab.
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await page.getByLabel('Your name').fill(E2E.name);
  await page.getByLabel('Email').fill(email);
  await page.locator('input[name="password"]').fill(E2E.password);

  await Promise.all([
    page.waitForURL('**/config', { timeout: 20_000 }),
    page.getByRole('button', { name: 'Create account' }).click(),
  ]);

  // Complete configuration.
  await page.getByLabel('AI Endpoint').fill(E2E.endpoint);
  await page.getByLabel('API Key').fill(E2E.apiKey);
  await page.getByLabel('Default model').fill(E2E.model);

  await Promise.all([
    page.waitForURL('**/chat', { timeout: 30_000 }),
    page.getByRole('button', { name: 'Verify & continue' }).click(),
  ]);
}

/** Alias kept for older specs. */
export async function login(page: Page) {
  await signUp(page);
}

export async function snapshotForView(page: Page, name: string) {
  await page.screenshot({ path: `test-results/snapshots/${name}.png`, fullPage: true });
}

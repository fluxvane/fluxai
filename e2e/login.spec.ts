import { test, expect } from '@playwright/test';
import { snapshotForView } from './_helpers';

test.describe('Auth page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
  });

  test('renders sign-in form with email + password', async ({ page }, info) => {
    await expect(page).toHaveTitle(/Flux AI/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await snapshotForView(page, `login-${info.project.name}`);
  });

  test('register tab reveals the name field', async ({ page }) => {
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page.getByLabel('Your name')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });

  test('toggles password visibility', async ({ page }) => {
    const pw = page.locator('input[name="password"]');
    await expect(pw).toHaveAttribute('type', 'password');
    await pw.fill('secret123');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(pw).toHaveAttribute('type', 'text');
  });
});

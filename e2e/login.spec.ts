import { test, expect } from '@playwright/test';
import { snapshotForView } from './_helpers';

test.describe('Login page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login');
	});

	test('renders hero copy + form on all viewports', async ({ page }, info) => {
		await expect(page).toHaveTitle(/Flux AI/);
		await expect(page.getByRole('heading', { level: 5, name: 'Flux AI' })).toBeVisible();
		await expect(
			page.getByRole('heading', { name: /Talk to any model\./ }),
		).toBeVisible();
		await expect(page.getByText('Streaming')).toBeVisible();
		await expect(page.getByText('Any OpenAI-compatible proxy')).toBeVisible();
		await expect(page.getByText('Zero backend')).toBeVisible();
		await expect(page.getByLabel('AI Endpoint (proxy URL)')).toBeVisible();
		await expect(page.getByLabel('Your Name')).toBeVisible();
		await snapshotForView(page, `login-${info.project.name}`);
	});

	test('blocks submit when fields are empty (HTML required)', async ({ page }) => {
		await expect(page.getByLabel('AI Endpoint (proxy URL)')).toHaveAttribute('required');
		await expect(page.getByLabel('Your Name')).toHaveAttribute('required');
		const url = page.url();
		await page.getByRole('button', { name: 'Start Chatting' }).click();
		await page.waitForTimeout(500);
		expect(page.url()).toBe(url);
	});

	test('toggles API key visibility on login', async ({ page }) => {
		const keyInput = page.locator('input[name="apiKey"], input[autocomplete="off"]').nth(1);
		await expect(keyInput).toHaveAttribute('type', 'password');
		await keyInput.fill('sk-test');
		await page.getByRole('button', { name: 'Show API key' }).click();
		await expect(keyInput).toHaveAttribute('type', 'text');
	});
});

import { expect, type Page } from '@playwright/test';
import { E2E } from '../playwright.config';

export async function login(page: Page) {
	await page.context().clearCookies();
	await page.goto('/login', { waitUntil: 'domcontentloaded' });
	await page.evaluate(() => {
		localStorage.clear();
		document.cookie.split(';').forEach((c) => {
			document.cookie = `${c.split('=')[0]}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
		});
	});
	await page.goto('/login');
	await expect(page.getByRole('heading', { level: 5, name: 'Flux AI' })).toBeVisible();
	const inputs = page.locator('form input[autocomplete="off"]');
	await inputs.nth(0).fill(E2E.endpoint);
	await inputs.nth(1).fill(E2E.apiKey);
	await inputs.nth(2).fill(E2E.name);
	await Promise.all([
		page.waitForURL('**/chat', { timeout: 20_000 }),
		page.getByRole('button', { name: 'Start Chatting' }).click(),
	]);
}

export async function logout(page: Page) {
	await page.evaluate(() => {
		localStorage.clear();
		document.cookie.split(';').forEach((c) => {
			document.cookie = `${c.split('=')[0]}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
		});
	});
}

export async function snapshotForView(page: Page, name: string) {
	await page.screenshot({
		path: `test-results/snapshots/${name}.png`,
		fullPage: true,
	});
}

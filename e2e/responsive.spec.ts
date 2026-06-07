import { test, expect } from '@playwright/test';
import { E2E } from '../playwright.config';

test.describe('Responsive layout', () => {
	test('login hero stacks correctly on mobile (375px)', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto('/login');
		const heading = page.getByRole('heading', { name: /Talk to any model\./ });
		await expect(heading).toBeVisible();
		const box = await heading.boundingBox();
		expect(box).not.toBeNull();
		expect(box!.width).toBeLessThanOrEqual(375);
	});

	test('chat composer is reachable on tablet (768px)', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto('/login');
		const inputs = page.locator('form input[autocomplete="off"]');
		await inputs.nth(0).fill(E2E.endpoint);
		await inputs.nth(1).fill(E2E.apiKey);
		await inputs.nth(2).fill(E2E.name);
		await Promise.all([
			page.waitForURL('**/chat'),
			page.getByRole('button', { name: 'Start Chatting' }).click(),
		]);

		const composer = page.locator('textarea[placeholder*="Message Flux AI"]');
		await expect(composer).toBeVisible();
		const cbox = await composer.boundingBox();
		expect(cbox).not.toBeNull();
		expect(cbox!.y + cbox!.height).toBeLessThanOrEqual(1024);
	});
});

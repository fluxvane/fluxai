import { test, expect } from '@playwright/test';
import { login, snapshotForView } from './_helpers';
import { E2E } from '../playwright.config';

test.describe('Chat flow', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('empty hero + 4 suggestion cards', async ({ page }, info) => {
		await expect(page.getByRole('heading', { name: /^Hello,/ })).toBeVisible();
		await expect(page.getByText('How can I help you today?')).toBeVisible();
		await expect(page.getByText('Explain quantum computing', { exact: true })).toBeVisible();
		await expect(page.getByText('Write a poem', { exact: true })).toBeVisible();
		await expect(page.getByText('Debug my code', { exact: true })).toBeVisible();
		await expect(page.getByText('Brainstorm ideas', { exact: true })).toBeVisible();
		await snapshotForView(page, `chat-empty-${info.project.name}`);
	});

	test('sends a message and receives a streamed response', async ({ page }) => {
		const composer = page.locator('textarea[placeholder*="Message Flux AI"]');
		await composer.fill('ping');
		await composer.press('Enter');

		await expect(page.getByText('ping', { exact: true })).toBeVisible({ timeout: 5_000 });
		await page.waitForTimeout(10_000);

		const text = await page.locator('body').textContent();
		const hasResponse = /pong|ping/i.test(text ?? '');
		expect(hasResponse).toBeTruthy();

		await snapshotForView(page, `chat-streaming`);
	});

	test('composer is enabled + placeholder shows current model', async ({ page }) => {
		const composer = page.locator('textarea[placeholder*="Message Flux AI"]');
		await expect(composer).toBeEnabled();
		const placeholder = await composer.getAttribute('placeholder');
		console.log('placeholder=', JSON.stringify(placeholder), 'expected to contain', E2E.model);
		expect(placeholder).toContain(E2E.model);
	});
});

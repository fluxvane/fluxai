import { test, expect } from '@playwright/test';
import { login, snapshotForView } from './_helpers';

test.describe('Analytics page', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/analytics');
	});

	test('renders header + 4 stat cards + 7-day chart', async ({ page }, info) => {
		await expect(page.getByText('Analytics', { exact: true })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Your activity' })).toBeVisible();

		await expect(page.getByText('Conversations', { exact: true }).first()).toBeVisible();
		await expect(page.getByText('Messages', { exact: true }).first()).toBeVisible();
		await expect(page.getByText('AI responses', { exact: true }).first()).toBeVisible();
		await expect(page.getByText('Models used', { exact: true }).first()).toBeVisible();

		await expect(page.getByText('Last 7 days')).toBeVisible();
		await snapshotForView(page, `analytics-${info.project.name}`);
	});
});

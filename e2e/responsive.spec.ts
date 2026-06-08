import { test, expect } from '@playwright/test';
import { signUp } from './_helpers';

test.describe('Responsive layout', () => {
  test('auth card fits on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    const heading = page.getByRole('heading', { name: 'Welcome back' });
    await expect(heading).toBeVisible();
    const box = await heading.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(375);
  });

  test('chat composer is reachable on tablet (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await signUp(page, `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@flux.test`);

    const composer = page.locator('textarea[placeholder*="Message Flux AI"]');
    await expect(composer).toBeVisible();
    const cbox = await composer.boundingBox();
    expect(cbox).not.toBeNull();
    expect(cbox!.y + cbox!.height).toBeLessThanOrEqual(1024);
  });
});

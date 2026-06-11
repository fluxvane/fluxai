import { test, expect } from "@playwright/test";
import { signUp, snapshotForView } from "./_helpers";

test.describe("Analytics page", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(
      page,
      `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@flux.test`,
    );
    await page.goto("/analytics");
  });

  test("renders header + stat cards + chart", async ({ page }, info) => {
    await expect(
      page.getByRole("heading", { name: "Your activity" }),
    ).toBeVisible();
    await expect(
      page.getByText("Conversations", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Messages", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("AI responses", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Images", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Last 14 days")).toBeVisible();
    await snapshotForView(page, `analytics-${info.project.name}`);
  });
});

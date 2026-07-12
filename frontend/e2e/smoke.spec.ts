import { expect, test } from "@playwright/test";

test.describe("AmaniBuild smoke", () => {
  test("marketing homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /AmaniBuild/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Log in|Sign in|Get started/i }).first()).toBeVisible();
  });

  test("login page is reachable", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("form, input[type='email'], input[name='email']").first()).toBeVisible();
  });
});

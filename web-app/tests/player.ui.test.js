// Example Playwright test for the player UI
const { test, expect } = require("@playwright/test");

test.describe("Player UI", () => {
  test("should load the player page", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page).toHaveTitle(/Henze Trivia/i);
    await expect(
      page.locator('input[placeholder="Enter your name"]')
    ).toBeVisible();
  });
});

import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(import.meta.dirname, "../playwright/.auth/user.json");

const DEMO_EMAIL = "demo@devstash.io";
const DEMO_PASSWORD = "12345678";

setup("authenticate as demo user", async ({ page }) => {
  await page.goto("/sign-in");

  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await page.waitForURL("/dashboard");
  await expect(page.getByRole("button", { name: "New Item" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});

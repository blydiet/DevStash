import { test, expect } from "@playwright/test";
import { uniqueTitle } from "./utils";

const FILES_URL = "/items/file";

test.describe("File upload validation", () => {
  test("Uploading a file with no file name is rejected and blocks Create", async ({ page }) => {
    await page.goto(FILES_URL);
    await page.getByRole("button", { name: "New File" }).click();

    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Title", { exact: true }).fill(uniqueTitle("No Filename"));

    await dialog.locator('input[type="file"]').setInputFiles({
      name: "",
      mimeType: "text/plain",
      buffer: Buffer.from("hello from e2e"),
    });

    await expect(dialog.getByText(/Unsupported extension/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Create" })).toBeDisabled();

    // cleanup: close without creating
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible();
  });
});

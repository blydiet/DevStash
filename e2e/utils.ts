import { expect, type Page } from "@playwright/test";

export interface TestItemData {
  title: string;
  description: string;
  content: string;
  language: string;
  tags: string;
}

export function uniqueTitle(label: string) {
  return `E2E ${label} ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function snippetData(title: string): TestItemData {
  return {
    title,
    description: "Created by a Playwright E2E test",
    content: "console.log('hello from e2e');",
    language: "typescript",
    tags: "e2e, playwright",
  };
}

/** Opens the "New Item" dialog, fills it in as a Snippet, and submits. */
export async function createItem(page: Page, data: TestItemData) {
  await page.getByRole("button", { name: "New Item" }).click();

  const dialog = page.locator('[data-slot="dialog-content"]');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Title", { exact: true }).fill(data.title);
  await dialog.getByLabel("Description", { exact: true }).fill(data.description);
  await dialog.getByLabel("Content", { exact: true }).fill(data.content);
  await dialog.getByLabel("Language", { exact: true }).fill(data.language);
  await dialog.getByLabel("Tags", { exact: true }).fill(data.tags);

  await dialog.getByRole("button", { name: "Create" }).click();

  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("Item created")).toBeVisible();
}

/** Locates the item card by its exact title text (avoids matching titles that share a prefix). */
export function itemCard(page: Page, title: string) {
  return page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText(title, { exact: true }) });
}

/** Clicks an item card to open its detail drawer, and waits for it to load. */
export async function openItemDrawer(page: Page, title: string) {
  await itemCard(page, title).click();

  const drawer = page.locator('[data-slot="sheet-content"]');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", { name: title, exact: true })).toBeVisible();

  return drawer;
}

/** From an open, view-mode drawer: confirms deletion via the trash button + alert dialog. */
export async function deleteItemFromDrawer(page: Page, title: string) {
  const drawer = page.locator('[data-slot="sheet-content"]');
  await drawer.getByRole("button", { name: "Delete item" }).click();

  const alert = page.getByRole("alertdialog");
  await expect(alert).toBeVisible();
  await alert.getByRole("button", { name: "Delete", exact: true }).click();

  await expect(drawer).not.toBeVisible();
  await expect(page.getByText("Item deleted")).toBeVisible();
  await expect(itemCard(page, title)).toHaveCount(0);
}

import { test, expect } from "@playwright/test";
import {
  createItem,
  deleteItemFromDrawer,
  itemCard,
  openItemDrawer,
  snippetData,
  uniqueTitle,
} from "./utils";

const SNIPPETS_URL = "/items/snippet";

test.describe("Items CRUD", () => {
  test("Create: new item appears in the items list", async ({ page }) => {
    const title = uniqueTitle("Create");
    const data = snippetData(title);

    await page.goto(SNIPPETS_URL);
    await createItem(page, data);

    await expect(itemCard(page, title)).toBeVisible();

    // cleanup
    await openItemDrawer(page, title);
    await deleteItemFromDrawer(page, title);
  });

  test("Read: item card and detail drawer show correct data", async ({ page }) => {
    const title = uniqueTitle("Read");
    const data = snippetData(title);

    await page.goto(SNIPPETS_URL);
    await createItem(page, data);

    const card = itemCard(page, title);
    await expect(card).toBeVisible();
    await expect(card.getByText(title, { exact: true })).toBeVisible();
    await expect(card.getByText(data.description)).toBeVisible();

    const drawer = await openItemDrawer(page, title);
    await expect(drawer.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(drawer.getByText(data.content)).toBeVisible();
    for (const tag of data.tags.split(",").map((t) => t.trim())) {
      await expect(drawer.getByText(tag, { exact: true })).toBeVisible();
    }
    await expect(drawer.getByText("Created", { exact: true })).toBeVisible();
    await expect(drawer.getByText("Updated", { exact: true })).toBeVisible();

    // cleanup
    await deleteItemFromDrawer(page, title);
  });

  test("Update: editing a field reflects in the drawer and list", async ({ page }) => {
    const title = uniqueTitle("Update");
    const updatedTitle = `${title} (edited)`;
    const data = snippetData(title);

    await page.goto(SNIPPETS_URL);
    await createItem(page, data);

    const drawer = await openItemDrawer(page, title);
    await drawer.getByRole("button", { name: "Edit", exact: true }).click();

    await expect(drawer.getByPlaceholder("Title")).toHaveValue(title);
    await expect(drawer.getByPlaceholder("Description")).toHaveValue(data.description);
    // Content is a Monaco editor (CodeEditor) for snippets, not a placeholder-bearing
    // <textarea> — assert the pre-filled text is visible instead.
    await expect(drawer.getByText(data.content)).toBeVisible();

    await drawer.getByPlaceholder("Title").fill(updatedTitle);
    await drawer.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Item updated")).toBeVisible();
    await expect(drawer.getByRole("heading", { name: updatedTitle, exact: true })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(itemCard(page, updatedTitle)).toBeVisible();
    await expect(itemCard(page, title)).toHaveCount(0);

    // cleanup
    await openItemDrawer(page, updatedTitle);
    await deleteItemFromDrawer(page, updatedTitle);
  });

  test("Delete: item is removed after confirming deletion", async ({ page }) => {
    const title = uniqueTitle("Delete");
    const data = snippetData(title);

    await page.goto(SNIPPETS_URL);
    await createItem(page, data);
    await expect(itemCard(page, title)).toBeVisible();

    await openItemDrawer(page, title);
    await deleteItemFromDrawer(page, title);
  });
});

import { expect, test } from "@playwright/test";
import { serveLedgerFromDisk } from "./fixtures/ledger";

test("load, search, open an item, edit, tray count changes, discard", async ({ page }) => {
  await serveLedgerFromDisk(page);
  await page.goto("/#/mwr/table");

  // Loaded: the table shows every item in the volume.
  await expect(page.locator("tbody tr")).toHaveCount(138);

  // Search finds an item by id and opens it on Enter. ("age" also ranks
  // OQ-1 "Age during a month" first by title-hit proximity, so the id
  // itself is the deterministic query.)
  const search = page.getByPlaceholder("Search items, sources, questions");
  await search.fill("wr-003");
  await search.press("Enter");
  await expect(page).toHaveURL(/#\/mwr\/item\/WR-003/);
  await expect(page.getByRole("heading", { name: "Age" })).toBeVisible();

  // Edit opens the editor overlay; the tray is empty.
  await page.getByRole("button", { name: "Edit" }).click();
  const meaning = page.getByLabel("Meaning");
  await expect(meaning).toHaveValue(/Whole years elapsed/);
  await meaning.fill("Whole years elapsed from Date of Birth to the Determination Date. (smoke)");
  await page.getByRole("button", { name: "Save to tray" }).click();

  // The tray count reflects the entry.
  const tray = page.getByRole("button", { name: /Tray \(1\)/ });
  await expect(tray).toBeVisible();
  await tray.click();
  await expect(page.getByRole("link", { name: "WR-003 Age" })).toBeVisible();

  // WR-003 has no cited sources, so the tray shows it as invalid and Propose
  // stays disabled (RULING A28: Save to tray always works; Propose does not).
  await expect(
    page.locator(".sheet.tray").getByText("At least one source excerpt is cited"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Propose" })).toBeDisabled();

  // Discard returns the tray to empty.
  await page.getByRole("button", { name: "Discard all" }).click();
  await expect(page.getByRole("button", { name: /Tray \(0\)/ })).toBeVisible();

  // Reader URL never changed while editing.
  await expect(page).toHaveURL(/#\/mwr\/item\/WR-003$/);
});

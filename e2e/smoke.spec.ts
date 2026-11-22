import { expect, test } from "@playwright/test";
import { serveLedgerFromDisk } from "./fixtures/ledger";

test("load, search, open an item, edit, tray count changes, discard", async ({ page }) => {
  await serveLedgerFromDisk(page);
  await page.goto("/#/mwr/table");

  // Loaded: the table shows every item in the volume.
  await expect(page.locator("tbody tr")).toHaveCount(138);

  // Reader mode is the default: turn edit mode on through the header control
  // before anything below (New item, Tray, Settings, Edit, Rename) can show.
  await page.getByRole("button", { name: "Turn on edit mode" }).click();
  await expect(page.getByRole("button", { name: "Turn off edit mode" })).toBeVisible();

  // Search: Enter opens the results page, grouped by type, never the first
  // hit; the item is one click from there.
  const search = page.getByPlaceholder("Search rules, figures, questions, households");
  await search.fill("wr-003");
  await search.press("Enter");
  await expect(page).toHaveURL(/#\/mwr\/search\?q=wr-003$/);
  await page.locator('section.group[data-group="rule"] a[href="#/mwr/item/WR-003"]').click();
  await expect(page).toHaveURL(/#\/mwr\/item\/WR-003/);
  await expect(page.getByRole("heading", { name: "Age" })).toBeVisible();

  // The derivation is rich text: a fact in it opens one card, which links to
  // the definition and to the decision record, and closes on Escape.
  await page.locator(".decided .derivation button.tok.fact").first().click();
  const card = page.locator(".tokpop");
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "Open definition" }))
    .toHaveAttribute("href", "#/mwr/item/WR-001");
  await expect(card.getByRole("link", { name: "Trace to source" }))
    .toHaveAttribute("href", "#/mwr/item/WR-001?section=record");
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);

  // Edit opens the editor overlay on the text surface, which is the default:
  // the item block is the document, so the Meaning line is edited in place.
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const doc = page.locator("textarea.block");
  await expect(doc).toHaveValue(/Whole years elapsed/);

  // The painted copy behind the textarea carries the same text, tokenised.
  await expect(page.locator("pre.hl .tk.phrase").first())
    .toHaveText("the number of whole years between");

  // WR-003's four examples evaluate against the draft being edited.
  await page.getByRole("button", { name: "Examples", exact: true }).click();
  await expect(page.locator("table.examples tbody tr")).toHaveCount(4);
  await expect(page.locator("table.examples tbody td.ok")).toHaveCount(4);

  // WR-003 cites no source, so the checker and the pill both say so.
  await page.getByRole("button", { name: "Checker", exact: true }).click();
  await expect(page.locator(".diagnostics")).toContainText(
    "At least one source excerpt is cited",
  );
  await expect(page.locator(".pill")).toHaveText("1 problem(s)");

  const block = await doc.inputValue();
  await doc.fill(block.replace(
    /^Meaning {7}.*$/m,
    "Meaning       Whole years elapsed from Date of Birth to the Determination Date. (smoke)",
  ));
  await expect(page.locator("pre.hl")).toContainText("(smoke)");
  await page.getByRole("button", { name: "Save to tray" }).click();

  // Reader URL never changed while editing.
  await expect(page).toHaveURL(/#\/mwr\/item\/WR-003$/);

  // The proposal pill counts the entry and opens My proposal.
  const pill = page.locator("a.proposal-pill");
  await expect(pill).toHaveText("Your proposal 1");
  await pill.click();
  await expect(page).toHaveURL(/#\/mwr\/changes\/proposal$/);
  await expect(page.getByRole("link", { name: "WR-003 Age" })).toBeVisible();

  // WR-003 has no cited sources, so the tray shows it as invalid and Propose
  // stays disabled (RULING A28: Save to tray always works; Propose does not).
  await expect(
    page.locator(".tray.inline").getByText("At least one source excerpt is cited"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Propose" })).toBeDisabled();

  // Discard returns the tray to empty.
  await page.getByRole("button", { name: "Discard all" }).click();
  await expect(pill).toHaveText("No proposal");
});

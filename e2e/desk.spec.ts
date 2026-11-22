import { expect, test } from "@playwright/test";

/* The Desk on the working tree's Colorado volume, by persona task
 * (docs/design-unified-ui.md): Dana, an HCPF analyst, finds an item she must
 * approve and signs it from the App's approval card, her name required;
 * Rosa, a county supervisor, sees what takes effect soon and opens that
 * month. Old addresses (the inbox, the role page) land here. */
test("Dana finds an item she must approve and signs it", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("codex.tour", "1");
    localStorage.setItem("codex.persona", "hcpf");
  });
  await page.goto("/#/co/desk");
  // The first load reads some 1,400 files from the working tree.
  const tile = page.locator('li.tile[data-tile="sign"]');
  await expect(tile).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".rolechoice")).toHaveCount(0);
  const total = Number((await tile.locator(".num").textContent())!.replace(/,/g, ""));
  expect(total).toBeGreaterThan(0);

  // Her first role's list, grouped; the groups add up to that role's line on the tile.
  await tile.locator(".tilelines a", { hasText: "Medicaid policy owner" }).click();
  await expect(page).toHaveURL(/#\/co\/desk\/sign\?role=Medicaid\+policy\+owner$/);
  await expect(page.locator(".placehead h1")).toHaveText("To sign as Medicaid policy owner");
  await expect(page.locator('.sidebar a[data-place="desk"]')).toHaveAttribute("aria-current", "page");
  const nums = (await page.locator("ul.signgroups .sg-num").allTextContents()).map((t) => Number(t.replace(/,/g, "")));
  expect(nums.length).toBeGreaterThan(1);
  expect(nums.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(total);

  // A group reads as a list of meanings, not bare names.
  await page.locator("ul.signgroups a.sgrow").first().click();
  await expect(page).toHaveURL(/group=Medicaid%2Fparameters/);
  const first = page.locator("li.signitem").first();
  await expect(first.locator(".si-m")).not.toBeEmpty();
  await expect(first).toContainText("You sign because");
  await expect(first).toContainText("Figure today");

  // Opening one shows the approval card.
  await first.locator(".si-h a").click();
  await expect(page).toHaveURL(/#\/co\/desk\/sign\/CO-\d+\?role=Medicaid\+policy\+owner$/);
  const card = page.locator(".signcard article.inbox-row");
  await expect(card.locator(".change")).toHaveText("New, never approved.");
  await expect(card).toContainText("Why you sign");
  await expect(page.locator("nav.crumbs")).toContainText("To sign");

  // Approve asks for a name first, then stages the signature.
  await card.locator("button.approve").click();
  await expect(page.locator(".signer .bad")).toContainText("Type your name");
  await page.locator(".signer input").fill("Dana Lee (HCPF)");
  await card.locator("button.approve").click();
  const notice = page.locator(".inbox-notice");
  await expect(notice).toContainText("saved in this browser only");
  await expect(notice).toContainText("Data steward");
  const download = page.waitForEvent("download");
  await notice.locator("button.download").click();
  expect((await download).suggestedFilename()).toMatch(/^codex-co-signature-\d{4}-\d{2}-\d{2}\.md$/);
  await expect(card.locator(".staged-note")).toContainText("signature is staged");
  await expect(page.locator(".proposal-pill")).toContainText("1");

  // Back on the Desk, the proposal tile counts it.
  await page.locator('.sidebar a[data-place="desk"]').click();
  await expect(page.locator('li.tile[data-tile="proposal"] .num')).toHaveText("1");

  // The old inbox address opens the card.
  await page.goto("/#/co/inbox/CO-191");
  await expect(page).toHaveURL(/#\/co\/desk\/sign\/CO-191$/);
  await expect(page.locator('.signcard article[data-item="CO-191"]')).toBeVisible({ timeout: 30_000 });
});

test("Rosa sees what takes effect soon and opens that month", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("codex.tour", "1");
    localStorage.setItem("codex.persona", "county");
  });
  await page.goto("/#/co/roles/county");
  await expect(page).toHaveURL(/#\/co\/desk\?persona=county$/, { timeout: 30_000 });
  const soon = page.locator('li.tile[data-tile="soon"]');
  await expect(soon).toBeVisible({ timeout: 30_000 });
  // A county worker signs nothing: no sign-off tile.
  await expect(page.locator('li.tile[data-tile="sign"]')).toHaveCount(0);
  const n = Number((await soon.locator(".num").textContent())!.replace(/,/g, ""));
  if (n > 0) {
    await expect(soon.locator(".tilelines li").first()).toBeVisible();
    const href = await soon.locator("> a").getAttribute("href");
    expect(href).toMatch(/#\/co\/changes\?(persona=county&)?month=\d{4}-\d{2}$/);
    await soon.locator("> a").click();
    await expect(page.locator('.sidebar a[data-place="changes"]')).toHaveAttribute("aria-current", "page");
  }
  // Definitions are one click away, not in the tiles.
  await page.goto("/#/co/desk");
  await page.locator("details.howcounted summary").click();
  await expect(page.locator("details.howcounted")).toContainText("Takes effect soon");
});

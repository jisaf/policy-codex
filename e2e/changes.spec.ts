import { expect, test } from "@playwright/test";

/* Changes on the working tree's Colorado volume, by persona task:
 * - Rosa and Dana: what took effect this month (and in October 2026), and
 *   which stored households read it; Dana compares the federal immigrant
 *   restriction with the previous version.
 * - Marcus: what a change to the $90 earned-income disregard would affect,
 *   then proposes it and sees who must approve, on one screen. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("codex.tour", "1");
    localStorage.setItem("codex.persona", "cdhs");
  });
});

test("this month by default; October 2026's immigrant restriction compared with the previous version", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/#/co/changes");
  await expect(page.locator("h2.monthhead")).toContainText("(this month)", { timeout: 60_000 });
  await expect(page.locator("nav.changetabs a[aria-current=page]")).toHaveText("What takes effect");

  await page.locator(".monthpick select").first().selectOption("2026-10");
  await expect(page).toHaveURL(/#\/co\/changes\?month=2026-10$/);
  const row = page.locator('li.change[data-item="CO-3034"]');
  await expect(row.locator(".readers")).toContainText("CO-75", { timeout: 30_000 });
  await row.locator("button.compare").click();
  await expect(row.locator(".compared")).toContainText("10 stored results in 1 household would change");
  await expect(row.locator('table.changed tr[data-case="CO-75"]').first()).toBeVisible();

  // Only what CO-75 reads.
  await page.locator(".monthpick select").nth(2).selectOption("CO-75");
  await expect(page).toHaveURL(/hh=CO-75/);
  await expect(page.locator('li.change[data-item="CO-3034"]')).toBeVisible();
});

test("Marcus changes the $90 disregard and sees its effect and approvers on one screen", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/#/co/changes/proposal?item=CO-273");
  const ed = page.locator("section.propose-editor");
  await expect(ed).toBeVisible({ timeout: 60_000 });
  await expect(ed.getByText("Add a new dated version")).toBeVisible();

  // A correction to the same $90 changes nothing and is refused.
  await ed.locator('input[name="mode"][value="correct"]').check();
  await expect(ed.locator(".refuse")).toContainText("changes nothing");
  await expect(ed.locator("button.addto")).toBeDisabled();

  await ed.locator('input[name="value"]').fill("100");
  const effect = page.locator("section.effect");
  await expect(effect.locator(".reach")).toHaveText("Read by 6 of 47 stored households; it reaches 15.", { timeout: 30_000 });
  await expect(effect).toContainText("8 stored results in 4 households would change", { timeout: 30_000 });
  await expect(effect).toContainText("Steps on the way that change (8)");

  const approvers = page.locator("section.approvers");
  await expect(approvers.locator('li[data-role="Cash programs policy owner"]')).toContainText("Colorado Works");
  await expect(approvers.locator('li[data-role="Data steward"]')).toContainText("merges the reviewed proposal");
  await expect(page.getByRole("button", { name: /^Approve/ })).toHaveCount(0);

  await ed.locator("button.addto").click();
  await expect(page).toHaveURL(/#\/co\/changes\/proposal$/);
  await expect(page.locator(".flash")).toContainText("Added to your proposal");
  await expect(page.locator('section.holds li.entry[data-entry="CO-273"] .what')).toHaveText("Corrects the figure: $90.00 → $100.00");
  await expect(page.locator("a.proposal-pill")).toHaveText("Your proposal 1");
  await expect(page.locator("section.send button.download")).toBeEnabled();
});

test("Edits to the codex is its own page, apart from what takes effect", async ({ page }) => {
  await page.goto("/#/co/changes/codex");
  await expect(page.locator(".codexedits")).toContainText("This is not law taking effect", { timeout: 60_000 });
  await expect(page.locator("nav.crumbs")).toContainText("Edits to the codex");
});

test("at phone width the proposal stacks and nothing scrolls sideways", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/co/changes/proposal?item=CO-273");
  await expect(page.locator("section.propose-editor")).toBeVisible({ timeout: 60_000 });
  await page.locator('input[name="value"]').fill("100");
  await expect(page.locator("section.effect")).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

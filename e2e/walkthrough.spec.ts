import { expect, test } from "@playwright/test";

/* Households on the working tree's Colorado volume: choose a household from
 * the list, open a person's determination, read the deciding step, the
 * budget and the documents still needed, at desktop and phone widths. The
 * old walkthrough addresses land on the same pages. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });
});

test("walks a SNAP household from the case list to the deciding step", async ({ page }) => {
  await page.goto("/#/co/households");
  // The first load reads some 1,400 files from the working tree.
  await expect(page.locator("ul.wk-cases li").first()).toBeVisible({ timeout: 30_000 });

  await page.locator("select.wk-program-filter").selectOption("SNAP");
  await expect(page).toHaveURL(/program=SNAP/);
  await page.locator('ul.wk-cases li[data-case="CO-01"] a.wk-case').click();
  await expect(page).toHaveURL(/#\/co\/households\/CO-01/);

  // Person 3 is an ineligible non-citizen in a paid household: their SNAP
  // determination.
  await page.goto("/#/co/households/CO-01/p3?program=SNAP");
  await expect(page.locator(".wk-person")).toContainText("Person 3's own place in SNAP");
  await expect(page.locator(".wk-person")).toContainText("Not eligible");
  await expect(page.locator("ol.stepper li.step.why")).toContainText("This is why");

  // The household's allotment as a budget, with the household label kept.
  await page.locator("select.wk-outcome").selectOption("snap_allotment");
  await expect(page.locator(".wk-household")).toContainText("household's result");
  await expect(page.locator("table.wk-budget tr.result")).toContainText("$");

  // Every step, then the fold again.
  const folded = await page.locator("ol.stepper li.step").count();
  await page.locator("button.wk-showall").click();
  await expect(page).toHaveURL(/all=1/);
  // Steps that did not change the answer now show (there may be none when every
  // step decided it); the steps behind a deep step open from their own control.
  expect(await page.locator("ol.stepper li.step").count()).toBeGreaterThanOrEqual(folded);
  const behind = page.locator("ol.stepper button.wk-folded").first();
  if (await behind.count()) {
    await behind.click();
    expect(await page.locator("ol.stepper li.step").count()).toBeGreaterThan(folded);
  }

  // A citation opens its excerpt.
  const cite = page.locator("ol.stepper a[data-cite]").first();
  const sid = await cite.getAttribute("data-cite");
  await cite.click();
  await expect(page).toHaveURL(new RegExp(`excerpt=${sid}`));
});

test("an old walkthrough address opens the person's determination", async ({ page }) => {
  await page.goto("/#/co/walkthrough/CO-05?person=p3");
  await expect(page).toHaveURL(/#\/co\/households\/CO-05\/p3$/, { timeout: 30_000 });
  await expect(page.locator('.wk-pick a.chip.on[data-person="p3"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.wk-pick a.chip.on[data-program="Medicaid"]')).toBeVisible();
  await expect(page.locator('.wk-pick a.chip[data-person="p3"]')).toContainText("grandchild of Person 1");
});

test("lists CO-92's documents with their due dates, and fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/co/households/CO-92?tab=documents");
  await expect(page.locator("table.wk-docs")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('table.wk-docs tr[data-doc="cccap_work_hours_verification_is_pending"]')).toContainText("October 16, 2026");
  // One row per document, every program it is owed for, the child's CHP+ included.
  await expect(page.locator('table.wk-docs tr[data-person="p2"][data-programs*="CHP+"]')).toBeVisible();
  // The household's page adds no sideways scroll at phone width.
  const overflow = await page.locator("section.household").evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

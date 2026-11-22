import { expect, test } from "@playwright/test";

/* Households on the working tree's Colorado volume, as the personas use them:
 * Rosa reads each person's aid codes for CO-01, steps through a
 * determination and finds what more income changes (CO-07), and reads CO-92's
 * documents; Priya reads a denial as of a date (CO-87); Marcus prints the
 * CO-07 grant for a training. At 1280px and 390px. Old walkthrough addresses
 * land on the same pages. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });
});

const noSideScroll = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("Rosa: from the list to CO-01's aid codes, persons as named columns, at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#/co/households");
  // The first load reads some 1,400 files from the working tree.
  await expect(page.locator("ul.hhlist li").first()).toBeVisible({ timeout: 30_000 });
  await page.locator("input.hh-find").fill("grandmother");
  await expect(page).toHaveURL(/find=grandmother/);
  await page.locator('ul.hhlist li[data-case="CO-01"] a').click();
  await expect(page).toHaveURL(/#\/co\/households\/CO-01$/);
  const table = page.locator('table.hhgrid[data-case="CO-01"]');
  await expect(table).toBeVisible();
  await expect(table.locator("thead th[data-person]")).toHaveCount(5);
  await expect(table.locator('thead th[data-person="p1"]')).toContainText("Grandmother, 79");
  await expect(table.locator('td[data-person="p4"][data-prog="Medicaid"]')).toContainText("PH-MA-");
  await expect(table.locator('td[data-person="p2"][data-prog="SNAP"] .amount')).toContainText("$");
  const box = (await table.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(1280);
  expect(await noSideScroll(page)).toBeLessThanOrEqual(1);
  // A cell opens the person's determination.
  await table.locator('td[data-person="p3"][data-prog="SNAP"] a').first().click();
  await expect(page).toHaveURL(/#\/co\/households\/CO-01\/p3/);
  await expect(page.locator("p.client")).toBeVisible();
});

test("Rosa: steps through CO-07's grant, then finds what more income changes", async ({ page }) => {
  await page.goto("/#/co/households/CO-07/p1/cw_eligibility_status");
  await expect(page.locator("p.client")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("ol.stepper li.step.why")).toContainText("This is why");
  await expect(page.locator("ol.whyshort li").first()).toContainText("eligibility status");
  // Another result for the same person.
  await page.locator("select.det-outcome").selectOption("cw_grant_amount");
  await expect(page).toHaveURL(/#\/co\/households\/CO-07\/p1\/cw_grant_amount/);
  await expect(page.locator("p.client")).toContainText("$387");
  await expect(page.locator("table.wk-budget tr.result")).toContainText("$387");
  // What if the income changes?
  await page.locator("a.det-whatif").click();
  await expect(page).toHaveURL(/tab=whatif/);
  await page.locator("button.wi-chip", { hasText: "+$250" }).click();
  await expect(page.locator('table.wi-changes tr[data-person="p1"][data-outcome="cw_grant_amount"]')).toContainText("$325");
  await page.locator("select.wi-target").selectOption("p1:cw_eligibility_status");
  await page.locator("button.wi-find").click();
  await expect(page.locator(".wi-found")).toHaveAttribute("data-raise", "931");
  await expect(page.locator(".wi-first")).toContainText("meets income test");
  await expect(page.locator("table.wi-steps tbody tr").first()).toBeVisible();
});

test("an old walkthrough address opens the person's determination", async ({ page }) => {
  await page.goto("/#/co/walkthrough/CO-05?person=p3");
  await expect(page).toHaveURL(/#\/co\/households\/CO-05\/p3$/, { timeout: 30_000 });
  await expect(page.locator("select.det-person")).toHaveValue("p3", { timeout: 30_000 });
  await expect(page.locator("select.det-program")).toHaveValue("Medicaid");
  await expect(page.locator(".wk-person, p.client").first()).toBeVisible();
});

test("Priya: CO-87's denial, as of its date and on another date, with the appeal print", async ({ page }) => {
  await page.goto("/#/co/households/CO-87/p1/snap_person_participation_status");
  await expect(page.locator("p.client")).toContainText("not eligible for SNAP", { timeout: 30_000 });
  await expect(page.locator(".determination .asof")).toContainText("As of");
  await expect(page.locator(".fedbanner").first()).toBeVisible();
  await expect(page.locator("button.det-print-appeal")).toBeVisible();
  await page.locator("input.det-asof").fill("2027-01-15");
  await page.locator("input.det-asof").dispatchEvent("change");
  await expect(page).toHaveURL(/asof=2027-01-15/);
  await expect(page.locator(".determination .asof")).toContainText("Read with the rules in force on");
  // Open in the Map carries the household.
  const href = await page.locator(".detactions a", { hasText: "Open in the Map" }).getAttribute("href");
  expect(decodeURIComponent(href!)).toMatch(/#\/co\/map\?.*CO-87/);
});

test("CO-92's documents with their due dates, and the household fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/co/households/CO-92?tab=documents");
  await expect(page.locator("table.hhdocs-table")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('table.hhdocs-table tr[data-doc="cccap_work_hours_verification_is_pending"]')).toContainText("October 16, 2026");
  await expect(page.locator('table.hhdocs-table tr[data-person="p2"][data-programs*="CHP+"]')).toBeVisible();
  await expect(page.locator("table.hhdocs-table .pastdue, table.hhdocs-table .beforetoday").first()).toBeVisible();
  expect(await noSideScroll(page)).toBeLessThanOrEqual(1);
  for (const tab of ["", "?tab=whatif", "?tab=states"]) {
    await page.goto(`/#/co/households/CO-92${tab}`);
    await expect(page.locator("nav.hhtabs a.on")).toBeVisible();
    expect(await noSideScroll(page), tab).toBeLessThanOrEqual(1);
  }
  await page.goto("/#/co/households/CO-07/p1/cw_grant_amount");
  await expect(page.locator("p.client")).toBeVisible({ timeout: 30_000 });
  expect(await noSideScroll(page)).toBeLessThanOrEqual(1);
});

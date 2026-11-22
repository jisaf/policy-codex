import { expect, test } from "@playwright/test";

/* The shell on the working tree's Colorado volume: the search results page
 * (Enter never jumps to the first hit), old addresses redirected to their new
 * homes, the aid-code grid at 1280px, and the sidebar as a drawer at 390px. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("codex.tour", "1");
    localStorage.setItem("codex.persona", "cdhs");
  });
});

test("Enter in search opens the results page, grouped by type", async ({ page }) => {
  await page.goto("/#/co/desk");
  await expect(page.locator("section.desk")).toBeVisible({ timeout: 30_000 });
  const search = page.locator("form.searchbox input");
  await search.fill("colorado works grant standard");
  await search.press("Enter");
  // Not the first hit (the evaluators landed on "AND-SO grant standard").
  await expect(page).toHaveURL(/#\/co\/search\?q=colorado\+works\+grant\+standard$/);
  await expect(page.locator("section.searchpage h1")).toContainText("results for");
  await expect(page.locator('section.group[data-group="figure"] a[href="#/co/item/CO-276"]')).toBeVisible();
  await expect(page.locator("nav.crumbs")).toContainText("Search");
});

test("old addresses land on their new homes", async ({ page }) => {
  for (const [from, to] of [
    ["/#/co/start", /#\/co\/desk$/],
    ["/#/co/cases/CO-01", /#\/co\/households\/CO-01\?tab=states$/],
    ["/#/co/walkthrough/CO-01?person=p1&program=SNAP", /#\/co\/households\/CO-01\/p1\?program=SNAP$/],
    ["/#/co/program/SNAP", /#\/co\/programs\/SNAP$/],
    ["/#/co/document/D-3?excerpt=S8", /#\/co\/law\/doc\/D-3\?at=S8$/],
    ["/#/co/source/S8", /#\/co\/law\/sources\/S8$/],
  ] as const) {
    await page.goto(from);
    await expect(page, from).toHaveURL(to, { timeout: 30_000 });
  }
  // The household's page shows what the case states, under Households.
  await page.goto("/#/co/cases/CO-01");
  await expect(page.locator("table.expectations")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.sidebar a[data-place="households"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator("nav.crumbs")).toContainText("What the case states");
});

test("the aid-code grid fits a 1280px screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#/co/households/CO-01");
  const table = page.locator('table.household[data-case="CO-01"]');
  await expect(table).toBeVisible({ timeout: 30_000 });
  const box = (await table.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(1280);
  const wrap = await page.locator(".hhwrap").evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(wrap).toBeLessThanOrEqual(1);
  // Every program's column is on screen, child care included.
  const last = (await table.locator("thead th").last().boundingBox())!;
  expect(last.x + last.width).toBeLessThanOrEqual(1280);
});

test("at phone width the sidebar is a drawer the Menu button opens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/co/desk");
  await expect(page.locator("section.desk")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("aside.sidebar")).not.toBeVisible();
  const menu = page.locator("button.navtoggle");
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.locator("aside.sidebar")).toBeVisible();
  await page.locator('.sidebar a[data-place="households"]').click();
  await expect(page).toHaveURL(/#\/co\/households$/);
  await expect(page.locator("aside.sidebar")).not.toBeVisible();
  // Escape closes it too.
  await menu.click();
  await expect(page.locator("aside.sidebar")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("aside.sidebar")).not.toBeVisible();
  // No sideways scroll on the page.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

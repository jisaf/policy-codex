import { expect, test } from "@playwright/test";

/* Aid codes on the working tree's Colorado volume (Programs, aid codes tab):
 * placeholder codes, one code's rule and households. A household's own grid
 * is e2e/households.spec.ts. The old by-outcome addresses land on those
 * pages. */
test("aid codes read as placeholders, with their rule, figures and households", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });
  await page.goto("/#/co/outcomes/Medicaid?code=PH-MA-CHILD");
  await expect(page).toHaveURL(/#\/co\/programs\/Medicaid\?tab=aid-codes&code=PH-MA-CHILD$/, { timeout: 30_000 });
  await expect(page.locator('.sidebar a[data-place="programs"]')).toHaveAttribute("aria-current", "page");
  const view = page.locator("section.outcomes");
  await expect(view.locator(".placeholder-banner")).toContainText("PLACEHOLDER", { timeout: 30_000 });

  const card = view.locator('.codecard[data-code="PH-MA-CHILD"]');
  await expect(card.locator(".codebody")).toBeVisible();
  await expect(card).toContainText("The rule that leads here");
  await expect(card.locator('a[href*="excerpt="]').first()).toBeVisible();
  await expect(card.locator('ul.landings a[href*="/households/"]').first()).toBeVisible();

});

test("a household never set up for a program says so, and the grid fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });
  await page.goto("/#/co/outcomes?tab=household&case=CO-83");
  await expect(page).toHaveURL(/#\/co\/households\/CO-83$/, { timeout: 30_000 });
  // At phone width the grid is one card per person.
  await expect(page.locator(".hhcards .hhperson").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".untested-line")).toContainText("Medicaid");
  const overflow = await page.locator("section.household").evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

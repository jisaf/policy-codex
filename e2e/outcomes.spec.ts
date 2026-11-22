import { expect, test } from "@playwright/test";

/* The by-aid-code view on the working tree's Colorado volume: placeholder
 * codes, one code's rule and households, and one stored household's persons
 * across every program, each cell linking to the walkthrough. */
test("aid codes read as placeholders, with their rule, figures and households", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });
  await page.goto("/#/co/outcomes/Medicaid?code=PH-MA-CHILD");
  const view = page.locator("section.outcomes");
  await expect(view.locator(".placeholder-banner")).toContainText("PLACEHOLDER", { timeout: 30_000 });

  const card = view.locator('.codecard[data-code="PH-MA-CHILD"]');
  await expect(card.locator(".codebody")).toBeVisible();
  await expect(card).toContainText("The rule that leads here");
  await expect(card.locator('a[href*="excerpt="]').first()).toBeVisible();
  await expect(card.locator('ul.landings a[href*="/walkthrough/"]').first()).toBeVisible();

  // The household view: one row per person, a column per program.
  await view.locator("nav.tabs a", { hasText: "Household view" }).click();
  await view.locator(".controls select").first().selectOption("CO-01");
  const table = view.locator('table.household[data-case="CO-01"]');
  await expect(table.locator("tbody tr")).toHaveCount(5);
  await expect(table.locator('tr[data-person="p4"] td[data-prog="Medicaid"]')).toContainText("PH-MA-");
  // Ages and amounts are in the grid.
  await expect(table.locator('tr[data-person="p1"] th')).toContainText(/age \d+/);
  await expect(table.locator('tr[data-person="p2"] td[data-prog="SNAP"] .amount')).toContainText("$");
  await table.locator('tr[data-person="p3"] td[data-prog="SNAP"] a').first().click();
  await expect(page).toHaveURL(/#\/co\/walkthrough\/CO-01\?person=p3&program=SNAP&outcome=/);
});

test("a household never set up for a program says so, and the grid fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });
  await page.goto("/#/co/outcomes?tab=household&case=CO-83");
  const table = page.locator('table.household[data-case="CO-83"]');
  await expect(table).toBeVisible({ timeout: 30_000 });
  await expect(table.locator('td[data-prog="Medicaid"] .untested').first()).toContainText("Not tested in this case");
  const overflow = await page.locator("section.outcomes").evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

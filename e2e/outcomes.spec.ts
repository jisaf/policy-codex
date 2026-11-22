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
  await table.locator('tr[data-person="p3"] td[data-prog="SNAP"] a').click();
  await expect(page).toHaveURL(/#\/co\/walkthrough\/CO-01\?person=p3&program=SNAP/);
});

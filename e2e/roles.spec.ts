import { expect, test } from "@playwright/test";

/* The by-role home on the working tree's Colorado volume: a persona's
 * counts link into the inbox and the question queue, its programs open on
 * outcome cards, and its figures read on a chosen date. */
test("the CDHS role home links its queues and reads figures as of a date", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });
  await page.goto("/#/co/roles/cdhs");
  const home = page.locator('section.roles div.persona[data-persona="cdhs"]');
  await expect(home).toBeVisible({ timeout: 30_000 });

  await expect(home.locator(".countcard").first()).toContainText("waiting on your sign-off");
  await expect(home.locator('.countcard a[href*="/inbox?role="]').first()).toBeVisible();
  await expect(home.locator('.countcard a[href*="/questions?persona=cdhs"]')).toBeVisible();

  // A program opens on plain-language outcome cards.
  await home.locator("details.program summary", { hasText: "Colorado Works" }).click();
  await expect(home.locator('.outcomecard[data-outcome="cw_eligibility_status"]')).toBeVisible();

  // What changed: SNAP's October figures, each with its rule text.
  await expect(home.locator("#role-changes li.change").first()).toBeVisible();
  await expect(home.locator('#role-changes a[href*="excerpt="]').first()).toBeVisible();

  // Figures in force on a date after the Colorado Works standards run out.
  await page.goto("/#/co/roles/cdhs?asof=2028-08-01&show=figures");
  const cw = page.locator('details.figuregroup[data-program="ColoradoWorks"]');
  await cw.locator(":scope > summary").click();
  await expect(cw.locator("li.figure .warn").first()).toContainText("No version in force");
});

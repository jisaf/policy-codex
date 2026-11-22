import { expect, test } from "@playwright/test";

/* The Desk for a role on the working tree's Colorado volume (until the Desk
 * track builds its tiles, the role page's content): a persona's counts link
 * into the sign-off list and the question queue, its programs open on
 * outcome cards, and its figures read on a chosen date. The old role-page
 * address lands here. */
test("the CDHS Desk links its queues and reads figures as of a date", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });
  await page.goto("/#/co/roles/cdhs");
  await expect(page).toHaveURL(/#\/co\/desk\?persona=cdhs$/, { timeout: 30_000 });
  const home = page.locator('section.desk div.persona[data-persona="cdhs"]');
  await expect(home).toBeVisible({ timeout: 30_000 });

  await expect(home.locator(".countcard").first()).toContainText("waiting on your sign-off");
  await expect(home.locator('.countcard a[href*="/desk/sign?role="]').first()).toBeVisible();
  await expect(home.locator('.countcard a[href*="/questions?persona=cdhs"]').first()).toBeVisible();
  // The question card's number is the open questions owned; its lines add
  // up to those plus the partly settled ones, counted apart.
  const qcard = home.locator(".countcard", { hasText: "open questions" });
  const total = Number((await qcard.locator(".num").textContent())!.replace(/,/g, ""));
  const partlyText = (await qcard.locator(".partly").count()) ? (await qcard.locator(".partly").textContent())! : "and 0 partly";
  const partly = Number(/and (\d+) partly/.exec(partlyText)![1]);
  const lines = await qcard.locator("li").allTextContents();
  if (lines.length) expect(lines.reduce((n, t) => n + Number(/: (\d+)$/.exec(t)![1]), 0)).toBe(total + partly);

  // A program opens on plain-language outcome cards.
  await home.locator("details.program summary", { hasText: "Colorado Works" }).click();
  await expect(home.locator('.outcomecard[data-outcome="cw_eligibility_status"]')).toBeVisible();

  // What changed: SNAP's October figures, each with its rule text.
  await expect(home.locator("#role-changes li.change").first()).toBeVisible();
  await expect(home.locator('#role-changes a[href*="excerpt="]').first()).toBeVisible();

  // Figures in force on a date after the Colorado Works standards run out.
  await page.goto("/#/co/desk?persona=cdhs&asof=2028-08-01&show=figures");
  const cw = page.locator('details.figuregroup[data-program="ColoradoWorks"]');
  await cw.locator(":scope > summary").click();
  await expect(cw.locator("li.figure .warn").first()).toContainText("No version in force");
});

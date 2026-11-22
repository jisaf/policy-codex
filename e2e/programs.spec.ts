import { expect, test } from "@playwright/test";

/* Figures and Programs on the working tree's Colorado volume, by persona
 * task (docs/design-unified-ui.md): Marcus, the CDHS cash lead, finds the
 * Colorado Works grant standard from Figures (a word filter, never a phrase),
 * then explains the grant computation step by step for a training from
 * Programs: a chosen depth, a stored household's values, print. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("codex.tour", "1");
    localStorage.setItem("codex.persona", "cdhs");
  });
});

test("Marcus finds the Colorado Works grant standard from Figures", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/#/co/figures");
  await expect(page.locator(".placehead h1")).toHaveText("Figures", { timeout: 30_000 });
  const find = page.locator(".figfilters input[type=search]");
  await find.fill("standard colorado grant");
  await find.press("Enter");
  await expect(page).toHaveURL(/q=standard\+colorado\+grant/);
  const row = page.locator('tr.figure[data-figure="cw_grant_standard_table"]');
  await expect(row).toBeVisible();
  await expect(row.locator("td.val")).toContainText("a table of");
  // On a date after the standards run out, the figure has no value.
  await page.locator(".figfilters input[type=date]").fill("2028-08-01");
  await page.locator(".figfilters input[type=date]").dispatchEvent("change");
  await expect(page).toHaveURL(/asof=2028-08-01/);
  await expect(row.locator(".warn")).toContainText("cannot determine");
  await row.locator("a.figname").click();
  await expect(page).toHaveURL(/#\/co\/item\/CO-276/);
  await expect(page.locator('.sidebar a[data-place="figures"]')).toHaveAttribute("aria-current", "page");
});

test("Marcus explains the grant computation step by step for a training", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/#/co/programs");
  await page.locator('li.pcard[data-program="ColoradoWorks"] a').click({ timeout: 30_000 });
  await expect(page).toHaveURL(/#\/co\/programs\/ColoradoWorks$/);
  await expect(page.locator("nav.crumbs")).toContainText("Colorado Works");
  await page.locator('li.outcomerow[data-outcome="cw_grant_amount"] a.explain').click();
  await expect(page).toHaveURL(/#\/co\/programs\/ColoradoWorks\/cw_grant_amount$/);
  await expect(page.locator("li.step")).toHaveCount(4);
  await expect(page.locator("li.step.result .step-n")).toHaveText("Result");
  await page.locator("nav.depthchips a", { hasText: "Two levels" }).click();
  await expect(page).toHaveURL(/depth=2/);
  await expect(page.locator("li.step")).toHaveCount(18);
  await page.locator(".hhpick select").selectOption("CO-07|p1");
  await expect(page).toHaveURL(/case=CO-07&person=p1/);
  await expect(page.locator("li.step.result .step-v")).toHaveText("In this household: $387.00");
  await expect(page.locator("button.print")).toHaveText("Print for a training");
  // Printed, the page is the steps alone.
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".explainbar")).toBeHidden();
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".print-only")).toContainText("Training handout");
  await page.emulateMedia({ media: "screen" });

  // The program's Map tab: the Map centred on the program.
  await page.goto("/#/co/programs/ColoradoWorks?tab=map");
  await expect(page.locator('section.mapview[data-mode="embed"]')).toBeVisible({ timeout: 30_000 });
});

import { expect, test, type Page } from "@playwright/test";

/* The item page on the working tree's Colorado volume, by the persona probes
 * the evaluators ran (docs/reviews/compare-eval-1.md, compare-eval-2.md):
 * Dana checks the children's Medicaid income limit (CO-191) against its
 * rule text; Marcus finds the Colorado Works grant standard's versions and
 * the SB 26-181 freeze (CO-276); Priya traces a citation to the verbatim
 * regulation. Then the sign-off panel, "Propose a change" and the Map tab. */

async function open(page: Page, hash: string, persona = "hcpf") {
  await page.addInitScript((p) => {
    localStorage.setItem("codex.tour", "1");
    localStorage.setItem("codex.persona", p);
  }, persona);
  await page.goto(hash);
  await expect(page.locator(".itempage h1")).toBeVisible({ timeout: 60_000 });
}

test("Dana: the children's income limit beside the rule text that states it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "/#/co/item/CO-191");
  await expect(page.locator(".figure-today .bigvalue")).toHaveText("142% of FPL");
  // The 2026 dollar table stays.
  await expect(page.locator(".figure-today table.fpl")).toBeVisible();
  // The version in force sits beside its excerpt, the number marked.
  const current = page.locator(".fversion.current");
  await expect(current).toHaveAttribute("data-from", "2022-06-30");
  await expect(current.locator("blockquote.words mark").first()).toHaveText("142%");
  await expect(current).toContainText("1 of 1 number found in the excerpt");
  // The law is on the page, not under a fold; no "Decision record" heading above the implementers' foot.
  await expect(page.locator("section#law blockquote.words").first()).toBeVisible();
  await expect(page.locator("section#law")).not.toContainText("Decision record");
  // Every count reads from counts.ts (test/ui/counts.test.ts): 20 read it, it reaches 28.
  await expect(page.locator("section#households .countline")).toContainText(/Read by 20 of \d+ stored households; it reaches 28/, { timeout: 30_000 });
});

test("Marcus: the grant standard's versions, the freeze and the gap", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "/#/co/item/CO-276", "cdhs");
  const bar = page.locator(".tlbar");
  await expect(bar.locator(".seg")).toHaveCount(3);
  await expect(bar.locator(".seg.same")).toContainText("Same figures");
  await expect(bar.locator(".today")).toBeVisible();
  await expect(page.locator("ul.gaps")).toContainText("From July 1, 2028 no figure; a household determined then gets “cannot determine”");
  const frozen = page.locator('.fversion[data-from="2026-07-01"]');
  await expect(frozen).toContainText("Same figures as the version before");
  await expect(frozen.locator(".why")).toContainText("no cost-of-living adjustment");
  await expect(frozen).toContainText("The excerpt states no figures: it carries the previous ones forward");
  await expect(page.locator('.fversion[data-from="2025-07-01"]')).toContainText("11 of 11 numbers found in the excerpt");
  // The legislative history is visible, not under "Precision".
  await expect(page.locator(".fighistory")).toContainText("SB 26-181");
  // The meaning names CO-274 by its name, linked.
  await expect(page.locator(".lead-meaning a.itemref")).toHaveAttribute("href", "#/co/item/CO-274");
  await expect(page.locator(".lead-meaning")).not.toContainText("cw_need_standard_table");
  // Nothing to compare: the version before has the same figures.
  await expect(page.locator("section#affects")).toContainText("same figures as the version before");
});

test("Priya: from a citation to the verbatim regulation in its document", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "/#/co/item/CO-914", "legal");
  // The meaning reads in names, not identifiers.
  await expect(page.locator(".lead-meaning")).not.toContainText("cw_eligibility_status");
  await expect(page.locator(".lead-meaning")).toContainText("(Colorado Works: eligibility status)");
  // The rule in plain sentences, each item a definition card.
  await page.locator(".decided .derivation button.tok[data-id]").first().click();
  await expect(page.locator(".tokpop")).toBeVisible();
  await page.keyboard.press("Escape");
  const excerpt = page.locator("section#law article.excerpt").first();
  await expect(excerpt.locator("blockquote.words")).toContainText("Gross Income");
  await excerpt.getByRole("link", { name: /Read it in the full document/ }).click();
  await expect(page).toHaveURL(/#\/co\/law\/doc\/D-\d+\?at=S415$/);
});

test("the sign-off panel needs a name and stages a signature; never on my own staged change", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "/#/co/item/CO-276", "cdhs");
  const panel = page.locator("#signoff");
  await expect(panel.locator("dl.facts")).toContainText("Why you sign");
  await panel.getByRole("button", { name: "Approve as Cash programs policy owner" }).click();
  await expect(panel).toContainText("Type your name first");
  await panel.getByLabel("Your name").fill("Marcus Test");
  await panel.getByRole("button", { name: "Approve as Cash programs policy owner" }).click();
  await expect(panel.locator(".notice")).toContainText("Your approval as the Cash programs policy owner (Marcus Test");
  await expect(panel.locator(".staged-note")).toContainText("Your signature is in your proposal");
  await panel.getByRole("button", { name: "Take it back" }).click();

  // "Propose a change" opens the one editor (Changes › My proposal, the item
  // chosen): refused when it changes nothing, staged when it does.
  await page.locator("#propose").getByRole("link", { name: "Change the figure" }).click();
  await expect(page).toHaveURL(/#\/co\/changes\/proposal\?item=CO-276$/);
  const ed = page.locator("section.propose-editor");
  await ed.locator('input[name="mode"][value="correct"]').check();
  await expect(ed.locator(".refuse")).toContainText("changes nothing");
  await ed.locator('input[name="row-0"]').fill("382");
  await ed.locator("button.addto").click();
  await expect(page.locator(".flash")).toContainText("Added to your proposal");
  // My own change: no Approve.
  await page.goto("/#/co/item/CO-276");
  await expect(panel).toContainText("You changed this item in your proposal, so you cannot sign it", { timeout: 30_000 });
  await expect(panel.getByRole("button", { name: /^Approve/ })).toHaveCount(0);
  // Its effect on the stored households is one click away.
  await page.getByRole("button", { name: "Compare the stored households with your staged change" }).click();
  await expect(page.locator("section#affects .compare .countline")).toBeVisible({ timeout: 30_000 });
});

test("the Map tab and the phone layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/#/co/item/CO-191");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.locator('.itemtabs a[data-tab="map"]').click();
  await expect(page).toHaveURL(/#\/co\/item\/CO-191\?tab=map$/);
  await expect(page.locator(".itemmap section.mapview")).toBeVisible();
  await expect(page.locator("nav.crumbs li").last()).toHaveText("Map");
});

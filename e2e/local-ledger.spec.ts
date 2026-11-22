import { expect, test } from "@playwright/test";

/* The preview server serves the working tree under /__ledger/, so the
 * Colorado volume opens with no interception of raw.githubusercontent.com.
 * Any request to GitHub would mean the app did not use the local tree. */
test("opens the co volume from the working tree and visits each place", async ({ page }) => {
  const github: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("raw.githubusercontent.com")) github.push(url);
  });
  // A first visit with the tour already seen, so nothing overlays the page.
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });

  // The bare app URL: the Desk, on the Colorado volume by default, asking for a role.
  await page.goto("/");
  // The first load reads some 1,400 files from the working tree.
  await expect(page.locator("section.desk")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".volume-select")).toHaveValue("co");
  await expect(page.locator(".ref-select")).toHaveValue("local");
  await expect(page.locator(".ref-select option:checked")).toContainText("working tree");
  await expect(page.locator(".rolechoice .door")).toHaveCount(6);

  // A role door shows the role's work, and the sidebar's picker says so.
  await page.locator('.door[data-persona="hcpf"]').click();
  await expect(page.locator('section.desk div.persona[data-persona="hcpf"]')).toContainText("Medicaid", { timeout: 15_000 });
  await expect(page.locator("select[aria-label='Working as']")).toHaveValue("hcpf");

  for (const [place, heading] of [
    ["programs", null],
    ["figures", "Figures"],
    ["households", "Households"],
    ["questions", null],
    ["law", "Law"],
    ["changes", "Changes"],
    ["desk", "Desk"],
  ] as const) {
    await page.locator(`.sidebar a[data-place="${place}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#/co/${place}$`));
    await expect(page.locator(`.sidebar a[data-place="${place}"]`)).toHaveAttribute("aria-current", "page");
    await expect(page.locator("nav.crumbs li").first()).toHaveText(place[0].toUpperCase() + place.slice(1));
    if (heading) await expect(page.locator(".placehead h1")).toHaveText(heading);
  }

  // An open question has its own page.
  await page.locator('.sidebar a[data-place="questions"]').click();
  await page.locator("ul.qlist a").first().click();
  await expect(page).toHaveURL(/#\/co\/questions\/OQ-\d+/);
  await expect(page.locator("section.question .qstatus")).toBeVisible();

  // A Colorado item reads in plain words: its meaning, then its figure. A
  // figure's page is under Figures.
  await page.goto("/#/co/item/CO-191");
  await expect(page.locator(".lead-meaning")).toContainText("Children");
  await expect(page.locator(".param-value")).toContainText("% of FPL");
  await expect(page.locator('.sidebar a[data-place="figures"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator("nav.crumbs li").first()).toHaveText("Figures");

  // The implementer tools are in their own menu.
  await page.locator(".sidebar details.implementers summary").click();
  await page.locator(".sidebar details.implementers a", { hasText: "Table of every item" }).click();
  await expect(page).toHaveURL(/#\/co\/table$/);

  // Nothing was read from GitHub.
  expect(github).toEqual([]);
});

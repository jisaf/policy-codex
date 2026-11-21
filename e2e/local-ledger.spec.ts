import { expect, test } from "@playwright/test";

/* The preview server serves the working tree under /__ledger/, so the
 * Colorado volume opens with no interception of raw.githubusercontent.com.
 * Any request to GitHub would mean the app did not use the local tree. */
test("opens the co volume from the working tree and visits each workflow view", async ({ page }) => {
  const github: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("raw.githubusercontent.com")) github.push(url);
  });
  // A first visit with the tour already seen, so nothing overlays the page.
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });

  // The bare app URL: the start page, on the Colorado volume by default.
  await page.goto("/");
  // The first load reads some 1,400 files from the working tree.
  await expect(page.locator("section.start")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".volume-select")).toHaveValue("co");
  await expect(page.locator(".ref-select")).toHaveValue("local");
  await expect(page.locator(".ref-select option:checked")).toContainText("working tree");
  await expect(page.locator(".doors.roles .door")).toHaveCount(6);
  await expect(page.locator(".doors.classic .door")).toHaveCount(4);

  // A role entry point routes to its view.
  await page.locator('.door[data-persona="hcpf"]').click();
  await expect(page).toHaveURL(/#\/co\/roles\/hcpf/);
  await expect(page.locator('section.roles div.persona[data-persona="hcpf"]')).toContainText("Medicaid", { timeout: 15_000 });

  for (const [view, title] of [
    ["inbox", "Approvals inbox"],
    ["questions", "Open questions"],
    ["walkthrough", "Case walkthrough"],
    ["roles", "By role"],
    ["outcomes", "By aid code and outcome"],
  ] as const) {
    await page.locator(`nav.workflows a[data-view="${view}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#/co/${view}$`));
    await expect(page.locator(".viewhead h1")).toHaveText(title);
    await expect(page.locator(".viewhead .purpose")).not.toBeEmpty();
  }

  // An open question has its own page.
  await page.locator(`nav.workflows a[data-view="questions"]`).click();
  await page.locator("ul.qlist a").first().click();
  await expect(page).toHaveURL(/#\/co\/questions\/OQ-\d+/);
  await expect(page.locator("section.question .qstatus")).toBeVisible();

  // A Colorado item reads in plain words: its meaning, then its figure.
  await page.goto("/#/co/item/CO-191");
  await expect(page.locator(".lead-meaning")).toContainText("Children");
  await expect(page.locator(".param-value")).toContainText("% of FPL");

  // Nothing was read from GitHub.
  expect(github).toEqual([]);
});

import { expect, test } from "@playwright/test";

/* Editing a figure set by dated periods on the working tree's Colorado
 * volume (CDHS cash lead retest, section 2): a new period from July 1, 2028
 * is added in the form editor and kept in the tray as a change, never as
 * "no change", and the editor offers the change as a download. */
test("adds a dated period to the Colorado Works grant standard", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    localStorage.setItem("codex.tour", "1");
    localStorage.setItem("codex.persona", "cdhs");
  });
  await page.goto("/#/co/item/CO-276");
  await expect(page.getByRole("heading", { name: /grant standard by number of children/ })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Turn on edit mode" }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  // The text surface says which period the Value line is.
  await expect(page.locator(".periodsnote")).toContainText("Add a new dated period");

  // Advanced, Form: add the July 2028 chart.
  await page.locator("details.advanced summary").click();
  await page.locator('button[data-surface="form"]').click();
  await page.locator('input[name="period-from"]').fill("2028-07-01");
  await page.locator('input[name="period-value"]').fill('{"0": 382, "1": 498, "2": 662}');
  await page.locator('input[name="period-source"]').fill("S1800");
  await page.locator("button.addperiodbtn").click();
  await expect(page.locator('table.periodtable tr[data-from="2028-07-01"]')).toBeVisible();
  await expect(page.locator(".editor .btn.download")).toBeEnabled();

  await page.getByRole("button", { name: "Save to tray" }).click();
  await page.getByRole("button", { name: /^Tray \(/ }).click();
  const entry = page.locator(".tray li.entry", { hasText: "CO-276" });
  await expect(entry).toContainText("edit");
  await expect(entry).not.toContainText("no change");
});

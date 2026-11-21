import { expect, test } from "@playwright/test";

/* The open-question decision queue on the working tree's Colorado volume:
 * the queue by owner, a filter, the departures tab, a question's full page
 * with its household effects, and an answer staged through the change tray. */
test("the decision queue: filter, departures, a question's page, and an answer staged", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    localStorage.setItem("codex.tour", "1");
    localStorage.setItem("codex.door", "reader");
  });

  await page.goto("/#/co/questions");
  await expect(page.locator(".viewhead h1")).toHaveText("Open questions", { timeout: 60_000 });
  const cards = page.locator("li.qcard");
  await expect(cards.first()).toBeVisible();
  const total = await cards.count();
  expect(total).toBeGreaterThan(10);
  await expect(page.locator("section.qgroup").first().locator("h2")).not.toBeEmpty();
  // The household effects arrive after the first paint.
  await expect(cards.first().locator(".effect")).not.toContainText("Working out", { timeout: 30_000 });

  // Filter to the questions that need Legal.
  await page.locator(".qfilters select").nth(2).selectOption("legal");
  await expect(page).toHaveURL(/class=legal/);
  const legal = await page.locator("li.qcard").count();
  expect(legal).toBeGreaterThan(0);
  expect(legal).toBeLessThan(total);
  await expect(page.locator('li.qcard[data-class="legal"]')).toHaveCount(legal);

  // Departures: statute over rule, as decisions for Legal.
  await page.locator(".qtabs a", { hasText: "Departures" }).click();
  await expect(page.locator("li.departure").first()).toContainText("Colorado rule it departs from");

  // Resolved questions are kept apart, folded, and searchable.
  await page.locator(".qtabs a", { hasText: "Decision queue" }).click();
  const resolved = page.locator("details.qresolved");
  await expect(resolved).not.toHaveAttribute("open", "");
  await resolved.locator("summary").click();
  await resolved.locator("input[type=search]").fill("OQ-2");
  await expect(resolved.locator("li").first()).toContainText(/./);

  // A question's full page, with what the other reading changes.
  await page.goto("/#/co/questions/OQ-533?answer=1");
  const q = page.locator('section.question[data-question="OQ-533"]');
  await expect(q.locator(".assumption")).not.toBeEmpty();
  await expect(q.locator(".alternative .effect-count")).toContainText("change", { timeout: 30_000 });
  await expect(q.locator("table.qresults td.changed").first()).toBeVisible();

  // Answer it: the edit is staged in the change tray.
  const form = q.locator("form.qanswer");
  await form.locator("textarea").fill("Apply the rule as written until CDHS's agency letter.");
  await form.getByLabel("Citation").fill("CDHS agency letter");
  await form.getByLabel("Decided by").fill("Priya Shah");
  await form.getByRole("button", { name: "Stage the answer" }).click();
  await expect(q.locator(".qstaged")).toContainText("Staged in the change tray");
  await q.getByRole("button", { name: "Open the change tray" }).click();
  await expect(page.locator(".sheet.tray")).toContainText("Answer to OQ-533");
});

test("the queue fits a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("codex.tour", "1");
    localStorage.setItem("codex.door", "reader");
  });
  await page.goto("/#/co/questions");
  await expect(page.locator("li.qcard").first()).toBeVisible({ timeout: 60_000 });
  const right = await page.locator("section.questions").evaluate((el) => {
    let max = 0;
    for (const n of el.querySelectorAll("*")) max = Math.max(max, n.getBoundingClientRect().right);
    return max;
  });
  expect(right).toBeLessThanOrEqual(390);
});

import { expect, test, type Page } from "@playwright/test";

/* Questions and Law on the working tree's Colorado volume, by the
 * evaluators' persona tasks: Dana answers an open question she owns, Marcus
 * sorts his questions, Priya finds every statute-over-rule place with its
 * reasoning, records a legal opinion, sees the unverified figures and what
 * depends on them, and traces a citation into the full document. */
async function as(page: Page, persona: string | null) {
  await page.addInitScript((p) => {
    localStorage.setItem("codex.tour", "1");
    localStorage.setItem("codex.door", "reader");
    if (p) localStorage.setItem("codex.persona", p);
  }, persona);
}

test("Dana answers an open question she owns, through the change tray", async ({ page }) => {
  test.setTimeout(120_000);
  await as(page, "hcpf");
  await page.goto("/#/co/questions");
  await expect(page.locator("li.qcard").first()).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /Only mine/ }).click();
  await expect(page).toHaveURL(/mine=1/);
  const first = page.locator("li.qcard").first();
  await expect(first.locator(".qowner .you")).toBeVisible();
  await first.getByRole("link", { name: "Answer it" }).click();
  await expect(page).toHaveURL(/#\/co\/questions\/OQ-\d+\?act=answer/);
  const q = page.locator("section.question");
  await expect(q.locator(".assumption")).not.toBeEmpty();
  const form = q.locator('form.qanswer[data-act="answer"]');
  await form.locator("textarea").fill("Keep the reading in force; the rule text is clear enough.");
  await form.getByLabel("Citation").fill("10 CCR 2505-10 8.100.4");
  await form.getByLabel(/Agency notified/).fill("HCPF eligibility policy, 2026-11-22");
  await form.getByLabel("Decided by").fill("Dana Ortiz");
  await form.getByRole("button", { name: "Stage the answer" }).click();
  await expect(q.locator(".qstaged")).toContainText("Staged in the change tray");
  await expect(q.locator(".qstaged .sendchange")).toContainText("Data steward");
  await q.getByRole("button", { name: "Open the change tray" }).click();
  await expect(page.locator(".sheet.tray")).toContainText(/Answer to OQ-\d+/);
});

test("Marcus sorts the questions he owns; every card names him", async ({ page }) => {
  test.setTimeout(120_000);
  await as(page, "cdhs");
  await page.goto("/#/co/questions");
  await expect(page.locator("li.qcard").first()).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /Only mine/ }).click();
  await page.getByRole("combobox", { name: /^Owner/ }).selectOption("Cash programs policy owner");
  await page.getByRole("combobox", { name: /^Sort/ }).selectOption("households");
  await expect(page).toHaveURL(/sort=households/);
  await expect(page.locator(".qsummary")).toContainText("19 questions, owned by Cash programs policy owner");
  await expect(page.locator(".qsummary")).not.toContainText("Working out", { timeout: 60_000 });
  const owners = await page.locator("li.qcard").evaluateAll((els) => els.map((e) => e.getAttribute("data-owner")));
  expect(owners).toHaveLength(19);
  expect(new Set(owners)).toEqual(new Set(["Cash programs policy owner"]));
});

test("Priya: every statute-over-rule place with its reasoning, and a legal opinion recorded", async ({ page }) => {
  test.setTimeout(120_000);
  await as(page, "legal");
  await page.goto("/#/co/law");
  await expect(page.locator(".lawcards")).toBeVisible({ timeout: 60_000 });
  await page.locator(".lawtabs a", { hasText: "Statute over rule" }).click();
  await expect(page).toHaveURL(/#\/co\/law\/departures$/);
  const rows = page.locator("li.departure");
  await expect(rows.first()).toBeVisible({ timeout: 60_000 });
  const n = await rows.count();
  expect(n).toBeGreaterThan(10);
  await expect(page.locator(".lawtabs a.on .n")).toHaveText(String(n));
  for (const label of ["The codex follows", "Departs from", "Reasoning", "Questions", "Agency notified"]) {
    await expect(rows.first().locator("dl.depfields")).toContainText(label);
  }
  // A departure with an open question: record Legal's opinion on it.
  const withQ = page.locator("li.departure", { has: page.getByRole("link", { name: /Record a legal opinion on OQ-/ }) }).first();
  await withQ.getByRole("link", { name: /Record a legal opinion on OQ-/ }).click();
  await expect(page).toHaveURL(/\?act=opinion/);
  const form = page.locator('form.qanswer[data-act="opinion"]');
  await form.getByLabel("The opinion").fill("The statute governs from its effective date; the Colorado rule yields until amended.");
  await form.getByLabel("Authority relied on").fill("Pub. L. 119-21 sec. 10102");
  await form.getByLabel("Effect").selectOption("Federal statute governs over Colorado's text");
  await form.getByLabel(/Agency notified/).fill("CDHS, by letter of 2026-11-22");
  await form.getByLabel("Given by").fill("Priya Shah");
  await form.getByRole("button", { name: "Stage the opinion" }).click();
  await expect(page.locator(".qstaged")).toContainText("the question stays open");
  // The departure now shows the agency notice the opinion recorded.
  await page.goto("/#/co/law/departures");
  await expect(page.locator("li.departure dl.depfields", { hasText: "CDHS, by letter of 2026-11-22" }).first()).toBeVisible({ timeout: 30_000 });
});

test("Priya: unverified figures, and what depends on them", async ({ page }) => {
  test.setTimeout(120_000);
  await as(page, "legal");
  await page.goto("/#/co/law/unverified");
  await expect(page.locator(".insum")).toContainText("items take a figure from an unverified source", { timeout: 60_000 });
  await expect(page.locator("section.unvsource")).toHaveCount(2);
  await expect(page.locator("ul.restlist").first().locator("li").first()).toBeVisible();
  await expect(page.locator(".hhlist a").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("ul.missing li").first()).toContainText(/no version/);
});

test("Priya traces a citation into the full document, the whole passage highlighted", async ({ page }) => {
  test.setTimeout(120_000);
  await as(page, "legal");
  await page.goto("/#/co/questions/OQ-533");
  const read = page.locator(".excerpt").first().getByRole("link", { name: "Read it in the full document" });
  await expect(read).toBeVisible({ timeout: 60_000 });
  await read.click();
  await expect(page).toHaveURL(/#\/co\/law\/doc\/D-\d+\?at=S\d+/);
  const hits = page.locator(".doctext pre.hit");
  await expect(hits.first()).toBeInViewport({ timeout: 30_000 });
  expect(await hits.count()).toBeGreaterThan(1);
  await expect(page.locator(".notice")).toContainText("highlighted");
  // S8 in D-3: every paragraph of the excerpt, not only the first.
  await page.goto("/#/co/law/doc/D-3?at=S8");
  await expect(page.locator(".doctext pre.hit").first()).toBeInViewport({ timeout: 30_000 });
  expect(await page.locator(".doctext pre.hit").count()).toBeGreaterThan(5);
  await expect(page.locator("section.law-document")).not.toContainText("volumes/co");
});

test("search finds the long-term care questions by word", async ({ page }) => {
  await as(page, null);
  await page.goto("/#/co/questions");
  await expect(page.locator("li.qcard").first()).toBeVisible({ timeout: 60_000 });
  const all = await page.locator("li.qcard").count();
  await page.locator(".qfilters input[type=search]").fill("long-term care");
  await expect(page).toHaveURL(/q=long-term/);
  const ltc = await page.locator("li.qcard").count();
  expect(ltc).toBeGreaterThan(0);
  expect(ltc).toBeLessThan(all);
});

test("Questions and Law fit a phone screen", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await as(page, "legal");
  for (const [hash, sel] of [
    ["/#/co/questions", "li.qcard"],
    ["/#/co/questions/OQ-533?act=opinion", "form.qanswer"],
    ["/#/co/law/departures", "li.departure"],
    ["/#/co/law/unverified", "section.unvsource"],
    ["/#/co/law/doc/D-3?at=S8", "pre.hit"],
  ] as const) {
    await page.goto(hash);
    await expect(page.locator(sel).first()).toBeVisible({ timeout: 60_000 });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over, hash).toBeLessThanOrEqual(0);
  }
});

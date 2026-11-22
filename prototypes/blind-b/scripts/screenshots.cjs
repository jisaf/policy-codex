/* Takes the screenshots in ../screenshots at 1280px and 390px wide.
 * Serve the built app first (see README), then:
 *   node prototypes/blind-b/scripts/screenshots.cjs [http://localhost:4319] [name-filter] */
// PLAYWRIGHT_MODULE lets a globally installed Playwright (with its own browsers) be used.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const path = require("node:path");

const base = process.argv[2] || "http://localhost:4319";
const only = process.argv[3];
const out = path.resolve(__dirname, "../screenshots");

const SHOTS = [
  ["01-desk", "#/desk"],
  ["02-sign-queue", "#/desk/sign?chapter=medicaid&topic=magi", async (page) => { await page.locator(".tick input:not([disabled])").nth(0).check(); await page.locator(".tick input:not([disabled])").nth(1).check(); }],
  ["03-rule-teen-medicaid", "#/item/CO-551"],
  ["04-rule-steps-grant", "#/item/CO-914?steps=1"],
  ["05-figure-need-standard", "#/item/CO-274"],
  ["06-figure-2026-vs-source", "#/item/CO-166"],
  ["07-household-results", "#/households/CO-75?p=p1&prog=Medicaid"],
  ["08-determination", "#/households/CO-75?why=ma_magi_eligibility_status&p=p4"],
  ["09-documents-needed", "#/households/CO-91?tab=documents"],
  ["10-what-if", "#/households/CO-08?tab=whatif", async (page) => { await page.getByRole("button", { name: "Find them" }).click(); await page.waitForTimeout(2500); }],
  ["11-questions", "#/questions?owner=Cash%20programs%20policy%20owner"],
  ["12-question-opinion", "#/questions/OQ-518", async (page) => { await page.getByRole("button", { name: "Record a legal opinion" }).click(); }],
  ["13-law-federal-over-state", "#/law"],
  ["14-law-unverified", "#/law/unverified"],
  ["15-law-document", "#/law/doc/D-7?at=S2"],
  ["16-changes-month", "#/changes?month=2026-10&program=Medicaid", async (page) => { const b = page.getByRole("button", { name: /Compare those/ }).first(); if (await b.count()) { await b.click(); await page.waitForTimeout(2500); } }],
  ["17-proposal", "#/changes/proposal", null, true],
  ["18-figures", "#/figures?show=year&on=2026-11-22"],
  ["19-programs", "#/programs"],
];

(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
    page.on("console", (m) => { if (m.type() === "error") console.log("console error:", m.text()); });
    for (const [name, hash, act, seed] of SHOTS) {
      if (only && !name.includes(only)) continue;
      await page.goto("about:blank");
      await page.goto(base + "/" + (seed ? "#/item/CO-350" : hash));
      await page.waitForSelector("#content h1, #content .empty", { timeout: 20000 });
      if (seed) {
        // Build the proposal through the interface itself.
        await page.evaluate(() => localStorage.removeItem("blind-b-state-1"));
        await page.reload();
        await page.waitForSelector("#content h1");
        await page.getByRole("button", { name: "Propose a change" }).click();
        await page.locator('.form input[type="date"]').fill("2026-07-01");
        await page.locator(".form fieldset label", { hasText: "Value" }).locator("input").fill("0.5");
        await page.locator(".form label", { hasText: "Why this change" }).locator("textarea").fill("Illustration: the disregard falls to 50% from July 1, 2026.");
        await page.getByRole("button", { name: "Review the proposal" }).click();
        await page.waitForSelector(".proposal");
        await page.getByRole("button", { name: "Compare before and after" }).click();
        await page.waitForSelector(".difflist, .proposal .ok-t", { timeout: 30000 });
      }
      if (act) await act(page);
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(out, `${name}-${w}.png`), fullPage: false });
      console.log(name, w);
      await page.evaluate(() => localStorage.removeItem("blind-b-state-1"));
    }
    await ctx.close();
  }
  await browser.close();
})();

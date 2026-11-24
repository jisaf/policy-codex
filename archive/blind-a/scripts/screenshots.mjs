// Screenshots of each key screen at 1280px and 390px wide (deviceScaleFactor 2)
// into prototypes/blind-a/screenshots/. Start the server first.
//   node prototypes/blind-a/scripts/screenshots.mjs [baseUrl] [only-name]
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { launch } from "./browser.mjs";

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../screenshots");
fs.mkdirSync(out, { recursive: true });
const base = process.argv[2] ?? "http://localhost:4317/";
const only = process.argv[3];

// A proposal already in the tray, so the Changes screen shows its full state.
const TRAY = [
  { type: "signoff", itemId: "CO-2400", role: "Medicaid policy owner", by: "Dana (HCPF)", date: "2026-11-22" },
  { type: "answer", qid: "OQ-471", kind: "legal_opinion", text: "42 U.S.C. 1396r-5(d)(1) requires the family allowance for every institutionalized spouse; the trust rule's shorter list cannot remove it. Keep the deduction.", by: "Priya (AGO)", date: "2026-11-22", resolves: true },
];

const shots = [
  { name: "1-desk", hash: "#/", tray: false },
  { name: "1b-desk-statute-over-rule", hash: "#/?list=statute" },
  { name: "2-item-figure-grant-standard", hash: "#/item/CO-276" },
  { name: "2b-item-rule-cw-grant", hash: "#/item/CO-914?ex=CO-07", act: async (p) => { await p.click(".outline details >> nth=0"); await p.waitForTimeout(200); } },
  { name: "3-household", hash: "#/case/CO-91" },
  { name: "4-walk-through", hash: "#/walk/CO-01/p4/ma_magi_category", act: async (p) => { await p.click("#raise button"); await p.waitForFunction(() => { const t = document.querySelector("#raise-out").innerText; return t.length > 5 && !t.includes("Re-running"); }, null, { timeout: 60000 }); } },
  { name: "5-questions", hash: "#/questions?owner=Cash%20programs%20policy%20owner&sort=households" },
  { name: "5b-question", hash: "#/q/OQ-471" },
  { name: "6-changes-month", hash: "#/changes?tab=month" },
  { name: "6b-change-editor", hash: "#/edit/CO-350", act: async (p) => {
      await p.check("input[name=mode][value=fix]"); await p.fill("[name=val]", "0.75"); await p.fill("[name=summary]", "Raise the disregard to 75%"); await p.click("#preview");
      await p.waitForSelector("#ed-out table, #ed-out .pill", { timeout: 30000 }); } },
  { name: "6c-proposal", hash: "#/changes?tab=proposal", tray: true, act: async (p) => {
      await p.goto(base + "#/edit/CO-350"); await p.waitForSelector("#ed");
      await p.check("input[name=mode][value=fix]"); await p.fill("[name=val]", "0.75"); await p.fill("[name=summary]", "Raise the disregard to 75%");
      await p.click("#ed button.primary"); await p.waitForSelector("#run-ba", { timeout: 10000 });
      await p.fill("#nm", "Marcus (CDHS)"); await p.fill("#em", "marcus@example.org");
      await p.click("#run-ba"); await p.waitForSelector("#ba-out table, #ba-out .pill", { timeout: 30000 }); } },
  { name: "7-source-document", hash: "#/doc/D-18?s=S4" },
];

const browser = await launch();
for (const width of [1280, 390]) {
  for (const s of shots) {
    if (only && !s.name.includes(only)) continue;
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript(([tray, useTray]) => {
      try {
        localStorage.setItem("blind-a.me", JSON.stringify({ role: "Cash programs policy owner", name: "", email: "" }));
        localStorage.setItem("blind-a.proposal", JSON.stringify(useTray ? tray : []));
      } catch { /* ignore */ }
    }, [TRAY, !!s.tray]);
    if (s.hash.startsWith("#/case") || s.hash.startsWith("#/walk") || s.hash.startsWith("#/item/CO-3")) {
      await page.addInitScript(() => localStorage.setItem("blind-a.me", JSON.stringify({ role: "Medicaid policy owner" })));
    }
    await page.goto(base + s.hash);
    await page.waitForSelector("main .page", { timeout: 30000 });
    await page.waitForTimeout(400);
    if (s.act) await s.act(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const maxH = width === 390 ? 5200 : 3200;
    const file = path.join(out, `${s.name}-${width}.png`);
    await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width, height: Math.min(h, maxH) } });
    console.log(file, `${Math.min(h, maxH)}/${h}`);
    await ctx.close();
  }
}
await browser.close();

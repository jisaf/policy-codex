// Loads each key route in Chromium and reports console errors and a text
// sample, so a broken screen shows up before the screenshots are taken.
//   node prototypes/blind-a/scripts/check-routes.mjs [baseUrl]
import { launch } from "./browser.mjs";

const base = process.argv[2] ?? "http://localhost:4317/";
const routes = process.argv.slice(3).length ? process.argv.slice(3) : [
  "#/", "#/?list=statute", "#/?list=unverified", "#/?list=soon", "#/?list=questions", "#/?q=grant%20standard",
  "#/item/CO-276", "#/item/CO-914", "#/item/CO-3034", "#/item/CO-2400",
  "#/cases", "#/case/CO-01", "#/case/CO-91",
  "#/walk/CO-01/p4/ma_magi_category", "#/questions", "#/q/OQ-471", "#/changes?tab=month", "#/changes?tab=proposal",
  "#/edit/CO-350", "#/doc/D-18?s=S4",
];
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
for (const r of routes) {
  errors.length = 0;
  const t = Date.now();
  await page.goto(base + r);
  await page.waitForSelector("main .page, main section", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);
  const text = (await page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 220);
  console.log(`${r} (${Date.now() - t} ms)${errors.length ? "\n  ERRORS: " + errors.join(" | ") : ""}\n  ${text}`);
}
await browser.close();

// Launches Chromium from whichever Playwright has a browser installed: the
// one named by PLAYWRIGHT_PATH, the repository's, or the global install.
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export async function launch() {
  const globalRoot = (() => { try { return execSync("npm root -g").toString().trim(); } catch { return ""; } })();
  const candidates = [
    process.env.PLAYWRIGHT_PATH,
    "playwright",
    globalRoot && pathToFileURL(`${globalRoot}/playwright/index.mjs`).href,
  ].filter(Boolean);
  let last;
  for (const c of candidates) {
    try {
      const { chromium } = await import(c);
      return await chromium.launch();
    } catch (e) { last = e; }
  }
  throw last;
}

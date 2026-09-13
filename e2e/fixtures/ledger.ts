import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";

const ROOT = join(import.meta.dirname, "..", "..");
const RAW = "https://raw.githubusercontent.com/jisaf/policy-codex/";

/** Answer every raw.githubusercontent.com read from the checked-in ledger. */
export async function serveLedgerFromDisk(page: Page): Promise<void> {
  // The guided tour is a first-visit overlay (docs/design-onboarding.md,
  // "Guided first run, hints, help"); the smoke test drives the app itself,
  // not onboarding, so it marks the tour already seen before anything loads.
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });
  await page.route(`${RAW}**`, (route) => {
    const url = route.request().url();
    const rel = url.slice(RAW.length).split("/").slice(1).join("/"); // drop the ref segment
    const file = join(ROOT, rel);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "not found" });
    return route.fulfill({ status: 200, body: readFileSync(file), headers: { "content-type": "text/plain" } });
  });
  // Anonymous head() lookups return null on failure; nothing else may hit the API.
  await page.route("https://api.github.com/**", (route) =>
    route.fulfill({ status: 404, body: "not found" }),
  );
}

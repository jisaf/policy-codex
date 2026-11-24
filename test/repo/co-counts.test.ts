/* Counts the Colorado Rulebook (prototypes/blind-b) shows, pinned against the
 * Colorado volume with the repository's own modules. They were pinned in the
 * original app's UI tests (test/ui/counts.test.ts and
 * questions-law-counts.test.ts, archived in archive/main-app/test/ui); the
 * data they guard is still on screen in the Rulebook (Questions, Law, the
 * Figures flags), so a change to the volume that moves one should move it
 * here on purpose. Each definition is restated here, in the Rulebook's terms. */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import { unverifiedSourceIds } from "../../src/ledger/markdown";
import { versionInForce } from "../../src/engine/versions";
import type { Item } from "../../src/engine/types";

const root = path.resolve(import.meta.dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const DATE = "2026-11-22";

/** A question's state from its heading (docs/reviews/open-question-status.md):
 *  "Resolved: ..." when every part is settled, "Partly resolved: ..." when a
 *  part is open, no prefix while it is open. */
function questionState(title: string): "open" | "partly" | "resolved" {
  const m = /^(partly resolved|resolved)\b[^:]*:\s*/i.exec(title.trim());
  if (!m) return "open";
  return m[1].toLowerCase().startsWith("partly") ? "partly" : "resolved";
}

/** An explicit `Owner: ...` line in a question's body (a list bullet or bold
 *  key reads the same). */
function ownerLine(body: string): string | null {
  const re = /^\s*(?:[-*]\s+)?(?:\*\*)?Owner:(?:\*\*)?\s*(.+)$/gim;
  let last: string | null = null;
  for (const m of body.matchAll(re)) last = m[1].replace(/\*\*/g, "").trim();
  return last;
}

/** The excerpts an item cites, in its sources or in a dated version. */
function cited(it: Item): string[] {
  return [...(it.sources ?? []), ...(it.versions ?? []).map((v) => v.source ?? "")];
}

describe("Questions: the questions still to answer", () => {
  const unsettled = vol.openQuestions.filter((q) => questionState(q.title) !== "resolved");

  it("235 open or partly settled, 24 of them partly settled", () => {
    expect(unsettled).toHaveLength(235);
    expect(unsettled.filter((q) => questionState(q.title) === "partly")).toHaveLength(24);
  });

  it("every one has an Owner line", () => {
    expect(unsettled.filter((q) => !ownerLine(q.body)).map((q) => q.id)).toEqual([]);
  });
});

describe("Law: statute over rule, and unverified sources", () => {
  const unverified = new Set(unverifiedSourceIds(vol.sources));
  const citing = engine.items().filter((it) => cited(it).some((s) => unverified.has(s)));
  const resting = new Set([...citing.map((it) => it.identifier), ...engine.impact(citing.map((it) => it.identifier))]);

  it("46 items follow a statute over Colorado's rule", () => {
    expect(engine.items().filter((it) => it.statute_override)).toHaveLength(46);
  });

  it("2 unverified sources, 6 items citing them, 65 resting on them in all", () => {
    expect([...unverified].sort()).toEqual(["S1228", "S1230"]);
    expect(citing).toHaveLength(6);
    expect(resting.size).toBe(65);
    for (const id of unverified) expect(citing.some((it) => cited(it).includes(id)), id).toBe(true);
  });
});

describe("Figures: no value on a date", () => {
  it("5 figures have no version in force on 2026-11-22", () => {
    const none = engine.items()
      .filter((it) => it.kind === "parameter" && Array.isArray(it.versions) && !versionInForce(it, DATE))
      .map((it) => it.id).sort();
    expect(none).toEqual(["CO-1272", "CO-1276", "CO-1277", "CO-3004", "CO-3932"]);
  });
});

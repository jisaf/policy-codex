import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createEngine } from "../../src/engine/engine";
import { buildIndex } from "../../src/engine/ledger-index";
import { parseVolumeFile } from "../../src/engine/yaml";
import { sha256Hex } from "../../src/engine/sha256";
import {
  changedFields, describeChanges, fingerprintItem, staleApprovalMessage,
} from "../../src/engine/fingerprint";
import { buildCheckReport, type LoadedLedger } from "../../src/tools/check";
import type { Item } from "../../src/engine/types";

// The stale-approval check (docs/plan-colorado.md, 2026-11-23 order of work,
// step 2; docs/governance.md "Stale approvals"): a signature records a
// fingerprint of what was signed, and a Reviewed or Approved item whose
// fingerprint has moved since, through its own fields, anything it reads, or
// an excerpt it cites, needs review again.

const root = path.resolve(__dirname, "../..");
const meta = parseVolumeFile(fs.readFileSync(path.join(root, "volumes/mwr/volume.yaml"), "utf8"));

const TEXTS: Record<string, string> = {
  S1: "The limit is $100 a month.",
  S2: "A person is a student when enrolled at least half time.",
  S3: "An unrelated paragraph.",
};

function ledger(): Item[] {
  return [
    {
      id: "WR-901", name: "Monthly limit", identifier: "test_monthly_limit", kind: "parameter",
      type: "money", scope: "global", program: "All", meaning: "The monthly income limit.",
      versions: [{ from: "2026-01-01", value: 100, source: "S1" }], sources: ["S1"],
    },
    {
      id: "WR-902", name: "Enrollment", identifier: "test_enrollment", kind: "supplied",
      type: "one of", options: ["full_time", "half_time", "none"], scope: "person", program: "All",
      meaning: "How the person is enrolled in school.", supplied_by: "Application", sources: ["S2"],
    },
    {
      id: "WR-903", name: "Income", identifier: "test_income", kind: "supplied", type: "money",
      scope: "person", program: "All", meaning: "Monthly income.", supplied_by: "Application",
    },
    {
      id: "WR-904", name: "Under limit", identifier: "test_under_limit", kind: "derived",
      type: "yes/no", scope: "person", program: "All",
      meaning: "Income is at or under the limit and the person is enrolled.",
      derived: ["all", ["<=", "test_income", "test_monthly_limit"], ["in", "test_enrollment", ["full_time", "half_time"]]],
      sources: ["S1", "S2"], precision: "Exact.", rationale: "Test.",
    },
    {
      id: "WR-905", name: "Reads the rule", identifier: "test_reads_rule", kind: "derived",
      type: "yes/no", scope: "person", program: "All", meaning: "The rule above, read once more.",
      derived: ["not", ["not", "test_under_limit"]], sources: ["S1"],
    },
    {
      id: "WR-906", name: "Unrelated", identifier: "test_unrelated", kind: "parameter", type: "money",
      scope: "global", program: "All", meaning: "Nothing reads this.", value: 5, sources: ["S3"],
    },
  ];
}

const engineOf = (items: Item[], texts = TEXTS) =>
  createEngine(items, meta, { sourceIds: Object.keys(texts), questionIds: [], sourceTexts: texts });

/** `id` signed by two roles against `items`, with status Approved. */
function signed(items: Item[], id: string, texts = TEXTS): Item[] {
  const e = engineOf(items, texts);
  const it = e.itemById(id)!;
  const fp = e.fingerprint(it)!;
  const s: Item = {
    ...it, status: "Approved",
    approval: [
      { role: meta.approval_policy.roles[0], by: "A", date: "2026-11-23", commit: "abc1234", fingerprint: fp },
      { role: meta.approval_policy.roles[1], by: "B", date: "2026-11-23", fingerprint: fp },
    ],
  };
  return items.map((x) => (x.id === id ? s : x));
}

function edit(items: Item[], id: string, patch: Partial<Item>): Item[] {
  return items.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

function stale(items: Item[], id: string, texts = TEXTS, baseline?: { items: Item[]; texts: Record<string, string> }) {
  const e = engineOf(items, texts);
  return e.governance(e.itemById(id)!, {
    baseline: baseline ? { ix: buildIndex(baseline.items), sourceTexts: baseline.texts } : null,
  }).filter((f) => f.rule === "approval.stale");
}

describe("sha256", () => {
  it("matches node's SHA-256, including multi-block and non-ASCII input", () => {
    for (const s of ["", "abc", "x".repeat(55), "x".repeat(56), "y".repeat(1000), "§ 8.100 — café"]) {
      expect(sha256Hex(s)).toBe(createHash("sha256").update(s, "utf8").digest("hex"));
    }
  });
});

describe("approval fingerprints", () => {
  const base = signed(ledger(), "WR-904");

  it("is deterministic and recorded in the documented form", () => {
    const e = engineOf(ledger());
    const fp = e.fingerprint(e.itemById("WR-904")!);
    expect(fp).toMatch(/^fp1-[0-9a-f]{20}$/);
    expect(engineOf(ledger().reverse()).fingerprint(e.itemById("WR-904")!)).toBe(fp);
    // Without sources.md texts there is no fingerprint and no check.
    expect(createEngine(ledger(), meta).fingerprint(e.itemById("WR-904")!)).toBeNull();
  });

  it("a fresh signature is not stale", () => {
    expect(stale(base, "WR-904")).toEqual([]);
  });

  it("goes stale when an upstream parameter's version changes, naming it", () => {
    const now = edit(base, "WR-901", { versions: [{ from: "2026-01-01", value: 120, source: "S1" }] });
    const f = stale(now, "WR-904", TEXTS, { items: base, texts: TEXTS });
    expect(f).toHaveLength(1);
    expect(f[0].level).toBe("error");
    expect(f[0].msg).toMatch(/^approval is stale: WR-901 test_monthly_limit changed \(versions\)\./);
    expect(f[0].msg).toContain("npm run fingerprint -- --item WR-904");
    // Without a baseline it still fails, in general words.
    expect(stale(now, "WR-904")[0].msg).toMatch(/^approval is stale: the item, or something it reads, changed after it was signed/);
  });

  it("goes stale when a supplied fact's meaning, type or options change", () => {
    for (const patch of [
      { meaning: "How many courses the person takes." },
      { type: "text" },
      { options: ["full_time", "half_time", "none", "unknown"] },
    ] as Partial<Item>[]) {
      const f = stale(edit(base, "WR-902", patch), "WR-904", TEXTS, { items: base, texts: TEXTS });
      expect(f.map((x) => x.msg)).toEqual([expect.stringMatching(/WR-902 test_enrollment changed \((meaning|type|options)\)/)]);
    }
  });

  it("goes stale when a cited excerpt's text changes, upstream or its own", () => {
    const texts = { ...TEXTS, S2: "A person is a student when enrolled full time." };
    const f = stale(base, "WR-904", texts, { items: base, texts: TEXTS });
    expect(f[0].msg).toMatch(/^approval is stale: excerpt S2 text changed\./);
  });

  it("goes stale through any depth, and when the item itself changes", () => {
    const deep = signed(ledger(), "WR-905");
    const now = edit(deep, "WR-901", { versions: [{ from: "2026-01-01", value: 120, source: "S1" }] });
    expect(stale(now, "WR-905", TEXTS, { items: deep, texts: TEXTS })[0].msg)
      .toContain("WR-901 test_monthly_limit changed (versions)");
    const own = edit(base, "WR-904", { derived: ["<=", "test_income", "test_monthly_limit"] });
    expect(stale(own, "WR-904", TEXTS, { items: base, texts: TEXTS })[0].msg)
      .toMatch(/the item itself changed \(derived\); it no longer reads WR-902 test_enrollment/);
  });

  it("does not go stale on wording, precision, rationale, name, tags, tests or an unrelated item", () => {
    let now = edit(base, "WR-904", {
      precision: "Rounded.", rationale: "Different.", name: "Renamed", tags: [],
      meaning: "  Income is at or under the limit   and the person is enrolled.",
      tests: [{ id: "t1", expect: true }], sources: ["S2", "S1"],
    });
    now = edit(now, "WR-902", { options: ["none", "half_time", "full_time"] });
    now = edit(now, "WR-906", { value: 6, meaning: "Changed." });
    expect(stale(now, "WR-904", { ...TEXTS, S3: "Rewritten." })).toEqual([]);
  });

  it("a signature with no fingerprint is stale; a Draft item is not checked", () => {
    const noFp = base.map((x) => x.id === "WR-904"
      ? { ...x, approval: x.approval!.map((a, i) => (i ? a : { ...a, fingerprint: undefined })) } : x);
    expect(stale(noFp, "WR-904")[0].msg).toContain(`${meta.approval_policy.roles[0]} signed with no fingerprint`);
    const draft = edit(edit(base, "WR-904", { status: "Draft" }), "WR-901", { versions: [] });
    expect(stale(draft, "WR-904")).toEqual([]);
  });

  it("lists the changed approvable fields only", () => {
    const a = ledger()[3];
    expect(changedFields(a, { ...a, precision: "x", meaning: `${a.meaning} More.` })).toEqual(["meaning"]);
    const b = { ix: buildIndex(base), sourceTexts: TEXTS };
    expect(describeChanges(b, base[3], b)).toEqual([]);
    expect(staleApprovalMessage(b, base[3])).toBeNull();
    expect(fingerprintItem(b, base[3])).toBe(base[3].approval![0].fingerprint);
  });
});

describe("npm run check and stale approvals", () => {
  const loaded = (items: Item[], texts = TEXTS): LoadedLedger => ({
    items, meta, chapterOf: Object.fromEntries(items.map((x) => [x.id, "test"])),
    volumePath: "volumes/mwr", cases: [], sourceIds: Object.keys(texts), questionIds: [],
    sourceTexts: texts,
  });
  const base = signed(ledger(), "WR-904");
  const changedParam = edit(base, "WR-901", { versions: [{ from: "2026-01-01", value: 120, source: "S1" }] });

  it("blocks an unchanged item whose upstream changed, naming the change", () => {
    const r = buildCheckReport(
      loaded(changedParam), [{ status: "M", path: "volumes/mwr/test/WR-901.yaml" }], [],
      { baseline: { items: base, sourceTexts: TEXTS } },
    );
    const stale = r.blockingItemErrors.filter((e) => e.msg.startsWith("approval.stale:"));
    expect(stale.map((e) => e.id)).toEqual(["WR-904"]);
    expect(stale[0].msg).toContain("approval is stale: WR-901 test_monthly_limit changed (versions)");
    expect(r.ok).toBe(false);
  });

  it("passes once the item is re-signed or returned to Draft", () => {
    const diff = [{ status: "M", path: "volumes/mwr/test/WR-901.yaml" }, { status: "M", path: "volumes/mwr/test/WR-904.yaml" }];
    for (const items of [
      signed(changedParam, "WR-904"),
      edit(changedParam, "WR-904", { status: "Draft" }),
    ]) {
      const r = buildCheckReport(loaded(items), diff, [], { baseline: { items: base, sourceTexts: TEXTS } });
      expect(r.blockingItemErrors.filter((e) => e.msg.startsWith("approval.stale:"))).toEqual([]);
    }
  });

  it("does not block on an unrelated change", () => {
    const r = buildCheckReport(
      loaded(edit(base, "WR-906", { value: 7 })), [{ status: "M", path: "volumes/mwr/test/WR-906.yaml" }], [],
      { baseline: { items: base, sourceTexts: TEXTS } },
    );
    expect(r.blockingItemErrors.filter((e) => e.msg.startsWith("approval.stale:"))).toEqual([]);
  });
});

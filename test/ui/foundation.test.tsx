/* Phase 13 foundation, against the Colorado volume the walkthroughs used:
 * the bugs they found stay fixed. Assertions read the volume's own
 * declarations (programs, outcomes, overrides) rather than fixed ids, since
 * the fix tracks keep editing the volume. */
import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { render } from "preact";
import { loadVolume } from "../../src/tools/volumes";
import { mergeBlock, parseApprovals, formatApproval } from "../../src/engine/item-block";
import type { Item } from "../../src/engine/types";
import { emptyChangeSet } from "../../src/changes/types";
import {
  changeSetSig, draftsShownSig, engineSig, modeSig, route, viewEngine, volumeSig,
} from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import { buildSearchIndex, search } from "../../src/ui/search";
import { TableView } from "../../src/ui/TableView";
import { TextEditor } from "../../src/ui/TextEditor";
import { SourcesView } from "../../src/ui/SourcesView";
import { QuestionsView } from "../../src/ui/views/QuestionsView";
import { questionStatus } from "../../src/ui/questions";
import { tourCase, tourItem, tourProgram } from "../../src/ui/Tour";
import { documentParagraphs, findExcerptParagraph } from "../../src/ui/DocumentsView";
import { DraftBanner } from "../../src/ui/DraftBanner";
import { volumePrograms } from "../../src/ui/programs";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const declared = (engine.meta.programs ?? []).map((p) => p.id);

function setUp() {
  route.value = { ...defaultRoute(), volume: "co" };
  volumeSig.value = vol;
  engineSig.value = engine;
  changeSetSig.value = emptyChangeSet("co", "local");
  modeSig.value = "read";
  draftsShownSig.value = null;
}

describe("program lists come from volume.yaml", () => {
  beforeEach(setUp);

  it("the Table program filter lists every declared program", () => {
    route.value = { ...route.value, view: "table" };
    const host = document.createElement("div");
    render(<TableView />, host);
    const select = [...host.querySelectorAll("label")].find((l) => l.textContent!.startsWith("Program"))!
      .querySelector("select")!;
    const options = [...select.querySelectorAll("option")].map((o) => o.value).filter(Boolean);
    expect(options.slice(0, declared.length)).toEqual(declared);
    expect(options).toContain("ColoradoWorks");
    expect(volumePrograms(engine)).toEqual(expect.arrayContaining(declared));
  });

  it("the item block accepts every declared program and names them when it refuses one", () => {
    const cw = engine.items().find((it) => it.program === "ColoradoWorks")!;
    expect(engine.parseItemBlock(engine.itemBlock(cw)).errors).toEqual([]);
    const bad = engine.itemBlock(cw).replace(/^Program\s+.*$/m, "Program       Nowhere");
    const errs = engine.parseItemBlock(bad).errors.map((e) => e.msg).join(" ");
    expect(errs).toContain("ColoradoWorks");
  });
});

describe("the editor keeps Status and Approval, and raises no false alarms", () => {
  beforeEach(setUp);

  it("round-trips a typed Status and signatures through the item block", () => {
    const it = engine.item("ma_income_limit_child_pct")!;
    const typed = engine.itemBlock(it) + "\nStatus        Approved\nApproval      Medicaid policy owner: Dana Lee, 2026-11-21; Legal: 2026-11-22, abc1234";
    const parsed = engine.parseItemBlock(typed);
    expect(parsed.errors).toEqual([]);
    const merged = mergeBlock(it, parsed.item);
    expect(merged.status).toBe("Approved");
    expect(merged.approval).toEqual([
      { role: "Medicaid policy owner", by: "Dana Lee", date: "2026-11-21" },
      { role: "Legal", date: "2026-11-22", commit: "abc1234" },
    ]);
    // ... and writes them back, so a reopened item shows them.
    const again = engine.itemBlock(merged);
    expect(again).toMatch(/^Status {8}Approved$/m);
    expect(again).toContain("Medicaid policy owner: Dana Lee, 2026-11-21; Legal: 2026-11-22, abc1234");
    expect(parseApprovals(formatApproval({ role: "Legal", date: "2026-11-22" })))
      .toEqual([{ role: "Legal", date: "2026-11-22" }]);
  });

  it("rejects a status it does not know and a signature with no date", () => {
    const it = engine.item("ma_income_limit_child_pct")!;
    const msgs = (extra: string) => engine.parseItemBlock(engine.itemBlock(it) + "\n" + extra).errors.map((e) => e.msg);
    expect(msgs("Status        Signed").join()).toContain("Status must be Draft, Reviewed, Approved");
    expect(msgs("Approval      Legal: Priya").join()).toContain("needs a date");
  });

  it("an untouched versioned parameter is not 'Parameter has a value' (HCPF F13)", () => {
    const it = engine.item("ma_income_limit_child_pct")!;
    expect(it.versions?.length).toBeGreaterThan(0);
    const host = document.createElement("div");
    render(<TextEditor engine={engine} draft={it} onChange={() => {}} vol={vol} />, host);
    expect(host.querySelector(".pill")!.textContent).toBe("parses, all constraints satisfied");
    // The merge never gives a versioned parameter a flat value, and an
    // unstated status is not set to Draft by reading the block back.
    const merged = mergeBlock(it, engine.parseItemBlock(engine.itemBlock(it)).item);
    expect(merged.value).toBeUndefined();
    expect(merged.status).toBeUndefined();
    expect(merged.versions).toEqual(it.versions);
  });

  it("a table parameter's Value line reads back as the same table, not the word 'table'", () => {
    const it: Item = { ...engine.item("federal_poverty_guideline_annual_table")!, versions: undefined, value: { "1": 100, "2": 200 } };
    const parsed = engine.parseItemBlock(engine.itemBlock(it));
    expect(parsed.errors).toEqual([]);
    expect(parsed.item.value).toEqual({ "1": 100, "2": 200 });
  });

  it("an edit the text surface cannot read is reported, never silently dropped (CDHS F1)", () => {
    const it = engine.items().find((x) => x.program === "ColoradoWorks" && x.kind === "parameter")!;
    let errors: unknown[] = [];
    let changed = 0;
    const host = document.createElement("div");
    render(
      <TextEditor engine={engine} draft={it} vol={vol} onChange={() => { changed++; }} onErrors={(e) => { errors = e; }} />,
      host,
    );
    const ta = host.querySelector("textarea.block") as HTMLTextAreaElement;
    ta.value = ta.value.replace(/^Program\s+.*$/m, "Program       Nowhere");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    expect(changed).toBe(0);
    expect(errors.length).toBe(1);
    ta.value = ta.value.replace(/^Program\s+.*$/m, "Program       ColoradoWorks")
      .replace(/^Meaning\s+(.*)$/m, (_m, rest) => `Meaning       ${rest} (edited)`);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    expect(changed).toBe(1);
    expect(errors).toEqual([]);
  });
});

describe("the Approach A projection uses the approval policy and the item's status", () => {
  it("names every role upstream_of_outcomes requires, and the item's own status", () => {
    const rule = engine.items().find((it) => it.kind === "derived" && it.implemented !== "assembly"
      && engine.approvals(it).length > 1)!;
    const text = engine.projectionA(rule.identifier).text;
    expect(text).toContain(`Approval       ${engine.approvals(rule).join(", ")}`);
    expect(text).toMatch(/^Status {9}Draft$/m);
    const approved = engine.withItems(engine.items().map((it) => it.id === rule.id ? { ...it, status: "Approved" as const } : it));
    expect(approved.projectionA(rule.identifier).text).toMatch(/^Status {9}Approved$/m);
  });
});

describe("search finds items by policy words (HCPF F5, AAG L1)", () => {
  const index = buildSearchIndex(vol, engine);

  it("matches the words of a phrase anywhere, not only as one string", () => {
    const hits = search(index, "countable income", 200).filter((h) => h.kind === "item");
    expect(hits.length).toBeGreaterThan(5);
    expect(hits[0].title.toLowerCase()).toContain("countable income");
  });

  it("knows H.R.1 by its public law number and immigrant by the ledger's words", () => {
    // An item whose text names the law only as "Pub. L. 119-21" is found.
    const byNumber = engine.items().find((it) => /119-21/.test(`${it.meaning} ${it.precision ?? ""} ${it.statute_override ?? ""}`)
      && !/H\.R\.\s?1\b/.test(`${it.name} ${it.meaning} ${it.precision ?? ""} ${it.statute_override ?? ""}`));
    const hr1 = search(index, "H.R.1", 1000).map((h) => h.id);
    if (byNumber) expect(hr1).toContain(byNumber.id);
    expect(hr1.length).toBeGreaterThan(0);
    const imm = search(index, "immigrant", 400).filter((h) => h.kind === "item");
    expect(imm.some((h) => /non-citizen|immigra|alien|lawful/i.test(h.title))).toBe(true);
  });

  it("finds every item that follows a statute over a rule", () => {
    const withOverride = engine.items().filter((it) => it.statute_override).map((it) => it.id).sort();
    expect(withOverride.length).toBeGreaterThan(0);
    const hits = search(index, "statute over rule", 400).filter((h) => h.kind === "item").map((h) => h.id);
    for (const id of withOverride) expect(hits).toContain(id);
  });

  it("keeps resolved questions apart from open ones", () => {
    const hits = search(index, "OQ-", 400).filter((h) => h.kind === "question" || h.kind === "resolved");
    for (const h of hits) {
      const q = vol.openQuestions.find((x) => x.id === h.id)!;
      expect(h.kind === "resolved").toBe(questionStatus(q) === "resolved");
    }
  });
});

describe("open questions have their own page", () => {
  beforeEach(setUp);

  it("shows title, status, programs, body and items", () => {
    const q = vol.openQuestions.find((x) => questionStatus(x) === "open" && x.items.length > 0)!;
    route.value = { ...route.value, view: "questions", arg: q.id };
    const host = document.createElement("div");
    render(<QuestionsView />, host);
    expect(host.querySelector("section.question")!.getAttribute("data-question")).toBe(q.id);
    expect(host.querySelector(".qstatus")!.textContent).toBe("Open");
    expect(host.querySelectorAll("ul.qitems li").length).toBeGreaterThan(0);
    expect(host.querySelector(".qbody")!.textContent!.length).toBeGreaterThan(20);
  });
});

describe("sources say what kind of text they are", () => {
  beforeEach(setUp);

  it("labels excerpts by kind and marks the unverified ones", () => {
    route.value = { ...route.value, view: "source", arg: null };
    const host = document.createElement("div");
    render(<SourcesView />, host);
    const kinds = new Set([...host.querySelectorAll("article.source")].map((a) => a.getAttribute("data-kind")));
    expect(kinds.has("statute")).toBe(true);
    expect(kinds.has("regulation")).toBe(true);
    const unverified = vol.sources.filter((s) => s.verification === "unverified");
    expect(host.querySelectorAll(".flag.unverified").length).toBe(unverified.length);
    expect(host.textContent).not.toContain("Nothing here is interpretation");
  });

  it("finds the paragraph of a document an excerpt was quoted from", () => {
    const paras = documentParagraphs("Heading\n\n4.407.3 Excess Shelter Deduction\n\nA. Households shall receive a deduction for the allowable monthly shelter costs.\n\nB. Other.");
    expect(findExcerptParagraph(paras, "4.407.3 Excess Shelter Deduction\nA. Households shall receive a deduction for the allowable monthly shelter costs.")).toBe(2);
    expect(findExcerptParagraph(paras, "A. Households shall  receive a *deduction* for the allowable monthly")).toBe(2);
    expect(findExcerptParagraph(paras, "Nothing like this appears anywhere in the text at all.")).toBe(-1);
  });
});

describe("the tour works on Colorado (HCPF F11)", () => {
  beforeEach(setUp);

  it("picks a program, a case and a rule this volume has", () => {
    expect(declared).toContain(tourProgram());
    expect(vol.cases.some((c) => c.id === tourCase())).toBe(true);
    expect(tourCase()).not.toBe("C-01");
    const item = engine.itemById(tourItem())!;
    expect(item.kind).toBe("derived");
  });
});

describe("drafts show as drafts (CDHS F3)", () => {
  beforeEach(setUp);

  it("hides staged drafts in reader mode behind a banner that can show or discard them", async () => {
    const it = engine.item("ma_income_limit_child_pct")!;
    changeSetSig.value = {
      ...emptyChangeSet("co", "local"),
      entries: [{ id: it.id, chapter: "parameters", before: it, after: { ...it, versions: [{ from: "2020-01-01", value: 9 }] } }],
    };
    const host = document.createElement("div");
    render(<DraftBanner />, host);
    expect(host.textContent).toContain("1 draft change");
    expect(host.textContent).toContain("rules in force");
    expect(viewEngine()!.item("ma_income_limit_child_pct")!.versions).toEqual(it.versions);
    (host.querySelector("button.drafts-toggle") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    expect(viewEngine()!.item("ma_income_limit_child_pct")!.versions![0].value).toBe(9);
    expect(host.querySelector(".draftbanner")!.textContent).toContain("Draft view");
    draftsShownSig.value = null;
    modeSig.value = "edit";
    expect(viewEngine()!.item("ma_income_limit_child_pct")!.versions![0].value).toBe(9);
  });
});

/* The open-question decision queue, against the Colorado volume. Assertions
 * read the volume's own state (which questions are open, which items carry a
 * statute-over-rule note) rather than fixed counts, since the fix tracks keep
 * answering questions. */
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render } from "preact";
import { loadVolume } from "../../src/tools/volumes";
import { parseOpenQuestions } from "../../src/ledger/markdown";
import { emptyChangeSet, fileEntries } from "../../src/changes/types";
import { excerptKind } from "../../src/ui/provenance";
import {
  assumptionInForce, blocksCertification, citedExcerpts, departures, groupByOwner, isOpen,
  matchesFilter, questionClass, questionInfo, questionInfos, questionNotes, questionStatus,
  queueEntry, ruleText, sentences, waitingOn, QUESTION_CLASSES, type QueueEntry,
} from "../../src/ui/questions";
import {
  ALTERNATIVES, alternativeEntry, alternativeFor, alternativeItem, changedResults, resultsRestingOn,
} from "../../src/ui/questionEffects";
import { answeredIds, applyAnswer } from "../../src/ui/questionAnswer";
import {
  changeSetSig, draftsShownSig, engineSig, modeSig, route, trayOpenSig, volumeSig,
} from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import { personaSig } from "../../src/ui/personas";
import { programName, questionEffect, QuestionsView } from "../../src/ui/views/QuestionsView";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const mdPath = path.join(root, vol.path, "open-questions.md");
const md = fs.readFileSync(mdPath, "utf8");
const infos = questionInfos(engine, vol.openQuestions);
const open: QueueEntry[] = infos.filter((q) => isOpen(q.status)).map((q) => queueEntry(engine, vol.sources, q));
const overrideItems = engine.items().filter((it) => it.statute_override);

function setUp() {
  route.value = { ...defaultRoute(), volume: "co", view: "questions", arg: null, params: {} };
  volumeSig.value = vol;
  engineSig.value = engine;
  changeSetSig.value = emptyChangeSet("co", "local");
  modeSig.value = "read";
  draftsShownSig.value = null;
  personaSig.value = null;
  trayOpenSig.value = false;
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

async function until(fn: () => boolean, ms = 20_000) {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw new Error("timed out");
    await tick(20);
  }
}

describe("reading a question", () => {
  it("splits sentences without breaking legal citations", () => {
    expect(sentences("Pub. L. 119-21 sec. 10108 governs. The draft follows 42 U.S.C. 1396b(v). snap_x (CO-1) keeps it."))
      .toEqual(["Pub. L. 119-21 sec. 10108 governs.", "The draft follows 42 U.S.C. 1396b(v).", "snap_x (CO-1) keeps it."]);
  });

  it("labels each later note and keeps the first as the question", () => {
    const q = vol.openQuestions.find((x) => x.id === "OQ-104") ?? vol.openQuestions[0];
    const notes = questionNotes(q.body);
    expect(notes[0].label).toBeNull();
    expect(notes.slice(1).every((n) => n.label)).toBe(true);
    expect(notes.some((n) => /^checked/i.test(n.label ?? ""))).toBe(q.body.includes("Checked"));
  });

  it("finds the reading in force for every open question, and an explicit line wins", () => {
    for (const e of open) {
      expect(e.assumption.length, e.id).toBeGreaterThan(20);
      // Never a capitalised identifier: the page names the item instead.
      expect(e.assumption, e.id).not.toMatch(/^[A-Z][a-z0-9]*_[a-z]/);
    }
    const q = { id: "OQ-9", items: [], body: "Body: Text. The draft keeps two.\n\nAssumption: The codex counts three." };
    expect(assumptionInForce(q)).toBe("The codex counts three.");
    expect(assumptionInForce({ ...q, body: "Body: The rule says one. The draft keeps two." })).toBe("The draft keeps two.");
  });

  it("expands excerpt ranges and keeps only excerpts the volume has", () => {
    const ids = vol.sources.slice(0, 4).map((s) => s.id);
    const n = (id: string) => Number(id.slice(1));
    const got = citedExcerpts(`see ${ids[0]}-${ids[2]} and S99999`, vol.sources).map((s) => s.id);
    expect(got[0]).toBe(ids[0]);
    expect(got.every((id) => n(id) >= n(ids[0]) && n(id) <= n(ids[2]))).toBe(true);
    expect(got).not.toContain("S99999");
  });

  it("falls back to the carrying items' excerpts when the question cites none", () => {
    const noCite = open.find((e) => !citedExcerpts(e.body, vol.sources).length && e.items.some((it) => it.sources?.length));
    expect(noCite).toBeTruthy();
    const t = ruleText(noCite!.body, noCite!.items, vol.sources);
    expect(t.fromItems).toBe(true);
    expect(t.excerpts.length).toBeGreaterThan(0);
  });
});

describe("class, owner and certification", () => {
  it("classes every open question, and uses each class", () => {
    for (const e of open) expect(QUESTION_CLASSES).toContain(e.cls);
    for (const c of QUESTION_CLASSES) expect(open.some((e) => e.cls === c), c).toBe(true);
  });

  it("puts a question whose item follows a statute over a rule before Legal", () => {
    const carried = open.filter((e) => e.items.some((it) => it.statute_override));
    expect(carried.length).toBeGreaterThan(0);
    for (const e of carried) {
      expect(e.cls).toBe("legal");
      expect(e.owners[0]).toBe("Legal");
    }
  });

  it("names the document a blocked question waits on", () => {
    for (const e of open.filter((x) => x.cls === "blocked")) {
      expect(waitingOn(e), e.id).toBeTruthy();
      // The card says it once: under "Waiting on", or as the reading itself.
      expect(e.waitingOn ?? e.assumption).toBe(waitingOn(e) === e.assumption ? e.assumption : waitingOn(e));
    }
  });

  it("owns a policy question by its program owner and its items' tags", () => {
    const policy = engine.meta.approval_policy;
    for (const e of open.filter((x) => x.cls !== "legal")) {
      const own = e.programs.filter((p) => p !== "All");
      const first = (own.length ? own : e.programs)[0];
      if (first) expect(e.owner, e.id).toBe(policy.by_program[first][0]);
    }
    const ltc = open.find((e) => e.items.some((it) => it.tags?.includes("ltc")));
    expect(ltc?.owners).toContain("LTSS policy owner");
  });

  it("an explicit Class line wins over the reading", () => {
    const base = open.find((e) => e.cls === "policy")!;
    expect(questionClass({ ...base, body: `${base.body}\n\nClass: ledger design` })).toBe("ledger");
  });

  it("blocks certification as the stopping rule says", () => {
    const q = { status: "open" as const, body: "Body: x." };
    expect(blocksCertification(q, "ledger")).toBe(true);
    expect(blocksCertification(q, "blocked")).toBe(false);
    expect(blocksCertification(q, "policy")).toBe(true);
    expect(blocksCertification({ ...q, body: "Checked 2026-11-21: no published rule settles it." }, "policy")).toBe(false);
    expect(blocksCertification({ status: "resolved", body: "" }, "ledger")).toBe(false);
  });

  it("groups by owner in the volume's role order", () => {
    const roles = engine.meta.approval_policy.roles;
    const groups = groupByOwner(engine, open);
    const ranks = groups.map((g) => roles.indexOf(g.owner)).filter((i) => i >= 0);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(groups.reduce((n, g) => n + g.entries.length, 0)).toBe(open.length);
  });

  it("filters by program, owner, class, outcome and certification", () => {
    const f = (x: Parameters<typeof matchesFilter>[1]) => open.filter((e) => matchesFilter(e, x));
    expect(f({ program: "SNAP" }).every((e) => e.programs.includes("SNAP"))).toBe(true);
    expect(f({ owner: "Legal" }).every((e) => e.owners.includes("Legal"))).toBe(true);
    expect(f({ cls: "blocked" }).every((e) => e.cls === "blocked")).toBe(true);
    expect(f({ affectsOutcome: true }).every((e) => e.outcomes.length > 0)).toBe(true);
    expect(f({ blocksCertification: true }).length).toBe(open.filter((e) => e.blocksCertification).length);
    expect(f({ text: "OQ-1" }).length).toBeGreaterThan(0);
  });
});

describe("departures", () => {
  const ds = departures(engine, vol.sources, (s) => excerptKind(s, vol.documents));

  it("lists every item that follows a statute over a Colorado rule", () => {
    expect(ds.map((d) => d.item.id).sort()).toEqual(overrideItems.map((it) => it.id).sort());
  });

  it("names the rule overridden, the reasoning and the statute", () => {
    for (const d of ds) {
      expect(d.ruleOverridden, d.item.id).toMatch(/\d/);
      expect(d.reasoning.length).toBeGreaterThan(20);
      expect(d.statutes.length + d.rules.length).toBeGreaterThan(0);
    }
  });
});

describe("what an answer would change in the stored households", () => {
  it("every listed alternative is an open question's real change", () => {
    for (const a of ALTERNATIVES) {
      const q = vol.openQuestions.find((x) => x.id === a.question);
      expect(q, a.question).toBeTruthy();
      expect(isOpen(questionStatus(q!)), a.question).toBe(true);
      const it = engine.item(a.identifier)!;
      expect(it, a.identifier).toBeTruthy();
      expect(questionInfo(engine, q!).items.map((x) => x.id), a.question).toContain(it.id);
      const alt = alternativeItem(engine, a)!;
      expect(JSON.stringify(alt)).not.toBe(JSON.stringify(it));
    }
  });

  it("re-runs the stored cases with the one change and reports what moves", () => {
    const a = alternativeFor("OQ-533")!;
    const entry = alternativeEntry(engine, vol.chapterOf, a)!;
    expect(entry.before!.identifier).toBe("snap_abawd_max_age");
    const changed = changedResults(engine, vol.cases, entry);
    expect(changed.length).toBeGreaterThan(0);
    for (const c of changed) expect(vol.cases.some((hc) => hc.id === c.caseId)).toBe(true);
    // Each change is a result that rests on the question's items.
    const q = questionInfo(engine, vol.openQuestions.find((x) => x.id === "OQ-533")!);
    const resting = resultsRestingOn(engine, vol.cases, q.items.map((it) => it.identifier));
    const key = (x: { caseId: string; person: string; identifier: string; month: string | null }) =>
      `${x.caseId}|${x.person}|${x.identifier}|${x.month}`;
    const restingKeys = new Set(resting.map(key));
    for (const c of changed) expect(restingKeys.has(key(c)), key(c)).toBe(true);
  }, 30_000);

  it("lists the resting results without values where no alternative is named", () => {
    const e = open.find((x) => !alternativeFor(x.id) && x.items.length)!;
    const eff = questionEffect(engine, vol, e);
    expect(eff.alternative).toBeNull();
    expect(eff.changed).toBeNull();
    expect(Array.isArray(eff.resting)).toBe(true);
  }, 30_000);
});

describe("answering a question", () => {
  const target = open.find((e) => e.status === "open")!;
  const answer = {
    decision: "Keep the reading", citation: "HCPF letter 26-01", by: "Dana Lee",
    role: "Medicaid policy owner", date: "2026-11-21", followUps: ["CO-1"],
  };

  it("retitles the question Resolved and appends the answer, leaving the rest as written", () => {
    const after = applyAnswer(md, target.id, answer);
    const qs = parseOpenQuestions(after);
    const q = qs.find((x) => x.id === target.id)!;
    expect(questionStatus(q)).toBe("resolved");
    expect(q.title).toBe(`Resolved: ${target.title}`);
    expect(q.body).toContain("Answer (2026-11-21, Dana Lee, Medicaid policy owner): Keep the reading.");
    expect(q.body).toContain("Citation: HCPF letter 26-01.");
    expect(q.body).toContain("Follow-up edits: CO-1");
    expect(q.items).toEqual(vol.openQuestions.find((x) => x.id === target.id)!.items);
    const others = (x: ReturnType<typeof parseOpenQuestions>) => x.filter((y) => y.id !== target.id);
    expect(others(qs)).toEqual(others(parseOpenQuestions(md)));
    expect(answeredIds(md, after)).toEqual([target.id]);
    expect(questionNotes(q.body).pop()!.label).toMatch(/^Answer/);
  });

  it("names the settled part of a partly resolved question", () => {
    const partly = open.find((e) => e.status === "partly" && /open:/i.test(e.rawTitle))!;
    const after = applyAnswer(md, partly.id, answer);
    const q = parseOpenQuestions(after).find((x) => x.id === partly.id)!;
    expect(q.title).toMatch(/^Resolved: .*answered: /);
  });

  it("refuses a question the file does not have", () => {
    expect(() => applyAnswer(md, "OQ-999999", answer)).toThrow();
  });
});

describe("the view", () => {
  beforeEach(setUp);

  it("files the open questions under their owners and keeps resolved ones apart", () => {
    const host = document.createElement("div");
    render(<QuestionsView />, host);
    const cards = host.querySelectorAll("li.qcard");
    expect(cards.length).toBe(open.length);
    const groups = [...host.querySelectorAll("section.qgroup")].map((g) => g.getAttribute("data-owner"));
    expect(groups).toEqual(groupByOwner(engine, open).map((g) => g.owner));
    expect(host.querySelector("li.qcard .qclass")).toBeTruthy();
    const resolved = host.querySelector("details.qresolved")!;
    expect(resolved.hasAttribute("open")).toBe(false);
    expect(resolved.querySelectorAll("li").length).toBe(infos.length - open.length);
    // Program filter names programs as a reader says them.
    expect([...host.querySelectorAll(".qfilters option")].map((o) => o.textContent)).toContain(programName("ColoradoWorks"));
    render(null, host);
  });

  it("filters from the address", () => {
    route.value = { ...route.value, params: { class: "legal" } };
    const host = document.createElement("div");
    render(<QuestionsView />, host);
    const cards = [...host.querySelectorAll("li.qcard")];
    expect(cards.length).toBe(open.filter((e) => e.cls === "legal").length);
    expect(cards.every((c) => c.getAttribute("data-class") === "legal")).toBe(true);
    render(null, host);
  });

  it("works out each card's households after the first paint", async () => {
    route.value = { ...route.value, params: { q: "OQ-533" } };
    const host = document.createElement("div");
    render(<QuestionsView />, host);
    const card = () => host.querySelector('li.qcard[data-question="OQ-533"] .effect')!;
    expect(card().textContent).toContain("Working out");
    await until(() => !card().textContent!.includes("Working out"));
    expect(card().textContent).toMatch(/stored results? in \d+ households? change/);
    render(null, host);
  }, 30_000);

  it("shows the departures as decisions for Legal", () => {
    route.value = { ...route.value, params: { tab: "departures" } };
    const host = document.createElement("div");
    render(<QuestionsView />, host);
    const cards = [...host.querySelectorAll("li.departure")];
    expect(cards.map((c) => c.getAttribute("data-item")).sort()).toEqual(overrideItems.map((it) => it.id).sort());
    expect(cards[0].textContent).toContain("Colorado rule it departs from");
    render(null, host);
  });

  it("opens a question's full page and stages an answer through the tray", async () => {
    const id = "OQ-533";
    route.value = { ...route.value, arg: id, params: { answer: "1" } };
    const host = document.createElement("div");
    document.body.appendChild(host);
    const read = async (p: string) => fs.readFileSync(path.join(root, p), "utf8");
    render(<QuestionsView readText={read} />, host);
    const page = host.querySelector("section.question")!;
    expect(page.getAttribute("data-question")).toBe(id);
    expect(page.querySelector(".assumption")!.textContent!.length).toBeGreaterThan(20);
    expect(page.querySelectorAll("ul.qitems li").length).toBeGreaterThan(0);
    expect(page.querySelector(".qclass")!.textContent).toBe("Needs Legal");
    await until(() => Boolean(page.querySelector(".alternative .effect-count")));
    expect(page.querySelector(".alternative table.qresults td.changed")).toBeTruthy();

    const form = page.querySelector("form.qanswer") as HTMLFormElement;
    const type = (sel: string, v: string) => {
      const el = form.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    (form.querySelectorAll("input[type=radio]")[1] as HTMLInputElement).click();
    type("textarea", "Apply the rule as written until CDHS's agency letter.");
    type("input[type=text]", "CDHS agency letter FEA 26-01");
    type('input[autocomplete="name"]', "Priya Shah");
    await tick();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await until(() => fileEntries(changeSetSig.value).length > 0);
    const entry = fileEntries(changeSetSig.value)[0];
    expect(entry.path).toBe(`${vol.path}/open-questions.md`);
    expect(entry.before).toBe(md);
    expect(entry.after).toMatch(new RegExp(`^### ${id}\\. Resolved: `, "m"));
    expect(entry.after).toContain("Priya Shah, Legal");
    expect(entry.label).toBe(`Answer to ${id}`);

    // Follow-up edits go through the tray too.
    await until(() => Boolean(host.querySelector(".qstaged")));
    const buttons = [...host.querySelectorAll(".qstaged button")] as HTMLButtonElement[];
    buttons.find((b) => b.textContent!.startsWith(`Take ${id} off`))!.click();
    buttons.find((b) => b.textContent!.startsWith("Stage the new value"))!.click();
    const staged = changeSetSig.value.entries;
    expect(staged.find((e) => e.after?.identifier === "snap_abawd_max_age")!.after!.versions!.every((v) => v.value === 54)).toBe(true);
    expect(staged.filter((e) => e.before?.open?.includes(id)).every((e) => !(e.after?.open ?? []).includes(id))).toBe(true);
    (host.querySelector(".qstaged button.btn:not(.small)") as HTMLButtonElement).click();
    expect(trayOpenSig.value).toBe(true);

    // With drafts shown, the staged answer moves the question to Resolved.
    draftsShownSig.value = true;
    route.value = { ...route.value, arg: null, params: { q: id } };
    render(<QuestionsView />, host);
    expect(host.querySelector(`li.qcard[data-question="${id}"]`)).toBeNull();
    render(null, host);
    host.remove();
  }, 60_000);
});

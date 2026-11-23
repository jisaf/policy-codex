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
  explicitField, matchesFilter, questionClass, questionInfo, questionInfos, questionNotes, questionOwners, questionStatus,
  ownerLineRoles, queueEntry, ruleText, sentences, waitingOn, QUESTION_CLASSES, type QueueEntry,
  plainReading, queueTextMatches,
} from "../../src/ui/questions";
import { agencyNotified, stagedAnswers } from "../../src/ui/questionAnswer";
import { changedBy, departureItems, departureSince, ownerGroups, personaQuestions, unknownReason } from "../../src/ui/counts";
import { personaById } from "../../src/ui/personas";
import {
  ALTERNATIVES, alternativeEntry, alternativeFor, alternativeItem, changedResults, resultsRestingOn,
} from "../../src/ui/questionEffects";
import { answeredIds, applyAnswer } from "../../src/ui/questionAnswer";
import {
  changeSetSig, draftsShownSig, engineSig, modeSig, route, trayOpenSig, volumeSig,
} from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import { personaSig } from "../../src/ui/personas";
import { programName, questionEffect } from "../../src/ui/places/questionParts";
import { QuestionsPage as QuestionsView } from "../../src/ui/places/QuestionsPage";
import { LawPage } from "../../src/ui/places/LawPage";
import { canonicalRoute, parseHash } from "../../src/ui/router";
import { questionQueue } from "../../src/ui/counts";
import { todayIso } from "../../src/ui/views/context";

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
  it("classes every open question, and uses each class the stopping rule accepts", () => {
    for (const e of open) expect(QUESTION_CLASSES).toContain(e.cls);
    for (const c of QUESTION_CLASSES.filter((x) => x !== "ledger")) expect(open.some((e) => e.cls === c), c).toBe(true);
  });

  it("states every open question's class, owner and reading, and none blocks certification (stopping rule)", () => {
    const roles = new Set<string>(engine.meta.approval_policy.roles);
    for (const e of open) {
      expect(explicitField(e.body, "Class"), e.id).toBeTruthy();
      expect(explicitField(e.body, "Assumption"), e.id).toBeTruthy();
      // The reading in force is plain language: no identifier, no item or excerpt number.
      expect(explicitField(e.body, "Assumption"), e.id).not.toMatch(/\b[a-z][a-z0-9]*_[a-z0-9_]+\b|\b(?:CO|OQ|D)-\d+|\bS\d{2,}\b|\[K\]/);
      const owners = explicitField(e.body, "Owner")!.split(",").map((r) => r.trim());
      for (const r of owners) expect(roles.has(r), `${e.id}: ${r}`).toBe(true);
      expect(e.cls, e.id).not.toBe("ledger");
      if (e.cls === "blocked") expect(explicitField(e.body, "Blocked on"), e.id).toBeTruthy();
      expect(e.blocksCertification, e.id).toBe(false);
    }
  });

  it("puts a question whose item follows a statute over a rule before Legal, unless it states its class", () => {
    const carried = open.filter((e) => e.items.some((it) => it.statute_override));
    expect(carried.length).toBeGreaterThan(0);
    for (const e of carried) {
      const q = { ...e, body: e.body.replace(/^(?:Class|Owner):.*$/gm, "") };
      expect(questionClass(q)).toBe("legal");
      expect(questionOwners(engine, q, "legal")[0]).toBe("Legal");
    }
  });

  it("names the document a blocked question waits on", () => {
    for (const e of open.filter((x) => x.cls === "blocked")) {
      expect(waitingOn(e), e.id).toBeTruthy();
      // The card says it once: under "Waiting on", or as the reading itself.
      const plain = plainReading(waitingOn(e)!);
      expect(e.waitingOn ?? e.assumption).toBe(e.waitingOn === null ? e.assumption : plain);
    }
  });

  it("owns a question by its Owner line alone; one without the line falls back to its programs' and tags' owners", () => {
    const policy = engine.meta.approval_policy;
    for (const e of open) {
      const named = explicitField(e.body, "Owner");
      if (named) {
        // "Owns" is one definition: the roles the Owner line names, nothing added.
        expect(e.owners, e.id).toEqual(ownerLineRoles(engine, e.body));
        expect(e.owner, e.id).toBe(named.split(",")[0].trim());
        continue;
      }
      const own = e.programs.filter((p) => p !== "All");
      const first = (own.length ? own : e.programs)[0];
      if (first && e.cls !== "legal") expect(e.owner, e.id).toBe(policy.by_program[first][0]);
    }
    // The fallback, on a question with no Owner line.
    const ltcItem = engine.items().find((it) => it.tags?.includes("ltc") && it.program === "Medicaid")!;
    const q = queueEntry(engine, vol.sources, {
      id: "OQ-X", title: "A question", rawTitle: "A question", body: "No owner line here.", status: "open",
      items: [ltcItem], programs: ["Medicaid"],
    });
    expect(q.owners).toContain("Medicaid policy owner");
    expect(q.owners).toContain("LTSS policy owner");
  });

  it("an explicit Class line wins over the reading", () => {
    const base = open.find((e) => e.cls === "policy")!;
    const body = base.body.replace(/^Class:.*$/m, "");
    expect(questionClass({ ...base, body: `${body}\n\nClass: ledger design` })).toBe("ledger");
  });

  it("reads an explicit Blocked on line, and does not show the field lines as a note", () => {
    const body = "Body: The figure is in a memo.\n\nClass: blocked on a named document\nOwner: Legal\nAssumption: The codex keeps the old figure.\nBlocked on: The annual memo (example.org refused)\n\nChecked 2026-11-22: the rule names no figure.";
    expect(waitingOn({ body })).toBe("The annual memo (example.org refused)");
    expect(questionNotes(body).map((n) => n.label)).toEqual([null, "Checked 2026-11-22"]);
    expect(assumptionInForce({ id: "OQ-9", items: [], body })).toBe("The codex keeps the old figure.");
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
    expect(groups).toEqual(questionQueue(engine, vol.sources, vol.openQuestions, null, {}).groups.map((g) => g.owner));
    for (const g of host.querySelectorAll("section.qgroup")) {
      for (const c of g.querySelectorAll("li.qcard")) expect(c.getAttribute("data-owner")).toBe(g.getAttribute("data-owner"));
    }
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

  it("'Only mine' and the owner filter: every card names an owner the filter accepts", () => {
    personaSig.value = "cdhs";
    const roles = personaById("cdhs")!.roles;
    const host = document.createElement("div");
    route.value = { ...route.value, params: { mine: "1", sort: "number" } };
    render(<QuestionsView />, host);
    const mine = [...host.querySelectorAll("li.qcard")];
    expect(mine.length).toBe(personaQuestions(engine, vol.sources, vol.openQuestions, personaById("cdhs")!).length);
    for (const c of mine) expect(roles).toContain(c.getAttribute("data-owner"));
    expect(host.querySelector("button.mine")!.getAttribute("aria-pressed")).toBe("true");
    // Marcus: only the Cash programs policy owner's, newest first.
    route.value = { ...route.value, params: { mine: "1", owner: "Cash programs policy owner", sort: "newest" } };
    render(<QuestionsView />, host);
    const cash = [...host.querySelectorAll("li.qcard")];
    expect(cash.length).toBe(40); // + OQ-1020, OQ-1022, OQ-1024 (earnings E0); + OQ-985, OQ-986, OQ-987 (receipts migration 2, Colorado Works); + OQ-951 (time audit T-1), OQ-953 (T-6); + OQ-901 (fix round 2026-11-23); + OQ-887, OQ-888 (receipts migration 1); + OQ-780 to OQ-783, - OQ-553 (Adult Financial coverage round); + OQ-830, OQ-831; + OQ-860
    for (const c of cash) {
      expect(c.getAttribute("data-owner")).toBe("Cash programs policy owner");
      expect(c.querySelector(".qowner b")!.textContent).toBe("Cash programs policy owner");
    }
    const nums = cash.map((c) => Number(c.getAttribute("data-question")!.slice(3)));
    expect(nums).toEqual([...nums].sort((x, y) => y - x));
    render(null, host);
  });

  it("sorts by the items carrying a question", () => {
    route.value = { ...route.value, params: { sort: "items" } };
    const host = document.createElement("div");
    render(<QuestionsView />, host);
    const ids = [...host.querySelectorAll("li.qcard")].map((c) => c.getAttribute("data-question")!);
    const n = (id: string) => open.find((e) => e.id === id)!.items.length;
    for (let i = 1; i < ids.length; i++) expect(n(ids[i - 1])).toBeGreaterThanOrEqual(n(ids[i]));
    render(null, host);
  });

  it("works out each card's households after the first paint", async () => {
    route.value = { ...route.value, params: { q: "OQ-533" } };
    const host = document.createElement("div");
    render(<QuestionsView />, host);
    const card = () => host.querySelector('li.qcard[data-question="OQ-533"] .effect')!;
    expect(card().textContent).toContain("Working out");
    await until(() => !card().textContent!.includes("Working out"));
    expect(card().textContent).toMatch(/stored results? in \d+ households? would change/);
    render(null, host);
  }, 30_000);

  it("the departures moved to Law: every one in force, with the App's fields", () => {
    expect(canonicalRoute(parseHash("#/co/questions?tab=departures"))).toMatchObject({ view: "law", arg: "departures" });
    route.value = { ...route.value, view: "law", arg: "departures", params: {} };
    const host = document.createElement("div");
    render(<LawPage />, host);
    const rows = [...host.querySelectorAll("li.departure")];
    expect(rows.map((c) => c.getAttribute("data-item")).sort())
      .toEqual(departureItems(engine, { asOf: todayIso() }).map((it) => it.id).sort());
    for (const label of ["The codex follows", "Departs from", "Reasoning", "Questions", "Agency notified"]) {
      expect(rows[0].querySelector("dl")!.textContent).toContain(label);
    }
    expect(rows[0].querySelector("h2 a")!.getAttribute("href")).toMatch(/^#\/co\/item\/CO-\d+$/);
    render(null, host);
  });

  it("opens a question's full page and stages an answer through the tray", async () => {
    const id = "OQ-533";
    route.value = { ...route.value, arg: id, params: { act: "answer" } };
    const host = document.createElement("div");
    document.body.appendChild(host);
    const read = async (p: string) => fs.readFileSync(path.join(root, p), "utf8");
    render(<QuestionsView readText={read} />, host);
    const page = host.querySelector("section.question")!;
    expect(page.getAttribute("data-question")).toBe(id);
    expect(page.querySelector(".assumption")!.textContent!.length).toBeGreaterThan(20);
    expect(page.querySelectorAll("ul.qitems li").length).toBeGreaterThan(0);
    expect(page.querySelector(".qclass")!.textContent).toBe("Blocked on a named document");
    // The rule text is on the page, with a way into the full document.
    expect(page.querySelector(".excerpt blockquote")).toBeTruthy();
    await until(() => Boolean(page.querySelector(".alternative .effect-count")));
    expect(page.querySelector(".alternative table.qresults td.changed")).toBeTruthy();

    const form = page.querySelector('form.qanswer[data-act="answer"]') as HTMLFormElement;
    const type = (sel: string, v: string) => {
      const el = form.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    (form.querySelectorAll("input[type=radio]")[1] as HTMLInputElement).click();
    type("textarea", "Apply the rule as written until CDHS's agency letter.");
    type('input[name="citation"]', "CDHS agency letter FEA 26-01");
    type('input[name="agency-notified"]', "CDHS SNAP division, 2026-11-22");
    type('input[autocomplete="name"]', "Priya Shah");
    await tick();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await until(() => fileEntries(changeSetSig.value).length > 0);
    const entry = fileEntries(changeSetSig.value)[0];
    expect(entry.path).toBe(`${vol.path}/open-questions.md`);
    expect(entry.before).toBe(md);
    expect(entry.after).toMatch(new RegExp(`^### ${id}\\. Resolved: `, "m"));
    expect(entry.after).toContain("Priya Shah, SNAP policy owner");
    expect(entry.after).toContain("Citation: CDHS agency letter FEA 26-01.");
    expect(entry.label).toBe(`Answer to ${id}`);

    // Follow-up edits go through the tray too.
    await until(() => Boolean(host.querySelector(".qstaged")));
    const buttons = [...host.querySelectorAll(".qstaged button")] as HTMLButtonElement[];
    buttons.find((b) => b.textContent!.startsWith(`Take ${id} off`))!.click();
    // Adopting the other reading staged its figure with the answer.
    const staged = changeSetSig.value.entries;
    expect(staged.find((e) => e.after?.identifier === "snap_abawd_max_age")!.after!.versions!.every((v) => v.value === 54)).toBe(true);
    expect(staged.filter((e) => e.before?.open?.includes(id)).every((e) => !(e.after?.open ?? []).includes(id))).toBe(true);
    expect(host.querySelector(".qstaged .sendchange button.download")).not.toBeNull();
    ([...host.querySelectorAll(".qstaged button")] as HTMLButtonElement[]).find((b) => b.textContent === "Open the change tray")!.click();
    expect(trayOpenSig.value).toBe(true);

    // With drafts shown, the staged answer moves the question to Resolved.
    draftsShownSig.value = true;
    route.value = { ...route.value, arg: null, params: { q: id } };
    render(<QuestionsView />, host);
    expect(host.querySelector(`li.qcard[data-question="${id}"]`)).toBeNull();
    render(null, host);
    host.remove();
  }, 60_000);

  it("records a legal opinion: conclusion, authority, effect and agency notified, the question kept open", async () => {
    personaSig.value = "legal";
    const id = open.find((e) => e.status === "open" && e.cls === "legal")!.id;
    route.value = { ...route.value, arg: id, params: { act: "opinion" } };
    const host = document.createElement("div");
    document.body.appendChild(host);
    const read = async (p: string) => fs.readFileSync(path.join(root, p), "utf8");
    render(<QuestionsView readText={read} />, host);
    const form = host.querySelector('form.qanswer[data-act="opinion"]') as HTMLFormElement;
    expect(form).toBeTruthy();
    const type = (sel: string, v: string) => {
      const el = form.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    type("textarea", "Section 10102 governs from its enactment; the Colorado rule yields.");
    type('input[name="authority"]', "Pub. L. 119-21 sec. 10102");
    const effect = form.querySelector('select[name="effect"]') as HTMLSelectElement;
    effect.value = "Federal statute governs over Colorado's text";
    effect.dispatchEvent(new Event("change", { bubbles: true }));
    type('input[name="agency-notified"]', "CDHS, by letter of 2026-11-22");
    type('input[autocomplete="name"]', "Priya Shah");
    await tick();
    // The role defaults to Legal.
    expect((form.querySelector(".row select") as HTMLSelectElement).value).toBe("Legal");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await until(() => fileEntries(changeSetSig.value).length > 0);
    const entry = fileEntries(changeSetSig.value)[0];
    expect(entry.label).toBe(`Legal opinion on ${id}`);
    const q = parseOpenQuestions(entry.after!).find((x) => x.id === id)!;
    expect(questionStatus(q)).toBe("open");
    expect(q.body).toContain("Legal opinion, question kept open");
    expect(q.body).toContain("Authority: Pub. L. 119-21 sec. 10102.");
    expect(q.body).toContain("Effect: Federal statute governs over Colorado's text.");
    expect(agencyNotified(q.body)).toBe("CDHS, by letter of 2026-11-22.");
    expect(stagedAnswers(md, entry.after!).get(id)).toBe("opinion");
    await until(() => Boolean(host.querySelector(".qstaged")));
    expect(host.querySelector(".qstaged")!.textContent).toContain("the question stays open");
    render(null, host);
    host.remove();
  }, 60_000);
});

describe("phase 13 retest fixes", () => {
  it("search 'long-term care' finds the LTC questions by their items' tags and owners", () => {
    const hits = open.filter((e) => queueTextMatches(e, "long-term care"));
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThan(open.length);
    const ltc = open.filter((e) => e.items.some((it) => (it.tags ?? []).includes("ltc")));
    for (const e of ltc) expect(hits.map((h) => h.id)).toContain(e.id);
    expect(matchesFilter(open[0], { text: open[0].id })).toBe(true);
  });

  it("reads explicit Class:, Owner: and Assumption: lines, the Owner line alone naming who answers", () => {
    const body = "Body: something.\n\n- **Class:** Blocked on a named document\nOwner: Cash programs policy owner; Legal\nAssumption: No figure from July 1, 2028, so the grant is unknown.";
    expect(explicitField(body, "Class")).toBe("Blocked on a named document");
    const q = { rawTitle: "X", body, status: "open" as const, items: open[0].items, programs: ["Medicaid"] };
    expect(questionClass(q)).toBe("blocked");
    expect(questionOwners(engine, q, "blocked").slice(0, 2)).toEqual(["Cash programs policy owner", "Legal"]);
    expect(assumptionInForce({ body, id: "OQ-0", items: [] })).toBe("No figure from July 1, 2028, so the grant is unknown.");
    // The field lines are fields, not notes.
    expect(questionNotes(body).map((n) => n.text).join(" ")).not.toMatch(/Owner:/);
  });

  it("the reading in force drops review history and code words", () => {
    expect(plainReading("The HCPF review's note C-13: § 8.100.7.B.3 states it, which HCPF's IM 25-030 [K] updates.")).toBe("§ 8.100.7.B.3 states it, which HCPF's IM 25-030 updates.");
    expect(plainReading("Each gets a county-facing statute_override note (HCPF review B-1).")).toBe("Each gets a county-facing statute-over-rule note.");
    expect(plainReading("See documents/D-80.md:6739-6747 for it.")).not.toMatch(/\.md/);
    for (const e of open) {
      expect(e.assumption, e.id).not.toMatch(/\[K\]|statute_override|\.md:\d/);
    }
  });

  it("an opinion keeps the question open; an answer leaves the open list", () => {
    const id = open.find((e) => e.status === "open")!.id;
    const opinion = applyAnswer(md, id, { decision: "Sec. 10102 governs.", citation: "Pub. L. 119-21", by: "Priya", role: "Legal", date: "2026-11-21", keepOpen: true, caveat: "revisit at the final rule", agencyNotified: "CDHS, 2026-11-21" });
    expect(answeredIds(md, opinion)).toEqual([]);
    expect(stagedAnswers(md, opinion).get(id)).toBe("opinion");
    const q = parseOpenQuestions(opinion).find((x) => x.id === id)!;
    expect(questionStatus(q)).toBe("open");
    expect(q.body).toContain("Caveat: revisit at the final rule.");
    expect(agencyNotified(q.body)).toBe("CDHS, 2026-11-21.");
    const answered = applyAnswer(md, id, { decision: "Keep it.", citation: "", by: "Dana", role: "Medicaid policy owner", date: "2026-11-21" });
    expect(stagedAnswers(md, answered).get(id)).toBe("answered");
  });

  it("an answered question leaves the queue and shows as 'answer staged'", () => {
    setUp();
    const id = open.find((e) => e.status === "open")!.id;
    const after = applyAnswer(md, id, { decision: "Keep it.", citation: "", by: "Dana", role: "Medicaid policy owner", date: "2026-11-21" });
    changeSetSig.value = { ...emptyChangeSet("co", "local"), files: [{ path: `${vol.path}/open-questions.md`, before: md, after, label: `Answer to ${id}` }] };
    route.value = { ...route.value, params: { mine: "0", q: id } };
    const host = document.createElement("div");
    render(<QuestionsView />, host);
    expect(host.querySelector(`.qcards li.qcard[data-question="${id}"]`)).toBeNull();
    expect(host.querySelector(`.qanswered li[data-question="${id}"]`)).not.toBeNull();
    render(null, host);
    changeSetSig.value = emptyChangeSet("co", "local");
  });

  it("the role page and the queue count a persona's questions the same way, and the groups add up", () => {
    for (const pid of ["hcpf", "cdhs", "legal"] as const) {
      const p = personaById(pid)!;
      const mine = personaQuestions(engine, vol.sources, vol.openQuestions, p);
      const roles = p.roles.filter((r) => engine.meta.approval_policy.roles.includes(r));
      for (const e of mine) expect(e.owners.some((o) => roles.includes(o))).toBe(true);
      const groups = ownerGroups(engine, mine, roles);
      expect(groups.reduce((n, g) => n + g.entries.length, 0)).toBe(mine.length);
      // The persona's own roles come first.
      const firstOther = groups.findIndex((g) => !g.mine);
      if (firstOther >= 0) expect(groups.slice(firstOther).every((g) => !g.mine)).toBe(true);
    }
  });

  it("departures give their start date where the item or note states one, and follow an as-of date", () => {
    for (const it of departureItems(engine)) {
      const since = departureSince(it);
      if (since) {
        expect(since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(departureItems(engine, { asOf: "1999-01-01" }).map((x) => x.id)).not.toContain(it.id);
      }
    }
    expect(departureSince({ statute_override: "Federal law overrides X: since Pub. L. 119-21 took effect on July 4, 2025, the age is 64." })).toBe("2025-07-04");
    // The rule overridden quotes its own date; the departure dates from what governs.
    expect(departureSince({ statute_override: "The federal figure overrides 4.408.E, which still states $4,500 \"Effective October 1, 2024\": the limit is $4,750 from October 1, 2026." })).toBe("2026-10-01");
  });

  it("explains an Unknown under the other reading by the facts the household lacks", () => {
    const alt = alternativeFor("OQ-410");
    if (!alt) return;
    const entry = alternativeEntry(engine, vol.chapterOf, alt)!;
    const changed = changedBy(engine, vol.cases, [entry]);
    const unknown = changed.filter((c) => c.after === null);
    for (const u of unknown) expect(unknownReason(u)).toMatch(/does not state|no figure/);
  });
});

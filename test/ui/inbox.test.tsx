/* The approvals inbox against the real Colorado volume: one definition of
 * "needs a role" behind every count, the grouping and filters, the plain
 * diff, and the actions that stage signatures and notes in the tray.
 * Assertions read the volume's own policy rather than fixed counts, since
 * the fix tracks keep editing the volume. */
import { describe, it, expect, beforeEach, vi } from "vitest";
import path from "node:path";
import { render } from "preact";
import { act } from "preact/test-utils";
import { loadVolume } from "../../src/tools/volumes";
import type { Item } from "../../src/engine/types";
import { emptyChangeSet } from "../../src/changes/types";
import { changedIdentifiers, isSignatureOnly } from "../../src/changes/apply";
import { validateChangeSet } from "../../src/changes/validate";
import {
  awaitingRole, policyStatus, requiringRole, roleCounts, roleRule, signItem, whyRequired,
} from "../../src/ui/approvals";
import {
  citedUnverified, filterFromParams, filterToParams, groupRows, inboxRows, KIND_ORDER, matches,
  NO_FILTER, parseReviewNotes, plainChanges, proposeHint, restingOnUnverified, reviewNoteEntry,
  signatureEntries, signatureNotice, stagedNotes, textMatches, withoutSignature, type InboxRow,
} from "../../src/ui/inbox";
import { householdsRestingOn, restingIndex } from "../../src/ui/counts";
import { unverifiedIds } from "../../src/ui/provenance";
import { personaSig } from "../../src/ui/personas";
import { defaultRoute } from "../../src/ui/router";
import {
  changeSetSig, credentials, draftsShownSig, engineSig, modeSig, route, volumeSig,
} from "../../src/ui/state";
import { INBOX_ROLE_KEY, InboxView, SIGNER_KEY, inboxRole } from "../../src/ui/views/InboxView";
import { personaById } from "../../src/ui/personas";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const roles = engine.meta.approval_policy.roles;
const unverified = unverifiedIds(vol.sources);
const tainted = restingOnUnverified(engine, unverified);

function rowsFor(role: string, cs = emptyChangeSet("co", "local")): InboxRow[] {
  return inboxRows({
    engine, role, sources: vol.sources, cases: vol.cases, chapterOf: vol.chapterOf, changeSet: cs,
  });
}

describe("one definition of who must sign (Legal's L5)", () => {
  it("every role's counts agree with awaitingRole and the inbox rows", () => {
    for (const c of roleCounts(engine, roles)) {
      expect(c.awaiting).toBe(awaitingRole(engine, c.role).length);
      expect(c.required).toBe(requiringRole(engine, c.role).length);
      expect(c.awaiting + c.signed).toBe(c.required);
      const rows = rowsFor(c.role);
      expect(rows.length).toBe(c.required);
      expect(rows.filter((r) => matches(r, NO_FILTER)).length).toBe(c.awaiting);
    }
  });

  it("needs Legal is exactly the policy's Legal tags, and the rule says so", () => {
    const legalTags = Object.entries(engine.meta.approval_policy.by_tag)
      .filter(([, rs]) => rs.includes("Legal")).map(([t]) => t);
    expect(legalTags.sort()).toEqual(["immigration", "legal", "state_election"]);
    const byTag = engine.items().filter((it) => (it.tags ?? []).some((t) => legalTags.includes(t)));
    expect(requiringRole(engine, "Legal").map((i) => i.id)).toEqual(byTag.map((i) => i.id));
    const rule = roleRule(engine.meta, "Legal");
    expect(rule).toMatch(/legal review/);
    expect(rule).toMatch(/immigration status/);
    expect(rule).toMatch(/state election/);
    // Every Legal row says which of those tags brought it in.
    for (const r of rowsFor("Legal")) expect(r.why.join(" ")).toMatch(/tagged/);
  });

  it("explains an upstream_of_outcomes requirement in words", () => {
    const rows = rowsFor("Medicaid policy owner");
    const upstream = rows.find((r) => r.item.program !== "Medicaid" && r.item.program !== "All");
    expect(upstream).toBeDefined();
    expect(upstream!.why.join(" ")).toMatch(/Medicaid outcomes read it/);
    expect(roleRule(engine.meta, "Medicaid policy owner")).toMatch(/every item that a Medicaid outcome reads/);
    for (const r of rows) expect(r.why.length).toBeGreaterThan(0);
    expect(whyRequired(engine, upstream!.item, "Child care policy owner (CDEC)")).toEqual(
      engine.approvals(upstream!.item).includes("Child care policy owner (CDEC)") ? expect.any(Array) : [],
    );
  });
});

describe("signing sets the status per the approval policy", () => {
  const multi = engine.items().find((it) => engine.approvals(it).length >= 2 && !tainted.has(it.identifier))!;
  const single = engine.items().find((it) => engine.approvals(it).length === 1 && !tainted.has(it.identifier))!;
  const dirty = engine.items().find((it) => citedUnverified(it, unverified).length > 0)!;

  it("reads the policy: partial is Reviewed, complete is Approved, unverified stays Draft", () => {
    expect(policyStatus(["A", "B"], new Set(["A"]), "approve", false)).toBe("Reviewed");
    expect(policyStatus(["A", "B"], new Set(["A", "B"]), "approve", false)).toBe("Approved");
    expect(policyStatus(["A", "B"], new Set(["A", "B"]), "review", false)).toBe("Reviewed");
    expect(policyStatus(["A"], new Set(["A"]), "approve", true)).toBe("Draft");
  });

  it("adds a Role: name, date signature, and governance accepts the result", () => {
    const [r1, r2] = engine.approvals(multi);
    const once = signItem(engine, multi, { role: r1, by: "Dana Lee", date: "2026-11-21" }, "approve", false);
    expect(once.approval).toEqual([{ role: r1, by: "Dana Lee", date: "2026-11-21" }]);
    expect(once.status).toBe("Reviewed");
    let all = once;
    for (const r of engine.approvals(multi).slice(1)) {
      all = signItem(engine, all, { role: r, by: "X", date: "2026-11-22" }, "approve", false);
    }
    expect(all.status).toBe("Approved");
    expect(all.approval!.map((a) => a.role)).toContain(r2);
    const errs = engine.governance(all).filter((f) => f.level === "error" && /^(status|approval)\./.test(f.rule));
    expect(errs).toEqual([]);

    const s = signItem(engine, single, { role: engine.approvals(single)[0], by: "P", date: "2026-11-21" }, "approve", false);
    expect(s.status).toBe("Approved");
  });

  it("keeps an item resting on unverified text Draft, which governance accepts", () => {
    expect(tainted.has(dirty.identifier)).toBe(true);
    const role = engine.approvals(dirty)[0];
    const s = signItem(engine, dirty, { role, by: "P", date: "2026-11-21" }, "approve", true);
    expect(s.status).toBeUndefined();
    expect(s.approval).toHaveLength(1);
    expect(engine.governance(s).filter((f) => f.rule === "status.unverified")).toEqual([]);
  });
});

describe("rows, groups and filters", () => {
  const rows = rowsFor("Medicaid policy owner");

  it("groups by program and chapter, figures first, then rules, then inputs", () => {
    const programs = (engine.meta.programs ?? []).map((p) => p.id);
    const groups = groupRows(rows, programs, ["supplied", "parameters", "shared", "medicaid"]);
    expect(groups.reduce((n, g) => n + g.rows.length, 0)).toBe(rows.length);
    const progRank = groups.map((g) => programs.indexOf(g.program));
    expect([...progRank].sort((a, b) => a - b)).toEqual(progRank);
    for (const g of groups) {
      const ranks = g.rows.map((r) => KIND_ORDER.indexOf(r.kind));
      expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
      expect(new Set(g.rows.map((r) => `${r.program}/${r.chapter}`)).size).toBe(1);
    }
  });

  it("every row carries its outcomes, households, sources and flags", () => {
    const withOutcome = rows.filter((r) => r.outcomes.length);
    expect(withOutcome.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.households.length > 0)).toBe(true);
    for (const r of rows) {
      expect(r.change.kind).toBe("new");
      for (const o of r.outcomes) expect(engine.item(o)).toBeDefined();
      for (const h of r.households) expect(vol.cases.some((c) => c.id === h)).toBe(true);
    }
    const overrides = rowsFor("SNAP policy owner").filter((r) => r.override);
    expect(overrides.length).toBe(engine.items().filter((i) => i.statute_override && engine.approvals(i).includes("SNAP policy owner")).length);
  });

  it("filters by status, program, tag, blocks-an-outcome and unverified text", () => {
    const f = (p: Record<string, string>) => rows.filter((r) => matches(r, filterFromParams(p)));
    expect(f({ program: "Medicaid" }).every((r) => r.program === "Medicaid")).toBe(true);
    expect(f({ tag: "immigration" }).every((r) => (r.item.tags ?? []).includes("immigration"))).toBe(true);
    expect(f({ blocks: "1" }).every((r) => r.outcomes.length > 0)).toBe(true);
    const unv = f({ unverified: "1" });
    expect(unv.length).toBeGreaterThan(0);
    expect(unv.every((r) => r.unverifiedCited.length > 0 && r.restsOnUnverified)).toBe(true);
    expect(f({ status: "Approved" })).toEqual([]);
    expect(f({ show: "all", status: "Draft" }).length).toBe(rows.length);
    expect(filterFromParams(filterToParams(filterFromParams({ tag: "legal", blocks: "1", show: "all" }))))
      .toEqual({ ...NO_FILTER, tag: "legal", blocksOutcome: true, show: "all" });
  });
});

describe("what changed, in plain words", () => {
  it("names a changed figure by its date and value", () => {
    const p = engine.items().find((it) => it.kind === "parameter" && (it.versions ?? []).length >= 1
      && typeof it.versions![it.versions!.length - 1].value === "number")!;
    const last = p.versions![p.versions!.length - 1];
    const after: Item = { ...p, versions: [...p.versions!.slice(0, -1), { ...last, value: (last.value as number) + 1 }] };
    const lines = plainChanges(engine, p, after);
    expect(lines).toHaveLength(1);
    expect(lines[0].what).toMatch(/^Figure from /);
    expect(lines[0].before).not.toEqual(lines[0].after);
  });

  it("reads a rule change as plain sentences and ignores signatures", () => {
    const d = engine.items().find((it) => it.kind === "derived" && it.meaning)!;
    const after: Item = { ...d, meaning: d.meaning + " Changed.", status: "Reviewed", approval: [{ role: "Legal", date: "2026-11-21" }] };
    expect(plainChanges(engine, d, after)).toEqual([{ what: "Meaning", before: d.meaning, after: d.meaning + " Changed." }]);
  });

  it("shows a staged edit on the row, and a staged signature on its own", () => {
    const role = "Medicaid policy owner";
    const it0 = rowsFor(role)[0].item;
    const edited = { ...it0, meaning: `${it0.meaning ?? ""} (edited)` };
    const cs = { ...emptyChangeSet("co", "local"), entries: [{ id: it0.id, chapter: vol.chapterOf[it0.id], before: it0, after: edited }] };
    const row = rowsFor(role, cs).find((r) => r.item.id === it0.id)!;
    expect(row.change.kind).toBe("staged");
    expect(row.change.lines[0].what).toBe("Meaning");
    expect(row.staged.signed).toBe(false);

    const signed = signatureEntries(engine, cs, vol.chapterOf, [it0.id], { role, by: "Dana", date: "2026-11-21" }, "approve", tainted);
    expect(signed[0].before).toBe(it0);
    expect(signed[0].after!.meaning).toBe(edited.meaning);
    const cs2 = { ...cs, entries: signed };
    const row2 = rowsFor(role, cs2).find((r) => r.item.id === it0.id)!;
    expect(row2.staged.signed).toBe(true);
    expect(row2.change.kind).toBe("staged");
    const back = withoutSignature(signed[0], role)!;
    expect(back.after!.approval).toBeUndefined();
    expect(back.after!.meaning).toBe(edited.meaning);
  });

  it("a signature changes no value: no downstream impact, and validation passes", () => {
    const role = "Medicaid policy owner";
    const ids = rowsFor(role).slice(0, 30).map((r) => r.item.id);
    const entries = signatureEntries(engine, null, vol.chapterOf, ids, { role, by: "Dana", date: "2026-11-21" }, "approve", tainted);
    expect(entries.every(isSignatureOnly)).toBe(true);
    const cs = { ...emptyChangeSet("co", "local"), entries };
    expect(changedIdentifiers(cs)).toEqual([]);
    const report = validateChangeSet(engine, cs);
    expect(report.impact).toEqual([]);
    expect(report.valid).toBe(true);
    // The second check of the same signatures reads the cache.
    expect(validateChangeSet(engine, cs).items).toEqual(report.items);
  });

  it("drops the tray entry when the signature was all it held", () => {
    const role = "Legal";
    const id = rowsFor(role)[0].item.id;
    const [e] = signatureEntries(engine, null, vol.chapterOf, [id], { role, by: "Priya", date: "2026-11-21" }, "review", tainted);
    expect(e.after!.approval).toEqual([{ role, by: "Priya", date: "2026-11-21" }]);
    expect(withoutSignature(e, role)).toBeNull();
  });
});

describe("requests for changes are notes in the tray", () => {
  it("round-trips the notes file and reuses it for the role", () => {
    const names = (id: string) => engine.itemById(id)?.name ?? "";
    const n1 = { id: "CO-191", role: "Medicaid policy owner", by: "Dana", date: "2026-11-21", text: "Cite § 8.100.4.G.2.\n\nAnd the 2026 date." };
    const f1 = reviewNoteEntry(vol.path, null, n1, names, () => "abc123");
    expect(f1.path).toBe("volumes/co/reviews/2026-11-21-medicaid-policy-owner-abc123.md");
    expect(parseReviewNotes(f1.after!)).toEqual([n1]);
    const cs = { ...emptyChangeSet("co", "local"), files: [f1] };
    const f2 = reviewNoteEntry(vol.path, cs, { ...n1, id: "CO-192", text: "Second." }, names, () => "zzz");
    expect(f2.path).toBe(f1.path);
    expect(stagedNotes({ ...cs, files: [f2] }).map((n) => n.id)).toEqual(["CO-191", "CO-192"]);
  });

  it("says what an approval does and who else must sign", () => {
    const it = engine.items().find((i) => engine.approvals(i).length >= 3 && engine.approvals(i).includes("Medicaid policy owner") && !tainted.has(i.identifier))!;
    const sig = { role: "Medicaid policy owner", by: "Dana", date: "2026-11-21" };
    const entries = signatureEntries(engine, null, vol.chapterOf, [it.id], sig, "approve", tainted);
    const text = signatureNotice(engine, entries, sig, "approve");
    expect(text).toMatch(/becomes Reviewed, not yet Approved/);
    for (const other of engine.approvals(it).filter((r) => r !== sig.role)) expect(text).toContain(other);
  });

  it("counts households the same way as the role page (results resting on it)", () => {
    const ix = restingIndex(engine, vol.cases);
    const rs = inboxRows({ engine, role: "Medicaid policy owner", sources: vol.sources, cases: vol.cases, chapterOf: vol.chapterOf, changeSet: null, resting: ix });
    for (const r of rs.slice(0, 40)) expect(r.households).toEqual(householdsRestingOn(engine, vol.cases, r.item.identifier));
  });

  it("says plainly how a staged change becomes a pull request", () => {
    expect(proposeHint(false)).toMatch(/Staged in this browser only/);
    expect(proposeHint(false)).toMatch(/Propose/);
    expect(proposeHint(false)).toMatch(/GitHub token/);
    expect(proposeHint(true)).toMatch(/press Propose/);
  });
});

describe("the inbox page", () => {
  beforeEach(() => {
    localStorage.clear();
    route.value = { ...defaultRoute(), volume: "co", view: "inbox" };
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("co", "local");
    modeSig.value = "read";
    draftsShownSig.value = null;
    personaSig.value = "hcpf";
    credentials.clear("github");
  });

  function mount() {
    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => { render(<InboxView />, host); });
    return host;
  }

  it("opens on the persona's first role, with counts that match the policy", () => {
    const host = mount();
    const c = roleCounts(engine, ["Medicaid policy owner"])[0];
    const line = host.querySelector(".rolecounts li.on")!.textContent!;
    expect(line).toContain(`Medicaid policy owner: ${c.awaiting.toLocaleString("en-US")} items awaiting, 0 approved`);
    expect(host.querySelector(".inbox-definition")!.textContent).toContain(`${c.required.toLocaleString("en-US")} items in all`);
    expect(host.querySelector(".shown-count")!.textContent).toContain(c.awaiting.toLocaleString("en-US"));
    // The every-role table states each role's rule beside its count.
    const legal = host.querySelector('tr[data-role="Legal"]')!;
    expect(legal.textContent).toContain(String(awaitingRole(engine, "Legal").length));
    expect(legal.textContent).toContain("immigration status");
    // Figures come first in the first open group.
    const kinds = [...host.querySelectorAll("details.inbox-group[open] .kindhead")].map((h) => h.textContent);
    expect(kinds[0]).toMatch(/^Figures|^Rules|^Facts/);
  });

  it("asks for a name, then stages an approval and says how it becomes a PR", () => {
    const host = mount();
    const first = host.querySelector<HTMLElement>("article.inbox-row")!;
    const id = first.dataset.item!;
    act(() => { first.querySelector<HTMLButtonElement>("button.approve")!.click(); });
    expect(changeSetSig.value.entries).toHaveLength(0);
    expect(host.querySelector(".signer .bad")!.textContent).toMatch(/Type your name/);

    const input = host.querySelector<HTMLInputElement>(".signer input")!;
    act(() => {
      input.value = "Dana Lee (HCPF)";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(localStorage.getItem(SIGNER_KEY)).toBe("Dana Lee (HCPF)");
    act(() => { host.querySelector<HTMLButtonElement>(`article[data-item="${id}"] button.approve`)!.click(); });
    const entry = changeSetSig.value.entries.find((e) => e.id === id)!;
    expect(entry.after!.approval).toEqual([
      { role: "Medicaid policy owner", by: "Dana Lee (HCPF)", date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
    ]);
    const notice = host.querySelector(".inbox-notice")!.textContent!;
    expect(notice).toContain("saved in this browser only");
    expect(notice).toContain("Download this change");
    // The steward codex.json names is in the message.
    expect(notice).toContain("Data steward");
    // The status sentence says why, not "status would be Reviewed".
    expect(notice).not.toMatch(/status would be/);
    expect(host.querySelector(`article[data-item="${id}"] .staged-note`)!.textContent).toMatch(/signature is staged/);

    // Undo takes it back out of the tray.
    act(() => { host.querySelector<HTMLButtonElement>(`article[data-item="${id}"] .staged-note button`)!.click(); });
    expect(changeSetSig.value.entries).toHaveLength(0);
  });

  it("signs a whole chapter at once, in one write", async () => {
    localStorage.setItem(SIGNER_KEY, "Priya (AG)");
    personaSig.value = "legal";
    const host = mount();
    const group = host.querySelector<HTMLDetailsElement>("details.inbox-group[open]")!;
    const n = Number(/Approve the chapter \((\d+)\)/.exec(group.querySelector("button.sign-chapter")!.textContent!)![1]);
    vi.stubGlobal("confirm", () => true);
    const t0 = Date.now();
    act(() => { group.querySelector<HTMLButtonElement>("button.sign-chapter")!.click(); });
    vi.unstubAllGlobals();
    if (n > 20) {
      // A large chapter says it is working, then stages.
      expect(host.querySelector(".inbox-notice")!.textContent).toMatch(/Staging \d+ signatures/);
      await act(() => new Promise((res) => setTimeout(res, 50)));
    }
    expect(changeSetSig.value.entries).toHaveLength(n);
    expect(changeSetSig.value.entries.every((e) => e.after!.approval!.some((a) => a.role === "Legal" && a.by === "Priya (AG)"))).toBe(true);
    expect(Date.now() - t0).toBeLessThan(20_000);
  });

  it("stages a request for changes as a note", () => {
    localStorage.setItem(SIGNER_KEY, "Dana");
    const host = mount();
    const row = host.querySelector<HTMLElement>("article.inbox-row")!;
    act(() => { row.querySelector<HTMLButtonElement>("button.request")!.click(); });
    const ta = row.querySelector<HTMLTextAreaElement>("textarea")!;
    act(() => {
      ta.value = "Show 142% and the 2026 monthly dollars.";
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => { row.querySelector<HTMLFormElement>("form.noteform")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    const files = changeSetSig.value.files ?? [];
    expect(files).toHaveLength(1);
    expect(files[0].path).toMatch(/^volumes\/co\/reviews\/\d{4}-\d{2}-\d{2}-medicaid-policy-owner-[a-z0-9]+\.md$/);
    expect(files[0].after).toContain("Show 142% and the 2026 monthly dollars.");
    expect(host.querySelector(`article[data-item="${row.dataset.item}"] .staged-note.request`)).not.toBeNull();
  });

  it("opens on the role it was last read as, if it is the persona's own (CDHS cash lead)", () => {
    personaSig.value = "cdhs";
    localStorage.setItem(INBOX_ROLE_KEY, "Cash programs policy owner");
    const host = mount();
    expect(host.querySelector("section.inbox")!.getAttribute("data-role")).toBe("Cash programs policy owner");
    // A role not the persona's is not reopened.
    localStorage.setItem(INBOX_ROLE_KEY, "Legal");
    const ctx = { engine, vol, route: { ...route.value, params: {} }, persona: personaById("cdhs"), today: "2026-11-22" };
    expect(inboxRole(ctx as never)).toBe("SNAP policy owner");
  });

  it("opens on the persona's role that signs something staged", () => {
    personaSig.value = "cdhs";
    const it = engine.items().find((i) => i.program === "ColoradoWorks" && i.kind === "parameter")!;
    const ctx = { engine, vol, route: { ...route.value, params: {} }, persona: personaById("cdhs"), today: "2026-11-22" };
    const staged = [{ id: it.id, chapter: vol.chapterOf[it.id], before: it, after: { ...it, value: 1 } }];
    expect(inboxRole(ctx as never, staged)).toBe("Cash programs policy owner");
  });

  it("inbox/<id> opens the item's row at the top, as a role that signs it", () => {
    const it = engine.items().find((i) => i.id === "CO-191")!;
    route.value = { ...route.value, arg: it.id, params: {} };
    const host = mount();
    const linked = host.querySelector(".inbox-linked")!;
    expect(linked.querySelector(`article[data-item="${it.id}"]`)).not.toBeNull();
    expect(engine.approvals(it)).toContain(host.querySelector("section.inbox")!.getAttribute("data-role"));
  });

  it("searches by words and lists my staged changes first", () => {
    localStorage.setItem(SIGNER_KEY, "Dana");
    route.value = { ...route.value, params: { role: "Medicaid policy owner", q: "children category percent" } };
    let host = mount();
    const found = [...host.querySelectorAll<HTMLElement>("article.inbox-row")].map((a) => a.dataset.item);
    expect(found.length).toBeGreaterThan(0);
    for (const id of found) expect(textMatches(engine.itemById(id!)!, "children category percent")).toBe(true);
    // Stage one signature, then the staged list leads.
    act(() => { host.querySelector<HTMLButtonElement>("article.inbox-row button.approve")!.click(); });
    const staged = changeSetSig.value.entries[0].id;
    host.remove();
    route.value = { ...route.value, params: { role: "Medicaid policy owner" } };
    host = mount();
    expect(host.querySelector(`.inbox-staged article[data-item="${staged}"]`)).not.toBeNull();
    route.value = { ...route.value, params: { role: "Medicaid policy owner", staged: "1" } };
    host.remove();
    host = mount();
    const onlyStaged = [...host.querySelectorAll<HTMLElement>("article.inbox-row")].map((a) => a.dataset.item);
    expect(onlyStaged).toEqual([staged]);
  });

  it("without a role, asks whose sign-off to list", () => {
    personaSig.value = null;
    const host = mount();
    expect(host.querySelector(".inbox-pick")).not.toBeNull();
    expect(host.querySelectorAll(".inbox-pick li")).toHaveLength(roles.length);
  });
});

/* The approvals inbox against the real Colorado volume: one definition of
 * "needs a role" behind every count, the grouping and filters, the plain
 * diff, and the Desk's sign-off list and approval card, which stage
 * signatures and notes in the tray.
 * Assertions read the volume's own policy rather than fixed counts, since
 * the fix tracks keep editing the volume. */
import { describe, it, expect, beforeEach } from "vitest";
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
import { householdsRestingOn, restingIndex, signOffGroups } from "../../src/ui/counts";
import { canSign, isOwnStagedChange } from "../../src/ui/inbox";
import { unverifiedIds } from "../../src/ui/provenance";
import { personaSig } from "../../src/ui/personas";
import { canonicalRoute, internalRoute, parseHash } from "../../src/ui/router";
import {
  changeSetSig, credentials, draftsShownSig, engineSig, modeSig, route, volumeSig,
} from "../../src/ui/state";
import { INBOX_ROLE_KEY, SIGNER_KEY, inboxRole } from "../../src/ui/views/ApprovalCard";
import { SignPage } from "../../src/ui/places/SignPage";
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
    // The row records the fingerprint of what was signed (docs/governance.md
    // "Stale approvals").
    expect(once.approval).toEqual([{ role: r1, by: "Dana Lee", date: "2026-11-21", fingerprint: engine.fingerprint(multi) }]);
    expect(once.approval![0].fingerprint).toMatch(/^fp1-[0-9a-f]{20}$/);
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
    expect(e.after!.approval).toEqual([{ role, by: "Priya", date: "2026-11-21", fingerprint: engine.fingerprint(e.after!) }]);
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

describe("Desk › To sign (the sign-off list and the approval card)", () => {
  beforeEach(() => {
    localStorage.clear();
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("co", "local");
    modeSig.value = "read";
    draftsShownSig.value = null;
    personaSig.value = "hcpf";
    credentials.clear("github");
  });

  function mount(hash: string) {
    route.value = internalRoute(canonicalRoute(parseHash(hash)));
    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => { render(<SignPage />, host); });
    return host;
  }
  const typeName = (host: HTMLElement, name: string) => {
    const input = host.querySelector<HTMLInputElement>(".signer input")!;
    act(() => {
      input.value = name;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const medGroups = () => signOffGroups(engine, "Medicaid policy owner", vol.chapterOf, tainted);

  it("opens on the persona's first role, its groups adding up to the role's count", () => {
    const host = mount("#/co/desk/sign");
    expect(host.querySelector("section.signpage")!.getAttribute("data-role")).toBe("Medicaid policy owner");
    expect(host.querySelector("h1")!.textContent).toBe("To sign as Medicaid policy owner");
    const nums = [...host.querySelectorAll("ul.signgroups .sg-num")].map((x) => Number(x.textContent!.replace(/,/g, "")));
    expect(nums.reduce((a, b) => a + b, 0)).toBe(awaitingRole(engine, "Medicaid policy owner").length);
    expect(nums).toEqual(medGroups().map((g) => g.items.length));
    // The persona's other roles are one click away.
    expect([...host.querySelectorAll("nav.rolechips a")].map((a) => a.textContent)).toContain(
      `CHP+ policy owner ${awaitingRole(engine, "CHP+ policy owner").length.toLocaleString("en-US")}`,
    );
  });

  it("a group opens as a reading list: meaning, figure today and why you sign", () => {
    const g = medGroups()[0];
    const host = mount(`#/co/desk/sign?role=Medicaid+policy+owner&group=${encodeURIComponent(g.key)}`);
    const items = [...host.querySelectorAll<HTMLElement>("li.signitem")];
    expect(items.length).toBe(Math.min(30, g.items.length));
    expect(items.map((li) => li.dataset.item)).toEqual(g.items.slice(0, 30).map((it) => it.id));
    const first = items[0];
    expect(first.querySelector(".si-m")!.textContent!.length).toBeGreaterThan(10);
    expect(first.textContent).toContain("You sign because");
    // Each name opens the approval card.
    expect(first.querySelector(".si-h a")!.getAttribute("href")).toBe(`#/co/desk/sign/${g.items[0].id}?role=Medicaid+policy+owner`);
  });

  it("approving the ticked asks for a name first, then stages each signature", () => {
    const g = medGroups()[0];
    const host = mount(`#/co/desk/sign?role=Medicaid+policy+owner&group=${encodeURIComponent(g.key)}`);
    const boxes = [...host.querySelectorAll<HTMLInputElement>("li.signitem input.pick")].slice(0, 2);
    for (const b of boxes) act(() => { b.click(); });
    const approve = () => act(() => { host.querySelector<HTMLButtonElement>(".signbar button.approve")!.click(); });
    approve();
    expect(changeSetSig.value.entries).toHaveLength(0);
    expect(host.querySelector(".signer .bad")!.textContent).toMatch(/Type your name/);
    typeName(host, "Dana Lee (HCPF)");
    expect(localStorage.getItem(SIGNER_KEY)).toBe("Dana Lee (HCPF)");
    approve();
    expect(changeSetSig.value.entries.map((e) => e.id).sort()).toEqual(g.items.slice(0, 2).map((it) => it.id).sort());
    expect(host.querySelector(".inbox-notice")!.textContent).toContain("Data steward");
  });

  it("the card asks for a name, then stages an approval and says how it becomes a PR", () => {
    const id = medGroups()[0].items[0].id;
    const host = mount(`#/co/desk/sign/${id}`);
    const card = host.querySelector<HTMLElement>(`article.inbox-row[data-item="${id}"]`)!;
    expect(card.querySelector(".change")!.textContent).toBe("New, never approved.");
    expect(card.textContent).toContain("Why you sign");
    act(() => { card.querySelector<HTMLButtonElement>("button.approve")!.click(); });
    expect(changeSetSig.value.entries).toHaveLength(0);
    expect(host.querySelector(".signer .bad")!.textContent).toMatch(/Type your name/);
    typeName(host, "Dana Lee (HCPF)");
    act(() => { host.querySelector<HTMLButtonElement>(`article[data-item="${id}"] button.approve`)!.click(); });
    const entry = changeSetSig.value.entries.find((e) => e.id === id)!;
    expect(entry.after!.approval).toEqual([
      {
        role: "Medicaid policy owner", by: "Dana Lee (HCPF)", date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        fingerprint: engineSig.value!.fingerprint(entry.after!),
      },
    ]);
    const notice = host.querySelector(".inbox-notice")!.textContent!;
    expect(notice).toContain("saved in this browser only");
    expect(notice).toContain("Download this change");
    expect(notice).toContain("Data steward");
    expect(notice).not.toMatch(/status would be/);
    expect(host.querySelector(`article[data-item="${id}"] .staged-note`)!.textContent).toMatch(/signature is staged/);
    // Undo takes it back out of the tray.
    act(() => { host.querySelector<HTMLButtonElement>(`article[data-item="${id}"] .staged-note button`)!.click(); });
    expect(changeSetSig.value.entries).toHaveLength(0);
    // The way back to its group, and on to the next item.
    expect(host.querySelector(".signcard .backline a")!.getAttribute("href")).toContain("group=");
    expect(host.querySelector(".signcard .nextline a")!.getAttribute("href")).toBe(`#/co/desk/sign/${medGroups()[0].items[1].id}?role=Medicaid+policy+owner`);
  });

  it("never offers Approve on the reader's own staged change", () => {
    const role = "Medicaid policy owner";
    const it0 = medGroups()[0].items[0];
    const edited = { ...it0, meaning: `${it0.meaning ?? ""} (my edit)` };
    changeSetSig.value = { ...emptyChangeSet("co", "local"), entries: [{ id: it0.id, chapter: vol.chapterOf[it0.id], before: it0, after: edited }] };
    const row = rowsFor(role, changeSetSig.value).find((r) => r.item.id === it0.id)!;
    expect(isOwnStagedChange(row)).toBe(true);
    expect(canSign(row)).toBe(false);
    expect(canSign(rowsFor(role)[0])).toBe(true);
    localStorage.setItem(SIGNER_KEY, "Dana Lee (HCPF)");
    const card = mount(`#/co/desk/sign/${it0.id}`).querySelector(`article[data-item="${it0.id}"]`)!;
    expect(card.querySelector("button.approve")).toBeNull();
    expect(card.querySelector(".own-change")!.textContent).toMatch(/cannot approve it/);
    const list = mount(`#/co/desk/sign?role=Medicaid+policy+owner&group=${encodeURIComponent(medGroups()[0].key)}`);
    expect(list.querySelector<HTMLInputElement>(`li.signitem[data-item="${it0.id}"] input.pick`)!.disabled).toBe(true);
    // Ticking everything and approving still leaves it out.
    act(() => { list.querySelector<HTMLButtonElement>(".signbar button")!.click(); });
    act(() => { list.querySelector<HTMLButtonElement>(".signbar button.approve")!.click(); });
    const signedIt = changeSetSig.value.entries.find((e) => e.id === it0.id)!;
    expect(signedIt.after!.approval ?? []).toEqual(it0.approval ?? []);
  });

  it("stages a request for changes as a note", () => {
    localStorage.setItem(SIGNER_KEY, "Dana");
    const id = medGroups()[0].items[0].id;
    const host = mount(`#/co/desk/sign/${id}`);
    const card = host.querySelector<HTMLElement>("article.inbox-row")!;
    act(() => { card.querySelector<HTMLButtonElement>("button.request")!.click(); });
    const ta = card.querySelector<HTMLTextAreaElement>("textarea")!;
    act(() => {
      ta.value = "Show 142% and the 2026 monthly dollars.";
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => { card.querySelector<HTMLFormElement>("form.noteform")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    const files = changeSetSig.value.files ?? [];
    expect(files).toHaveLength(1);
    expect(files[0].path).toMatch(/^volumes\/co\/reviews\/\d{4}-\d{2}-\d{2}-medicaid-policy-owner-[a-z0-9]+\.md$/);
    expect(files[0].after).toContain("Show 142% and the 2026 monthly dollars.");
    expect(host.querySelector(`article[data-item="${id}"] .staged-note.request`)).not.toBeNull();
  });

  it("opens on the role it was last read as, if it is the persona's own (CDHS cash lead)", () => {
    personaSig.value = "cdhs";
    localStorage.setItem(INBOX_ROLE_KEY, "Cash programs policy owner");
    const host = mount("#/co/desk/sign");
    expect(host.querySelector("section.signpage")!.getAttribute("data-role")).toBe("Cash programs policy owner");
    localStorage.setItem(INBOX_ROLE_KEY, "Legal");
    const ctx = { engine, vol, route: { ...route.value, arg: null, params: {} }, persona: personaById("cdhs"), today: "2026-11-22" };
    expect(inboxRole(ctx as never)).toBe("SNAP policy owner");
  });

  it("opens on the persona's role that signs something staged", () => {
    const it = engine.items().find((i) => i.program === "ColoradoWorks" && i.kind === "parameter")!;
    const ctx = { engine, vol, route: { ...route.value, arg: null, params: {} }, persona: personaById("cdhs"), today: "2026-11-22" };
    const staged = [{ id: it.id, chapter: vol.chapterOf[it.id], before: it, after: { ...it, value: 1 } }];
    expect(inboxRole(ctx as never, staged)).toBe("Cash programs policy owner");
  });

  it("desk/sign/<id> opens the item's card, as a role that signs it", () => {
    const host = mount("#/co/desk/sign/CO-191");
    expect(host.querySelector('.signcard article[data-item="CO-191"]')).not.toBeNull();
    expect(engine.approvals(engine.itemById("CO-191")!)).toContain(host.querySelector("section.signpage")!.getAttribute("data-role"));
  });

  it("finds by words across the groups, every word in any order", () => {
    const host = mount("#/co/desk/sign?role=Medicaid+policy+owner&q=children+category+percent");
    const found = [...host.querySelectorAll<HTMLElement>("li.signitem")].map((a) => a.dataset.item!);
    expect(found.length).toBeGreaterThan(0);
    for (const id of found) expect(textMatches(engine.itemById(id)!, "children category percent")).toBe(true);
  });

  it("without a role, asks whose signature", () => {
    personaSig.value = null;
    const host = mount("#/co/desk/sign");
    expect(host.querySelectorAll("ul.rolelist li")).toHaveLength(roles.length);
  });
});


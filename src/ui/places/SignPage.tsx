/* Desk › To sign (docs/design-unified-ui.md, "Desk"): the items waiting on
 * one approval role's signature.
 *
 * - `desk/sign?role=` lists the role's items in groups (program and
 *   chapter), each with how many carry an open question or rest on
 *   unverified text (Blind B's queue).
 * - `?group=<program>/<chapter>` (or `?q=` words) opens a reading list: each
 *   item's meaning, the figure today and why you sign, with a tick box and
 *   "Approve the ticked" (Blind B, never a list of bare names).
 * - `desk/sign/CO-n` opens the App's approval card for one item.
 *
 * Every signature needs the signer's name, and a change the reader staged
 * themselves is never offered for approval (inbox.ts `canSign`). Signatures
 * go to the change tray; counts come from counts.ts. */
import { useSignal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import type { SignAction } from "../approvals";
import {
  awaitingByRole, DESK_DEFINITIONS, restingIndex, restingOnUnverified, restingReady, signOffGroups,
} from "../counts";
import {
  canSign, figureOn, inboxRows, isOwnStagedChange, KIND_ONE, reviewNoteEntry, signatureEntries, signatureNotice,
  textMatches, withoutReviewNote, withoutSignature, type InboxRow,
} from "../inbox";
import { fileEntries } from "../../changes/types";
import type { StoredResult } from "../questionEffects";
import { personaRoles } from "../personas";
import { formatValue } from "../present";
import { noVersionReason } from "../Present";
import { unverifiedIds } from "../provenance";
import { firstSentence, programLabel } from "../roles";
import { argParts, buildHash, isPrRef, type Route } from "../router";
import { SendChange } from "../sendChange";
import {
  changeSetSig, discardFileChange, engineSig, prBaseVolumeSig, putChangeEntries, putFileChange,
} from "../state";
import {
  ApprovalCard, chapterTitles, inboxRole, readSigner, saveRole, saveSigner,
} from "../views/ApprovalCard";
import { viewContext } from "../views/context";
import { plainMeaning } from "./ProgramsPage";
import { NoLedger } from "../views/ViewStub";
import "./desk.css";

const PAGE = 30;

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

/** The chapters every program shares, in words. */
const CHAPTER_WORDS: Record<string, string> = { parameters: "Figures", supplied: "Facts we are told", shared: "Shared rules" };

/** A group's name in words: "Medicaid · Figures". */
function groupTitle(program: string, chapter: string, titles: Map<string, string>): string {
  return `${programLabel(program)} · ${CHAPTER_WORDS[chapter] ?? titles.get(chapter) ?? chapter}`;
}

export function SignPage() {
  const ctx = viewContext();
  const signer = useSignal(readSigner());
  const needName = useSignal(false);
  const notice = useSignal<string | null>(null);
  const ticked = useSignal<ReadonlySet<string>>(new Set());
  const limit = useSignal(PAGE);
  const resting = useSignal<Map<string, StoredResult[]> | null>(null);

  const base = engineSig.value ?? ctx?.engine ?? null;
  const vol = ctx?.vol ?? null;
  const cs = changeSetSig.value;
  const linkedId = ctx ? argParts(ctx.route)[1] ?? null : null;
  const role = ctx ? inboxRole(ctx, cs.entries, linkedId) : null;
  const proposedBase = ctx && isPrRef(ctx.route.ref) ? prBaseVolumeSig.value?.items ?? null : null;

  // The card says which stored households rest on the item: worked out from
  // every stored case's trace (about a second), after the page paints.
  const ready = base && vol ? restingReady(base, vol.cases) : false;
  useEffect(() => {
    if (!base || !vol || !linkedId) return;
    if (ready) { resting.value = restingIndex(base, vol.cases); return; }
    resting.value = null;
    const t = setTimeout(() => { resting.value = restingIndex(base, vol.cases); }, 30);
    return () => clearTimeout(t);
  }, [base, vol, ready, linkedId]);
  const restIx = linkedId ? (resting.value ?? (ready && base && vol ? restingIndex(base, vol.cases) : null)) : null;

  const rows = useMemo(
    () => (base && vol && role
      ? inboxRows({
        engine: base, role, sources: vol.sources, cases: vol.cases, chapterOf: vol.chapterOf,
        changeSet: cs, proposedBase, resting: restIx,
      })
      : []),
    [base, vol, role, cs, proposedBase, restIx],
  );
  const tainted = useMemo(
    () => (base && vol ? restingOnUnverified(base, unverifiedIds(vol.sources)) : new Set<string>()),
    [base, vol],
  );
  useEffect(() => { if (ctx?.route.params.role && role) saveRole(role); }, [role, ctx?.route.params.role]);
  useEffect(() => { ticked.value = new Set(); limit.value = PAGE; }, [role, ctx?.route.params.group, ctx?.route.params.q]);

  if (!ctx || !base || !vol) return <NoLedger />;
  const { route: r, engine } = ctx;
  const declared = engine.meta.approval_policy?.roles ?? [];
  const mine = ctx.persona ? personaRoles(ctx.persona, engine.meta) : [];
  const at = (patch: { arg?: string | null; params?: Record<string, string> }) =>
    buildHash({ ...r, view: "desk", arg: patch.arg ?? "sign", params: patch.params ?? (role ? { role } : {}) });

  if (!role) return <ChooseRole route={r} roles={declared} counts={awaitingByRole(base)} at={at} />;

  const titles = chapterTitles(vol);
  const groups = signOffGroups(base, role, vol.chapterOf, tainted);
  const byId = new Map(rows.map((row) => [row.item.id, row]));
  const names = (id: string) => base.itemById(id)?.name ?? "";
  const stagedSigs = rows.filter((row) => row.staged.signed).length;
  const stagedNotes = rows.filter((row) => row.staged.note).length;

  const sign = (picked: string[], action: SignAction) => {
    // Never a signature on the reader's own staged change, whichever button.
    const ids = picked.filter((id) => { const row = byId.get(id); return row && canSign(row); });
    if (!ids.length) return;
    const by = signer.value.trim();
    if (!by) { needName.value = true; document.querySelector<HTMLInputElement>(".signer input")?.focus(); return; }
    const sig = { role, by, date: ctx.today };
    const entries = signatureEntries(base, changeSetSig.value, vol.chapterOf, ids, sig, action, tainted);
    if (!entries.length) return;
    putChangeEntries(entries);
    notice.value = signatureNotice(base, entries, sig, action);
    ticked.value = new Set([...ticked.value].filter((id) => !ids.includes(id)));
  };
  const undo = (row: InboxRow) => {
    const entry = row.staged.entry;
    if (!entry) return;
    const next = withoutSignature(entry, role);
    putChangeEntries(next ? [next] : [], next ? [] : [entry.id]);
    notice.value = `Signature on "${row.item.name}" taken back out of your proposal.`;
  };
  const note = (row: InboxRow, text: string) => {
    const by = signer.value.trim();
    if (!by) { needName.value = true; return; }
    putFileChange(reviewNoteEntry(vol.path, changeSetSig.value, { id: row.item.id, role, by, date: ctx.today, text }, names));
    notice.value = `Request for changes on "${row.item.name}" added to your proposal as a note from the ${role}.`;
  };
  const dropNote = (row: InboxRow) => {
    const file = fileEntries(changeSetSig.value).find((f) => f.after && f.after.includes(`## ${row.item.id} `) && f.label.includes(role));
    if (!file) return;
    const next = withoutReviewNote(file, row.item.id, names);
    if (next) putFileChange(next); else discardFileChange(file.path);
  };

  const group = groups.find((g) => g.key === r.params.group) ?? null;
  const q = r.params.q ?? "";
  const linkedItem = linkedId ? base.itemById(linkedId) : undefined;
  const linkedRow = linkedItem ? byId.get(linkedItem.id) ?? null : null;
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section class="view place desk inbox signpage" data-role={role}>
      <div class="placehead" data-place="desk">
        <h1>To sign as {role}</h1>
        <p class="purpose">
          {plural(total, "item")} wait for your signature. Read each one, then approve. A signature goes into your
          proposal; nothing is sent until you send it.
        </p>
      </div>

      {mine.length > 1 && (
        <nav class="tabs rolechips" aria-label="Your roles">
          {mine.map((x) => (
            <a key={x} class={x === role ? "on" : ""} aria-current={x === role ? "page" : undefined} href={at({ params: { role: x } })}>
              {x} <b>{(awaitingByRole(base).get(x) ?? []).length.toLocaleString("en-US")}</b>
            </a>
          ))}
        </nav>
      )}

      <div class="signer">
        <label>Your name
          <input
            value={signer.value} placeholder="e.g. Dana Lee (HCPF)" autocomplete="name"
            aria-invalid={needName.value && !signer.value.trim() ? "true" : undefined}
            onInput={(e) => { signer.value = (e.target as HTMLInputElement).value; needName.value = false; saveSigner(signer.value); }}
          />
        </label>
        {needName.value && !signer.value.trim() && <span class="bad" role="alert">Type your name first: it goes on the signature.</span>}
        <label>Signing as
          <select
            value={role}
            onChange={(e) => { const next = (e.target as HTMLSelectElement).value; saveRole(next); location.hash = at({ arg: "sign", params: { role: next } }); }}
          >
            {declared.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
      </div>

      {(notice.value || stagedSigs > 0 || stagedNotes > 0) && (
        <div class="inbox-notice" role="status" aria-live="polite">
          {notice.value && <p><b>{notice.value}</b></p>}
          {(stagedSigs > 0 || stagedNotes > 0) && (
            <p>
              In your proposal for the {role}: {plural(stagedSigs, "signature")}
              {stagedNotes > 0 && <>, {plural(stagedNotes, "request")} for changes</>}.
            </p>
          )}
          <SendChange kind="signature" compact />
        </div>
      )}

      {linkedId
        ? (
          <LinkedCard
            id={linkedId} item={linkedItem} row={linkedRow} role={role} titles={titles} groups={groups} at={at}
            render={(row) => (
              <ApprovalCard row={row} ctx={ctx} role={role} onSign={sign} onUndo={undo} onNote={note} onDropNote={dropNote} />
            )}
            approvals={linkedItem ? engine.approvals(linkedItem) : []}
          />
        )
        : group || q
          ? (
            <ReadingList
              rows={rows.filter((row) => !row.signed && (!group || group.items.includes(row.item)) && (!q || textMatches(row.item, q)))}
              group={group} groups={groups} titles={titles} q={q} at={at} role={role}
              ticked={ticked.value} setTicked={(s) => { ticked.value = s; }}
              limit={limit.value} more={() => { limit.value += PAGE; }}
              today={ctx.today} sign={sign} undo={undo}
            />
          )
          : <GroupList groups={groups} titles={titles} at={at} role={role} rows={rows} />}

      <details class="howcounted">
        <summary>How this is counted</summary>
        <p>{DESK_DEFINITIONS.signOff}</p>
        <p>An item that rests on unverified text stays Draft whoever signs, until its excerpt is verified.</p>
      </details>
    </section>
  );
}

type At = (patch: { arg?: string | null; params?: Record<string, string> }) => string;

function ChooseRole({ route: r, roles, counts, at }: { route: Route; roles: string[]; counts: Map<string, unknown[]>; at: At }) {
  void r;
  return (
    <section class="view place desk signpage">
      <div class="placehead" data-place="desk">
        <h1>To sign</h1>
        <p class="purpose">Whose signature? Choose a role.</p>
      </div>
      <ul class="signgroups rolelist">
        {roles.map((x) => (
          <li key={x}>
            <a class="sgrow" href={at({ params: { role: x } })}>
              <span class="sg-name">{x}</span>
              <span class="sg-num">{(counts.get(x) ?? []).length.toLocaleString("en-US")}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The role's groups, each a link to its reading list. */
function GroupList(
  { groups, titles, at, role, rows }:
  { groups: ReturnType<typeof signOffGroups>; titles: Map<string, string>; at: At; role: string; rows: InboxRow[] },
) {
  const staged = rows.filter((row) => row.staged.entry || row.staged.note);
  if (!groups.length) return <p class="muted empty">Nothing waits for the {role}'s signature.</p>;
  return (
    <>
      {staged.length > 0 && (
        <p class="stagedline">
          You have staged something on {plural(staged.length, "item")} of this role:{" "}
          {staged.slice(0, 5).map((row, i) => (
            <span key={row.item.id}>{i > 0 && ", "}<a href={at({ arg: `sign/${row.item.id}` })}>{row.item.name}</a></span>
          ))}
          {staged.length > 5 && ` and ${staged.length - 5} more`}.
        </p>
      )}
      <SearchBox q="" at={at} role={role} />
      <ul class="signgroups" aria-label="Groups to sign">
        {groups.map((g) => (
          <li key={g.key} data-group={g.key}>
            <a class="sgrow" href={at({ params: { role, group: g.key } })}>
              <span class="sg-name">{groupTitle(g.program, g.chapter, titles)}</span>
              <span class="sg-num">{g.items.length.toLocaleString("en-US")}</span>
              <span class="sg-sub muted">
                {[
                  g.withOpenQuestion ? `${g.withOpenQuestion.toLocaleString("en-US")} with an open question` : "",
                  g.onUnverified ? `${g.onUnverified.toLocaleString("en-US")} rest on unverified text` : "",
                ].filter(Boolean).join(" · ") || "ready to read"}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

function SearchBox({ q, at, role, group }: { q: string; at: At; role: string; group?: string }) {
  return (
    <form
      class="controls signsearch" role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = ((e.currentTarget as HTMLFormElement).elements.namedItem("q") as HTMLInputElement).value.trim();
        location.hash = at({ params: { role, ...(group ? { group } : {}), ...(v ? { q: v } : {}) } });
      }}
    >
      <label>Find
        <input name="q" type="search" value={q} placeholder="words in a name or meaning" />
      </label>
      <button class="btn" type="submit">Find</button>
    </form>
  );
}

/** One group's items (or every item matching the words), to read and tick. */
function ReadingList(
  { rows, group, groups, titles, q, at, role, ticked, setTicked, limit, more, today, sign, undo }: {
    rows: InboxRow[]; group: ReturnType<typeof signOffGroups>[number] | null; groups: ReturnType<typeof signOffGroups>;
    titles: Map<string, string>; q: string; at: At; role: string;
    ticked: ReadonlySet<string>; setTicked: (s: ReadonlySet<string>) => void;
    limit: number; more: () => void; today: string;
    sign: (ids: string[], action: SignAction) => void; undo: (row: InboxRow) => void;
  },
) {
  const signable = rows.filter(canSign);
  const shown = rows.slice(0, limit);
  const pick = [...ticked].filter((id) => signable.some((row) => row.item.id === id));
  return (
    <>
      <p class="backline"><a href={at({ params: { role } })}>‹ All groups</a></p>
      <nav class="chips signchips" aria-label="Groups">
        {groups.map((g) => (
          <a key={g.key} class={`chip${g.key === group?.key ? " on" : ""}`} aria-current={g.key === group?.key ? "page" : undefined}
            href={at({ params: { role, group: g.key } })}>
            {groupTitle(g.program, g.chapter, titles)} <b>{g.items.length.toLocaleString("en-US")}</b>
          </a>
        ))}
      </nav>
      <SearchBox q={q} at={at} role={role} group={group?.key} />
      <div class="signbar" role="region" aria-label="Ticked items">
        <span><b>{pick.length}</b> of {rows.length.toLocaleString("en-US")} ticked</span>
        <button class="btn" disabled={!signable.length} onClick={() => setTicked(new Set(signable.slice(0, limit).map((row) => row.item.id)))}>
          Tick all {Math.min(limit, signable.length)} shown
        </button>
        {pick.length > 0 && <button class="btn" onClick={() => setTicked(new Set())}>Untick</button>}
        <button class="btn approve" disabled={!pick.length} onClick={() => sign(pick, "approve")}>Approve the ticked ({pick.length})</button>
        <button class="btn" disabled={!pick.length} onClick={() => sign(pick, "review")}>Mark them reviewed</button>
      </div>
      {!rows.length && <p class="muted empty">Nothing here waits for the {role}'s signature{q ? " with those words" : ""}.</p>}
      <ul class="signlist">
        {shown.map((row) => (
          <SignItem
            key={row.item.id} row={row} role={role} today={today} href={at({ arg: `sign/${row.item.id}` })}
            on={ticked.has(row.item.id)}
            toggle={(on) => { const s = new Set(ticked); if (on) s.add(row.item.id); else s.delete(row.item.id); setTicked(s); }}
            undo={() => undo(row)}
          />
        ))}
      </ul>
      {rows.length > limit && (
        <button class="btn more" onClick={more}>Show {Math.min(PAGE, rows.length - limit)} more ({(rows.length - limit).toLocaleString("en-US")} left)</button>
      )}
    </>
  );
}

function SignItem(
  { row, role, today, href, on, toggle, undo }:
  { row: InboxRow; role: string; today: string; href: string; on: boolean; toggle: (on: boolean) => void; undo: () => void },
) {
  const engine = engineSig.value!;
  const it = row.item;
  const others = row.required.filter((x) => x !== role);
  const figure = it.kind === "parameter" ? figureOn(engine, it, today) : undefined;
  const isTable = figure && typeof figure === "object" && !Array.isArray(figure);
  const id = `si-${it.id}`;
  return (
    <li class={`signitem${on ? " on" : ""}${row.staged.signed ? " staged" : ""}`} data-item={it.id}>
      <input
        type="checkbox" class="pick" id={id} checked={on} disabled={!canSign(row)}
        aria-label={`Tick ${it.name}`} onChange={(e) => toggle((e.target as HTMLInputElement).checked)}
      />
      <div class="si-body">
        <p class="si-h">
          <a href={href}>{it.name}</a>{" "}
          <span class="tag kind">{KIND_ONE[row.kind]}</span>
          {(it.open ?? []).length > 0 && <span class="tag qflag">Open question</span>}
          {row.override && <span class="flag override">Statute over rule</span>}
          {row.restsOnUnverified && <span class="flag unverified">Unverified text</span>}{" "}
          <small class="mono muted">{it.id}</small>
        </p>
        {it.meaning && <p class="si-m">{firstSentence(plainMeaning(it.meaning), 300)}</p>}
        {it.kind === "parameter" && (
          <p class="small">
            Figure today: {noVersionReason(it, today) ?? (isTable ? <a href={href}>a table of {Object.keys(figure as object).length} rows</a> : <b>{formatValue(it, figure)}</b>)}
          </p>
        )}
        <p class="small muted">
          You sign because {row.why.join("; ")}.{others.length > 0 && <> Also signs: {others.join(", ")}.</>}
        </p>
        {row.staged.signed && (
          <p class="staged-note" role="status">Your signature is in your proposal. <button class="linkish" onClick={undo}>Undo</button></p>
        )}
        {isOwnStagedChange(row) && (
          <p class="own-change muted">You staged a change to this item, so you cannot approve it: another reviewer signs it.</p>
        )}
      </div>
    </li>
  );
}

/** `desk/sign/CO-n`: the approval card, with the way back to its group and
 *  on to the next item. */
function LinkedCard(
  { id, item, row, role, titles, groups, at, render, approvals }: {
    id: string; item: ReturnType<NonNullable<typeof engineSig.value>["itemById"]>; row: InboxRow | null; role: string;
    titles: Map<string, string>; groups: ReturnType<typeof signOffGroups>; at: At;
    render: (row: InboxRow) => preact.JSX.Element; approvals: string[];
  },
) {
  if (!item) return <p class="bad">No item {id} in this volume.</p>;
  const g = groups.find((x) => x.items.some((i) => i.id === item.id));
  const idx = g ? g.items.findIndex((i) => i.id === item.id) : -1;
  const next = g && idx >= 0 ? g.items[idx + 1] : undefined;
  return (
    <section class="signcard" aria-label="The item to sign">
      <p class="backline">
        {g
          ? <a href={at({ params: { role, group: g.key } })}>‹ {groupTitle(g.program, g.chapter, titles)}</a>
          : <a href={at({ params: { role } })}>‹ All groups</a>}
      </p>
      {row
        ? render(row)
        : (
          <p class="muted">
            The {role} does not sign "{item.name}". It needs: {approvals.join(", ") || "no role"}.{" "}
            {approvals.slice(0, 4).map((x, i) => (
              <span key={x}>{i > 0 && " · "}<a href={at({ arg: `sign/${item.id}`, params: { role: x } })}>Open as the {x}</a></span>
            ))}
          </p>
        )}
      {next && (
        <p class="nextline">Next in this group: <a href={at({ arg: `sign/${next.id}` })}>{next.name}</a></p>
      )}
    </section>
  );
}

/* The approval card (the App's, kept by docs/design-unified-ui.md): one item
 * waiting on an approval role's signature, as the Desk's sign-off list
 * (src/ui/places/SignPage.tsx) opens it. It says what the item means, the
 * figure today, what changed since it was last approved, which outcomes and
 * stored households it reaches, its sources, any statute-over-rule or
 * unverified flag, and why the role signs. Approve, Mark reviewed and Request
 * changes stage a change in the tray; a name is required first, and a change
 * the reader staged themselves cannot be approved. Also here: which role the
 * list is for, and the signer's name kept in this browser. */
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import "./inbox.css";
import type { Engine } from "../../engine/engine";
import type { LoadedVolume } from "../../ledger/load";
import type { ChangeEntry } from "../../changes/types";
import type { HouseholdCase } from "../../engine/cases";
import type { SignAction } from "../approvals";
import {
  citeLabel, figureOn, canSign, isOwnStagedChange, KIND_ONE, type InboxRow,
} from "../inbox";
import {
  changedBy, changedPhrase, householdCount, pathToOutcome, restingPhrase,
} from "../counts";
import { personaRoles } from "../personas";
import { noVersionReason, Value } from "../Present";
import { plainQuestionTitle } from "../questions";
import { buildHash } from "../router";
import { engineSig, manifestSig } from "../state";
import type { ViewContext } from "./context";

export const SIGNER_KEY = "codex.signer";
/** The role the sign-off list was last read as, so it reopens there. */
export const INBOX_ROLE_KEY = "codex.inbox.role";

function readRole(): string | null {
  try { return localStorage.getItem(INBOX_ROLE_KEY); } catch { return null; }
}

export function saveRole(role: string): void {
  try { localStorage.setItem(INBOX_ROLE_KEY, role); } catch { /* blocked */ }
}

export function readSigner(): string {
  try { return localStorage.getItem(SIGNER_KEY) ?? ""; } catch { return ""; }
}

export function saveSigner(name: string): void {
  try { localStorage.setItem(SIGNER_KEY, name); } catch { /* blocked */ }
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

/** The role the sign-off list is for, the persona's own first (CDHS cash
 *  lead: the CDHS door opened on the SNAP owner): `?role=`; else, for a
 *  linked item (`desk/sign/<id>`), the persona's role that signs it, or the
 *  first that does; else the role the list was last read as, if it is the
 *  persona's; else the persona's role that must sign something staged in the
 *  tray; else the persona's first role; else none (the page then asks). */
export function inboxRole(
  ctx: ViewContext, staged: readonly ChangeEntry[] = [], linkedId: string | null = ctx.route.arg,
): string | null {
  const declared = ctx.engine.meta.approval_policy?.roles ?? [];
  const asked = ctx.route.params.role;
  if (asked && declared.includes(asked)) return asked;
  const mine = ctx.persona ? personaRoles(ctx.persona, ctx.engine.meta) : [];
  const linked = linkedId ? ctx.engine.itemById(linkedId) : undefined;
  if (linked) {
    const req = ctx.engine.approvals(linked);
    return req.find((x) => mine.includes(x)) ?? req[0] ?? mine[0] ?? null;
  }
  const last = readRole();
  if (last && declared.includes(last) && (mine.length === 0 ? false : mine.includes(last))) return last;
  for (const e of staged) {
    const it = e.after ?? e.before;
    if (!it) continue;
    const hit = ctx.engine.approvals(it).find((x) => mine.includes(x));
    if (hit) return hit;
  }
  return mine[0] ?? null;
}

/** Each chapter's title, as the volume's manifest gives it. */
export function chapterTitles(vol: LoadedVolume): Map<string, string> {
  const entry = manifestSig.value?.volumes.find((v) => v.id === vol.volumeId);
  return new Map((entry?.chapters ?? []).map((c) => [c.dir, c.title ?? c.dir]));
}

/* --------------------------------------------------------------- the card */

export interface ApprovalCardProps {
  row: InboxRow;
  ctx: ViewContext;
  role: string;
  onSign: (ids: string[], action: SignAction) => void;
  onUndo: (row: InboxRow) => void;
  onNote: (row: InboxRow, text: string) => void;
  onDropNote: (row: InboxRow) => void;
}

function SourceLinks({ ctx, ids }: { ctx: ViewContext; ids: string[] }) {
  const { vol, route: r } = ctx;
  const more = useSignal(false);
  const shown = more.value ? ids : ids.slice(0, 3);
  return (
    <>
      {shown.map((id, i) => {
        const s = vol.sources.find((x) => x.id === id);
        const href = s?.document
          ? buildHash({ ...r, view: "document", arg: s.document, params: { excerpt: id } })
          : buildHash({ ...r, view: "source", arg: id, params: { excerpt: id } });
        return (
          <span key={id}>
            {i > 0 && " · "}
            <a href={href}>{citeLabel(s?.citation || s?.title || id)}</a>{" "}
            <small class="mono">{id}</small>
            {s?.verification === "unverified" && <span class="flag unverified">unverified</span>}
          </span>
        );
      })}
      {ids.length > 3 && (
        <button class="linkish" onClick={() => { more.value = !more.value; }}>
          {more.value ? " show fewer" : ` +${ids.length - 3} more`}
        </button>
      )}
    </>
  );
}

function sentence(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const MEANING_CUT = 320;

/** The plain meaning, cut at a sentence near 320 characters with a "Read
 *  all" toggle: some supplied facts list every option in their meaning. */
function Meaning({ text }: { text: string }) {
  const all = useSignal(false);
  if (text.length <= MEANING_CUT + 80) return <p class="meaning">{text}</p>;
  const stop = text.lastIndexOf(". ", MEANING_CUT);
  const short = text.slice(0, stop > 120 ? stop + 1 : MEANING_CUT) + " …";
  return (
    <p class="meaning">
      {all.value ? text : short}{" "}
      <button class="linkish" aria-expanded={all.value} onClick={() => { all.value = !all.value; }}>
        {all.value ? "Show less" : "Read all"}
      </button>
    </p>
  );
}

/** What a staged edit does to the stored households, worked out after the
 *  page paints: the same comparison the role page and the question pages
 *  make (counts.ts `changedBy`). */
function StagedEffect({ engine, cases, entry }: { engine: Engine; cases: readonly HouseholdCase[]; entry: ChangeEntry }) {
  const out = useSignal<ReturnType<typeof changedBy> | null>(null);
  useEffect(() => {
    out.value = null;
    const t = setTimeout(() => { out.value = changedBy(engine, cases, [entry]); }, 40);
    return () => clearTimeout(t);
  }, [engine, cases, entry]);
  if (!out.value) return <span class="muted">Working out what your change does to the stored households…</span>;
  const ch = out.value;
  return (
    <span class="changed-count">
      With your staged change: <b>{changedPhrase(ch.length, householdCount(ch))}</b>
      {ch.length > 0 && <>: {[...new Set(ch.map((c) => c.caseId))].slice(0, 6).join(", ")}</>}.
    </span>
  );
}

/** How an item reaches one outcome, as the chain of rule names. */
function reachText(engine: Engine, outcome: string, identifier: string): string {
  const path = pathToOutcome(engine, outcome, identifier);
  return path.length > 1 ? path.slice(1, -1).reverse().map((id) => engine.item(id)?.name ?? id).join(" → ") : "";
}

/** One item's approval card. */
export function ApprovalCard({ row, ctx, role, onSign, onUndo, onNote, onDropNote }: ApprovalCardProps) {
  const { engine, vol, route: r, today } = ctx;
  const noting = useSignal(false);
  const noteText = useSignal("");
  const it = row.item;
  const figure = figureOn(engine, it, today);
  const others = row.required.filter((x) => x !== role);
  const signedOthers = others.filter((x) => !row.missing.includes(x)).length;
  const sources = [...new Set([...(it.sources ?? []), ...(it.versions ?? []).map((v) => v.source ?? "").filter(Boolean)])];
  const itemHref = buildHash({ ...r, view: "item", arg: it.id, params: {} });
  const outcomeNames = row.outcomes.map((o) => ({ o, item: engine.item(o) }));
  const cases = row.households.map((id) => vol.cases.find((c) => c.id === id)).filter(Boolean);
  const labelId = `inbox-${it.id}`;
  const showWhy = useSignal(false);
  return (
    <article class={`inbox-row${row.staged.signed ? " staged" : ""}`} data-item={it.id} aria-labelledby={labelId}>
      <div class="rowhead">
        <h2 id={labelId}><a href={itemHref}>{it.name}</a></h2>
        <span class="tag kind">{KIND_ONE[row.kind]}</span>
        <span class={`tag status-${row.status.toLowerCase()}`}>{row.status}</span>
        {row.override && <span class="flag override">Statute over rule</span>}
        {row.restsOnUnverified && <span class="flag unverified">Unverified text</span>}
        <small class="mono muted">{it.id}</small>
      </div>
      <div class="rowbody">
        {it.meaning && <Meaning text={it.meaning} />}
        <dl class="facts">
          {it.kind === "parameter" && (
            <>
              <dt>Figure today</dt>
              <dd class="figure">
                {noVersionReason(it, today) ?? <Value item={it} value={figure} />}
              </dd>
            </>
          )}
          <dt>What changed</dt>
          <dd class={`change change-${row.change.kind}`}>
            {row.change.kind === "new" && <>New, never approved.</>}
            {row.change.kind === "approved" && <>Approved, and unchanged since.</>}
            {(row.change.kind === "staged" || row.change.kind === "proposed") && (
              <>
                <span class="muted">{row.change.kind === "staged" ? "Staged in this browser, against the version in force:" : "Proposed in this pull request, against its base:"}</span>
                <ul class="plaindiff">
                  {row.change.lines.map((l, i) => (
                    <li key={i}>
                      <b>{l.what}</b>
                      {l.before !== undefined && <>: <del>{l.before}</del></>}
                      {l.after !== undefined && <>{l.before !== undefined ? " → " : ": "}<ins>{l.after}</ins></>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </dd>
          {row.override && (<><dt>Statute over rule</dt><dd class="override-note">{row.override}</dd></>)}
          {row.restsOnUnverified && (
            <>
              <dt>Unverified</dt>
              <dd class="unverified-note">
                {row.unverifiedCited.length
                  ? <>Cites {row.unverifiedCited.join(", ")}, which is not a quotation of the fetched text.</>
                  : <>Rests on a figure or rule that cites unverified text.</>}
                {" "}It stays Draft whoever signs, until the excerpt is replaced by a verified quotation.
              </dd>
            </>
          )}
          <dt>Affects</dt>
          <dd class="affects">
            {outcomeNames.length === 0
              ? <span class="muted">No program outcome reads it, except through document-verification flags.</span>
              : (
                <span>
                  {plural(outcomeNames.length, "program outcome")} read it through the rules:{" "}
                  {outcomeNames.slice(0, 4).map(({ o, item }, i) => (
                    <span key={o}>{i > 0 && ", "}<a title={reachText(engine, o, it.identifier) ? `Through: ${reachText(engine, o, it.identifier)}` : undefined} href={buildHash({ ...r, view: "item", arg: item?.id ?? o, params: {} })}>{item?.name ?? o}</a></span>
                  ))}
                  {outcomeNames.length > 4 && <span class="muted"> and {outcomeNames.length - 4} more</span>}{" "}
                  <button type="button" class="linkish whyreach" aria-expanded={showWhy.value} onClick={() => { showWhy.value = !showWhy.value; }}>
                    {showWhy.value ? "Hide how" : "How?"}
                  </button>
                  {showWhy.value && (
                    <ul class="reach">
                      {outcomeNames.slice(0, 8).map(({ o, item }) => {
                        const via = reachText(engine, o, it.identifier);
                        return <li key={o}><b>{item?.name ?? o}</b>{via ? <> reads it through: {via}</> : <> reads it directly</>}.</li>;
                      })}
                    </ul>
                  )}
                </span>
              )}
            <br />
            {!row.restingKnown
              ? <span class="muted">Working out which stored households rest on it…</span>
              : cases.length === 0
                ? <span class="muted">No stored household result rests on it.</span>
                : (
                  <span>
                    {restingPhrase(row.resting.length, cases.length)}:{" "}
                    {cases.slice(0, 6).map((c, i) => (
                      <span key={c!.id}>{i > 0 && ", "}<a title={c!.title} href={buildHash({ ...r, view: "households", arg: c!.id, params: {} })}>{c!.id}</a></span>
                    ))}
                    {cases.length > 6 && <span class="muted"> and {cases.length - 6} more</span>}
                  </span>
                )}
            {row.change.kind === "staged" && row.staged.entry && (
              <><br /><StagedEffect engine={engineSig.value ?? engine} cases={vol.cases} entry={row.staged.entry} /></>
            )}
          </dd>
          <dt>Sources</dt>
          <dd class="sources">{sources.length ? <SourceLinks ctx={ctx} ids={sources} /> : <span class="muted">No source cited.</span>}</dd>
          {(it.open ?? []).length > 0 && (
            <>
              <dt>Open questions</dt>
              <dd>
                {(it.open ?? []).map((q, i) => {
                  const oq = vol.openQuestions.find((x) => x.id === q);
                  return (
                    <span key={q}>{i > 0 && " · "}
                      <a href={buildHash({ ...r, view: "questions", arg: q, params: {} })}>{oq ? plainQuestionTitle(oq.title) : q}</a>{" "}
                      <small class="mono">{q}</small>
                    </span>
                  );
                })}
              </dd>
            </>
          )}
          <dt>Why you sign</dt>
          <dd class="why">
            {sentence(row.why.join("; "))}.
            {others.length > 0 && <span class="muted"> Also signs: {others.join(", ")} ({signedOthers} of {others.length} signed).</span>}
          </dd>
        </dl>
        {row.staged.signed && (
          <p class="staged-note" role="status">
            Your signature is staged in this browser.{" "}
            {row.staged.status === "Approved" ? "Once merged the item is Approved: every role has signed."
              : row.staged.status === "Draft" ? "The item stays Draft: it rests on unverified text."
                : row.missing.filter((x) => x !== role).length
                  ? `Once merged it is Reviewed until ${row.missing.filter((x) => x !== role).join(", ")} also approve.`
                  : "Once merged it is Reviewed."}{" "}
            <button class="linkish" onClick={() => onUndo(row)}>Undo</button>
          </p>
        )}
        {row.staged.note && (
          <div class="staged-note request">
            <b>Changes requested (staged):</b> {row.staged.note.text}{" "}
            <button class="linkish" onClick={() => onDropNote(row)}>Withdraw</button>
          </div>
        )}
        {isOwnStagedChange(row) && !row.signed && (
          <p class="own-change muted" role="note">
            You staged this change in this browser, so you cannot approve it: another reviewer for this role signs it
            once it is proposed.
          </p>
        )}
        {canSign(row) && (
          <div class="rowactions">
            <button class="btn approve" onClick={() => onSign([it.id], "approve")}>Approve</button>
            <button class="btn review" onClick={() => onSign([it.id], "review")}>Mark reviewed</button>
            <button class="btn request" aria-expanded={noting.value} onClick={() => { noting.value = !noting.value; }}>
              Request changes
            </button>
          </div>
        )}
        {noting.value && (
          <form
            class="noteform"
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteText.value.trim()) return;
              onNote(row, noteText.value);
              noteText.value = "";
              noting.value = false;
            }}
          >
            <label>What should change before you sign?
              <textarea
                rows={3} value={noteText.value}
                onInput={(e) => { noteText.value = (e.target as HTMLTextAreaElement).value; }}
              />
            </label>
            <button class="btn" type="submit" disabled={!noteText.value.trim()}>Add the note</button>
            <button class="btn" type="button" onClick={() => { noting.value = false; }}>Cancel</button>
          </form>
        )}
      </div>
    </article>
  );
}


/* The approvals inbox (phase 13; HCPF analyst's wish 1, Legal's view e):
 * every item waiting on one approval role's signature, grouped by program and
 * chapter and then by kind (figures, rules, inputs). Each row says what the
 * item means, what changed since it was last approved, which outcomes and
 * stored households it reaches, its sources, and any statute-over-rule or
 * unverified flag. Approve, Mark reviewed and Request changes stage a change
 * in the tray; Propose there turns it into a pull request. Route:
 * `#/<volume>/inbox?role=<approval role>` plus the filter parameters
 * (src/ui/inbox.ts `filterToParams`). */
import { useSignal } from "@preact/signals";
import { useMemo } from "preact/hooks";
import "./inbox.css";
import type { Engine } from "../../engine/engine";
import type { LoadedVolume } from "../../ledger/load";
import { entryFiles, proposalBody } from "../../changes/serialize";
import { fileEntries } from "../../changes/types";
import { validateChangeSet } from "../../changes/validate";
import {
  roleCounts, roleRule, type SignAction,
} from "../approvals";
import {
  citeLabel, countBy, figureOn, filterFromParams, filterToParams, FILTER_TAGS, groupRows, inboxRows,
  KIND_GROUP_LABEL, KIND_ONE, matches, programOrderFor, proposeHint, restingOnUnverified, reviewNoteEntry,
  signatureEntries, withoutReviewNote, withoutSignature, type InboxFilter, type InboxGroup,
  type InboxRow,
} from "../inbox";
import { personaRoles } from "../personas";
import { noVersionReason, Value } from "../Present";
import { volumePrograms } from "../programs";
import { plainQuestionTitle } from "../questions";
import { unverifiedIds } from "../provenance";
import { buildHash, isPrRef, type Route } from "../router";
import { downloadText } from "../Settings";
import {
  changeSetSig, credentials, discardFileChange, engineSig, manifestSig, prBaseVolumeSig,
  putChangeEntries, putFileChange, reportSig, settingsOpenSig, trayOpenSig,
} from "../state";
import { viewContext, type ViewContext } from "./context";
import { NoLedger, ViewHeader } from "./ViewStub";

export const SIGNER_KEY = "codex.signer";

function readSigner(): string {
  try { return localStorage.getItem(SIGNER_KEY) ?? ""; } catch { return ""; }
}

function saveSigner(name: string): void {
  try { localStorage.setItem(SIGNER_KEY, name); } catch { /* blocked */ }
}

const PROGRAM_LABEL: Record<string, string> = {
  All: "All programs", ColoradoWorks: "Colorado Works", AdultFinancial: "Adult Financial",
  SunBucks: "SUN Bucks", CCCAP: "Child care (CCCAP)", LEAP: "Energy assistance (LEAP)",
};

export function programName(id: string): string {
  return PROGRAM_LABEL[id] ?? id;
}

const ROWS_PER_PAGE = 25;
/** A bulk action larger than this stages after the page says it is working. */
const BULK_DEFER = 20;

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

/** The role this inbox lists: `?role=`, else the visitor's persona's first
 *  role, else none (the page then asks). */
export function inboxRole(ctx: ViewContext): string | null {
  const declared = ctx.engine.meta.approval_policy?.roles ?? [];
  const asked = ctx.route.params.role;
  if (asked && declared.includes(asked)) return asked;
  if (ctx.persona) return personaRoles(ctx.persona, ctx.engine.meta)[0] ?? null;
  return null;
}

function chapterTitles(vol: LoadedVolume): Map<string, string> {
  const entry = manifestSig.value?.volumes.find((v) => v.id === vol.volumeId);
  return new Map((entry?.chapters ?? []).map((c) => [c.dir, c.title ?? c.dir]));
}

/* ------------------------------------------------------------- header */

function RoleCounts(
  { engine, role, mine, route: r }: { engine: Engine; role: string | null; mine: string[]; route: Route },
) {
  const all = engine.meta.approval_policy?.roles ?? [];
  const counts = roleCounts(engine, all);
  const shown = counts.filter((c) => mine.includes(c.role) || c.role === role);
  const link = (rl: string) => buildHash({ ...r, params: { role: rl } });
  return (
    <div class="inbox-counts">
      {shown.length > 0 && (
        <ul class="rolecounts">
          {[...shown.filter((c) => c.role === role), ...shown.filter((c) => c.role !== role)].map((c) => (
            c.role === role
              ? (
                <li key={c.role} class="on">
                  <a href={link(c.role)} aria-current="page">
                    <b>{c.role}</b>: {plural(c.awaiting, "item")} awaiting, {c.approved.toLocaleString("en-US")} approved
                  </a>
                  {c.signed > 0 && <span class="muted"> ({c.signed.toLocaleString("en-US")} signed by this role)</span>}
                </li>
              )
              : (
                <li key={c.role} class="other">
                  <a href={link(c.role)} title={`${c.role}: ${c.awaiting} items awaiting, ${c.approved} approved`}>
                    {c.role}: {c.awaiting.toLocaleString("en-US")} awaiting, {c.approved.toLocaleString("en-US")} approved
                  </a>
                </li>
              )
          ))}
        </ul>
      )}
      <details class="allroles">
        <summary>Every role's count, and what each signs</summary>
        <div class="tablewrap">
          <table class="grid rolecount-table">
            <thead>
              <tr><th>Role</th><th>Must sign</th><th>Awaiting</th><th>Signed</th><th>Approved</th><th>What the approval policy asks this role to sign</th></tr>
            </thead>
            <tbody>
              {counts.map((c) => (
                <tr key={c.role} data-role={c.role}>
                  <td><a href={link(c.role)}>{c.role}</a></td>
                  <td class="num">{c.required.toLocaleString("en-US")}</td>
                  <td class="num">{c.awaiting.toLocaleString("en-US")}</td>
                  <td class="num">{c.signed.toLocaleString("en-US")}</td>
                  <td class="num">{c.approved.toLocaleString("en-US")}</td>
                  <td>{roleRule(engine.meta, c.role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** The one definition of "needs <role>" and how the role's items break down
 *  by the policy's reasons. Legal's L5: every count on the page is this. */
function Definition({ engine, role, rows }: { engine: Engine; role: string; rows: InboxRow[] }) {
  const reasons = [...countBy(rows, (r) => r.why)].sort((a, b) => b[1] - a[1]);
  return (
    <div class="inbox-definition" data-role={role}>
      <p>
        <b>Needs the {role}:</b> {roleRule(engine.meta, role).replace(`${role} signs `, "")}{" "}
        That is {plural(rows.length, "item")} in all.
      </p>
      {reasons.length > 1 && (
        <p class="muted reasons">
          Why: {reasons.map(([why, n], i) => <span key={why}>{i > 0 && " · "}{why} ({n.toLocaleString("en-US")})</span>)}.
          {" "}An item can have more than one reason.
        </p>
      )}
      <p class="muted small">
        This is the approval policy in the volume's settings (volume.yaml), the same rule the item
        pages and the role pages use, so the counts agree everywhere.
        {role === "Legal" && (
          <> The Table's "Legal sign-off is required" warning is an older editor check (tagged legal,
            or carries an open question) and is not this definition.</>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- filters */

function Filters(
  { rows, filter, programs, setFilter, shownCount, tagLabel }: {
    rows: InboxRow[]; filter: InboxFilter; programs: string[];
    setFilter: (f: InboxFilter) => void; shownCount: number; tagLabel: (t: string) => string;
  },
) {
  const byShow = { awaiting: rows.filter((r) => !r.signed).length, signed: rows.filter((r) => r.signed).length };
  const byStatus = countBy(rows, (r) => r.status);
  const byProgram = countBy(rows, (r) => r.program);
  const byTag = countBy(rows, (r) => r.item.tags ?? []);
  const blocks = rows.filter((r) => r.outcomes.length).length;
  const unverified = rows.filter((r) => r.unverifiedCited.length).length;
  const set = (patch: Partial<InboxFilter>) => setFilter({ ...filter, ...patch });
  return (
    <div class="controls inbox-filters" role="group" aria-label="Filters">
      <label>Show
        <select value={filter.show} onChange={(e) => set({ show: (e.target as HTMLSelectElement).value as InboxFilter["show"] })}>
          <option value="awaiting">Waiting on this role ({byShow.awaiting})</option>
          <option value="signed">Signed by this role ({byShow.signed})</option>
          <option value="all">Everything this role signs ({rows.length})</option>
        </select>
      </label>
      <label>Status
        <select value={filter.status} onChange={(e) => set({ status: (e.target as HTMLSelectElement).value as InboxFilter["status"] })}>
          <option value="">Any</option>
          {(["Draft", "Reviewed", "Approved"] as const).map((s) => (
            <option key={s} value={s}>{s} ({byStatus.get(s) ?? 0})</option>
          ))}
        </select>
      </label>
      <label>Program
        <select value={filter.program} onChange={(e) => set({ program: (e.target as HTMLSelectElement).value })}>
          <option value="">Any</option>
          {programs.filter((p) => byProgram.has(p)).map((p) => (
            <option key={p} value={p}>{programName(p)} ({byProgram.get(p)})</option>
          ))}
        </select>
      </label>
      <label>Tag
        <select value={filter.tag} onChange={(e) => set({ tag: (e.target as HTMLSelectElement).value })}>
          <option value="">Any</option>
          {FILTER_TAGS.map((t) => <option key={t} value={t}>{tagLabel(t)} ({byTag.get(t) ?? 0})</option>)}
        </select>
      </label>
      <label class="check" title="A program outcome reads this item, so the outcome cannot be fully signed until it is">
        <input type="checkbox" checked={filter.blocksOutcome} onChange={(e) => set({ blocksOutcome: (e.target as HTMLInputElement).checked })} />
        Blocks an outcome ({blocks})
      </label>
      <label class="check" title="Cites an excerpt marked unverified: not a quotation of the fetched text">
        <input type="checkbox" checked={filter.unverified} onChange={(e) => set({ unverified: (e.target as HTMLInputElement).checked })} />
        Cites unverified text ({unverified})
      </label>
      <span class="muted shown-count" aria-live="polite">Showing {plural(shownCount, "item")}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- a row */

interface RowProps {
  row: InboxRow;
  ctx: ViewContext;
  role: string;
  selected: boolean;
  onSelect: (on: boolean) => void;
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

function Row({ row, ctx, role, selected, onSelect, onSign, onUndo, onNote, onDropNote }: RowProps) {
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
  return (
    <article class={`inbox-row${row.staged.signed ? " staged" : ""}`} data-item={it.id} aria-labelledby={labelId}>
      <div class="rowhead">
        <input
          type="checkbox" class="pick" checked={selected} disabled={row.signed || row.staged.signed}
          aria-label={`Select ${it.name}`} onChange={(e) => onSelect((e.target as HTMLInputElement).checked)}
        />
        <h4 id={labelId}><a href={itemHref}>{it.name}</a></h4>
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
              ? <span class="muted">No program outcome reads it.</span>
              : (
                <span>
                  {plural(outcomeNames.length, "outcome")}:{" "}
                  {outcomeNames.slice(0, 4).map(({ o, item }, i) => (
                    <span key={o}>{i > 0 && ", "}<a href={buildHash({ ...r, view: "item", arg: item?.id ?? o, params: {} })}>{item?.name ?? o}</a></span>
                  ))}
                  {outcomeNames.length > 4 && <span class="muted"> and {outcomeNames.length - 4} more</span>}
                </span>
              )}
            <br />
            {cases.length === 0
              ? <span class="muted">No stored test household checks a result that reads it.</span>
              : (
                <span>
                  {plural(cases.length, "test household")}:{" "}
                  {cases.slice(0, 6).map((c, i) => (
                    <span key={c!.id}>{i > 0 && ", "}<a title={c!.title} href={buildHash({ ...r, view: "walkthrough", arg: c!.id, params: {} })}>{c!.id}</a></span>
                  ))}
                  {cases.length > 6 && <span class="muted"> and {cases.length - 6} more</span>}
                </span>
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
            Your signature is staged in this browser (status would be {row.staged.status}).{" "}
            <button class="linkish" onClick={() => onUndo(row)}>Undo</button>
          </p>
        )}
        {row.staged.note && (
          <div class="staged-note request">
            <b>Changes requested (staged):</b> {row.staged.note.text}{" "}
            <button class="linkish" onClick={() => onDropNote(row)}>Withdraw</button>
          </div>
        )}
        {!row.signed && !row.staged.signed && (
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

/* --------------------------------------------------------------- a group */

function Group(
  { group, title, open, onToggle, limit, onMore, renderRow, selected, onSelectAll, onSignGroup }: {
    group: InboxGroup; title: string; open: boolean; onToggle: (open: boolean) => void;
    limit: number; onMore: () => void; renderRow: (row: InboxRow) => preact.JSX.Element;
    selected: ReadonlySet<string>; onSelectAll: (on: boolean) => void;
    onSignGroup: (action: SignAction) => void;
  },
) {
  const signable = group.rows.filter((r) => !r.signed && !r.staged.signed);
  const allOn = signable.length > 0 && signable.every((r) => selected.has(r.item.id));
  let left = limit;
  return (
    <details class="inbox-group" open={open} data-group={group.key} onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>
        <span class="gtitle">{title}</span>{" "}
        <span class="muted gcount">
          {plural(group.rows.length, "item")}: {group.kinds.map((k) => `${k.rows.length} ${KIND_GROUP_LABEL[k.kind].toLowerCase().split(" ")[0]}`).join(", ")}
        </span>
      </summary>
      {open && (
        <>
          {signable.length > 0 && (
            <div class="group-actions">
              <label class="check">
                <input type="checkbox" checked={allOn} onChange={(e) => onSelectAll((e.target as HTMLInputElement).checked)} />
                Select all {signable.length} unsigned in this chapter
              </label>
              <button class="btn sign-chapter" onClick={() => onSignGroup("approve")}>
                Approve the chapter ({signable.length})
              </button>
              <button class="btn" onClick={() => onSignGroup("review")}>Mark the chapter reviewed</button>
            </div>
          )}
          {group.kinds.map((k) => {
            if (left <= 0) return null;
            const rows = k.rows.slice(0, left);
            left -= rows.length;
            return (
              <section key={k.kind} class={`kindblock kind-${k.kind}`}>
                <h4 class="kindhead">{KIND_GROUP_LABEL[k.kind]} ({k.rows.length})</h4>
                {rows.map(renderRow)}
              </section>
            );
          })}
          {group.rows.length > limit && (
            <button class="btn more" onClick={onMore}>
              Show {Math.min(ROWS_PER_PAGE, group.rows.length - limit)} more of {group.rows.length - limit} left
            </button>
          )}
        </>
      )}
    </details>
  );
}

/* ------------------------------------------------------------- the view */

interface Notice { text: string; count: number }

function RolePicker({ ctx }: { ctx: ViewContext }) {
  const roles = ctx.engine.meta.approval_policy?.roles ?? [];
  const counts = roleCounts(ctx.engine, roles);
  return (
    <div class="inbox-pick">
      <p>Whose sign-off should this list? Choose a role (or a role door on the start page, which remembers it).</p>
      <ul class="rolecounts">
        {counts.map((c) => (
          <li key={c.role}>
            <a href={buildHash({ ...ctx.route, params: { role: c.role } })}>
              <b>{c.role}</b>: {plural(c.awaiting, "item")} awaiting, {c.approved.toLocaleString("en-US")} approved
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InboxView() {
  const ctx = viewContext();
  const signer = useSignal(readSigner());
  const selected = useSignal<ReadonlySet<string>>(new Set());
  const openGroups = useSignal<ReadonlySet<string> | null>(null);
  const limits = useSignal<ReadonlyMap<string, number>>(new Map());
  const notice = useSignal<Notice | null>(null);
  const needName = useSignal(false);

  // The ledger as loaded (not the tray's drafts): the queue is what is in
  // force, and what this browser has staged is shown on each row.
  const base = engineSig.value ?? ctx?.engine ?? null;
  const vol = ctx?.vol ?? null;
  const role = ctx ? inboxRole(ctx) : null;
  const cs = changeSetSig.value;
  const proposedBase = ctx && isPrRef(ctx.route.ref) ? prBaseVolumeSig.value?.items ?? null : null;

  const rows = useMemo(
    () => (base && vol && role
      ? inboxRows({
        engine: base, role, sources: vol.sources, cases: vol.cases, chapterOf: vol.chapterOf,
        changeSet: cs, proposedBase,
      })
      : []),
    [base, vol, role, cs, proposedBase],
  );
  const tainted = useMemo(
    () => (base && vol ? restingOnUnverified(base, unverifiedIds(vol.sources)) : new Set<string>()),
    [base, vol],
  );

  if (!ctx || !base || !vol) return <NoLedger />;
  const { route: r, engine } = ctx;
  const mine = ctx.persona ? personaRoles(ctx.persona, engine.meta) : [];
  const filter = filterFromParams(r.params);
  const setFilter = (f: InboxFilter) => {
    location.hash = buildHash({ ...r, params: { ...(role ? { role } : {}), ...filterToParams(f) } });
  };
  const tagLabel = (t: string) => {
    for (const d of engine.meta.tags ?? []) if (typeof d !== "string" && d.id === t) return d.label ?? t;
    return t.replace(/_/g, " ");
  };

  if (!role) {
    return (
      <section class="view workflow inbox">
        <ViewHeader view="inbox" />
        <RolePicker ctx={ctx} />
      </section>
    );
  }

  const shown = rows.filter((row) => matches(row, filter));
  const titles = chapterTitles(vol);
  const chapterOrder = [...titles.keys()];
  const groups = groupRows(shown, programOrderFor(engine.meta, role, volumePrograms(base)), chapterOrder);
  const open = openGroups.value ?? new Set(groups.slice(0, 1).map((g) => g.key));
  const hasToken = Boolean(credentials.get("github"));
  const stagedSigs = rows.filter((row) => row.staged.signed).length;
  const stagedNotes = rows.filter((row) => row.staged.note).length;
  const names = (id: string) => base.itemById(id)?.name ?? "";

  const sign = (ids: string[], action: SignAction) => {
    const by = signer.value.trim();
    if (!by) { needName.value = true; document.querySelector<HTMLInputElement>(".signer input")?.focus(); return; }
    const entries = signatureEntries(base, changeSetSig.value, vol.chapterOf, ids,
      { role, by, date: ctx.today }, action, tainted);
    if (!entries.length) return;
    const statuses = new Map<string, number>();
    for (const e of entries) {
      const s = e.after?.status ?? "Draft";
      statuses.set(s, (statuses.get(s) ?? 0) + 1);
    }
    const sum = statuses.size === 1
      ? [...statuses.keys()][0]
      : [...statuses].map(([s, n]) => `${s} on ${n}`).join(", ");
    const done = () => {
      putChangeEntries(entries);
      notice.value = {
        count: entries.length,
        text: `${action === "approve" ? "Approval" : "Review"} by the ${role} (${by}, ${ctx.today}) staged on ${plural(entries.length, "item")}; status would be ${sum}.`,
      };
      selected.value = new Set([...selected.value].filter((id) => !ids.includes(id)));
    };
    if (entries.length <= BULK_DEFER) { done(); return; }
    // Checking a chapter's worth of signatures takes a few seconds: say so
    // first, so the page is not silently frozen.
    notice.value = { count: 0, text: `Staging ${plural(entries.length, "signature")} and checking them…` };
    setTimeout(done, 30);
  };
  const undo = (row: InboxRow) => {
    const entry = row.staged.entry;
    if (!entry) return;
    const next = withoutSignature(entry, role);
    putChangeEntries(next ? [next] : [], next ? [] : [entry.id]);
    notice.value = { count: 0, text: `Signature on "${row.item.name}" taken back out of the tray.` };
  };
  const note = (row: InboxRow, text: string) => {
    const by = signer.value.trim();
    if (!by) { needName.value = true; return; }
    putFileChange(reviewNoteEntry(vol.path, changeSetSig.value,
      { id: row.item.id, role, by, date: ctx.today, text }, names));
    notice.value = { count: 1, text: `Request for changes on "${row.item.name}" staged as a note from the ${role}.` };
  };
  const dropNote = (row: InboxRow) => {
    const file = fileEntries(changeSetSig.value).find((f) => f.after && f.after.includes(`## ${row.item.id} `) && f.label.includes(role));
    if (!file) return;
    const next = withoutReviewNote(file, row.item.id, names);
    if (next) putFileChange(next); else discardFileChange(file.path);
  };
  const download = () => {
    const current = changeSetSig.value;
    const report = reportSig.value ?? validateChangeSet(base, current);
    const files = entryFiles(current, vol.path);
    const text = [
      proposalBody(base, current, report),
      "## Files to write",
      ...files.map((f) => `\n### ${f.path}\n\n\`\`\`\n${f.content ?? "(delete this file)"}\n\`\`\``),
    ].join("\n");
    downloadText(`codex-${vol.volumeId}-signatures-${ctx.today}.md`, text);
  };

  const selIds = [...selected.value];
  const renderRow = (row: InboxRow) => (
    <Row
      key={row.item.id} row={row} ctx={ctx} role={role}
      selected={selected.value.has(row.item.id)}
      onSelect={(on) => {
        const s = new Set(selected.value);
        if (on) s.add(row.item.id); else s.delete(row.item.id);
        selected.value = s;
      }}
      onSign={sign} onUndo={undo} onNote={note} onDropNote={dropNote}
    />
  );

  return (
    <section class="view workflow inbox" data-role={role}>
      <ViewHeader view="inbox">
        <RoleCounts engine={base} role={role} mine={mine} route={r} />
      </ViewHeader>

      <div class="signer">
        <span>Signing as <b>{role}</b>.</span>
        <label>Your name
          <input
            value={signer.value} placeholder="e.g. Dana Lee (HCPF)" autocomplete="name"
            aria-invalid={needName.value && !signer.value.trim() ? "true" : undefined}
            onInput={(e) => { signer.value = (e.target as HTMLInputElement).value; needName.value = false; saveSigner(signer.value); }}
          />
        </label>
        {needName.value && !signer.value.trim() && <span class="bad">Type your name first: it goes on the signature.</span>}
        <label>Role
          <select
            value={role}
            onChange={(e) => { location.hash = buildHash({ ...r, params: { role: (e.target as HTMLSelectElement).value } }); }}
          >
            {(engine.meta.approval_policy?.roles ?? []).map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
      </div>

      <Definition engine={base} role={role} rows={rows} />

      {(notice.value || stagedSigs > 0 || stagedNotes > 0) && (
        <div class={`inbox-notice${hasToken ? "" : " notoken"}`} role="status" aria-live="polite">
          {notice.value && <p><b>{notice.value.text}</b></p>}
          {(stagedSigs > 0 || stagedNotes > 0) && (
            <p>
              In the tray for the {role}: {plural(stagedSigs, "signature")}
              {stagedNotes > 0 && <>, {plural(stagedNotes, "request")} for changes</>}.
            </p>
          )}
          <p class="howpr">{proposeHint(hasToken)}</p>
          <p class="noticeactions">
            <button class="btn" onClick={() => { trayOpenSig.value = true; }}>Open the change tray</button>
            {!hasToken && <button class="btn" onClick={download}>Download the staged change</button>}
            {!hasToken && <button class="btn" onClick={() => { settingsOpenSig.value = true; }}>Add a GitHub token</button>}
          </p>
        </div>
      )}

      <Filters
        rows={rows} filter={filter} programs={volumePrograms(base)} setFilter={setFilter}
        shownCount={shown.length} tagLabel={tagLabel}
      />

      {groups.length === 0 && (
        <p class="muted empty">
          {rows.length === 0 ? `The approval policy asks the ${role} to sign nothing in this volume.` : "Nothing matches these filters."}
        </p>
      )}

      <div class="inbox-groups">
        {groups.map((g) => (
          <Group
            key={g.key} group={g}
            title={`${programName(g.program)} · ${titles.get(g.chapter) ?? g.chapter}`}
            open={open.has(g.key)}
            onToggle={(on) => {
              const s = new Set(open);
              if (on) s.add(g.key); else s.delete(g.key);
              if (on !== open.has(g.key)) openGroups.value = s;
            }}
            limit={limits.value.get(g.key) ?? ROWS_PER_PAGE}
            onMore={() => {
              const m = new Map(limits.value);
              m.set(g.key, (m.get(g.key) ?? ROWS_PER_PAGE) + ROWS_PER_PAGE);
              limits.value = m;
            }}
            renderRow={renderRow}
            selected={selected.value}
            onSelectAll={(on) => {
              const s = new Set(selected.value);
              for (const row of g.rows) {
                if (row.signed || row.staged.signed) continue;
                if (on) s.add(row.item.id); else s.delete(row.item.id);
              }
              selected.value = s;
            }}
            onSignGroup={(action) => {
              const ids = g.rows.filter((row) => !row.signed && !row.staged.signed).map((row) => row.item.id);
              const what = action === "approve" ? "Approve" : "Mark reviewed";
              if (typeof confirm === "function" && !confirm(`${what}: sign ${ids.length} items in ${programName(g.program)} · ${titles.get(g.chapter) ?? g.chapter} as the ${role}?`)) return;
              sign(ids, action);
            }}
          />
        ))}
      </div>

      {selIds.length > 0 && (
        <div class="bulkbar" role="region" aria-label="Selected items">
          <span><b>{plural(selIds.length, "item")}</b> selected</span>
          <button class="btn approve" onClick={() => sign(selIds, "approve")}>Approve selected</button>
          <button class="btn" onClick={() => sign(selIds, "review")}>Mark selected reviewed</button>
          <button class="btn" onClick={() => { selected.value = new Set(); }}>Clear</button>
        </div>
      )}
    </section>
  );
}

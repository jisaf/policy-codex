/* Changes: what takes effect month by month, the reader's proposal, and the
 * codex's own editing history kept apart (docs/design-unified-ui.md). A
 * first version for the Changes track. Routes: `changes?month=YYYY-MM`
 * (default: this month), `changes/proposal`, `changes/codex`. */
import { REPO } from "../../config";
import { BUNDLED } from "../../ledger/source";
import { changesInMonth, monthRange } from "../counts";
import { formatDate } from "../present";
import { argParts, buildHash } from "../router";
import { baseRefOf, navigate } from "../state";
import { TrayPanel } from "../Tray";
import { viewContext } from "../views/context";
import { ChangeList, DocList, useResting, useWorkedOut } from "../views/RolesView";
import { NoLedger } from "../views/ViewStub";
import { PlaceHeader } from "./PlaceHeader";
import "../views/workflow-views.css";

const SECTIONS = [
  { arg: null, label: "What takes effect" },
  { arg: "proposal", label: "My proposal" },
  { arg: "codex", label: "Edits to the codex" },
] as const;

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

function monthName(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function ChangesPage() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const { route: r } = ctx;
  const section = argParts(r)[0] ?? null;
  return (
    <section class="view place changes">
      <PlaceHeader place="changes" interim />
      <nav class="tabs changetabs" aria-label="Changes">
        {SECTIONS.map((s) => (
          <a
            key={s.label} class={section === s.arg ? "on" : ""} aria-current={section === s.arg ? "page" : undefined}
            href={buildHash({ ...r, view: "changes", arg: s.arg, params: {} })}
          >{s.label}</a>
        ))}
      </nav>
      {section === "proposal" ? <Proposal /> : section === "codex" ? <CodexEdits /> : <ThisMonth />}
    </section>
  );
}

function ThisMonth() {
  const ctx = viewContext()!;
  const { engine, vol, route: r, today } = ctx;
  const month = /^\d{4}-\d{2}$/.test(r.params.month ?? "") ? r.params.month! : today.slice(0, 7);
  const { from, to } = monthRange(month);
  const changes = changesInMonth(engine, vol, month);
  const resting = useResting(engine, vol.cases);
  const worked = useWorkedOut(engine, vol.cases, vol.chapterOf, changes.events);
  const go = (m: string) => navigate({ params: m === today.slice(0, 7) ? {} : { month: m } });
  return (
    <>
      <div class="controls monthpick">
        <button class="btn" onClick={() => go(shiftMonth(month, -1))} aria-label="The month before">‹ {monthName(shiftMonth(month, -1))}</button>
        <label>
          Month{" "}
          <input type="month" value={month} onChange={(e) => { const v = (e.target as HTMLInputElement).value; if (v) go(v); }} />
        </label>
        <button class="btn" onClick={() => go(shiftMonth(month, 1))} aria-label="The month after">{monthName(shiftMonth(month, 1))} ›</button>
      </div>
      <h2>
        {monthName(month)}{month === today.slice(0, 7) ? " (this month)" : ""}: {changes.total} change{changes.total === 1 ? "" : "s"} take effect
      </h2>
      <p class="muted note">
        Figures, rules and rule documents whose own dates fall between {formatDate(from)} and {formatDate(to)}. A new
        figure's effect on the stored households is worked out by running them with the old figure and the new one.
      </p>
      <DocList ctx={ctx} docs={changes.documents} />
      <ChangeList ctx={ctx} events={changes.events} resting={resting} worked={worked} empty={changes.documents.length ? "" : "Nothing takes effect this month."} />
    </>
  );
}

function Proposal() {
  return (
    <>
      <p class="muted">
        Everything you staged in this browser: edits, signatures, answers and notes. Propose them as one pull request,
        or download them and send the file.
      </p>
      <TrayPanel inline />
    </>
  );
}

function CodexEdits() {
  const ctx = viewContext()!;
  const ref = baseRefOf(ctx.route);
  const url = `https://github.com/${REPO.owner}/${REPO.name}/commits/${ref === "local" ? "main" : ref}/${ctx.vol.path}`;
  return (
    <>
      <p>
        The codex's own editing history (who changed which file, and when) is kept apart from what takes effect in law.
        Each item's page lists its own history under its decision record.
      </p>
      {!BUNDLED && <p><a href={url} target="_blank" rel="noreferrer">The volume's history on GitHub</a></p>}
    </>
  );
}

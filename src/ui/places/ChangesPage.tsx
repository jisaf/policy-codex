/* Changes (docs/design-unified-ui.md): what takes effect month by month,
 * past and future; the reader's proposal; and the codex's own editing
 * history, kept apart. Routes: `changes?month=YYYY-MM&program=&hh=`
 * (default: this month), `changes/proposal?item=CO-n`, `changes/codex`. */
import { argParts, buildHash } from "../router";
import { viewContext } from "../views/context";
import { NoLedger } from "../views/ViewStub";
import { PlaceHeader } from "./PlaceHeader";
import { CodexEdits } from "./changes/CodexEdits";
import { ProposalPage } from "./changes/ProposalPage";
import { TakesEffect } from "./changes/TakesEffect";
import { proposalCount } from "../Header";
import "../views/workflow-views.css";
import "./changes/changes.css";

const SECTIONS = [
  { arg: null, label: "What takes effect" },
  { arg: "proposal", label: "My proposal" },
  { arg: "codex", label: "Edits to the codex" },
] as const;

export function ChangesPage() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const { route: r } = ctx;
  const section = argParts(r)[0] ?? null;
  const n = proposalCount();
  return (
    <section class="view place changes">
      <PlaceHeader place="changes" />
      <nav class="tabs changetabs" aria-label="Changes">
        {SECTIONS.map((s) => (
          <a
            key={s.label} class={section === s.arg ? "on" : ""} aria-current={section === s.arg ? "page" : undefined}
            href={buildHash({ ...r, view: "changes", arg: s.arg, params: {} })}
          >{s.label}{s.arg === "proposal" && n > 0 ? ` (${n})` : ""}</a>
        ))}
      </nav>
      {section === "proposal" ? <ProposalPage ctx={ctx} />
        : section === "codex" ? <CodexEdits ctx={ctx} />
        : <TakesEffect ctx={ctx} />}
    </section>
  );
}

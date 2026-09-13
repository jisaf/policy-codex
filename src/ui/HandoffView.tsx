import { useLayoutEffect, useMemo } from "preact/hooks";
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import { buildSuite } from "../export/conformance";
import { handoffMarkdown } from "../export/handoff";
import type { LoadedVolume } from "../ledger/load";
import { programOutcomes } from "./CasesView";
import { renderMarkdown } from "./markdown";
import { buildHash, type Route } from "./router";
import { engineSig, route, viewEngine, volumeSig } from "./state";

interface ChapterGroup { chapter: string; items: Item[] }
interface ProgramGroup { program: string; chapters: ChapterGroup[] }

/** Every derived item, grouped by program (declared order, falling back to
 *  the ledger's distinct programs) then by the chapter file it is filed
 *  under, for the implementation checklist. */
function groupDerived(engine: Engine, vol: LoadedVolume): ProgramGroup[] {
  const derived = engine.items().filter((it) => it.kind === "derived");
  const programIds = programOutcomes(engine).map((p) => p.id);
  for (const it of derived) if (!programIds.includes(it.program)) programIds.push(it.program);
  return programIds
    .map((program) => {
      const inProgram = derived.filter((it) => it.program === program);
      const chapters = [...new Set(inProgram.map((it) => vol.chapterOf[it.id] ?? "unfiled"))];
      return {
        program,
        chapters: chapters.map((chapter) => ({
          chapter,
          items: inProgram.filter((it) => (vol.chapterOf[it.id] ?? "unfiled") === chapter),
        })),
      };
    })
    .filter((g) => g.chapters.length > 0);
}

function implementationLabel(it: Item): string {
  if (!it.implemented) return "not recorded";
  return it.implemented_by ? `${it.implemented} — ${it.implemented_by}` : it.implemented;
}

/** An object URL for `text`, revoked when the view unmounts or the text
 *  changes; a fresh URL for a fresh version rather than one reused across
 *  volumes. */
function useObjectUrl(text: string, type: string): string {
  const url = useMemo(() => URL.createObjectURL(new Blob([text], { type })), [text, type]);
  useLayoutEffect(() => () => URL.revokeObjectURL(url), [url]);
  return url;
}

function ChecklistTable({ items, route: r }: { items: Item[]; route: Route }) {
  return (
    <table class="checklist grid">
      <thead>
        <tr>
          <th>Name</th><th>Identifier</th><th>Implementation</th>
          <th>Rule tests</th><th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.id}>
            <td>
              <a href={buildHash({ ...r, view: "item", arg: it.id, params: {} })}>{it.name}</a>{" "}
              <small class="mono">{it.id}</small>
            </td>
            <td class="mono">{it.identifier}</td>
            <td>{implementationLabel(it)}</td>
            <td>{(it.tests ?? []).length}</td>
            <td>
              <a href={buildHash({ ...r, view: "item", arg: it.id, params: { section: "record" } })}>
                Decision record
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function HandoffView() {
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  const r = route.value;
  const md = engine && vol ? handoffMarkdown(engine, vol) : "";
  const suiteJson = engine && vol
    ? JSON.stringify(buildSuite(engine, vol, vol.sha ?? "unknown"), null, 2)
    : "";
  const markdownUrl = useObjectUrl(md, "text/markdown");
  const suiteUrl = useObjectUrl(suiteJson, "application/json");

  if (!engine || !vol) return <p class="status">No ledger loaded.</p>;
  const groups = groupDerived(engine, vol);

  return (
    <section class="view handoff">
      <h1>Engineer handoff</h1>
      <p class="muted">
        Everything the fact-assembly layer and the determination engine need, and the path
        each rule keeps back to statute.
      </p>

      <div class="downloads actions">
        <a class="btn" download={`handoff-${vol.volumeId}.md`} href={markdownUrl}>
          Download handoff.md
        </a>
        <a class="btn" download={`conformance-${vol.volumeId}.json`} href={suiteUrl}>
          Download conformance suite
        </a>
      </div>

      <h2>Implementation checklist</h2>
      {groups.map((g) => (
        <div key={g.program} class="program-group">
          <h3>{g.program}</h3>
          {g.chapters.map((c) => (
            <div key={c.chapter} class="chapter-group">
              <h4>{c.chapter}</h4>
              <ChecklistTable items={c.items} route={r} />
            </div>
          ))}
        </div>
      ))}

      <h2>Rendered handoff</h2>
      <div class="handoff-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
    </section>
  );
}

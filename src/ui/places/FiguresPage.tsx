/* Figures: every dated figure, as it stands on a date the reader chooses,
 * with a word-match filter and three flags (docs/design-unified-ui.md). A
 * first version for the Figures track to build on: each row is the role
 * page's figure row (value, since, next version, the rule text, a staged
 * draft's effect). Route: `#/<volume>/figures?asof=&q=&soon=1&unverified=1&novalue=1`. */
import { citedUnverified, figuresWithoutValue, newVersionSoon, NEW_VERSION_SOON_DAYS } from "../counts";
import { unverifiedIds } from "../provenance";
import { formatDate } from "../present";
import { figuresInForce, programLabel, rolePrograms } from "../roles";
import { personaById } from "../personas";
import { wordsMatch } from "../search";
import { changeSetSig, draftEngine, engineSig, navigate } from "../state";
import { viewContext } from "../views/context";
import { FigureRow } from "../views/RolesView";
import { NoLedger } from "../views/ViewStub";
import { PlaceHeader } from "./PlaceHeader";
import "../views/workflow-views.css";

const FLAGS = [
  { key: "soon", label: `New version in the next ${NEW_VERSION_SOON_DAYS} days` },
  { key: "unverified", label: "Source not verified" },
  { key: "novalue", label: "No value on this date" },
] as const;

export function FiguresPage() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const { route: r, today, vol } = ctx;
  const base = engineSig.value ?? ctx.engine;
  const draft = draftEngine() ?? base;
  const asOf = r.params.asof || today;
  const q = r.params.q ?? "";
  const everyone = personaById("county")!;
  const programs = rolePrograms(base, everyone);
  const unverified = unverifiedIds(vol.sources);
  const noValue = new Set(figuresWithoutValue(base, asOf).map((it) => it.id));
  const staged = new Set(changeSetSig.value.entries.map((e) => e.id));
  const set = (patch: Record<string, string | null>) => {
    const params = { ...r.params };
    for (const [k, v] of Object.entries(patch)) if (v) params[k] = v; else delete params[k];
    navigate({ params });
  };
  const groups = figuresInForce(base, programs, asOf).map((g) => ({
    program: g.program,
    figures: g.figures.filter((f) => {
      const it = f.item;
      if (q && !wordsMatch(`${it.name} ${it.meaning ?? ""} ${it.identifier} ${it.id}`, q)) return false;
      if (r.params.soon === "1" && !newVersionSoon(it, asOf)) return false;
      if (r.params.unverified === "1" && !citedUnverified(it, unverified).length) return false;
      if (r.params.novalue === "1" && !noValue.has(it.id)) return false;
      return true;
    }),
  })).filter((g) => g.figures.length);
  return (
    <section class="view place figures">
      <PlaceHeader place="figures" interim />
      <form class="controls" onSubmit={(e) => e.preventDefault()}>
        <label>
          In force on{" "}
          <input type="date" value={asOf} onChange={(e) => set({ asof: (e.target as HTMLInputElement).value || null })} />
        </label>
        <label>
          Find{" "}
          <input
            type="search" value={q} placeholder="words in a figure's name or meaning"
            onChange={(e) => set({ q: (e.target as HTMLInputElement).value.trim() || null })}
          />
        </label>
        {FLAGS.map((f) => (
          <label key={f.key} class="check">
            <input type="checkbox" checked={r.params[f.key] === "1"} onChange={(e) => set({ [f.key]: (e.target as HTMLInputElement).checked ? "1" : null })} />
            {f.label}
          </label>
        ))}
      </form>
      <p class="muted">Values in force on {formatDate(asOf)}. A figure with no value then gives a household determined on that date "cannot determine".</p>
      {!groups.length && <p class="status">No figure matches these filters.</p>}
      {groups.map((g) => (
        <section key={g.program} class="figuregroup" data-program={g.program}>
          <h2>{programLabel(g.program)} <span class="muted">{g.figures.length}</span></h2>
          <ul class="figurelist">
            {g.figures.map((f) => (
              <FigureRow key={f.item.id} ctx={ctx} figure={f} asOf={asOf} staged={staged.has(f.item.id) ? draft : null} base={base} />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

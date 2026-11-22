/* Figures (docs/design-unified-ui.md, "Figures"; Blind B's list): every
 * figure the rules read, its value in force on a date the reader picks, and
 * three filters: a new version soon, a source not verified, no value on this
 * date. The word filter matches words in any order, never a phrase. Each
 * figure's name links to its own page (the item), where its versions, the law
 * and what it affects are. Route:
 * `#/<volume>/figures?asof=&q=&program=&soon=1&unverified=1&novalue=1`. */
import { useSignal } from "@preact/signals";
import { DESK_DEFINITIONS, figuresOnDate, NEW_VERSION_SOON_DAYS, type FigureOnDate } from "../counts";
import { formatDate, formatValue } from "../present";
import { unverifiedIds } from "../provenance";
import { programLabel } from "../roles";
import { buildHash, type Route } from "../router";
import { wordsMatch } from "../search";
import { changeSetSig, engineSig, navigate } from "../state";
import { viewContext } from "../views/context";
import { itemHref } from "../views/parts";
import { NoLedger } from "../views/ViewStub";
import { PlaceHeader } from "./PlaceHeader";
import "./desk.css";

const FLAGS = [
  { key: "soon", label: "New version soon" },
  { key: "unverified", label: "Source not verified" },
  { key: "novalue", label: "No value on this date" },
] as const;

const PER_GROUP = 40;

export function FiguresPage() {
  const open = useSignal<ReadonlySet<string>>(new Set());
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const { route: r, today, vol } = ctx;
  // The figures in force, not the tray's drafts: a staged figure says so.
  const engine = engineSig.value ?? ctx.engine;
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(r.params.asof ?? "") ? r.params.asof! : today;
  const q = r.params.q ?? "";
  const program = r.params.program ?? "";
  const programs = [...(engine.meta.programs ?? []).map((p) => p.id).filter((p) => p !== "All"), "All"];
  const rows = figuresOnDate(engine, unverifiedIds(vol.sources), {
    asOf, q, program, soon: r.params.soon === "1", unverified: r.params.unverified === "1", noValue: r.params.novalue === "1",
  }, wordsMatch);
  const all = figuresOnDate(engine, unverifiedIds(vol.sources), { asOf }, wordsMatch).length;
  const staged = new Set(changeSetSig.value.entries.map((e) => e.id));
  const set = (patch: Record<string, string | null>) => {
    const params = { ...r.params };
    for (const [k, v] of Object.entries(patch)) if (v) params[k] = v; else delete params[k];
    navigate({ params });
  };
  const groups = programs.map((p) => ({ program: p, rows: rows.filter((x) => x.item.program === p) })).filter((g) => g.rows.length);
  return (
    <section class="view place figures">
      <PlaceHeader place="figures" />
      <form class="controls figfilters" role="search" onSubmit={(e) => {
        e.preventDefault();
        const v = ((e.currentTarget as HTMLFormElement).elements.namedItem("q") as HTMLInputElement).value.trim();
        set({ q: v || null });
      }}>
        <label class="asof">
          In force on{" "}
          <input type="date" value={asOf} onChange={(e) => {
            const v = (e.target as HTMLInputElement).value;
            set({ asof: v && v !== today ? v : null });
          }} />
        </label>
        <label class="find">
          Find{" "}
          <input
            name="q" type="search" value={q} placeholder="e.g. grant standard"
            onChange={(e) => set({ q: (e.target as HTMLInputElement).value.trim() || null })}
          />
        </label>
        <label>
          Program{" "}
          <select value={program} onChange={(e) => set({ program: (e.target as HTMLSelectElement).value || null })}>
            <option value="">Every program</option>
            {programs.map((p) => <option key={p} value={p}>{programLabel(p)}</option>)}
          </select>
        </label>
        <span class="flags" role="group" aria-label="Show only">
          {FLAGS.map((f) => (
            <label key={f.key} class="check">
              <input type="checkbox" checked={r.params[f.key] === "1"} onChange={(e) => set({ [f.key]: (e.target as HTMLInputElement).checked ? "1" : null })} />
              {f.label}
            </label>
          ))}
        </span>
      </form>
      <p class="muted figcount" aria-live="polite">
        {rows.length === all ? `${all.toLocaleString("en-US")} figures` : `${rows.length.toLocaleString("en-US")} of ${all.toLocaleString("en-US")} figures`},
        values in force on {formatDate(asOf)}{asOf === today ? " (today)" : ""}.
      </p>
      {!rows.length && <p class="status">No figure matches. Try fewer words or another date.</p>}
      {groups.map((g) => {
        const more = open.value.has(g.program) || g.rows.length <= PER_GROUP;
        return (
          <section key={g.program} class="figuregroup" data-program={g.program}>
            <h2>{programLabel(g.program)} <span class="muted">{g.rows.length.toLocaleString("en-US")}</span></h2>
            <table class="figtable">
              <thead>
                <tr><th scope="col">Figure</th><th scope="col">Value on {formatDate(asOf)}</th><th scope="col">In force since</th><th scope="col">Next version</th></tr>
              </thead>
              <tbody>
                {(more ? g.rows : g.rows.slice(0, PER_GROUP)).map((x) => (
                  <FigureRow key={x.item.id} r={r} x={x} staged={staged.has(x.item.id)} />
                ))}
              </tbody>
            </table>
            {!more && (
              <button class="btn more" onClick={() => { open.value = new Set([...open.value, g.program]); }}>
                Show all {g.rows.length.toLocaleString("en-US")}
              </button>
            )}
          </section>
        );
      })}
      <details class="howcounted">
        <summary>How this is counted</summary>
        <p>{DESK_DEFINITIONS.figures}</p>
        <p>New version soon: one starts within {NEW_VERSION_SOON_DAYS} days after the date. Source not verified: the figure cites an excerpt not verified against its document. No value on this date: no version is in force then, so a household determined that day gets "cannot determine".</p>
      </details>
    </section>
  );
}

function valueText(x: FigureOnDate): string {
  const v = x.value;
  if (v && typeof v === "object" && !Array.isArray(v)) return `a table of ${Object.keys(v).length} rows`;
  return formatValue(x.item, v);
}

function FigureRow({ r, x, staged }: { r: Route; x: FigureOnDate; staged: boolean }) {
  const it = x.item;
  const href = itemHref(r, it);
  const isTable = x.value && typeof x.value === "object" && !Array.isArray(x.value);
  return (
    <tr class="figure" data-figure={it.identifier}>
      <td data-l="Figure">
        <a class="figname" href={href}>{it.name}</a>{" "}
        {x.unverified.length > 0 && <span class="flag unverified">Source not verified</span>}
        {x.soon && <span class="tag soon">New version {formatDate(x.soon.from)}</span>}
        {staged && <a class="tag draft" href={buildHash({ ...r, view: "changes", arg: "proposal", params: {} })}>In your proposal</a>}
        <small class="mono muted"> {it.id}</small>
      </td>
      <td data-l="Value" class="val">
        {x.noValue
          ? <span class="warn">No value: a household gets "cannot determine"</span>
          : isTable ? <a href={href}>{valueText(x)}</a> : <b>{valueText(x)}</b>}
      </td>
      <td data-l="Since">{x.version ? formatDate(x.version.from) : Array.isArray(it.versions) ? "" : <span class="muted">not dated</span>}</td>
      <td data-l="Next">
        {x.next
          ? <>{formatDate(x.next.from)}{x.next.value !== undefined && x.next.value !== null && typeof x.next.value !== "object" ? <span class="muted">: {formatValue(it, x.next.value)}</span> : null}</>
          : <span class="muted">none loaded</span>}
      </td>
    </tr>
  );
}

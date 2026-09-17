import type { Engine } from "../engine/engine";
import { tagAncestors, tagGroups, tagIds, tagLabel } from "../engine/tags";
import type { Item } from "../engine/types";
import { Term } from "./labels";
import { Ident } from "./Rich";
import { buildHash, type Route } from "./router";
import { engineSig, navigate, route, viewEngine, volumeSig } from "./state";
import { validationMap } from "./validation";

export interface TableFilters {
  kind: string; program: string; scope: string; open: string; state: string;
  /** Comma-separated tag ids; AND semantics (an item must carry every one). */
  tags: string;
  /** A parent tag id; matches an item that carries that tag itself or any
   *  tag declared under it. */
  group: string;
  sort: string; dir: string;
}

export function readFilters(r: Route): TableFilters {
  const p = r.params;
  return {
    kind: p.kind ?? "", program: p.program ?? "", scope: p.scope ?? "",
    open: p.open ?? "", state: p.state ?? "",
    tags: p.tags ?? "", group: p.group ?? "",
    sort: p.sort ?? "id", dir: p.dir === "desc" ? "desc" : "asc",
  };
}

function cell(it: Item, key: string): string {
  switch (key) {
    case "id": return it.id;
    case "name": return it.name;
    case "kind": return it.kind;
    case "type": return it.type;
    case "scope": return it.scope;
    case "program": return it.program;
    default: return it.id;
  }
}

export function filterItems(engine: Engine, f: TableFilters): Item[] {
  const validation = validationMap(engine);
  const wantedTags = f.tags ? f.tags.split(",").filter(Boolean) : [];
  const rows = engine.items().filter((it) => {
    if (f.kind && it.kind !== f.kind) return false;
    if (f.program && it.program !== f.program) return false;
    if (f.scope && it.scope !== f.scope) return false;
    if (f.open === "any" && !(it.open ?? []).length) return false;
    if (f.open && f.open !== "any" && !(it.open ?? []).includes(f.open)) return false;
    if (wantedTags.length && !wantedTags.every((t) => (it.tags ?? []).includes(t))) return false;
    if (f.group) {
      const under = (it.tags ?? []).some(
        (t) => t === f.group || tagAncestors(engine.meta, t).includes(f.group),
      );
      if (!under) return false;
    }
    const v = validation.get(it.id);
    if (f.state === "invalid" && !(v && v.errors > 0)) return false;
    if (f.state === "warn" && !(v && v.errors === 0 && v.warnings > 0)) return false;
    if (f.state === "clean" && !(v && v.errors === 0 && v.warnings === 0)) return false;
    return true;
  });
  const dir = f.dir === "desc" ? -1 : 1;
  return rows.sort((a, b) => dir * cell(a, f.sort).localeCompare(cell(b, f.sort)));
}

const COLUMNS = [
  { key: "name", label: "Fact" },
  { key: "kind", label: "Kind" },
  { key: "type", label: "Type" },
  { key: "scope", label: "Scope" },
  { key: "program", label: "Program" },
];

export function TableView() {
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  if (!engine || !vol) return <p class="status">No ledger loaded.</p>;
  const r = route.value;
  const f = readFilters(r);
  const rows = filterItems(engine, f);
  const validation = validationMap(engine);

  const set = (key: keyof TableFilters, value: string) => {
    const params = { ...r.params };
    if (value) params[key] = value;
    else delete params[key];
    navigate({ params });
  };
  const sortBy = (key: string) => {
    const dir = f.sort === key && f.dir === "asc" ? "desc" : "asc";
    navigate({ params: { ...r.params, sort: key, dir } });
  };

  const select = (
    key: keyof TableFilters, label: string, options: Array<[string, string]>,
  ) => (
    <label>
      {label}
      <select value={f[key]} onChange={(e) => set(key, (e.target as HTMLSelectElement).value)}>
        <option value="">any</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );

  const allTags = tagIds(vol.meta);
  const groups = [...tagGroups(vol.meta).keys()];
  const selectedTags = new Set(f.tags ? f.tags.split(",").filter(Boolean) : []);

  return (
    <section class="view">
      <div class="controls">
        {select("kind", "Kind", [["supplied", "supplied"], ["derived", "derived"], ["parameter", "parameter"]])}
        {select("program", "Program", [["All", "All"], ["Medicaid", "Medicaid"], ["SNAP", "SNAP"]])}
        {select("scope", "Scope", vol.meta.scopes.map((s) => [s, s] as [string, string]))}
        {select("open", "Open question", [
          ["any", "any"],
          ...vol.openQuestions.map((q) => [q.id, `${q.id} ${q.title}`] as [string, string]),
        ])}
        {select("state", "Validation", [
          ["invalid", "errors"], ["warn", "warnings only"], ["clean", "clean"],
        ])}
        {allTags.length > 0 && (
          <label>
            Tags
            <select
              class="tag-filter"
              multiple
              onChange={(e) => {
                const opts = [...(e.target as HTMLSelectElement).selectedOptions].map((o) => o.value);
                set("tags", opts.join(","));
              }}
            >
              {allTags.map((t) => (
                <option key={t} value={t} selected={selectedTags.has(t)}>
                  {tagLabel(vol.meta, t)}
                </option>
              ))}
            </select>
          </label>
        )}
        {groups.length > 0 &&
          select("group", "Group", groups.map((g) => [g, tagLabel(vol.meta, g)] as [string, string]))}
        <span class="tag">{rows.length} items</span>
      </div>
      <table class="grid">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key}>
                <button class="linkish" onClick={() => sortBy(c.key)}>
                  {c.label}{f.sort === c.key ? (f.dir === "asc" ? " ▲" : " ▼") : ""}
                </button>
              </th>
            ))}
            <th>Open</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it) => {
            const v = validation.get(it.id);
            return (
              <tr key={it.id}>
                <td>
                  <a href={buildHash({ ...r, view: "item", arg: it.id, params: {} })}>
                    <b>{it.name}</b>
                  </a>
                  <br />
                  <small>{it.id} · <Ident id={it.identifier} engine={engine} /></small>
                </td>
                <td><Term kind={it.kind} /></td>
                <td>{it.type}</td>
                <td><Term scope={it.scope} /></td>
                <td class={`prog-${it.program.toLowerCase()}`}>{it.program}</td>
                <td>{(it.open ?? []).join(", ")}</td>
                <td class={v && v.errors ? "bad" : v && v.warnings ? "warn" : "ok"}>
                  {v && v.errors ? `${v.errors} error${v.errors > 1 ? "s" : ""}`
                    : v && v.warnings ? `${v.warnings} warning${v.warnings > 1 ? "s" : ""}`
                    : "clean"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

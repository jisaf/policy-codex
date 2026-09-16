import { signal, useSignal } from "@preact/signals";
import { useLayoutEffect } from "preact/hooks";
import type { ViewName } from "./router";
import { editingSig, ledgerSource, route } from "./state";

export const HELP_PATH = "docs/onboarding.md";

export const helpOpenSig = signal(false);

/** A doc and a heading inside it, when the panel was opened on a specific
 *  section rather than on the help for the current view: a token's "Trace to
 *  source" reaches the grammar's own source this way. */
export interface HelpTarget { path: string; heading: string }

export const helpTargetSig = signal<HelpTarget | null>(null);

export function toggleHelp(): void {
  // Toggling from the header always means "help for where I am", so any
  // section a token opened is forgotten.
  helpTargetSig.value = null;
  helpOpenSig.value = !helpOpenSig.value;
}

/** Opens the panel on one heading of one doc, read at the current ref the
 *  way onboarding.md is. */
export function openHelp(path: string, heading: string): void {
  helpTargetSig.value = { path, heading };
  helpOpenSig.value = true;
}

export function closeHelp(): void {
  helpTargetSig.value = null;
  helpOpenSig.value = false;
}

/** Which `## <view>` section of docs/onboarding.md answers for the page the
 *  reader is on right now. The editor overlays every other view, so it wins
 *  regardless of the route underneath it; a route with no section of its own
 *  (Table, Graph's whole-ledger neighbours, Search, and so on) gets none. */
export function helpKeyFor(view: ViewName, editing: boolean): string | null {
  if (editing) return "editing";
  const known: Partial<Record<ViewName, string>> = {
    start: "start", program: "programs", cases: "cases", item: "item",
    table: "table", graph: "graph", source: "sources",
    documents: "documents", document: "documents", search: "search",
    handoff: "handoff",
  };
  return known[view] ?? null;
}

/** Splits docs/onboarding.md into its `## <key>` sections, key trimmed to
 *  the bare word (so "## cases" keys "cases"), body kept verbatim. */
export function parseHelpSections(md: string): Record<string, string> {
  const out: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  const flush = () => { if (current !== null) out[current] = buf.join("\n").trim(); };
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\r$/, "");
    const m = /^##\s+(\S+)\s*$/.exec(line);
    if (m) {
      flush();
      current = m[1];
      buf = [];
    } else if (current !== null) {
      buf.push(line);
    }
  }
  flush();
  return out;
}

/** The body under one `#` heading of a markdown doc: everything up to the
 *  next heading at the same level or higher. Returns null when the doc has
 *  no such heading, which reads to a visitor as "nothing written here". */
export function sectionOf(md: string, heading: string): string | null {
  const lines = md.split("\n");
  const want = heading.trim().toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    const m = /^(#{1,6})\s+(.*?)\s*$/.exec(lines[i].replace(/\r$/, ""));
    if (!m || m[2].toLowerCase() !== want) continue;
    const level = m[1].length;
    const body: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const h = /^(#{1,6})\s+/.exec(lines[j]);
      if (h && h[1].length <= level) break;
      body.push(lines[j].replace(/\r$/, ""));
    }
    return body.join("\n").trim();
  }
  return null;
}

function Paragraphs({ text }: { text: string }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return <>{paras.map((p, i) => <p key={i}>{p}</p>)}</>;
}

export function HelpPanel(
  { fetchText }: { fetchText?: (path: string) => Promise<string> } = {},
) {
  const text = useSignal<string | null>(null);
  const error = useSignal<string | null>(null);
  const open = helpOpenSig.value;
  const target = helpTargetSig.value;
  const r = route.value;
  const key = helpKeyFor(r.view, editingSig.value !== null);
  const read = fetchText ?? ((p: string) => ledgerSource().readText(p));
  const path = target ? target.path : HELP_PATH;

  useLayoutEffect(() => {
    if (!open) return;
    let live = true;
    text.value = null;
    error.value = null;
    read(path).then(
      (t) => { if (live) text.value = t; },
      // Any failure (a 404, a ref the docs file never reached) reads the same
      // to a visitor: there is nothing here to show.
      () => { if (live) error.value = "Help is not available at this ref."; },
    );
    return () => { live = false; };
  }, [open, r.ref, path]);

  if (!open) return null;

  const loaded = text.value;
  const body = loaded === null
    ? undefined
    : target
      ? sectionOf(loaded, target.heading) ?? undefined
      : (key ? parseHelpSections(loaded)[key] : undefined);

  return (
    <div class="overlay help-overlay" onClick={closeHelp}>
      <div class="sheet help" onClick={(e) => e.stopPropagation()}>
        <div class="cardhead">
          <h2>{target ? target.heading : "Help"}</h2>
          {target && <span class="tag mono">{target.path}</span>}
          <span class="spacer" />
          <button class="btn" onClick={closeHelp}>Close</button>
        </div>
        {error.value && <p class="status bad">{error.value}</p>}
        {!error.value && loaded !== null && (body
          ? <Paragraphs text={body} />
          : (
            <p class="muted">
              {target
                ? `Nothing under "${target.heading}" in ${target.path}.`
                : "No help written for this view yet."}
            </p>
          ))}
        {!error.value && loaded === null && <p class="status">Loading…</p>}
      </div>
    </div>
  );
}

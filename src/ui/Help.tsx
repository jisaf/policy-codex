import { signal, useSignal } from "@preact/signals";
import { useLayoutEffect } from "preact/hooks";
import type { ViewName } from "./router";
import { editingSig, ledgerSource, route } from "./state";

export const HELP_PATH = "docs/onboarding.md";

export const helpOpenSig = signal(false);

export function toggleHelp(): void {
  helpOpenSig.value = !helpOpenSig.value;
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
  const r = route.value;
  const key = helpKeyFor(r.view, editingSig.value !== null);
  const read = fetchText ?? ((p: string) => ledgerSource().readText(p));

  useLayoutEffect(() => {
    if (!open) return;
    let live = true;
    text.value = null;
    error.value = null;
    read(HELP_PATH).then(
      (t) => { if (live) text.value = t; },
      // Any failure (a 404, a ref the docs file never reached) reads the same
      // to a visitor: there is nothing here to show.
      () => { if (live) error.value = "Help is not available at this ref."; },
    );
    return () => { live = false; };
  }, [open, r.ref]);

  if (!open) return null;

  const sections = text.value ? parseHelpSections(text.value) : null;
  const body = sections ? (key ? sections[key] : undefined) : undefined;

  return (
    <div class="overlay help-overlay" onClick={() => { helpOpenSig.value = false; }}>
      <div class="sheet help" onClick={(e) => e.stopPropagation()}>
        <div class="cardhead">
          <h2>Help</h2>
          <span class="spacer" />
          <button class="btn" onClick={() => { helpOpenSig.value = false; }}>Close</button>
        </div>
        {error.value && <p class="status bad">{error.value}</p>}
        {!error.value && sections && (
          body ? <Paragraphs text={body} /> : <p class="muted">No help written for this view yet.</p>
        )}
        {!error.value && !sections && <p class="status">Loading…</p>}
      </div>
    </div>
  );
}

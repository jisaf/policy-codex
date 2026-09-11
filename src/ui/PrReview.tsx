import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import { isPrRef } from "./router";
import { diffVolumes, prImpact, type PrItemDiff } from "./prDiff";
import {
  engineSig, prBaseEngineSig, prBaseVolumeSig, pullRequestSig, route, trayOpenSig, volumeSig,
} from "./state";

function itemBlockOf(engine: Engine | null, item: Item | null): string {
  if (!engine || !item) return "(absent)";
  try { return engine.itemBlock(item); } catch (e) { return `(unrenderable: ${(e as Error).message})`; }
}

export function DiffCard(
  { diff, headEngine, baseEngine }: {
    diff: PrItemDiff; headEngine: Engine; baseEngine: Engine | null;
  },
) {
  const results = (diff.after?.tests ?? []).map((t) => headEngine.runTest(diff.after!, t));
  const passing = results.filter((r) => r.ok).length;
  return (
    <article class="diff" key={diff.id}>
      <h3>{diff.id} {(diff.after ?? diff.before)!.name} <span class="tag">{diff.kind}</span></h3>
      <div class="sidebyside">
        <div>
          <h4>Before</h4>
          <pre>{itemBlockOf(baseEngine, diff.before)}</pre>
        </div>
        <div>
          <h4>After</h4>
          <pre>{itemBlockOf(headEngine, diff.after)}</pre>
        </div>
      </div>
      {diff.after && (
        <p class={passing === results.length ? "ok" : "bad"}>
          {results.length === 0
            ? "No examples on this item."
            : `${passing} of ${results.length} examples pass on the head.`}
        </p>
      )}
    </article>
  );
}

export function PrReview() {
  const r = route.value;
  if (!trayOpenSig.value || !isPrRef(r.ref)) return null;
  const pr = pullRequestSig.value;
  const headEngine = engineSig.value;
  const headVol = volumeSig.value;
  const baseVol = prBaseVolumeSig.value;
  const baseEngine = prBaseEngineSig.value;
  if (!pr || !headEngine || !headVol) return null;

  const diffs = baseVol ? diffVolumes(baseVol.items, headVol.items) : [];
  const impact = baseEngine ? prImpact(baseEngine, diffs) : [];

  return (
    <div
      class="overlay"
      onClick={(e) => { if (e.target === e.currentTarget) trayOpenSig.value = false; }}
    >
      <div class="sheet review">
        <div class="cardhead">
          <h2>#{pr.number} {pr.title}</h2>
          <span class="tag">{pr.headRef} → {pr.baseRef}</span>
          <span class="spacer" />
          <button class="btn" onClick={() => { trayOpenSig.value = false; }}>Close</button>
        </div>
        <p class="muted">
          <a href={pr.url} target="_blank" rel="noreferrer">Open #{pr.number} on GitHub</a>.
          {" "}Comments and merge stay on GitHub.
        </p>
        {!baseVol && <p class="status">Loading the base ledger to diff against…</p>}
        {baseVol && diffs.length === 0 && (
          <p class="muted">This pull request changes no item files.</p>
        )}
        {diffs.map((d) => (
          <DiffCard key={d.id} diff={d} headEngine={headEngine} baseEngine={baseEngine} />
        ))}
        <div class="impact">
          <h4>Impact</h4>
          {impact.length === 0
            ? <p class="muted">No downstream items depend on the changed facts.</p>
            : <p>{impact.length} downstream item(s): {impact.join(", ")}</p>}
        </div>
      </div>
    </div>
  );
}

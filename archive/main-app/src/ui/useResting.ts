/* The resting index (counts.ts `restingIndex`: which stored results read
 * each item) as a page uses it. It takes about a second to build for the
 * Colorado volume, and many seconds on a loaded machine, so no page builds
 * it at once: these hooks build it a household at a time after the first
 * paint (`restingIndexInSteps`, one build shared by every page that asks)
 * and re-render when it is ready. A page shows "Working out…" meanwhile. */
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Engine } from "../engine/engine";
import type { HouseholdCase } from "../engine/cases";
import { restingIndex, restingIndexInSteps, restingReady } from "./counts";
import type { StoredResult } from "./questionEffects";

/** Whether the resting index is built; starts building it when `enabled`. */
export function useRestingReady(
  engine: Engine | null | undefined, cases: readonly HouseholdCase[], enabled = true,
): boolean {
  const done = useSignal(engine ? restingReady(engine, cases) : false);
  useEffect(() => {
    if (!engine || !enabled) return;
    if (restingReady(engine, cases)) { done.value = true; return; }
    done.value = false;
    let live = true;
    restingIndexInSteps(engine, cases).then(() => { if (live) done.value = true; });
    return () => { live = false; };
  }, [engine, cases, enabled]);
  return Boolean(engine) && (done.value || restingReady(engine!, cases));
}

/** The resting index once it is built, else null. */
export function useRestingIndex(
  engine: Engine | null | undefined, cases: readonly HouseholdCase[], enabled = true,
): Map<string, StoredResult[]> | null {
  const ready = useRestingReady(engine, cases, enabled);
  return engine && ready ? restingIndex(engine, cases) : null;
}

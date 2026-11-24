/* Phase timings for `npm run check` (CHECK_PROFILE=1, or `--profile`): each
 * phase's wall time, printed on stderr so the check's own output is
 * unchanged. Recording is a no-op unless enabled. */

export interface PhaseTiming { phase: string; ms: number }

const timings: PhaseTiming[] = [];
let enabled = typeof process !== "undefined" && !!process.env?.CHECK_PROFILE;

export function enableProfile(on = true): void { enabled = on; }
export function profileEnabled(): boolean { return enabled; }

/** Runs `fn`, recording its wall time under `phase` when profiling is on. */
export function timed<T>(phase: string, fn: () => T): T {
  if (!enabled) return fn();
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    timings.push({ phase, ms: performance.now() - t0 });
  }
}

/** Records an already-measured span. */
export function record(phase: string, ms: number): void {
  if (enabled) timings.push({ phase, ms });
}

/** The recorded timings, summed by phase, in first-seen order. */
export function phaseTimings(): PhaseTiming[] {
  const by = new Map<string, number>();
  for (const t of timings) by.set(t.phase, (by.get(t.phase) ?? 0) + t.ms);
  return [...by].map(([phase, ms]) => ({ phase, ms }));
}

export function formatTimings(): string {
  const rows = phaseTimings();
  const w = Math.max(5, ...rows.map((r) => r.phase.length));
  return ["phase timings (ms):", ...rows.map((r) => `  ${r.phase.padEnd(w)}  ${r.ms.toFixed(0).padStart(8)}`)].join("\n");
}

/** A stopwatch: each call records the time since the previous call (or since
 *  the stopwatch was made) under the phase it names. */
export function stopwatch(): (phase: string) => void {
  let t = enabled ? performance.now() : 0;
  return (phase) => {
    if (!enabled) return;
    const now = performance.now();
    timings.push({ phase, ms: now - t });
    t = now;
  };
}

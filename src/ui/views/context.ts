/* What every workflow view needs, in one call: the engine with the reader's
 * drafts applied (or not; see `draftsShownSig`), the loaded volume, the route,
 * the persona the visitor chose, and today's date as the default "as of".
 * A view renders `<NoLedger />` when this returns null. */
import type { Engine } from "../../engine/engine";
import type { LoadedVolume } from "../../ledger/load";
import { personaById, personaSig, type Persona } from "../personas";
import type { Route } from "../router";
import { engineSig, route, viewEngine, volumeSig } from "../state";

export interface ViewContext {
  engine: Engine;
  vol: LoadedVolume;
  route: Route;
  persona: Persona | null;
  /** Today, YYYY-MM-DD, local time: the default "as of" a view offers
   *  (the county supervisor's U9: never a stale fixed date). */
  today: string;
}

export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function viewContext(): ViewContext | null {
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  if (!engine || !vol) return null;
  return {
    engine, vol, route: route.value, persona: personaById(personaSig.value), today: todayIso(),
  };
}

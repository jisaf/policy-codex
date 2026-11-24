/* The item page's prose: the shared renderer (kit.tsx `Prose`), under the
 * prop name the item page's components pass. */
import type { Engine } from "../../engine/engine";
import type { LoadedVolume } from "../../ledger/load";
import { Prose as KitProse } from "../kit";
import type { Route } from "../router";

export { excerptLink } from "../kit";

export function Prose(
  { engine, vol, route: r, text, as = "span", class: klass }:
  { engine: Engine; vol: LoadedVolume; route: Route; text: string; as?: "span" | "p"; class?: string },
) {
  return <KitProse engine={engine} vol={vol} r={r} text={text} as={as} class={klass} />;
}

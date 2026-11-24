import type { Engine } from "../engine/engine";
import { declaredPrograms } from "../engine/item-block";

/** Every program a filter should offer: the volume's declared programs
 *  (volume.yaml `programs`, in their order), then any program an item names
 *  that the volume did not declare, so no item is unreachable by filter. */
export function volumePrograms(engine: Engine): string[] {
  const out = declaredPrograms(engine.meta);
  for (const it of engine.items()) if (!out.includes(it.program)) out.push(it.program);
  return out;
}

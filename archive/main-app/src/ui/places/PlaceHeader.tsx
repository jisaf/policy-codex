import type { ComponentChildren } from "preact";
import type { PlaceName } from "../router";
import { placeInfo } from "../shell";

/** The heading and one-line purpose every place opens with. `title`
 *  replaces the place's own name on a sub-page; `interim` says the page is a
 *  first version that shows the content the app already had. */
export function PlaceHeader(
  { place, title, interim = false, children }:
  { place: PlaceName; title?: string; interim?: boolean; children?: ComponentChildren },
) {
  const p = placeInfo(place);
  return (
    <div class="placehead" data-place={place}>
      <h1>{title ?? p.label}</h1>
      <p class="purpose">{p.purpose}</p>
      {interim && (
        <p class="muted interim">
          A first version of this page: it gathers what the app already showed elsewhere. Its address and its place in
          the sidebar are final.
        </p>
      )}
      {children}
    </div>
  );
}

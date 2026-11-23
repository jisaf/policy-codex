// The registry of one program track (docs/design-earned-and-resource-records.md
// 4.3, rule 3): each E1 (and H1) track owns its own file under
// scripts/records/programs/ and edits no other track's, so tracks running in
// parallel never collide on the harness's lists. The harness loads every
// file in the directory.

/** A stored household varied one earned fact (generate-earnings.ts), or one
 *  resource fact (generate-holdings.ts), at a time. */
export interface Base {
  /** the stored household */
  id: string;
  /** the person varied; "" for the person a sponsor edge points to */
  person: string;
  label: string;
}

export interface ListEntry {
  /** The track's counting tables for the list (Medicaid has two methods). */
  tables: string[];
  /** Intermediate figures compared beside the outcomes, old ledger against new. */
  figures: string[];
  /** Figures that read the list itself, which the metamorphic relations
   *  compare (empty until the track moves its readers onto the list). */
  metamorphic: string[];
  /** Relations the track's rules say are NOT invariant, by relation id
   *  (ME-1 to ME-5; for holdings MH-1 to MH-5), with the reason; the
   *  relation is not run for the track's figures. */
  notInvariant?: Record<string, string>;
  /** Holdings only: the couple and household figures (the SSI couple, the
   *  CSRA, Adult Financial's client and spouse, SNAP's household) that MH-3
   *  joint compares; an individual's figure is not invariant under it
   *  (design 4.4). */
  coupleFigures?: string[];
  /** Generated-household bases for the track. */
  bases: Base[];
}

export interface Track {
  /** the track's name (its file name) */
  track: string;
  /** the program ids whose outcomes the harness compares for the track */
  programs: string[];
  earnings?: ListEntry;
  holdings?: ListEntry;
}

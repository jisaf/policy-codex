# Colorado build notes

One entry per phase: what the approach handled, what it did not, and where open questions cluster. Written at the end of each phase for the reader who was not in the room.

## Phase 1: platform (2026-09-17)

Built: a volume selector in the header (the manifest now lists `mwr` and the draft `co`); a tag hierarchy declared in `volume.yaml` with filters by tag (AND) and by parent grouping in the table, program view, and search; dated parameter versions with an exclusive `to` and a per-version excerpt, rule effectivity ranges that make a rule evaluate to unknown outside its dates (trace origin `not-in-force`), and case-level relationships `[role, from, to]` that the engine expands with inverses; the `co` skeleton with seven programs and the target household (CO-01, CO-02) as cases with empty expectations; `npm run check` and the other scripts run per volume.

Worked: every piece was additive. The 138-item federal volume's fixtures did not change, so the engine's behaviour for existing rules is provably the same.

Did not fit cleanly:
- `paramValue` (the item block, lead sentence, editor) still reads the last version in array order and ignores `to`, because the item-block fixtures pin it. Dating those surfaces is a follow-up.
- The text-editor item block has no line format for version tables; a versioned parameter is edited through the form until the grammar grows a `Versions` field.
- `docs/conventions.md` does not yet describe `versions[].to`/`source` or case-level relationships.
- Network policy: the primary sources (eCFR, Cornell, the Colorado Secretary of State, HCPF, CDHS, FNS, CMS, SSA, ASPE) were allow-listed during this phase but the running session still saw 403s; the authoring phases need a session started after the policy change.

Open questions to settle before phase 2 authoring:
- Whether SNAP household composition should be a derived fact over `buys_prepares_with` edges (the plan says yes) or a supplied unit id from the worker; the target household has a grandmother in a facility, so the rule must handle institutional exclusion.
- How to represent the ITIN tax filer (p3) who claims citizen children: the MAGI household rules need `is_tax_filer` and dependency edges, but immigrant eligibility must not read them.

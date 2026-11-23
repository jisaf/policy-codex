// SNAP track registry (docs/design-earned-and-resource-records.md 4.3,
// rule 3). Owned by the SNAP E1 track: the figures its harness compares,
// the figures that read the records (for the metamorphic relations; empty
// until the track's readers read the records), the relations its rules say
// are not invariant, and its generated-household bases. Set up in step E0
// by the integration owner with today's earned figures, so E0 is measured
// on them.
import type { Track } from "./types";

export const track: Track = {
  track: "snap",
  programs: ["SNAP"],
  earnings: {
    tables: ["snap_earnings_treatment_table"],
    figures: [
      "snap_person_wages", "snap_excluded_earned_income", "snap_self_employment_income", "snap_farm_self_employment_loss",
      "snap_boarder_income", "snap_person_earned_income_other_than_self_employment", "snap_person_earned_income",
      "snap_household_gross_income", "snap_household_net_income",
    ],
    metamorphic: [],
    notInvariant: {
      "ME-1": "SNAP converts each pay by its frequency (4.402.A.2): a stream split in two is not one pay schedule",
      "ME-3": "SNAP averages over the year (4.403.3, 4.403.12) and tests irregular pay over the quarter (4.405.A)",
    },
    bases: [
      { id: "CO-155", person: "p1", label: "SNAP" },
    ],
  },
};

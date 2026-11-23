// SNAP track registry (docs/design-earned-and-resource-records.md 4.3,
// rule 3). Owned by the SNAP E1 track: the figures its harness compares,
// the figures that read the records (for the metamorphic relations), the
// relations its rules say are not invariant, and its generated-household
// bases. Set up in step E0 by the integration owner with today's earned
// figures; step E1 (docs/reviews/records-earnings-snap.md) moved SNAP's
// readers onto the earnings records and registers them here.
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
      // step E1: the figures that read the earnings records
      "snap_person_counted_wages", "snap_self_employment_gross_receipts", "snap_farm_gross_receipts", "snap_farm_costs",
      "snap_self_employment_costs", "snap_room_and_board_payments", "snap_person_pay_received",
      "snap_irregular_earnings_are_excluded",
    ],
    metamorphic: [
      "snap_person_wages", "snap_person_counted_wages", "snap_excluded_earned_income", "snap_self_employment_income",
      "snap_farm_self_employment_loss", "snap_boarder_income", "snap_person_earned_income", "snap_person_pay_received",
    ],
    notInvariant: {
      // ME-1 runs from the records E1 integration: the split halves a boarder record's boarders and a business's hours.
      "ME-3": "SNAP averages over the year (4.403.3, 4.403.12) and tests irregular pay over the quarter (4.405.A): a record stated for one month is not the same as one that recurs in the months those rules read",
    },
    bases: [
      { id: "CO-155", person: "p1", label: "SNAP" },
      { id: "CO-447", person: "p1", label: "SNAPfarm" },
    ],
  },
};

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
  holdings: {
    // Resource records, step H0 (docs/reviews/holdings-h0.md): set up by the
    // integration owner with today's resource figures. Step H1 SNAP
    // (docs/reviews/records-holdings-snap-af.md) moved SNAP's readers onto
    // the holdings records and registers the figures that read them.
    tables: ["snap_holding_treatment_table"],
    figures: [
      "snap_countable_liquid_resources", "snap_countable_nonliquid_resources", "snap_household_countable_resources",
      "snap_sponsor_deemed_resources", "snap_resource_transfer_disqualification_months", "snap_resource_transfer_is_disqualifying",
      "snap_is_disqualified_for_resource_transfer",
      // step H1: the figures that read the holdings records (CO-5310 to CO-5315)
      "snap_real_property_not_exempt", "snap_countable_real_property", "snap_countable_funeral_agreements",
      "snap_countable_burial_spaces", "snap_disqualifying_transfer_value", "snap_disqualifying_transfer_value_before_application",
      "snap_household_liquid_resources",
      // coverage pass 4 SNAP resources (SR-3, SR-5): non-liquid personal property and installment contracts
      "snap_countable_other_nonliquid_resources",
    ],
    metamorphic: [
      "snap_countable_liquid_resources", "snap_countable_nonliquid_resources", "snap_real_property_not_exempt",
      "snap_countable_real_property", "snap_countable_funeral_agreements", "snap_countable_burial_spaces",
      "snap_disqualifying_transfer_value", "snap_household_countable_resources", "snap_countable_other_nonliquid_resources",
    ],
    // The SNAP household's figures; MH-3 is not run (below).
    coupleFigures: ["snap_household_countable_resources", "snap_household_liquid_resources"],
    notInvariant: {
      "MH-3": "SNAP's household is not the couple: a spouse who is not a member of the SNAP household (in an institution that provides meals, or an ineligible student) is outside it, so an account stated whole on that spouse is not the household's, while the same account stated jointly is counted in its entirety on the member's list (10 CCR 2506-1 4.409.C, a separate household's joint resource; coverage pass 4 SNAP resources SR-8, OQ-1252 resolved in part): the two statements are not the same household's resources (CO-01, CO-02 and the other long-term care couples)",
    },
    bases: [
      { id: "CO-223", person: "p1", label: "SNAP resources" },
      { id: "CO-447", person: "p2", label: "SNAP member" },
    ],
  },
};

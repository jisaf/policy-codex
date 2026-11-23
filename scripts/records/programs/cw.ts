// Colorado Works track registry (docs/design-earned-and-resource-records.md
// 4.3, rule 3). Owned by the Colorado Works E1 track; see snap.ts for what
// each list is.
import type { Track } from "./types";

export const track: Track = {
  track: "cw",
  programs: ["ColoradoWorks"],
  earnings: {
    tables: ["cw_earnings_treatment_table"],
    figures: [
      "cw_earned_pay", "cw_new_source_earnings", "cw_excluded_earned_income", "cw_self_employment_business_costs",
      "cw_self_employment_net_profit", "cw_boarder_income", "cw_gross_earned_income", "cw_payment_countable_earned_income",
      "cw_countable_income", "cw_earned_income_is_unverified",
    ],
    // E1 Colorado Works (docs/reviews/records-earnings-cash.md): the figures that read the earnings records.
    metamorphic: [
      "cw_earned_pay", "cw_new_source_earnings", "cw_excluded_earned_income", "cw_self_employment_business_costs",
      "cw_self_employment_net_profit", "cw_boarder_income", "cw_gross_earned_income", "cw_payment_countable_earned_income",
      "cw_countable_income",
    ],
    notInvariant: {
      "ME-1": "Colorado Works deducts a Food Assistance allotment per boarder (3.605.2.E.4.c, e, S3159): a boarder record split in two states its boarders twice",
    },
    bases: [
      { id: "CO-358", person: "p1", label: "CW applicant" },
      { id: "CO-83", person: "p2", label: "CW stepparent (deemed)" },
    ],
  },
};

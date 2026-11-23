// Adult Financial track registry (docs/design-earned-and-resource-records.md
// 4.3, rule 3). Owned by the Adult Financial E1 track; see snap.ts for what
// each list is.
import type { Track } from "./types";

export const track: Track = {
  track: "af",
  programs: ["AdultFinancial"],
  earnings: {
    tables: ["af_earnings_treatment_table"],
    figures: [
      "af_earned_pay", "af_boarder_income", "af_excluded_earned_income", "af_self_employment_business_costs",
      "af_self_employment_net_profit", "af_gross_earned_income", "af_countable_income", "af_deemed_relative_income",
      "af_spouse_dependent_children_needs", "af_earned_income_is_unverified",
    ],
    // E1 Adult Financial (docs/reviews/records-earnings-cash.md): the figures that read the earnings records.
    metamorphic: [
      "af_earned_pay", "af_boarder_income", "af_excluded_earned_income", "af_self_employment_business_costs",
      "af_self_employment_net_profit", "af_gross_earned_income", "af_countable_income", "af_deemed_relative_income",
    ],
    notInvariant: {
      "ME-3": "Adult Financial averages a farm's income over the year (3.520.783, S3505) and tests infrequent pay over the quarter",
    },
    bases: [
      { id: "CO-196", person: "p1", label: "AF client" },
      { id: "CO-196", person: "p2", label: "AF spouse (deemed)" },
    ],
  },
};

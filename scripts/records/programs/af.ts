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
  holdings: {
    // Resource records, step H0 (docs/reviews/holdings-h0.md): set up by the
    // integration owner with today's resource figures; the Adult Financial
    // H1 track moves its readers onto the holdings records.
    tables: ["af_holding_treatment_table"],
    figures: [
      "af_exempt_liquid_resources", "af_self_support_property_countable_value", "af_person_countable_resources_other_than_life_insurance",
      "af_life_insurance_cash_value", "af_life_insurance_countable_cash_value", "af_life_insurance_countable_value_for_oap",
      "af_life_insurance_countable_value_other_than_oap", "af_client_and_spouse_countable_resources", "af_sponsor_countable_resources",
      "af_twfc_transfer_is_counted", "af_twfc_penalty_months", "af_burial_responsible_person_resources",
    ],
    metamorphic: [],
    coupleFigures: [],
    bases: [
      { id: "CO-196", person: "p1", label: "AF client resources" },
      { id: "CO-196", person: "p2", label: "AF spouse resources" },
    ],
  },
};

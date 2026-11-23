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
    // integration owner with today's resource figures. Step H1 Adult
    // Financial (docs/reviews/records-holdings-snap-af.md) moved the readers
    // onto the holdings records and registers the figures that read them.
    tables: ["af_holding_treatment_table"],
    figures: [
      "af_exempt_liquid_resources", "af_self_support_property_countable_value", "af_person_countable_resources_other_than_life_insurance",
      "af_life_insurance_cash_value", "af_life_insurance_countable_cash_value", "af_life_insurance_countable_value_for_oap",
      "af_life_insurance_countable_value_other_than_oap", "af_client_and_spouse_countable_resources", "af_sponsor_countable_resources",
      "af_twfc_transfer_is_counted", "af_twfc_penalty_months", "af_burial_responsible_person_resources",
      // step H1: the figures that read the holdings records (CO-5340 to CO-5350)
      "af_cash_and_convertible_holdings", "af_countable_retirement_accounts", "af_countable_real_property", "af_countable_vehicles",
      "af_countable_burial_holdings", "af_countable_personal_property", "af_countable_home_equity", "af_life_insurance_face_value",
      "af_life_insurance_bought_within_lookback", "af_life_insurance_premiums_in_lookback", "af_resources_known_lower_bound",
      "af_meets_resource_limit",
    ],
    metamorphic: [
      "af_cash_and_convertible_holdings", "af_exempt_liquid_resources", "af_countable_retirement_accounts", "af_countable_real_property",
      "af_self_support_property_countable_value", "af_countable_vehicles", "af_countable_burial_holdings", "af_countable_personal_property",
      "af_countable_home_equity", "af_person_countable_resources_other_than_life_insurance", "af_life_insurance_cash_value",
      "af_life_insurance_face_value",
    ],
    // MH-3: a spouse's account stated as a joint holding of the two spouses
    // (share 0.5 each, 3.520.73.A.2) is counted once for the couple.
    coupleFigures: ["af_client_and_spouse_countable_resources"],
    bases: [
      { id: "CO-196", person: "p1", label: "AF client resources" },
      { id: "CO-196", person: "p2", label: "AF spouse resources" },
    ],
  },
};

// Medicaid and CHP+ track registry (docs/design-earned-and-resource-records.md
// 4.3, rule 3). Owned by the Medicaid and CHP+ E1 track (MAGI, the SSI
// method, long-term care, the buy-ins; CHP+ reads Medicaid's MAGI income by
// its adopted-method link); see snap.ts for what each list is.
import type { Track } from "./types";

export const track: Track = {
  track: "medicaid",
  programs: ["Medicaid", "CHP+"],
  earnings: {
    tables: ["ma_magi_earnings_treatment_table", "ma_ssi_earnings_treatment_table"],
    figures: [
      "ma_self_employment_net_earnings", "ma_excluded_difficulty_of_care_payments", "ma_person_magi_income", "ma_magi_household_income",
      "ma_ssi_excluded_earned_income", "ma_ssi_countable_income", "ma_wawd_countable_income", "ma_cbwd_household_earned_income",
      "ma_ssi_parental_income_deemed",
      // E1 (Medicaid and CHP+): the figures that read the earnings records
      "ma_magi_wage_earnings", "ma_magi_self_employment_earnings", "ma_ssi_wage_earnings", "ma_ssi_gross_earned_income",
      "ma_ssi_exempt_earned_receipts", "ma_ssi_irregular_earned_receipts", "ma_ssi_pass_set_aside_earned_income",
      "ma_employer_pay_for_verification", "ma_ltc_gross_income", "ma_community_spouse_income", "ma_ssi_ineligible_child_allocation",
      "ma_pickle_countable_income", "ma_dac_countable_income",
    ],
    // E1: the figures that read the earnings records, which the metamorphic relations compare
    metamorphic: [
      "ma_magi_wage_earnings", "ma_magi_self_employment_earnings", "ma_person_magi_income", "ma_ssi_gross_earned_income",
      "ma_self_employment_net_earnings", "ma_ssi_countable_income", "ma_ltc_gross_income", "ma_wawd_countable_income",
      "ma_employer_pay_for_verification",
    ],
    notInvariant: {
      "ME-3": "the SSI method tests infrequent pay over the quarter (416.1112(c)(2)) and the student exclusion over the year",
      // ME-1 runs from the records E1 integration: the split halves a boarder record's boarders and a business's hours (R-2).
    },
    bases: [
      { id: "CO-202", person: "p1", label: "MA MAGI parent" },
      { id: "CO-185", person: "p1", label: "MA aged" },
      { id: "CO-187", person: "p1", label: "MA WAWD" },
      { id: "CO-386", person: "p1", label: "CHP parent" },
      // E1: the SSI-method bases of receipts phase 2 (scripts/receipts/generate.ts)
      { id: "CO-189", person: "p2", label: "MA aged spouse" },
      { id: "CO-186", person: "p2", label: "MA deeming parent" },
      { id: "CO-112", person: "p1", label: "MA LTC" },
      { id: "CO-112", person: "p2", label: "MA community spouse" },
      { id: "CO-145", person: "p3", label: "MA CBWD child" },
    ],
  },
  holdings: {
    // Resource records, step H0 (docs/reviews/holdings-h0.md): set up by the
    // integration owner with today's resource figures (the SSI method,
    // shared ssi_countable_resources_individual included, the MSP, LTC and
    // the CSRA, transfers); the Medicaid H1 track moves its readers onto the
    // holdings records, in sequential sub-commits (design 4.2).
    tables: ["ma_ssi_holding_treatment_table"],
    figures: [
      "ssi_countable_resources_individual", "ssi_countable_resources_couple", "ma_excluded_real_property_value",
      "ma_countable_income_producing_property_value", "ma_home_is_countable_resource", "ma_home_is_countable_resource_without_beneficiary_deed",
      "ma_home_equity_counted_only_by_beneficiary_deed", "ma_ssi_countable_resources_individual", "ma_ssi_countable_resources",
      "ma_ssi_parental_resources_deemed", "ma_msp_countable_resources", "ma_csra", "ma_institutionalized_spouse_countable_resources",
      "ma_home_equity_disqualifies", "ma_transfer_penalty_months", "ma_transfer_penalty_days", "ma_transfer_penalty_applies",
      // H1 (Medicaid): the figures that read the holdings records
      "ma_ssi_holdings_countable_in_month", "ma_ssi_excluded_automobile_equity_in_month", "ma_ssi_countable_resources_in_month",
      "ma_real_property_for_sale_excluded_in_month", "ma_uncompensated_transfers_in_lookback", "ma_ssi_retirement_accounts_counted_in_month",
      "ma_home_equity_interest_in_month", "ma_liquid_holdings_value_in_month", "ma_holds_trust_interest_in_month", "ma_holds_annuity_in_month",
      "ma_spousal_resources_at_snapshot",
    ],
    // H1 (Medicaid): the figures that read the holdings records, which the
    // metamorphic relations compare
    metamorphic: [
      "ssi_countable_resources_individual", "ma_ssi_countable_resources_individual", "ma_ssi_holdings_countable_in_month",
      "ma_ssi_countable_resources_in_month", "ma_ssi_excluded_automobile_equity_in_month", "ma_excluded_real_property_value",
      "ma_countable_income_producing_property_value", "ma_home_equity_interest_in_month", "ma_uncompensated_transfers_in_lookback",
      "ma_ssi_retirement_accounts_counted_in_month",
    ],
    // MH-3 joint: the couple's figures (20 CFR 416.1202(a); 8.100.7.L "whether owned jointly or individually")
    // (ma_institutionalized_spouse_countable_resources is the person's own figure for anyone not an LTC couple, CO-647)
    coupleFigures: ["ssi_countable_resources_couple", "ma_spousal_resources_at_snapshot"],
    bases: [
      { id: "CO-185", person: "p1", label: "MA aged resources" },
      { id: "CO-189", person: "p2", label: "MA aged spouse resources" },
      { id: "CO-186", person: "p2", label: "MA deeming parent resources" },
      { id: "CO-112", person: "p1", label: "MA LTC resources" },
    ],
  },
};

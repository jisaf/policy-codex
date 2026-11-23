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
      // E1: the split keeps a boarder record's boarders on both halves (it halves amounts only), so the allowance per
      // boarder is taken twice; a request to the integration owner (docs/reviews/records-earnings-medicaid.md, R-2):
      // halve or leave whole the boarder records in ME-1, after which this line is removed.
      "ME-1": "the SSI method's boarder allowance is per boarder (10 CCR 2505-10 8.100.3.K.10.c, e), and the split states each record's boarders on both halves",
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
};

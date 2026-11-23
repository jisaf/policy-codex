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
    ],
    metamorphic: [],
    notInvariant: {
      "ME-3": "the SSI method tests infrequent pay over the quarter (416.1112(c)(2)) and the student exclusion over the year",
    },
    bases: [
      { id: "CO-202", person: "p1", label: "MA MAGI parent" },
      { id: "CO-185", person: "p1", label: "MA aged" },
      { id: "CO-187", person: "p1", label: "MA WAWD" },
      { id: "CO-386", person: "p1", label: "CHP parent" },
    ],
  },
};

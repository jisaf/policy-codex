// CCCAP track registry (docs/design-earned-and-resource-records.md 4.3,
// rule 3). Owned by the CCCAP E1 track; see snap.ts for what each list is.
// E1 (CCCAP; docs/reviews/records-earnings-care-energy.md): CCCAP reads its
// earnings records, so its figures that read them are compared by the
// metamorphic relations that hold for CCCAP.
import type { Track } from "./types";

export const track: Track = {
  track: "cccap",
  programs: ["CCCAP"],
  earnings: {
    tables: ["cccap_earnings_treatment_table"],
    figures: [
      "cccap_person_gross_wages", "cccap_self_employment_gross_receipts", "cccap_self_employment_business_expenses",
      "cccap_self_employment_net_earnings", "cccap_other_countable_receipts", "cccap_irregular_earnings", "cccap_irregular_earnings_in_quarter",
      "cccap_person_earned_income", "cccap_has_earned_income", "cccap_caretaker_in_eligible_activity", "cccap_household_income",
    ],
    metamorphic: [
      "cccap_person_gross_wages", "cccap_self_employment_gross_receipts", "cccap_self_employment_business_expenses",
      "cccap_self_employment_net_earnings", "cccap_other_countable_receipts", "cccap_person_earned_income", "cccap_has_earned_income",
    ],
    notInvariant: {
      "ME-1": "CCCAP's launch-period income is the federal minimum wage times the declared hours of the business (3.111.G.2.e), and ME-1 does not halve a record's hours: two records with the same hours state twice the hours (request R-3, docs/reviews/records-earnings-care-energy.md)",
      "ME-3": "CCCAP reads the prior thirty days at application (3.111.H.5.a.1) and may average a business over twelve months (I.2.c)",
    },
    bases: [
      { id: "CO-345", person: "p1", label: "CCCAP" },
    ],
  },
};

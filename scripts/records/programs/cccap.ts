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
    metamorphic: [
      "cccap_person_gross_wages", "cccap_self_employment_gross_receipts", "cccap_self_employment_business_expenses",
      "cccap_self_employment_net_earnings", "cccap_other_countable_receipts", "cccap_person_earned_income", "cccap_has_earned_income",
    ],
    notInvariant: {
      // ME-1 runs from the records E1 integration: the split halves a boarder record's boarders and a business's hours.
      "ME-3": "CCCAP reads the prior thirty days at application (3.111.H.5.a.1) and may average a business over twelve months (I.2.c)",
    },
    bases: [
      { id: "CO-345", person: "p1", label: "CCCAP" },
    ],
  },
};

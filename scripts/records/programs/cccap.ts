// CCCAP track registry (docs/design-earned-and-resource-records.md 4.3,
// rule 3). Owned by the CCCAP E1 track; see snap.ts for what each list is.
import type { Track } from "./types";

export const track: Track = {
  track: "cccap",
  programs: ["CCCAP"],
  earnings: {
    tables: ["cccap_earnings_treatment_table"],
    figures: [
      "cccap_self_employment_net_earnings", "cccap_other_countable_receipts", "cccap_person_earned_income", "cccap_household_income",
    ],
    metamorphic: [],
    notInvariant: {
      "ME-3": "CCCAP reads the prior thirty days at application (3.111.H.5.a.1) and may average a business over twelve months (I.2.c)",
    },
    bases: [
      { id: "CO-345", person: "p1", label: "CCCAP" },
    ],
  },
};

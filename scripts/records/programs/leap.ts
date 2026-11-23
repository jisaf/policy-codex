// LEAP track registry (docs/design-earned-and-resource-records.md 4.3,
// rule 3). Owned by the LEAP E1 track; see snap.ts for what each list is.
import type { Track } from "./types";

export const track: Track = {
  track: "leap",
  programs: ["LEAP"],
  earnings: {
    tables: ["leap_earnings_treatment_table"],
    figures: [
      "leap_wages_in_income_verification_period", "leap_person_wages", "leap_self_employment_income", "leap_household_income",
    ],
    metamorphic: [],
    notInvariant: {
      "ME-1": "LEAP averages the pays of four of the eight weeks before application (3.752.22.B-C), not dollars",
      "ME-3": "LEAP places pays by date against the application date (3.752.22.A-C)",
    },
    bases: [
      { id: "CO-224", person: "p1", label: "LEAP" },
    ],
  },
};

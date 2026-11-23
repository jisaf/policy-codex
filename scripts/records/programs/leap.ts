// LEAP track registry (docs/design-earned-and-resource-records.md 4.3,
// rule 3). Owned by the LEAP E1 track; see snap.ts for what each list is.
// E1 (LEAP; docs/reviews/records-earnings-care-energy.md): LEAP reads its
// earnings records, so its figures that read them are compared by the
// metamorphic relations that hold for LEAP.
import type { Track } from "./types";

export const track: Track = {
  track: "leap",
  programs: ["LEAP"],
  earnings: {
    tables: ["leap_earnings_treatment_table"],
    figures: [
      "leap_wages_in_income_verification_period", "leap_ongoing_wage_streams", "leap_ongoing_dated_wages", "leap_scsep_wages",
      "leap_person_wages", "leap_self_employment_gross_receipts", "leap_self_employment_allowable_costs", "leap_self_employment_income",
      "leap_boarder_payments", "leap_earnings_are_excluded_as_child", "leap_requires_verification_of_earned_income", "leap_household_income",
    ],
    metamorphic: [
      "leap_ongoing_wage_streams", "leap_scsep_wages", "leap_person_wages", "leap_self_employment_gross_receipts",
      "leap_self_employment_allowable_costs", "leap_self_employment_income", "leap_boarder_payments",
    ],
    notInvariant: {
      "ME-1": "LEAP averages the pays of four of the eight weeks before application (3.752.22.B-C), not dollars",
      "ME-3": "LEAP places pays by date against the application date (3.752.22.A-C)",
    },
    bases: [
      { id: "CO-224", person: "p1", label: "LEAP" },
    ],
  },
};

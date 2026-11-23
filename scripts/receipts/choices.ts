// Receipt records translation: the kind chosen, case by case, for an old
// fact that names two sources the kinds split (docs/reviews/
// receipts-migration-1.md, "Facts that named two sources"). A case not
// listed takes the default (translate.ts, choiceFor): ssi for a retroactive
// "SSI or public assistance" lump sum, general_assistance for "general or
// emergency assistance". Each entry says why, from the case's own text.
import type { Choices } from "./translate";

export const CHOICES: Choices = {
  // Every stored household that states retroactive_ssi_or_public_assistance_lump_sum_received
  // states 0 (CO-185 to CO-189, CO-392), so no choice is needed there.
  retroactiveSsiOrPa: {},
  generalOrEmergency: {
    // CO-358 (probe CWZ-14): "The mother receives $300 of county General Assistance."
    "CO-358": "general_assistance",
  },
  // No stored household states in_home_care_allowance_received above 0; a
  // household whose allowance is the Adult Financial Home Care Allowance is
  // listed here as home_care_allowance (H-5). adult_financial_cash_income
  // could hold the HCA too; a household that states it there states the
  // grant, which the translation cannot split, and is restated by hand.
  homeCareAllowance: {},
};

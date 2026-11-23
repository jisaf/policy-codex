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
};

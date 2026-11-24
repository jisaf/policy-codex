/* The roles a visitor works as (the sidebar's "Working as" picker and the
 * Desk's role doors): who a visitor is, which programs and approval roles
 * are theirs. The pages read the chosen persona to filter to "mine". */
import { signal, type Signal } from "@preact/signals";
import type { VolumeMeta } from "../engine/types";

export type PersonaId = "hcpf" | "cdhs" | "cdec" | "legal" | "county" | "engineer";

export interface Persona {
  id: PersonaId;
  /** The door's title, in the visitor's own words. */
  label: string;
  /** The agency or office, shown under the title. */
  agency: string;
  /** One sentence: what this door opens. */
  body: string;
  /** Declared program ids this persona owns or works in. Empty means every
   *  program (legal, county, engineering read across them all). */
  programs: string[];
  /** Approval-policy roles this persona signs as (volume.yaml
   *  `approval_policy.roles`); filtered to the volume's own roles by
   *  `personaRoles`. */
  roles: string[];
  /** The older door (docs/design-onboarding.md) this persona implies, so the
   *  engineer still gets the Handoff nav entry and so on. */
  door: "admin" | "reader" | "sme" | "engineer";
}

export const PERSONAS: Persona[] = [
  {
    id: "hcpf", label: "HCPF policy", agency: "Health Care Policy and Financing",
    body: "Medicaid and CHP+: what needs your sign-off, your open questions, your outcomes.",
    programs: ["Medicaid", "CHP+"],
    roles: [
      "Medicaid policy owner", "CHP+ policy owner", "LTSS policy owner",
      "Premium and finance owner", "State plan coordinator", "Eligibility operations owner",
    ],
    door: "reader",
  },
  {
    id: "cdhs", label: "CDHS policy", agency: "Human Services",
    body: "SNAP, Colorado Works, Adult Financial, LEAP and SUN Bucks: sign-offs, questions, outcomes.",
    programs: ["SNAP", "ColoradoWorks", "AdultFinancial", "LEAP", "SunBucks"],
    roles: [
      "SNAP policy owner", "Cash programs policy owner", "Energy assistance (LEAP) policy owner",
      "School meals (CDE) co-approver",
    ],
    door: "reader",
  },
  {
    id: "cdec", label: "CDEC", agency: "Early Childhood",
    body: "Child care assistance (CCCAP): what needs your sign-off and what is still open.",
    programs: ["CCCAP"],
    roles: ["Child care policy owner (CDEC)"],
    door: "reader",
  },
  {
    id: "legal", label: "Legal", agency: "Attorney General's office",
    body: "Questions that need a legal opinion, statute-over-rule departures and unverified figures.",
    programs: [],
    roles: ["Legal"],
    door: "reader",
  },
  {
    id: "county", label: "County worker", agency: "County human services",
    body: "Step through how a test household's result is reached, rule by rule, in plain words, with the rule text behind each step.",
    programs: [],
    roles: [],
    door: "admin",
  },
  {
    id: "engineer", label: "Engineer", agency: "Implementation vendor",
    body: "The handoff, the conformance suite, and each rule's decision record back to statute.",
    programs: [],
    roles: ["Data steward"],
    door: "engineer",
  },
];

export const PERSONA_KEY = "codex.persona";

export function personaById(id: string | null | undefined): Persona | null {
  return PERSONAS.find((p) => p.id === id) ?? null;
}

function readPersona(): PersonaId | null {
  try { return personaById(localStorage.getItem(PERSONA_KEY))?.id ?? null; } catch { return null; }
}

/** The persona the visitor last chose on the start page, or null. */
export const personaSig: Signal<PersonaId | null> = signal(readPersona());

export function setPersona(id: PersonaId | null): void {
  personaSig.value = id;
  try {
    if (id === null) localStorage.removeItem(PERSONA_KEY);
    else localStorage.setItem(PERSONA_KEY, id);
  } catch { /* blocked */ }
}

/** The approval roles a persona signs as, limited to the roles this volume's
 *  policy declares (a volume without the role has nothing for it to sign). */
export function personaRoles(p: Persona, meta: VolumeMeta): string[] {
  const declared = meta.approval_policy?.roles ?? [];
  return p.roles.filter((r) => declared.includes(r));
}

/** The programs a persona works in, limited to the volume's declared ones;
 *  an empty persona list means all of them. */
export function personaPrograms(p: Persona, programIds: readonly string[]): string[] {
  return p.programs.length ? p.programs.filter((id) => programIds.includes(id)) : [...programIds];
}

/* Turns the classified cells of a harness run (scripts/audit/pattern-sweep-cash-classify.ts) into enumerated allowed
 * differences, one entry per class, person, identifier, month and pair of values, naming every case:
 *
 *   npx vite-node scripts/audit/pattern-sweep-cash-allow.ts <classified.json> <out.yaml> [--header "<comment>"]
 *
 * A cell's class is the sweep's change its trace shows (docs/reviews/pattern-sweep-cash.md, section 6): the fact now
 * required that its evaluation reports missing, or the fact whose absence no longer leaves it undetermined, or the
 * fixed reader its value moves through. A cell no class explains is printed and left out, to be traced by hand; a cell
 * whose value at the branch before the sweep is already the new value is not the sweep's and is printed apart. */
import fs from "node:fs";

type Cell = { source: string; case: string; person: string; identifier: string; month: string; old: unknown; new: unknown; before: unknown; now: unknown; sweep: boolean; newMiss: string[]; goneMiss: string[]; nowMiss: string[] };
const args = process.argv.slice(2).filter((a) => a !== "--");
const cells = JSON.parse(fs.readFileSync(args[0], "utf8")) as Cell[];
const out = args[1];
const header = args.includes("--header") ? args[args.indexOf("--header") + 1] : "";

const R = "(docs/reviews/pattern-sweep-cash.md, section 3; decision 4 of 2026-11-23)";
const CLASSES: Record<string, string> = {
  "PS-D2": `cash pattern sweep PS-D2 ${R}: Colorado Works and Adult Financial read living together from dwelling_id as stated (9 CCR 2503-6 3.604.2.A, E, I; 9 CCR 2503-5 3.534.B.3, 3.549.E; convention rule 17 amended); the household states no dwelling_id, so whether its persons live together, and what the unit, the caretakers and the deeming read from it, cannot be determined (was read as living together)`,
  "PS-T8": `cash pattern sweep PS-T8 and PS-D3 ${R}: the Colorado Works unit of the month takes only a member living in the home in the month (cw_is_considered_living_in_home_in_month CO-7602; 3.604.2.E, G, I, O.2), which reads the person's absence (temporary_absence_reason) and, for a person in the home, the residence setting; the household does not state them, so the month's unit and what reads it cannot be determined (before, the month's unit did not test living in the home and an unstated setting was read as a private dwelling)`,
  "PS-T8v": `cash pattern sweep PS-T8 (9 CCR 2503-6 3.604.2.I.3, O.2: a resident of an institution, or a person away past the limit of the absence, "is not considered to be in the home"; docs/reviews/pattern-sweep-cash.md, section 3): the person is not living in the home in the month (cw_is_considered_living_in_home_in_month CO-7602) and so is no member of the month's Colorado Works unit (CO-7303); the person's own unit has no member, or no dependent child, in the month (before, the month's unit did not test the person's own living in the home)`,
  "PS-T5": `cash pattern sweep PS-T5 (9 CCR 2503-6 3.604.3.I.4.b, S877; docs/reviews/pattern-sweep-cash.md, section 3): the lawful presence verification reads the age on the month's first day and the month's pregnancy (cw_is_pregnant_in_month CO-7301), not the determination date's; where the pregnancy's start is not stated the month's pregnancy cannot be determined (coverage pass 6 CA6-3), and where the determination date's pregnancy was unstated the month's is determined from the dates`,
  "PS-D5i": `cash pattern sweep PS-D5 (9 CCR 2503-6 3.609.5: an IPV is established by an administrative disqualification hearing or a signed waiver of it; docs/reviews/pattern-sweep-cash.md, section 3): the IPV disqualification is the county's finding, read inside cw_is_disqualified_member (CO-928) as none when the household states none, so the member's income is determined where the old reading left it unknown (the default was CO-921's, on the whole test, and CO-910, CO-923 had none)`,
  "PS-D5": `cash pattern sweep PS-D5 ${R}: whether a member is a fugitive or fleeing felon (3.604.2.L.1, is_fleeing_felon) is required where read; the household does not state it (before, cw_eligibility_status read the whole disqualified-member test as false when unknown)`,
  "PS-D8": `cash pattern sweep PS-D8 ${R}: the AND-SO interview date (3.541.1.A.1.b, af_interview_date) and whether the AND-SO application is a subsequent one (3.520.71.C) are required where read; the household does not state them (before, the interview was read as the verification request date and the application as a first one)`,
  "PS-D9": `cash pattern sweep PS-D9 ${R}: whether the Adult Financial determination is a redetermination (and, for one, a twenty-four-month one with newly reported resources) decides the resource verification (3.520.5); the household does not state it (before, read as an application)`,
  "PS-D10": `cash pattern sweep PS-D10 ${R}: a client who has requested disaster assistance and has an emergent need has it determined against a declared disaster (3.570.51-52, declared_disaster_in_effect), required where read (before, an unstated declaration was read as none)`,
  "PS-D1": `cash pattern sweep PS-D1 ${R}: the Home Care Allowance's setting, absence and expected stay are required where read, and the combined leave days for a client approved before the determination (3.570.12, 3.570.17.C.4, C.7); the household does not state them`,
  "PS-D1v": `cash pattern sweep PS-D1 (9 CCR 2503-5 3.570.13.F, S3503: payment begins "on the first day of the month following the month in which the HCA is approved ... There shall be no retroactive HCA payments"; docs/reviews/pattern-sweep-cash.md, section 3): the household states no earlier approval (af_hca_approval_date), so the client is approved at this determination and nothing is paid for the determination month or a month before it (before, an unstated approval date was read as no limit)`,
  "PS-D6": `cash pattern sweep PS-D6 ${R}: whether the client receives OAP-C (receives_oap_c, from adult_financial_program_received) is required where a home not lived in would count (3.530.1, 3.520.77.C); the household does not state it (before, read as not OAP-C)`,
  "PS-M3": `cash pattern sweep PS-M3 ${R}: sponsor deeming reaches this person (Adult Financial 3.520.69.E and 3.534; Colorado Works 3.605.1.A.5) and the facts it turns on (the person's immigration status and sponsorship, the sponsor as a person of the case) are not stated, so the deemed income cannot be determined (before, a sponsor not in the case contributed nothing and the 125% test of 3.605.1.A.5.c.5 read the sponsor's income as 0)`,
  "PS-D4": `cash pattern sweep PS-D4 and PS-M1 ${R}: Adult Financial's spouse is the spouse of the month (af_spouses_in_month CO-7603), read from the relationships as stated: a client whose relationships are not stated in a case of more than one person cannot be determined; a case of one person has no spouse among its persons, so a figure the old reading left undetermined there is now determined`,
  "PS-T12D4": `cash pattern sweep PS-T12 and PS-D4 (9 CCR 2503-5 3.554.C.6, S5180; 3.520.63.A; docs/reviews/pattern-sweep-cash.md, section 3): Adult Financial's AND-SO SSI bar and AND-CS condition read SSI received in the month (af_receives_ssi_in_month CO-7605), and its couple readers the spouse of the month (af_spouses_in_month CO-7603), so a figure the old readings left undetermined is now determined: a person with no SSI received in the month is no AND-CS client and meets no AND-SO SSI bar, whatever the award stated, and a case of one person has no spouse among its persons`,
  "PS-D11": `cash pattern sweep PS-D11 ${R}: the burial's legally responsible persons (3.570.42; af_burial_legally_responsible_persons CO-3312) are read from the relationships as stated, with no default; the household states no relationships for this person in a case of more than one person, so they cannot be determined (before, unstated relationships were read as no spouse and no parent)`,
  "PS-M1": `cash pattern sweep PS-M1 (9 CCR 2503-5 3.520.63.A, 3.533.A.2, 3.534.B; docs/reviews/pattern-sweep-cash.md, section 3): Adult Financial's marriage, couple and spouse deeming are the month's (af_spouses_in_month CO-7603, af_is_married CO-7308): the figure moves with the month's spouse`,
  "PS-T12": `cash pattern sweep PS-T12 (9 CCR 2503-5 3.554.C.6, S5180: AND-SO and Colorado Supplement payments "issued in the same month that the SSI or SSDI benefits are received" are recovered; docs/reviews/pattern-sweep-cash.md, section 3): AND-SO's SSI bar and AND-CS's SSI condition read SSI received in the month (af_receives_ssi_in_month CO-7605: the award and an SSI receipt in the month), so a person not awarded SSI is determined without the month's SSI receipts, and an award with no SSI received in the month opens no AND-CS month`,
  "PS-M4": `cash pattern sweep PS-M4 (9 CCR 2503-6 3.605.1.A.4, 3.609.2.C.1-2; docs/reviews/pattern-sweep-cash.md, section 3): the budgetary members, deemed parents and stepparent's children of the month are those alive on its first day and born by its last`,
};
/** Cells traced by hand (section 6): the household and person, and the class their trace shows. */
const HAND: Array<[RegExp, string]> = [
  [/^(CO-02 p1|CO-429 p2|CO-431 p2) cw_/, "PS-T8v"],
  [/^(CO-76|CO-110|CO-138|CO-491) p1 cw_lawful_presence_verification_is_pending$/, "PS-T5"],
  [/^CO-487 p1 cw_/, "PS-D5i"],
];
function classify(c: Cell): string | null {
  const hand = HAND.find(([re]) => re.test(`${c.case} ${c.person} ${c.identifier}`));
  if (hand) return hand[1];
  // every fact the evaluation on disk reports missing (a fact read through a default is reported too, so a fact the
  // sweep made required shows here whether or not the branch before reported it)
  const nm = c.nowMiss.map((m) => m.split("@")[0]);
  const gm = c.goneMiss.map((m) => m.split("@")[0]);
  const has = (xs: string[], re: RegExp) => xs.some((x) => re.test(x));
  if (c.now == null) {
    if (has(nm, /^(af_interview_date|af_is_subsequent_and_so_application)$/) && /^af_/.test(c.identifier)) return "PS-D8";
    if (has(nm, /^adult_financial_program_received$/) && /^af_/.test(c.identifier)) return "PS-D6";
    if (has(nm, /^(af_determination_is_redetermination|af_redetermination_is_twenty_four_month|af_has_newly_reported_resources)$/)) return "PS-D9";
    if (has(nm, /^declared_disaster_in_effect$/)) return "PS-D10";
    if (/hca/.test(c.identifier) && has(nm, /^(af_hca_combined_leave_days_in_approval_year|expects_institutional_stay_of_thirty_days|residence_setting_type|temporary_absence_reason)$/)) return "PS-D1";
    if (has(nm, /^is_fleeing_felon$/)) return "PS-D5";
    if (has(nm, /^(temporary_absence_reason|residence_setting_type|temporary_absence_start_date)$/)) return "PS-T8";
    if (has(nm, /^dwelling_id$/)) return "PS-D2";
    if (has(nm, /^(immigration_status|is_sponsored_non_citizen|status_before_lpr_adjustment|qualifying_quarters|is_victim_of_battery_or_extreme_cruelty)$/) || /sponsor/.test(c.identifier)) return "PS-M3";
    if (/^af_burial_/.test(c.identifier)) return "PS-D11";
    if (/^af_/.test(c.identifier)) return "PS-D4";
    return null;
  }
  if (c.before == null) {
    if (/^cw_/.test(c.identifier) && has(nm, /^cw_is_serving_ipv_disqualification$/)) return "PS-D5i";
    if (/^af_/.test(c.identifier)) return "PS-T12D4";
    return null;
  }
  if (c.identifier === "af_hca_grant") return "PS-D1v";
  return null;
}
const groups = new Map<string, { cls: string; cases: Set<string>; c: Cell }>();
const left: Cell[] = [];
const notMine: Cell[] = [];
for (const c of cells) {
  if (!c.sweep) { notMine.push(c); continue; }
  const k = classify(c);
  if (!k) { left.push(c); continue; }
  const key = JSON.stringify([k, c.person, c.identifier, c.month, c.old, c.new]);
  if (!groups.has(key)) groups.set(key, { cls: k, cases: new Set(), c });
  groups.get(key)!.cases.add(c.case);
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
const lines: string[] = header ? header.split("\\n").map((l) => "# " + l) : [];
const tally = new Map<string, number>();
for (const g of groups.values()) {
  const e: Record<string, unknown> = { case: `/^(${[...g.cases].sort().map(esc).join("|")})$/`, person: g.c.person, identifier: g.c.identifier };
  if (g.c.month) e.month = g.c.month;
  e.old = g.c.old == null ? "unknown" : g.c.old;
  e.new = g.c.new == null ? "unknown" : g.c.new;
  e.class = CLASSES[g.cls];
  lines.push("- " + JSON.stringify(e));
  tally.set(g.cls, (tally.get(g.cls) ?? 0) + g.cases.size);
}
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log(`entries ${groups.size}; cells ${cells.length}; classified ${[...tally.values()].reduce((a, b) => a + b, 0)}; not the sweep's ${notMine.length}; left ${left.length}`);
for (const [k, v] of [...tally].sort()) console.log(`  ${k}\t${v}`);
for (const c of left.slice(0, 40)) console.log(`LEFT ${c.case} ${c.person} ${c.identifier} @${c.month} old ${JSON.stringify(c.old)} new ${JSON.stringify(c.new)} before ${JSON.stringify(c.before)} now ${JSON.stringify(c.now)} +[${c.newMiss.slice(0, 6).join(",")}] -[${c.goneMiss.slice(0, 6).join(",")}]`);
for (const c of notMine.slice(0, 20)) console.log(`NOT-SWEEP ${c.case} ${c.person} ${c.identifier} @${c.month} old ${JSON.stringify(c.old)} new ${JSON.stringify(c.new)} before ${JSON.stringify(c.before)}`);

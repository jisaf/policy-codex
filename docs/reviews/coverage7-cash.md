# Coverage pass 7: the cash programs (Adult Financial and Colorado Works)

Reviewer: an independent seventh pass, the last before the product owner's sign-off, over both cash families: Adult Financial (OAP, AND-SO, AND-CS, the Home Care Allowance, burial, disaster assistance and the deeming of a spouse's, a parent's and a sponsor's income; 9 CCR 2503-5, D-80) and Colorado Works (9 CCR 2503-6, D-81; C.R.S. 26-2, D-59, where the items cite it). Review only: nothing in the ledger is changed. The dispositions of docs/reviews/coverage6-cash.md (section 8) and docs/reviews/pattern-sweep-cash.md were read for section 4 only; the matrix in section 3 was built from the fetched text.

Commit reviewed: `b467f1c` (branch ccr-9d19bf4c-wmnwcl), in a detached worktree with node_modules linked. Date: 2026-11-24. This file is the review's only file in the worktree; the probe runner `scripts/probe7.ts` there is scratch and untracked.

Governing texts, read from volumes/co/documents/:
- D-80, 9 CCR 2503-5 (rule version 12428, effective 2026-03-02): 3.510; 3.520.6 (3.520.61 to 3.520.69); 3.520.7 (3.520.71 to 3.520.79); 3.530 to 3.534; 3.540 to 3.549; 3.570.1 (HCA), 3.570.4 (burial), 3.570.5 (supportive payments); 3.581.C-E.
- D-81, 9 CCR 2503-6 (rule version 12030, effective 2025-07-01): 3.601; 3.604.1 to 3.604.4; 3.605.1 to 3.605.5; 3.606.1 to 3.606.3, 3.606.6 to 3.606.8; 3.608.4; 3.609.1-2.
- D-59, C.R.S. title 26: 26-2-703(2.5), (9); 26-2-706(1), (1.5).
- docs/plan-colorado.md (decision 4 of 2026-11-23; month-v1), docs/conventions.md (records; rule 17, lives_with), docs/operators.md (resolution, "Ages in a month", P55 to P60).

Tools and gates on the reviewed commit:
- `npm run check -- --volume co`: OK. Rule tests 6,273 of 6,273; household expectations 4,701 of 4,701; 25 change-impact flags, all dispositioned; conformance self-check 11,134 of 11,134.
- Items read: every Adult Financial and Colorado Works item's meaning and derivation (468 items: 259 Adult Financial, 209 Colorado Works, dumped by program), the new items of coverage pass 6 and the pattern sweep (CO-7300 to CO-7308, CO-7600, CO-7602 to CO-7604, CO-2604) and the shared items they read where an answer turned on them (lives_with CO-1925, is_married CO-930, receives_tanf_cash, immigration_status).
- Probe households: YAML at /tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/c7tools (p1.yaml to p8.yaml, built by p1.py to p8.py from lib.py), evaluated with the engine's `evaluate` by `npx vite-node scripts/probe7.ts <yaml> <case|all> <identifiers> [YYYY-MM ...]`. "The base client": CO-770 without its workers' compensation (an OAP client of 70, Social Security $600, $500 in the bank, determined 2026-10-01): countable 580, oap, $452. "The base unit": CO-670 with the mother's earnings removed (a mother and a daughter of 6, no income, application 2026-10-12, determined 2026-10-15): eligible, $320 (.65754 x 488).

## 1. Verdict

**3 P1** (1 common, 2 rare), **2 P2**, **2 P3**. The completion bar (no P1) is not met; each P1 has a concrete household, the engine's answer and the answer computed by hand from the quoted text, and a proposed fix small enough to go on the known-limits list as written.

- **F7-1** (P1, rare): Colorado Works counts a parenting-plan visit and a voluntary foster placement (3.604.2.G.2-3) in calendar months with the month the absence began as the first, so a visit is "over six months" after five months and a day and a placement "over three months" after two months and a day; the stored household CO-1032 carries the wrong October answer.
- **F7-2** (P1, common): an Adult Financial client who is married to a spouse who is not a person of the case (marital_status married, the volume's own reading of a spouse outside the case) has no spouse income deemed and no spouse resources counted, where decision 4 makes it cannot determine; the sponsor (PS-M3) and the non-MAGI couple (F6-7) were fixed for exactly this shape.
- **F7-3** (P1, rare): C.R.S. 26-2-706(1.5)(c) ("Not be receiving financial assistance from other financial assistance programs administered by the state of Colorado") has no item and no open question, so an OAP grandmother who asks to join her grandchild's Colorado Works unit brings her pension into it and the grandchild loses the child-only grant.

The fixes of coverage pass 6 and the pattern sweep hold (section 4), with one exception: PS-T8's month counting of G.2 and G.3 is F7-1. Every open question the cash items cite is a recorded state policy choice, a needs-Legal question with its reading in force, or blocked on a named unfetchable document (section 5); F7-1 and F7-3 are the two questions the text leaves that no open question records.

## 2. Findings

| id | sev | common/rare | paragraph | item(s) | governing text (quoted) | repro (engine against hand) | proposed fix |
|---|---|---|---|---|---|---|---|
| F7-1 | **P1** | **rare**: needs a child away from the home past forty-five days under a parenting plan or in voluntary foster care, with the determination landing in the calendar month the engine counts as the seventh (fourth); one line: the shape is rare, but every such case within a month of the limit gets the wrong month | 9 CCR 2503-6 3.604.2.G.2-3; C.R.S. 26-2-706(1)(a.5)(V); OQ-1435 (the day an earlier month is read; the determination month on the determination date) | cw_is_considered_living_in_home_in_month CO-7602 (the parenting-plan and voluntary-foster-care arms), through cw_is_assistance_unit_member_in_month CO-7303 to CO-921, CO-914; cw_parenting_plan_visit_max_months CO-3356 (6), cw_voluntary_foster_care_max_months CO-3357 (3); stored household CO-1032 | G.2: "Child(ren) visiting a noncustodial parent, as specified in a parenting plan ... the visit not exceeding six (6) months unless otherwise specified"; G.3: "Child(ren) residing in voluntary foster care placement for a period not expected to exceed three (3) months"; 26-2-706(1)(a.5)(V): "The child is in a voluntary foster care placement for a period not expected to exceed three months." | CO-7602 tests `month_of(cw_month_reading_date) < months_after(N, month_of(temporary_absence_start_date))`, so the length is the number of calendar months touched, the first month counting whole. **V1** (p1.yaml): CO-1032 with the visit begun 2026-04-30 (application 2026-09-10, determined 2026-10-15). Engine October: the daughter not in the home, **ineligible_no_dependent_child, $0**. Hand: on the determination date (the day the volume reads the determination month on, CO-7600) the visit has lasted five months and fifteen days, not exceeding six months: the daughter is in the home, the unit is mother and daughter, October a full month (application month September): **eligible, $488**. **V2** (p1.yaml): CO-1032 with a voluntary foster placement begun 2026-07-31, application 2026-10-01, determined 2026-10-05. Engine October **$0**; hand: two months and five days, not over three: **eligible, $488**. **V0** (CO-1032 itself, visit from 2026-04-20): engine October $0 (the stored expectation); hand: five months twenty-five days on October 15, **$488**. | Measure the visit and the placement as a duration from temporary_absence_start_date to cw_month_reading_date (`days_after`/`months_after` on the date, not on its month): in the home while the reading date is before the date N months after the start. For G.3 the text's test is the expected length: either add the county's expectation (a neutral expected end date of the placement) or record the elapsed-length reading as a state policy choice. Restate CO-1032's October expectation; store V1 and V2. |
| F7-2 | **P1** | **common**: a married OAP or AND applicant whose spouse does not apply is a routine intake shape, and Adult Financial keeps "just one client per case" (3.532.A, 3.543.A, 3.548.A; 3.520.63.B: "Each spouse shall have a separate case"), so the spouse is often not a person of the client's case; the volume itself reads that shape from marital_status (CO-7308, CO-930) | 9 CCR 2503-5 3.534.A-C, 3.544.D-F, 3.549.C-F; 3.520.72.A; 3.520.5 (verification); decision 4 | af_deemed_relative_income CO-2384 (sums `persons` in af_spouses_in_month CO-7603), af_client_and_spouse_countable_resources CO-2389, af_meets_resource_limit CO-948 (couple limit from af_is_married CO-7308 with no spouse resources), af_spouse_income_pending_verification_count CO-3884, af_spouse_resources_pending_verification_count CO-4004 | 3.534.B: "To determine the amount of unearned income to deem to a client from the client's spouse ... 2. Deduct the OAP grant standard from the total unearned income of the spouse"; 3.520.72.A: "a resource is countable, and together with all other countable resources of the client, spouse, and sponsor(s) shall be considered against the resource limit"; decision 4: "Missing information means 'cannot determine' unless the rule says otherwise." | The volume reads a spouse who is not a person of the case through marital_status (CO-7603's precision: "A spouse who is not a person of the case is read through marital_status"), and then deems nothing from that spouse and counts none of the spouse's resources: the spouse's income and resources are read as 0. **A1** (p3.yaml): the base client with marital_status married and no spouse in the case. Engine: married, $10 of the couple's $20 (590), deemed 0, couple limit $3,000, **oap, $442**; spouse income verification 0 pending. **A2** (p3.yaml): the same marriage with the husband stated as a person of the case living apart (dwelling d2), Social Security $2,000: deemed 2,000 - 1,032 = 968 (3.534.B.2; not exempt under C: income over the OAP standard), countable 590 + 968 = 1,558 >= 1,032: **none, $0**, by hand and by the engine. Hand for A1: the spouse's income and resources decide the answer and are not stated: **cannot determine** (decision 4), as PS-M3 made it for a sponsor who is not a person of the case (CO-2386-T20) and coverage pass 6 F6-7 made it for the non-MAGI couple (CO-643). | In CO-2384, CO-2389 and CO-948 (and the two verification counts), a client with af_is_married true and no person in af_spouses_in_month is cannot determine for the spouse's income and resources (keep the split $20 of CO-3829, which needs only the marriage). Restate the rule tests that rely on the zero (CO-3829-T3 is the split, unaffected). Store A1 with a cannot-determine expectation. |
| F7-3 | **P1** | **rare**: needs an Adult Financial recipient in the home who is a non-parent caretaker (or other optional member) and asks to join; one line: a grandparent on OAP raising a grandchild is common, the request to join is not, since 3.520.71.F.1.a says the grandparent need not be in the case | C.R.S. 26-2-706(1.5)(c) (D-59); 9 CCR 2503-6 3.604.2.C.2.b, C.3; the Colorado Works notice paragraph on benefits "which may not be received concurrently with a Colorado Works grant, such as Supplemental Security Income or Adult Financial programs" (D-81, 3.609.1); 9 CCR 2503-5 3.520.71.F.1 | cw_assistance_unit_members CO-900, cw_is_excluded_from_assistance_unit CO-2350 (SSI and Title IV only), cw_receipt_treatment_table CO-5650 (adult_financial_cash: counted_no_rule_excludes), cw_eligibility_status CO-921 | 26-2-706(1.5): "To participate in the Colorado works program an applicant or person shall: ... (c) Not be receiving financial assistance from other financial assistance programs administered by the state of Colorado". | No item reads 26-2-706(1.5)(c) and no open question records how a Colorado Works unit treats a member who receives Adult Financial: an OAP or AND recipient who asks to join is a member, and the grant is counted as the unit's income. **G2** (p8.yaml): a grandmother born 1960 with primary responsibility for her granddaughter of 6 (no parent in the home), Social Security $600 and an OAP grant of $452, who requests inclusion; application 2026-10-12, determined 2026-10-15. Engine: unit of two, countable 1,052 >= 331: **ineligible_income for both, $0**. **G1** (the same, not requesting): child-only unit, 173 x .65754 = 113.75, **$113**. Hand for G2: the grandmother receives financial assistance from a State program and cannot participate (26-2-706(1.5)(c)), so the unit is the granddaughter's alone: **eligible, $113**. | Add the statute's condition: a person receiving an Adult Financial grant (adult_financial_program_received, or an adult_financial_cash receipt in the month) is not a participant (excluded from the unit as C.3's recipients are, or, for a mandatory member, a member whose own status is ineligible), with an open question for the cash owner on the reach of "other financial assistance programs" (OAP, AND, AB; LEAP and the other State programs) and on how it meets 3.520.71.F (an Adult Financial client with a dependent child must apply for Colorado Works). Store G1 and G2. |
| F7-4 | P2 | — (changes an answer only for a client whose fair share is below the ISM maximum and whose housemates are not persons of the case) | 9 CCR 2503-5 3.520.79.B.4, C.2: "Fair share is calculated by totaling shelter costs and dividing by the number of people living in the household" | af_in_kind_support_and_maintenance CO-1512 (`home_total_shelter_costs / count(lives_with)`) | as quoted | lives_with (CO-1925) holds only persons of the case, and an Adult Financial case has one client (3.532.A); nothing requires a case to state its housemates. A client sharing a $1,000 market-rent home with three people not stated, paying $250 (her fair share): engine fair share 1,000, ISM min(1,000, 351) - 250 = $101; by the text, fair share 250 paid in full, no ISM (B.4). No stored household has the shape. | State the number of persons in the home as a case fact (convention rule 18) and divide by it, or state in docs/conventions.md that a case lists every person of the home for Adult Financial's ISM (rule 17's case contract), required where CO-1512 reads it. |
| F7-5 | P2 | — | 9 CCR 2503-5 3.570.13.B.3: "Have been receiving both Old Age Pension (OAP) grant payments and HCA as of December 31, 2013 and remain continuously eligible for both benefits" | af_hca_financially_eligible CO-1215 (reads received_oap_and_hca_grandfathered CO-1208, not af_category) | as quoted | The continuity of OAP eligibility is a stated flag ("A case states it true only while the person remains eligible for both"), while the same evaluation computes OAP eligibility per month. **H1** (p7.yaml): CO-13 (the grandfathered client) with Social Security $1,500: af_category **none** (countable 1,480 >= 1,032) and af_hca_grant **$977**. With the flag stated as its meaning requires (false once OAP lapses), the answer is $0; the engine does not check the flag against its own OAP answer. A dual entry, not a wrong answer for a correctly authored case. | Derive the OAP half of the route: the flag for "receiving both as of December 31, 2013" and af_category = oap in the month for "remain continuously eligible" (continuity of HCA is the HCA status itself). |
| F7-6 | P3 | — | — | cw_assistance_unit_members CO-900, precision | "where a case states no dwelling_id a stated edge is read as living in the home (same-word SW-7, convention rule 17)"; "A pregnancy left unstated is read as none for the spouse edge." | Both sentences are stale: later sentences of the same precision say dwelling_id is required where read (PS-D2) and a pregnancy is required (CA4-16, CA6-7). The derivation reads them as required. | Delete the two stale sentences. |
| F7-7 | P3 | — | — | cw_is_considered_living_in_home CO-3354, meaning | "Whether Colorado Works considers the person to be living in the home they usually live in despite a temporary absence ..." | Since PS-T8 the derivation is "in the home in some month of the determination" (sum_months over cw_determination_months), the reading for who may join; the meaning still describes the month's test, which is CO-7602's. | Restate the meaning as "in some month the determination covers", naming CO-7602 for the month. |

P1 count: 3 (F7-1 to F7-3): common 1 (F7-2), rare 2 (F7-1, F7-3). P2: 2 (F7-4, F7-5). P3: 2 (F7-6, F7-7).

## 3. Coverage matrix (from the rule text)

Key: **C** carried (derivation read against the paragraph); **F7-n** finding; **OQ** open question; **NA** not applicable, with the reason. "probe" marks a paragraph exercised by a probe household of this pass.

### Adult Financial, non-financial (3.520.6) and the special programs

| paragraph | status |
|---|---|
| 3.520.61.A, 3.532.B.3 (ages by program; transition to OAP in the birth month) | C: CO-940 (last day, 60), CO-1203 (first day for 59, last day for 18), CO-950 (first day); OQ-951 (the day) |
| 3.520.61.B, 3.520.64.A-G (residency, inmates, fleeing felons, another State's payment, absences 30/90/180 days) | C: CO-942, CO-3343, CO-4401 (OQ-780, OQ-953, OQ-1435) |
| 3.520.61.C, 3.520.67-68 (AND citizenship, five-year bar); OAP non-citizens (26-2-111(2)(c)) | C: CO-905 in CO-950, CO-1203; CO-929 (OQ-591, needs Legal) |
| 3.520.61.D, 3.520.65 (SSN) | C as verification: CO-1430, CO-1661, CO-1438 (CA6-11's recorded design) |
| 3.520.61.E, 3.541 (disability, substance abuse) | C: CO-944, CO-1203, CO-3849; OQ-138 (needs Legal) |
| 3.520.61.F, 3.520.71.F (Colorado Works bar) | C: CO-1511 (OQ-845, needs Legal); the reverse bar of 26-2-706(1.5)(c) **F7-3** |
| 3.520.61.G-H, 3.520.71.B-E, G-H (other benefits, potential income and resources) | C: county findings (CO-3860, CO-3861, CO-4433, CO-4434) |
| 3.520.63.A-D (marital status; separate cases) | C: CO-7308, CO-7603 (per month, PS-M1); spouse outside the case **F7-2** (probes A1, A2); both spouses applying OQ-1375 |
| 3.520.69.A-E (sponsorship; obligation ends; deeming) | C: CO-4400, CO-7604, CO-2386, CO-2390 (PS-M2; PS-M3 re-probed, SP4: cannot determine) |
| 3.542.B, 3.510 "Effective date of eligibility" | C: CO-2603 (CA6-1) |
| 3.570.1 (HCA: age 5, home, HCBS, tiers, financial routes, payment from the month after approval) | C: CO-1206, CO-1215 to CO-1219 (PS-D1; OQ-250 blocked); grandfathered continuity **F7-5** (probe H1) |
| 3.570.4 (burial: receiving at death, $2,500 cost limit, plot exclusion, order of reductions, $1,500) | C: CO-1220 to CO-1232, CO-3312 (PS-T2; OQ-355) |
| 3.570.5 (supportive payments, disaster assistance) | C: CO-3873 to CO-3878 (PS-D10) |
| 3.581.C (death of a client) | C: CO-953 (none from the month after death); CO-1217 |

### Adult Financial, financial (3.510, 3.520.7, 3.530 to 3.549, 3.581.D-E)

| paragraph | status |
|---|---|
| 3.520.72 to 3.520.77 (resources; "below" the limit; couples; sponsors' limits; exemptions; TWFC) | C: CO-947, CO-948 (OQ-662), CO-2389, CO-5340 to CO-5350, CO-3840, CO-3841; spouse outside the case **F7-2** |
| 3.520.78x (income kinds, month received, self-employment, donated work, exempt income) | C: CO-5016, CO-5103, CO-3830, CO-3831, CO-4443, CO-3827 |
| 3.520.79 (ISM) | C: CO-1512, CO-1513; fair-share divisor **F7-4** |
| 3.530, 3.531.D, 3.532.A-F (OAP standard, floor, PNA, facilities) | C: CO-951, CO-1510, CO-2006, CO-2007 (OQ-352) |
| 3.533 ($65 and half; $20 split; SSI added back; rollover) | C: CO-946, CO-3829, CO-3832, CO-3833 (OQ-661) |
| 3.534.A-D (spouse's earned and unearned income, children's needs, medical payments, support; exempt spouse; sponsor) | C: CO-2384 (probe A2: 968 deemed, by hand), CO-2392, CO-4720, CO-2386 (probe SP3: 4,000 - 994 = 3,006) |
| 3.540, 3.543, 3.544 (AND-SO $248, PNA, disregards with no rollover, spouse, sponsor) | C: CO-1203, CO-952, CO-946, CO-2384, CO-2604 (PS-T12) |
| 3.546 to 3.549 (AND-CS $994, floor $13, under the full SSI standard, PNA after the first full month, parents of a child) | C: CO-950, CO-952, CO-2384 (OQ-783) |
| 3.581.D-E (partial-month table; cents) | C: CO-2602, CO-2603, CO-2604 |

### Colorado Works, non-financial (3.601, 3.604, 3.606.3, 3.606.6 to 3.606.8, 3.608.4, 3.609.2; 26-2-706)

| paragraph | status |
|---|---|
| 3.601 "Dependent child", "Parent"; 26-2-703(9); 26-2-706(1)(a), (a.5) (the unit includes a dependent child) | C: CO-6807, CO-901, CO-7301, CO-7302, CO-921 (probe S1: a parent whose only child receives SSI has no unit with a dependent child, as (a.5) requires; probe U1: a child excluded for status stays a member, so the parent is paid as one caretaker, 3.604.2.M) |
| 3.604.1.A, 3.604.2.O.1 (residency; another State's TANF; 90 days out of State) | C: CO-904, CO-2351 |
| 3.604.1.B, 3.604.2.L.3, M.6 (citizenship, qualified non-citizens, five-year bar) | C: CO-4005, CO-928, CO-2557 |
| 3.604.1.C, 3.604.3 (verification) | C: CO-1420 to CO-1427, CO-1644 to CO-1656, CO-4372 |
| 3.604.1.D-E, 3.604.2.O.2 (institutions) | C: CO-3802, CO-3804, CO-3805 (OQ-660, OQ-1435) |
| 26-2-706(1.5)(c) (no other State financial assistance) | **F7-3** (probes G1, G2) |
| 3.604.2.A-D (assistance and budgetary units; mandatory, optional, excluded members) | C: CO-900, CO-7303, CO-7304, CO-2349, CO-2350, CO-2352, CO-2558 (probes T1: two parents 649 x .65754 = $426; T2: stepfather's $1,500 less $90 and 253 deemed, 1,157, ineligible; T3: stepfather's $300, nothing deemed, $320; S2: SSI parent, child-only 173 x .65754 = $113) |
| 3.604.2.E, G, I (living in the home; absences) | C: CO-7602, CO-3354 (OQ-611, OQ-1435); G.2-3 month counting **F7-1** (probes V0 to V2); meaning **F7-7** |
| 3.604.2.H (caretaker hierarchy) | C: CO-2608, CO-5207, CO-5208 |
| 3.604.2.J (tribal members) | C: CO-921 (OQ-772) |
| 3.604.2.L.1-2, M.1-6 (fleeing felons, strike, IPV, SSN; size and income of disqualified members) | C: CO-928, CO-2351, CO-910, CO-923, CO-3808 (OQ-490) |
| 3.604.2.N (minor parents) | C: CO-906, CO-909, CO-2000, CO-4352, CO-4660 (OQ-102, OQ-830) |
| 3.604.4 (assignment, cooperation) | C: CO-3811, CO-7307 |
| 3.606.3 (changes in the certification period) | NA: recorded out of scope (docs/colorado-notes.md, CW-17); 3.606.3.C.2.b's newborn from the month of birth is CO-7303 |
| 3.606.6 (sixty months, extensions, hardship, Indian Country) | C: CO-915, CO-916, CO-918, CO-924, CO-925 |
| 3.606.7 (death reimbursement) | C: CO-1504 to CO-1508 (OQ-354) |
| 3.606.8.A (diversion: agreement, POI, county income limit, A.6 one-time cash, A.7) | C: CO-1270, CO-2560, CO-7306, CO-7307 (OQ-252, OQ-531 blocked) |
| 3.606.8.B-E | NA: county services, recorded out of scope |
| 3.608.4.C-F (sanctions $1, 25%, 25%, closure; the higher level) | C: CO-1261, CO-1264, CO-1265, CO-914 (OQ-831) |
| 3.609.2.A.1 (initial payment; partial-month table; $10 and $1) | C: CO-4358, CO-4359, CO-914 |
| 3.609.2.C (death) | C: CO-921, CO-7303 |

### Colorado Works, financial (3.605, 3.606.1, 3.606.2)

| paragraph | status |
|---|---|
| 3.605.1.A.1-3, B (months; availability; potential income) | C: CO-910, CO-908 (OQ-771) |
| 3.605.1.A.4 (stepparent; minor parent's parents) | C: CO-2353, CO-909, CO-2000 (probe T2) |
| 3.605.1.A.5 (sponsor) | C: CO-2360, CO-2364, CO-2365, CO-4363 (PS-M3 re-probed, SP1: cannot determine) |
| 3.605.1.A.6 (status and SSN disqualified members) | C: CO-910, CO-923, CO-2557 |
| 3.605.2 to 3.605.4 (earned and unearned income; exempt income) | C: CO-5104, CO-5140, CO-5650, CO-5651, CO-4369 (OQ-1295, OQ-1335); adult_financial_cash counted **F7-3** |
| 3.605.5 (child support at application and redetermination) | C: CO-2550 to CO-2554, CO-7300 (probe E4: $400 support counted against need 421 at application and left out of the grant, $407) |
| 3.606.1.E-K (certification; chart; pregnancy allowance; need test; grant) | C: CO-911 to CO-914, CO-926, CO-927, CO-1260 (OQ-153; probes E1: 500 - 90 = 410 < 421, 620 x .65754 = $407; E2: 512 - 90 = 422 >= 421, ineligible) |
| 3.606.2.A ($90 at application; 100% in the first period and for a new source; 67%) | C: CO-907, CO-922 (OQ-1142; probe E3: a recipient's $1,000 at 67%, 330, 620 - 330 = $290) |

## 4. Recent fixes: status

`npm run check -- --volume co` passes at `b467f1c` (section intro), every stored repro household and rule test of the earlier rounds included.

| round | findings | status |
|---|---|---|
| Coverage pass 6 (coverage6-cash.md section 8) | CA6-1 to CA6-7, CA6-10, CA6-12 | Hold. CO-880 to CO-894 and CO-896 pass; CO-2603 is cannot determine with an application date and no eligibility date; the kind of determination is required where read; the month's pregnancy, members, deaths and ages are read per month; the refused assignment reaches the one-time diversion; the decision-4 defaults are gone. |
| | CA6-8, CA6-9, CA6-11, CA6-13 to CA6-15 | Hold as recorded or restated (OQ-1375; rule 17's convention since replaced by PS-D2; CO-1438's precision; OQ-252, OQ-845, CO-1260). |
| Pattern sweep (pattern-sweep-cash.md) | PS-T1 to PS-T7, PS-T9 to PS-T12 | Hold: ages in the month, the time limit and strike per month, the absence out of State per month for Adult Financial, SSI received in the month (rule tests on file pass; CO-1031 passes). |
| | PS-T8 | Holds for the days of I.3, O.1 and O.2 and for the reading day (OQ-1435); the calendar-month count of G.2-3 is **F7-1**, and CO-1032's October expectation is the defect's answer. |
| | PS-M1, PS-M2, PS-M4 | Hold (CO-1030 passes; the sponsors and the budgetary members of the month). |
| | PS-M3 | Holds: a sponsor who is not a person of the case is cannot determine in both programs (probes SP1, SP4). The same shape for a spouse is **F7-2**. |
| | PS-D1 to PS-D12 | Hold: HCA from the month after approval (CO-305), lives_with required in both programs' readers (docs/conventions.md rule 17 says so), the setting, the spouse and the fleeing felon required, the IPV finding the county's. The grandfathered HCA route (not a PS-D item) is **F7-5**. |
| Earlier rounds (coverage4-cash.md section 7; field-sweep; cross-list records) | CA4-1 to CA4-25; FS-AF, FS-CW; CA4-19 | Hold, as coverage pass 6 found; nothing in this pass reopens them. |

## 5. Open-question classification check

The Adult Financial and Colorado Works items cite 58 open questions: 50 state policy choice, 5 needs Legal (OQ-138, OQ-591, OQ-783, OQ-845, OQ-901), 3 blocked on a named document (OQ-250, OQ-530, OQ-531). Each has an owner and an assumption; none of them is marked resolved while still cited.

| question(s) | class | confirmed? |
|---|---|---|
| OQ-250, OQ-530, OQ-531 | blocked on a named document | Yes: the HCA tier maximum schedule (cdhs.colorado.gov refused), the Colorado Works standards from July 1, 2028, and the TANF State Plan's non-recurrent short-term benefit maximum, each named with the host that refused it. |
| OQ-138, OQ-591, OQ-783, OQ-845, OQ-901 | needs Legal | Yes as recorded choices with the reading in force (docs/reviews/open-question-status.md counts these as policy choices for the stopping rule). |
| OQ-1435, OQ-1436 (new in the sweep) | state policy choice | Yes: two readings each, an assumption, the cash owner. OQ-1435 fixes the day an absence's length is read, not the unit it is counted in: the calendar-month count of F7-1 is not among its readings. |
| The other 48 (OQ-101 to OQ-1375) | state policy choice | Yes, as coverage pass 6 confirmed them; OQ-951 and OQ-252 as restated there. |
| Unrecorded | — | F7-1 (if the owner prefers a month count to a duration for G.2-3, it is a choice to record, with G.3's "not expected to exceed" as its other reading) and F7-3 (the reach of 26-2-706(1.5)(c)). |

## 6. Probe summary

| probe | file | finding | engine | hand |
|---|---|---|---|---|
| V0 / V1 / V2 | p1.yaml | F7-1 | October $0 / $0 / $0 | $488 / $488 / $488 |
| A1 / A2 | p3.yaml | F7-2 | oap $442 / none $0 | cannot determine / none $0 (968 deemed) |
| G1 / G2 | p8.yaml | F7-3 | $113 / ineligible_income $0 | $113 / $113 |
| H0 / H1 | p7.yaml | F7-5 | HCA $977 / HCA $977 (af_category none) | $977 / $0 |
| SP1 / SP4 | p6.yaml | PS-M3 control | cannot determine | cannot determine |
| SP3 | p6.yaml | sponsor deeming control | 3,006 deemed, none | 4,000 - 994 = 3,006 |
| W0, T1, T2, T3, S1, S2, U1 | p2.yaml, p5.yaml | unit controls | $320; $426; 1,157 ineligible; $320; ineligible_no_dependent_child; $113; $245 | the same (S1 by 26-2-706(1)(a.5); U1 by 3.604.2.M: 374 x .65754 = 245.9) |
| E1 to E4 | p4.yaml | income controls | $407; ineligible; $290; $407 | the same |

All Colorado Works probes are determined 2026-10-15 with the application 2026-10-12 unless stated (V0 and V1: application 2026-09-10; V2: 2026-10-01 and 2026-10-05); Adult Financial probes 2026-10-01 (A1, A2, SP probes) or CO-13's 2026-11-01 (H0, H1). To rerun one: `cd` to the worktree, `npx vite-node scripts/probe7.ts ../c7tools/p1.yaml V1 cw_is_considered_living_in_home_in_month,cw_eligibility_status,cw_grant_amount 2026-09 2026-10`.

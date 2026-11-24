# Coverage review, sixth pass: Medicaid non-MAGI (family file `coverage6-medicaid-nonmagi`)

Reviewer pass: independent exhaustive verification, 2026-11-24, on `5db41ba` (branch `ccr-9d19bf4c-wmnwcl`, "co: re-key the stale change-impact dispositions of earlier records"). Review only: nothing in the volume was changed and nothing was committed. Scratch copy: `git worktree add --detach .../scratchpad/cov6nm 5db41ba`, `node_modules` linked from the main checkout. Probe runner and probe files: `scratch6/probe.ts`, `scratch6/p1.yaml` to `p13.yaml` in the scratch copy; their output is `scratch6/probe-results.txt`.

Scope: the SSI-related aged, blind and disabled groups, Pickle, disabled adult children, disabled widow(er)s, 1619(b), OAP SISC B, long-term care (nursing facility, HCBS waivers, PACE), post-eligibility (patient payment, spousal and family allowances, home maintenance), transfers, the Medicare Savings Programs and the two buy-ins: 10 CCR 2505-10 § 8.100.5-8.100.7 (D-65, version effective 11/14/2026) with 20 CFR 416 Subparts K and L (D-53, D-54, D-208) as 42 CFR 435.601(b)(2) applies them where Colorado's text is silent.

## Method

- Read the governing text before the earlier matrices: D-65 § 8.100.5.H (allocations and disregards), § 8.100.6.A-Q and § 8.100.7.A-D, F and K-V line by line; § 8.100.5.A-G, I-P and § 8.100.7.E, G-J against the items the outcomes reach, relying on the pass-4 line-by-line matrix for paragraphs no outcome reads; 20 CFR 416.1163(d), 42 CFR 435.135(a)-(b) (S1233) where a finding turns on them.
- Walked the dependency graph of the six outcomes (ma_ssi_related_category CO-612, ma_protected_group_category CO-1163, ma_msp_category CO-617, ma_buy_in_category CO-622, ma_ltc_eligibility_status CO-652, ma_patient_payment CO-658): 899 items, 416 derived (`scratch6/deps.ts`). Read every derived item on the category, long-term care, spousal, transfer, MSP and buy-in paths; listed every person-scope derived item those person-month outcomes read (the class N4-7 and N4-9 came from) and every `otherwise` on a supplied fact (`scratch6/oth.ts`).
- Probed households with the engine (`npx vite-node scratch6/probe.ts scratch6/pN.yaml`, the runner patches a stored case and evaluates per month) and computed each answer by hand. 2026 figures as the volume holds them: FBR 994 / 1,491; resource limits 2,000 / 3,000; 300% of the FBR 2,982; poverty guideline 1,330 a month for one, 1,803.33 for two; MSP resource limits 9,950 / 14,910; CSRA maximum 162,660; MMMNA standard 2,705 (150% of the 2026 guideline for two), cap 4,066.50; personal needs allowance 110.36 (OQ-1060, not re-reported).
- Boundaries checked and agreeing (p7): countable income exactly at the FBR (994: aged; 995: none), resources at 2,000 and 2,001, QMB at 100% (1,330: QMB from the effective month; 1,331: SLMB), SLMB at 120% (1,596), QI between 120% and 135% (cannot determine on a base without the MAGI facts QI's "not otherwise eligible" needs, decision 4), over 135% none, MSP resources at 9,950 and 9,951. Patient payment with a community spouse (p9: MMMNA 2,705 + excess shelter 1,250 - 811.50 = 438.50, + medical needs 427.90 = 3,571.40; MIA 2,571.40; 2,789.64 less 2,571.40, Part B 202.90, Part D 40, tax 60 = negative, floored to 0, plus long-term care insurance 300 = 300): agrees.
- `npx vite-node scripts/check.ts` on the scratch copy: OK; 5,680 rule tests and 4,294 household expectations pass; conformance self-check 10,134/10,134.

## 1. Verdict

**9 P1 found (4 common, 5 rare edge). The family does not meet the stopping rule.** 3 P2, 1 P3.

The earlier P1 fixes hold (section 4). The new P1s fall in three groups:

- **Facts of the determination date read in every month (F6-2 to F6-5).** N4-7 and N4-9 moved the SSI-related resources, couple and ages to the month; the long-term care path, the protected groups and the SSI recipient branch still read person-scope figures in every month. A nursing facility resident who spent down before applying, or whose retroactive months fall before admission, is long-term care eligible with a patient payment in months the rule denies.
- **Couples (F6-1, F6-6, F6-7).** Spouses who live apart for any reason but a medical institution stay one SSI household forever; an ineligible spouse's small income is combined and tested against the couple rate where 20 CFR 416.1163(d) deems nothing and tests the individual rate; and a spouse stated by marital status alone (not a person of the case) silently switches off the spousal impoverishment rules.
- **Pathways narrower than the text (F6-8, F6-9).** Pickle only for a loss caused by OASDI, against the mandatory 42 CFR 435.135; PACE held to the 300% test for a person B.1.a admits through SSI or 1619(b).

| ID | Sev | Common / rare | One line (why that frequency) |
|---|---|---|---|
| F6-1 | P1 | rare | Married spouses living apart (separated, or one in an assisted living residence on a waiver) stay a couple for the SSI method. Rare: both spouses must be persons of one case while living apart. |
| F6-2 | P1 | common | A single long-term care applicant's resources are the determination month's in every retroactive month. Common: spend-down before applying with retroactive months requested is the usual nursing facility application. |
| F6-3 | P1 | common | Long-term care eligibility and a patient payment in retroactive months before admission. Common: most nursing facility applications are filed within three months of admission and ask for retroactive months. |
| F6-4 | P1 | rare | Aged for long-term care, HCBS, PACE and the protected groups is the determination month's. Rare: needs a 65th birthday inside the retroactive window and no disability determination. |
| F6-5 | P1 | rare | An SSI award as of the determination date makes every retroactive month an SSI month. Rare: a separate Medicaid application with retroactive months before the award that fail the SSI-related test. |
| F6-6 | P1 | common (over-grant) | 416.1163(d)'s threshold not applied: an ineligible spouse with little income lets the applicant use the couple rate. Common: an aged or disabled person with a younger, non-disabled spouse who earns little. Errs toward eligibility. |
| F6-7 | P1 | common | A spouse stated by `marital_status: married` and not a person of the case: no community spouse, no MIA, no CSRA attribution, and the SSI method treats the person as single. Common shape (married nursing facility resident); the volume's own fact meaning invites stating the spouse this way. |
| F6-8 | P1 | rare | Pickle needs a loss caused by OASDI; 42 CFR 435.135 covers any loss after April 1977. Rare: Pickle cases are few and most losses are OASDI-related. |
| F6-9 | P1 | rare | PACE reads the 300% test and the long-term care resource test even where § 8.100.7.B.1.a admits the person through SSI (1619(b)). Rare: a 1619(b) worker 55 or older above 300% gross asking for PACE. |
| F6-10 | P2 | | Decision-4 defaults left on supplied facts with no rule-given default. |
| F6-11 | P2 | | Open questions classed "needs Legal" (OQ-471, OQ-820, OQ-900), a class the stopping rule does not accept; OQ-471 is answered by text on file. |
| F6-12 | P2 | | OQ-209 records "not offering" mandatory historical groups (§ 8.100.6.F, G) as a state policy choice; it is a scope decision. |
| F6-13 | P3 | | CO-641's precision still names wages_gross. |

OQ-1060 and OQ-1061 (OM 25-073) are not re-reported.

## 2. Findings

P1: a wrong eligibility or benefit answer, a missing pathway, or an element a rule reads that is undefined. P2: a gap with no answer effect today. P3: wording.

| ID | Sev | Common / rare | Paragraph | Items | Quoted text | Repro (engine vs hand) | Proposed fix |
|---|---|---|---|---|---|---|---|
| F6-1 | **P1** | rare | § 8.100.7.C.2.b; § 8.100.5.H.1.a; 20 CFR 416.1163(a) ("if you live in the same household with your ineligible spouse") | ma_ssi_couple_members CO-3626, ma_excluded_from_ssi_household CO-661, ma_ssi_household_size CO-604; readers CO-605 to CO-610, CO-613 to CO-616, CO-1158 to CO-1162 | C.2.b: "Beginning the first month following the month the couple ceases to live together, only the income of the individual spouse is counted in determining his or her eligibility." H.1.a: "Income of spouses living together is considered mutually available". | CO-661 reads "ceases to live together" only as entry to a medical institution; CO-3626 walks the spouse edge whatever the spouses' dwellings. **SEPARATED** (p1.yaml: CO-395's couple, both aged, p1 at dwelling h2, p2 at h1, neither institutionalized; p1 Social Security 1,000, p2 700; 500 in the bank each): engine household size 2, countable 1,680, `none` for both. Hand: each alone, p1 1,000 - 20 = 980 <= 994, p2 680 <= 994, resources 500: **aged** for both. **SEPARATED-QMB** (p2.yaml, p1's income 2,000): p2 engine 2,680 against the couple guideline, `none` in December; hand 680 <= 1,330: **qmb** from December (application 2026-11-02, determined 2026-11-20). **ACF-SPOUSE** (p2.yaml: p1 in an assisted living residence on the EBD waiver since June): the same, p2 `none` where the rule gives aged and QMB. | Count spouses as a couple only while they share a dwelling (lives_with, CO-1925), from the month after the month they ceased to (C.2.b), alongside the institution test; store SEPARATED and ACF-SPOUSE. |
| F6-2 | **P1** | common | § 8.100.3.E.1 (a retroactive month where the person "met all applicable eligibility requirements"); 20 CFR 416.1207(a); § 8.100.7.A.2.f | ma_meets_ltc_resource_standard CO-648 and ma_institutionalized_spouse_countable_resources CO-647 (person scope; the single person's branch is ma_ssi_countable_resources_individual CO-4623 at the determination month); readers CO-3310, CO-651, CO-652, CO-658 | 416.1207(a): "Resources determinations are made as of the first moment of the month." A.2.f: resources "that conform with the regulations regarding resource limits and exemptions set forth in section 8.100.5". | N4-7 made the SSI-related figures per month; the long-term care test of a person with no community spouse still reads the determination month in every month. **RETRO-LTC** (p3.yaml: CO-485, widower in a nursing facility since 2026-08-03, Social Security 2,500, home excluded by written intent to return; applied 2026-11-02 asking for retroactive months, determined 2026-11-12; bank 8,000 in August and September, 1,200 from October): engine `eligible_institutional` and patient payment 2,389.64 in every month. Hand: August and September 8,000 > 2,000, **ineligible_resources**, patient payment 0; October and November 1,200, income 2,500 <= 2,982, eligible_institutional, 2,500 - 110.36 = 2,389.64. | Make the single person's branch of CO-647 and CO-648 per month (CO-5322 in the month); keep the couple's attribution and the CSRA at their dates; store RETRO-LTC. |
| F6-3 | **P1** | common | § 8.100.7.A.2.c ("Have been institutionalized for at least 30 consecutive full days"), A.2.c.iii ("benefits start as of the first day when institutionalization began"); § 8.100.3.E.1 | ma_is_institutionalized CO-640 (person scope, from residence_setting_type on the determination date); ma_ltc_unmet_requirement CO-3310, ma_ltc_eligibility_status CO-652, ma_patient_payment CO-658 | A.2.c.iii: "Once the 30 consecutive days of institutionalization requirement has been met, Medical Assistance benefits start as of the first day when institutionalization began if all other eligibility requirements were met as of that date." | institution_entry_date is read by the spousal items (CO-661, CO-5200) and the Part B and home maintenance months, not by CO-640. **PREADMIT-RETRO** (p4.yaml: CO-485 as stored, admitted 2026-09-14, applied 2026-11-02 with retroactive months): engine August `eligible_institutional`, patient payment 2,389.64. Hand: in August he was not in an institution: **not_institutionalized_or_waiver**, patient payment 0 (and not SSI-related or QMB-eligible on 2,500 of Social Security). September on: eligible_institutional. | Read institutionalization per month: in the institution from the month of institution_entry_date (as CO-5200 does for a month before the determination); store PREADMIT-RETRO. |
| F6-4 | **P1** | rare | § 8.100.7.A.2.a ("Have attained the age of 65 years"); § 8.100.5.C.1; docs/operators.md "Ages in a month" | ma_is_aged_blind_or_disabled CO-603 (`[at, ma_is_aged, [det_month]]`), read by CO-3310 (long-term care), CO-653 (HCBS), CO-654 (PACE), CO-1163 (protected groups), CO-1159 (Pickle) | operators.md: "A month-scoped rule that tests an age condition for the month it evaluates measures it in that month, never on the determination date". | N4-9 moved the per-month readers' ages; these per-month outcomes still read the determination month's age through a person-scope item. **AGE65-RETRO-LTC** (p5.yaml: CO-485 with date of birth 1961-10-15, not blind or disabled, in a nursing facility since 2026-08-01, retroactive months requested): ma_is_aged is false in August and September, ma_is_aged_blind_or_disabled true; engine `eligible_institutional` in August and September. Hand: 64 on the last day of each: **not_aged_blind_or_disabled**. | Read ma_is_aged_blind_or_disabled_in_month (CO-5201) in the per-month readers, or make CO-603 per month; keep `[at ..., det_month]` only where a rule is about the determination itself. Store AGE65-RETRO-LTC. |
| F6-5 | **P1** | rare | § 8.100.6.C.1.a, C.7 ("must be approved from the original SSI eligibility date"); § 8.100.3.E.1 | receives_ssi CO-012 ("A fact about SSA's award as of the determination date"), read in every month by ma_is_ssi_related_eligible CO-611 and ma_ssi_related_category CO-612 | C.1.a: "persons receiving financial assistance under SSI". | **SSI-RETRO** (p11.yaml: CO-533's aged person, SSI awarded from October 2026, Medicaid application 2026-11-05 with retroactive months; bank 5,000 in August and September, 1,000 from October): engine `ssi_recipient` in August and September (CO-610 false in both). Hand: no SSI in August or September, so the SSI-related test applies: 5,000 > 2,000, **none**; October on ssi_recipient. | State the month SSI began (a date on the award, or per-month receipt from the `ssi` receipt record) and read the SSI branch only from it; store SSI-RETRO. |
| F6-6 | **P1** | common; errs toward eligibility | 20 CFR 416.1163(d)(1)-(2) (D-53:888-890); 42 CFR 435.601(b)(2); § 8.100.6.C.1.b | ma_ssi_income_standard CO-2240 (couple rate whenever ma_ssi_household_size is 2), ma_ssi_countable_income CO-607; the same in CO-1158, CO-1160 (Pickle, DAC, DWB) | 416.1163(d)(1): "If the amount of your ineligible spouse's income that remains after appropriate allocations is not more than the difference between the Federal benefit rate for an eligible couple and the Federal benefit rate for an eligible individual, there is no income to deem to you from your spouse. In this situation, we subtract only your..." (d)(2): if more, "we treat you and your ineligible spouse as an eligible couple". | Colorado's H.1.a makes a living-together spouse's income "mutually available" but names no standard; C.1.b is SSI eligibility, which (d) governs, and the volume fills Colorado's silence with Subpart K elsewhere (N4-3). No item reads (d). **INELIG-SPOUSE** (p6.yaml: aged p1, Social Security 1,100; p2, 50, not blind or disabled, not applying for SSI, no income; 500 in the bank each): engine household 2, 1,080 <= 1,491, `aged`. Hand: p2's income 0 <= 1,491 - 994 = 497, nothing deemed, p1 alone 1,100 - 20 = 1,080 > 994: **none** (resources 1,000 <= 3,000 either way). The engine never denies where (d) grants (with the spouse's income at most 497 the combined test is the looser), so the error only grants. | Apply (d): when the ineligible spouse's income after allocations is at most the couple-individual difference, test the applicant's own income against the individual rate; otherwise as now. If Colorado means the looser reading, record it as a state policy choice citing H.1.a against 416.1163(d) and 435.601(b)(2). Store INELIG-SPOUSE. |
| F6-7 | **P1** | common (married nursing facility resident), when the spouse is stated by status | Decision 4 (docs/plan-colorado.md: "Missing information means 'cannot determine' unless the rule says otherwise"); § 8.100.7.K.2.d, L, R, T.1.b; § 8.100.5.H.1.a | marital_status CO-844 ("married here states a spouse who is not a person of the case"); ma_ltc_couple CO-643 and ma_ssi_couple_members CO-3626 read only the spouse edge | L: "All non-exempt resources owned by a married couple are counted, whether owned jointly or individually. There are no exceptions for legal separation". K.2.d: the institutionalized spouse "Is married to a spouse who is not in a medical institution or nursing facility". | **MARRIED-SPOUSE-NOT-IN-CASE** (p10.yaml: CO-485 with `marital_status: married`, no spouse person, the person's relationships stated empty): engine ma_ltc_couple false, resources the person's own 1,200, `eligible_institutional`, patient payment 2,389.64 (no MIA). Hand: a community spouse exists, so the couple's resources, the CSRA and the MIA are the rule's; without the spouse's facts the outcome is **cannot determine**. With a community spouse on Social Security 1,000 and no excess shelter or medical needs: MIA 2,705 - 1,000 = 1,705, patient payment 2,389.64 - 1,705 = **684.64**. The SSI method likewise reads such a person as single, which is right only if the spouse lives elsewhere (F6-1). | When is_married and no spouse is a person of the case, make the spousal and couple readers cannot determine (or require the spouse in the case for long-term care and say so on marital_status); store the probe. |
| F6-8 | **P1** | rare | 42 CFR 435.135(a)(2)-(3), (b) (S1233, D-31); § 8.100.6.D.1-2, E.1.b | ma_pickle_eligible CO-1159 (requires lost_ssi_or_oap_due_to_social_security_benefits, CO-1108); social_security_income_when_ssi_or_oap_lost CO-1109 | 435.135(a): Medicaid "must" go to individuals who "(2) Were eligible for and receiving SSI or State supplements but became ineligible for those payments after April 1977; and (3) Would still be eligible ... if the amount of OASDI cost-of-living increases paid ... after the last month after April 1977 for which those individuals were both eligible for and received SSI or a State supplement and were entitled to OASDI, were deducted from current OASDI benefits." | Colorado's D.2 lists losses caused by OASDI; the federal mandatory group covers a loss for any reason and measures the increases from the last month of concurrent receipt, not from "the previous amount of the OASDI that caused them to lose" (CO-1109's meaning). **PICKLE-PENSION** (p8.yaml: aged, lost SSI in January 2016 when a 150 pension began; OASDI 700 in the last concurrent month, 960 now; pension 150): engine ma_pickle_countable_income 830 but `none` (the loss was not OASDI-caused). Hand under 435.135: 960 - 260 = 700, + 150 - 20 = 830 < 994: **pickle**. The control with the loss stated as OASDI-caused gives `pickle`. No open question records the narrowing. | Read the loss as any loss of SSI or OAP after April 1977 while entitled to OASDI (D.1 states no cause), and define CO-1109 as the OASDI of the last month of concurrent receipt; or record the conflict as OQ-820 is recorded. Store PICKLE-PENSION. |
| F6-9 | **P1** | rare | § 8.100.7.B.1.a ("are SSI (including 1619b) or OAP Medicaid eligible; or b. are eligible under the Institutionalized 300% Special Income category") | ma_pace_eligible CO-654 (reads ma_ltc_financially_eligible CO-651: the 300% test and the long-term care resource test); CO-3310 and ma_hcbs_waiver_eligible CO-653 already take B.1.a | B.1: "Persons Requesting Long-term Care through Home and Community Based Services (HCBS) or the Program of All Inclusive Care for the Elderly (PACE)" are eligible if they "a. are SSI (including 1619b) or OAP Medicaid eligible; or b. ... 300%". | **PACE-1619B** (p12.yaml: disabled, 60, at home, 1619(b) status, wages 3,500, nursing facility level of care, in a PACE service area): CO-3310 `none` (it takes B.1.a), but CO-654 false on the 300% test (3,500 > 2,982): `not_eligible_for_requested_setting`. Hand: B.1.a admits him: **eligible_pace**. | Give CO-654 CO-653's financial arm (ma_ltc_financially_eligible or the SSI, 1619(b) and OAP SISC B routes), keeping home equity and the transfer penalty; store PACE-1619B. |
| F6-10 | P2 | decision 4 | docs/plan-colorado.md decision 4 ("readers do not invent defaults") | `otherwise` on supplied facts whose meaning gives no rule default: is_blind (the person's own) `false` in CO-1715; ma_payroll_taxes_withheld `0` in CO-2467 (R.2's FICA and Medicare deduction); ma_institutionalized_spouse_refuses_income_allowance `false` in CO-658; housing_maintenance_fee and utility_expenses_actual `0` in CO-2802, CO-3618; ma_transfer_penalty_months_assigned_from_spouse `0` in CO-2232; is_emancipated_minor `false` in CO-4624, CO-4625, CO-2275; is_surviving_spouse_of_va_pensioner `false` in CO-1986; ma_lottery_winnings_hardship_exemption_granted `false` in CO-641, CO-663, CO-1715, CO-4201 | | Each gives a definite answer where the fact is not stated (an unstated FICA withholding raises the community spouse's income and lowers the MIA). No household that states the facts is wrong. N4-13 cleared the others. | Declare the default on the fact where a rule gives one (a refusal, an exemption granted and a physician's certification are findings whose absence is "not so"); otherwise drop the `otherwise`. |
| F6-11 | P2 | classification | Stopping rule (open questions are state policy choices or blocked on a named document) | OQ-471, OQ-820, OQ-900 | | Each is classed "needs Legal", which is neither accepted class; the MAGI family reclassified its own in pass 4 (coverage4-medicaid-magi-chp.md section 4). OQ-471 is answered by text on file: 42 U.S.C. 1396r-5(d)(1) requires the family allowance for every institutionalized spouse, the reading in force, as CO-657 takes the federal floor over T.1.c.i. OQ-820 and OQ-900 rest on text on file (state text against 1396p(f), 435.601(b)(2), 1396p(b)); no unfetched document would decide them. | Resolve OQ-471 by 1396r-5(d)(1); reclassify OQ-820 and OQ-900 as state policy choices with Legal advising. |
| F6-12 | P2 | classification (rare population) | § 8.100.6.F.1, G.1-3 ("Medical Assistance must be provided") | OQ-209 | F.1: "Medical Assistance must be provided to a person who was receiving financial assistance under AND or Aid to the Blind (AB) for August 1972 and who - except for the October 1972 Social Security ... 20% increase amount would currently be eligible". | OQ-209's assumption "The closed historical groups ... are not offered" is classed a state policy choice, but the rule makes them mandatory; whether to model closed cohorts is a scope decision of the product owner, not Colorado's policy. Survivors of the 1972-1973 cohorts are now in their seventies or older and nearly all fall within the aged group. | Record the omission as a scope decision (or model F and G.1 as supplied findings, like the Pickle base). |
| F6-13 | P3 | | | ma_ltc_gross_income CO-641 | | The precision says "Sums wages_gross, ma_self_employment_net_earnings, ..."; the derivation reads ma_ssi_gross_earned_income since earned-income records E1. | Name the current figures. |

## 3. Coverage matrix (built from the text)

C = covered by the item(s) named, read against the text; a finding ID where it is not; NA = procedure with no eligibility effect.

### § 8.100.5 (ABD, long-term care and MSP general eligibility)

| Paragraph | Disposition |
|---|---|
| A-B (application, verification) | NA for eligibility; verification items CO-1405 to CO-1415, CO-1620 to CO-1639 (the phase-9 family). |
| C.1-4 (effective dates, onset) | C: CO-5201, CO-4888, ages in the month (CO-5402, CO-4978). **F6-4**, **F6-5** (determination-date facts in retroactive months). |
| D (estate recovery) | C: CO-5203 (55, per month), OQ-900 (**F6-11**). |
| E.1-9 (availability) | C: CO-5320 inaccessible_reason (FS-MA-4), CO-4886 (E.6), CO-5322 found value. |
| F.1-6 (income, exemptions) | C: CO-5510 table and readers CO-5511 to CO-5516 (N4-1 to N4-5, FS-MA-1, FS-MA-8, cross-list FS-MA-3); OQ-971, OQ-995, OQ-1280 to OQ-1282. |
| G (OAP deeming) | C: Adult Financial's; not read by these outcomes. |
| H.1.a | C for spouses living together; **F6-1** (living apart), **F6-6** (ineligible spouse's standard), **F6-7** (spouse outside the case). |
| H.1.b | C: CO-802 (OQ-823). |
| H.2-3 (allocations) | C: CO-6050, CO-6054, CO-6055, CO-4624 to CO-4634, CO-5902, CO-5904 (N4-9 ages). |
| H.4.a-e | C: CO-605, CO-606, CO-2281, CO-5513, CO-2471 (student exclusion by year, NM-31), CO-4628, CO-4629. |
| I, J, K, L | C: receipts by ownership_share; CO-4621 (J); CO-641, CO-4103 (K); reverse_mortgage not income (L.1, N4-1). |
| M.1-3 | C: CO-5303 table, CO-5320 to CO-5323, CO-6733 (one car per couple, N4-6), CO-4622, CO-650 (OQ-820, **F6-11**). |
| N, O, P | C: CO-5326 (N.5), held_* rows (O, P.1-4), CO-6501, CO-7150, CO-7151 (FS-MA-9). |

### § 8.100.6 (ABD categories)

| Paragraph | Disposition |
|---|---|
| A, B | C: CO-603, CO-5201; disability supplied (meets_ssa_disability_criteria). |
| C.1-9 | C: CO-611, CO-612 (receives_ssi), CO-1163 (C.8, continued_ssi_status). **F6-5** (retroactive months before the award). C.10 (under-21 effective date) and C.7 (overturned denials): read through receives_ssi only; covered by the F6-5 fix. |
| D, E (Pickle) | C: CO-1158, CO-1159, CO-5221, CO-5222, CO-6052 to CO-6056. **F6-8** (loss cause, base month). |
| F, G (1972, 1973 groups) | OQ-209 (**F6-12**). |
| H (1983 actuarial group) | OQ-209 (closed: reapply before July 1, 1987). |
| I (disabled widow(er)s) | C: CO-1162, CO-5516 (`met_with_oasdi_disregarded`). |
| J (DAC) | C: CO-1161, CO-1160, CO-1110. |
| K.1-8 (OAP) | C: CO-1177 (K.2-4), long-term care for K.5, CO-1156 (K.7, the OAP health care family's). |
| L (QMB) | C: CO-613, CO-3622, CO-3623 (L.10-11), CO-3628, CO-3629 (L.12; OQ-622), CO-1750 (L.3). OQ-624. **F6-1**, **F6-7** reach L.3's couple. |
| M (SLMB), N (QI-1) | C: CO-614, CO-615 (boundaries checked, p7). N.2's allocation and waiting list: not an eligibility test. |
| O (QDWI) | C: CO-616, CO-1157, CO-3624 (OQ-621). |
| P (WAwD) | C: CO-618, CO-1715, CO-3030, CO-6200, CO-619 (premium). **F6-10** (is_blind default in CO-1715). |
| Q (CBwD) | C: CO-620, CO-4200 to CO-4203, CO-621; OQ-623, OQ-740, OQ-144. |

### § 8.100.7 (long-term care)

| Paragraph | Disposition |
|---|---|
| A.1 (300% group, gross income) | C: CO-642, CO-641. |
| A.2.a-b | C: CO-603. **F6-4** (age in the month). |
| A.2.c (30 days; start of benefits) | C: expects_institutional_stay_of_thirty_days. **F6-3** (months before admission). |
| A.2.d-e | C: CO-642 (income trust not in a hospital); OQ-1061 (blocked, not re-reported). |
| A.2.f-j | C: CO-648, CO-660, CO-1634, CO-1635. **F6-2** (resources in retroactive months). |
| B.1-3 | C: CO-653, CO-4630; OQ-519 (blocked). **F6-9** (PACE). |
| C.1, C.2.a, C.2.c | C: CO-5200, CO-643, CO-647. |
| C.2.b | Institutional separation only: **F6-1**. |
| C.3-4 | C: CO-658 (long-term care insurance), CO-2467. |
| D | NA. |
| E (trusts) | C: trust_interest records with the site's finding (ma_found_available_value), income trusts CO-823, CO-2238. |
| F.1-2 (transfers) | C: CO-5325 (look-back from ma_ltc_request_date, N4-10), CO-649, CO-659, CO-660, CO-886 (start date supplied); OQ-1244, OQ-821 (partial month); OQ-1060 (divisor, not re-reported). |
| F.2.j, G, H, I, J | C: each action a holdings record with its disposed_date and the site's ma_transfer_exempt finding (decision D9); annuities and life estates by finding. |
| K | C: CO-644, CO-643. **F6-7** (spouse outside the case). |
| L, M, N, O | C: CO-888 (snapshot at the application month), CO-646, CO-1977, CO-4636, CO-4637, CO-647, CO-648. |
| P | C: receipts stated on the spouse paid; ownership_share. |
| Q, R | C: CO-655, CO-662, CO-2802 (OQ-560), CO-3619 (OQ-620), CO-656, CO-2467 (OQ-974, OQ-1050, OQ-1345). **F6-10** (FICA default). |
| S | C: CO-1977. |
| T.1.a-f | C: CO-658, CO-657 (federal floor), CO-2469; OQ-471 (**F6-11**). |
| U | NA. |
| V.1-4 | C: CO-3616, CO-1987, CO-3618, CO-658 (Part B two months, OQ-721), CO-4638 (V.4), CO-4886 (V.2.c). |

### 20 CFR 416 where Colorado is silent (42 CFR 435.601(b)(2))

| Paragraph | Disposition |
|---|---|
| 416.1103, 416.1121, 416.1123, 416.1124 | C: the pass-4 rows hold (section 4). |
| 416.1163(a)-(c) | C: CO-6050, CO-6054, CO-6055 (allocations from an ineligible spouse). |
| 416.1163(d) | **F6-6**. |
| 416.1165 | C: CO-4624 to CO-4634, CO-5902, CO-5904. |
| 416.1201-416.1218, 416.1207(a) | C for the SSI-related groups (N4-7, N4-8); **F6-2** for long-term care. |
| 42 CFR 435.135 | **F6-8**. |

## 4. Earlier fixes (status at 5db41ba)

`scripts/check.ts` passes every stored expectation, including each fix's own households; the probes below were run again or varied.

| Earlier finding | Status |
|---|---|
| N4-1 (reverse mortgage, reimbursement, utility allowance, diversion) | Holds: CO-766, CO-768 pass; the table rows are `not_income`/`exempt` with their paragraphs. |
| N4-2 (conversion of a resource) | Holds: CO-767 August. |
| N4-3 (Subpart K where Colorado is silent; irregular $60 a quarter) | Holds: CO-766 November, CO-6731 tests; OQ-1280 for Colorado's stricter paragraphs. |
| N4-4 (death benefits, claim expenses) | Holds: CO-767 September, October. |
| N4-5 (difficulty of care, work-study) | Holds: CO-767 November, CO-764 p2. |
| N4-6 (one joint car) | Holds: CO-762; the probes' couples agree. |
| N4-7 (SSI-related resources and couple by month) | Holds for the SSI-related, MSP and deeming figures (CO-760, CO-761; SSI-RETRO's CO-610 is right month by month). Not extended to long-term care, the SSI recipient branch or the long-term care institution status: **F6-2**, **F6-3**, **F6-5**. |
| N4-8 (first moment of the month) | Holds: CO-763; CO-131. |
| N4-9 (ages in the month) | Holds for the readers it named; **F6-4** is the person-scope CO-603 those outcomes still read. |
| N4-10 (look-back from the long-term care request) | Holds: CO-765. |
| N4-11 (child support on the child's list) | Holds: CO-768, CO-769. |
| N4-12 (interest) | Recorded, OQ-1280: holds as a state policy choice. |
| N4-13 (decision-4 defaults) | Holds for the facts it named; **F6-10** lists those left. |
| N4-14, N4-15, N4-16 | Hold. |
| FS-MA-1, FS-MA-2 (streams by their dates) | Hold: CO-835, CO-836. |
| FS-MA-3 (veterans benefit for a dependent; cross-list round) | Holds: CO-850 (she 700, he 1,100, couple 1,780 > 1,491, none). |
| FS-MA-4 to FS-MA-9 | Hold: CO-837 to CO-843. |
| Defaults (`taxes_on_withdrawal` when_absent 20%) | Holds. |
| CO-2467 (OQ-1345) | Recorded; holds. |

No regression of an earlier fix was found.

## 5. Open-question classification check

Every open question a non-MAGI item on the six outcomes' paths cites (`scratch6/oqs.ts`) was read. MAGI-only questions (OQ-204, OQ-213, OQ-214, OQ-410 to OQ-412, OQ-472, OQ-510, OQ-512, OQ-540, OQ-593, OQ-810) are the MAGI family's.

| OQ | Class recorded | Check |
|---|---|---|
| OQ-99, OQ-212, OQ-1060, OQ-1061 | blocked on a named document | Hold (OM 25-073, hcpf.colorado.gov). Not re-reported. |
| OQ-515, OQ-519, OQ-550 | blocked on a named document | Hold: each names a document no allowed host serves. |
| OQ-471, OQ-820, OQ-900 | needs Legal | **Not an accepted class** (F6-11). OQ-471 is decided by 1396r-5(d)(1) on file; OQ-820 and OQ-900 are state policy choices with Legal advising. |
| OQ-209 | state policy choice | **Weak** (F6-12): the omitted groups are mandatory; it is a scope decision. Its first half (the widow(er)s' test) is resolved and holds. |
| OQ-302, OQ-560, OQ-620 to OQ-624, OQ-721, OQ-740, OQ-821, OQ-822, OQ-950, OQ-971 to OQ-974, OQ-995, OQ-1020, OQ-1024, OQ-1050, OQ-1120, OQ-1122, OQ-1180, OQ-1200, OQ-1204, OQ-1205, OQ-1240 to OQ-1244, OQ-1280 to OQ-1282, OQ-1345 to OQ-1347 | state policy choice | Hold: each reads Colorado text where no text on file decides it (OQ-821: the rule counts penalty days and says nothing of the month's status; OQ-1244: F.1.d's months against F.2.a's date). |
| Unrecorded | | F6-6 (416.1163(d) against H.1.a) and F6-8 (435.135 against D.2) are conflicts between Colorado's text and federal text on file that no question records; if the fix keeps Colorado's reading, each needs a question. |

## 6. Reproducing

```
cd <scratch copy>
npx vite-node scratch6/probe.ts scratch6/p1.yaml   # SEPARATED (F6-1)
npx vite-node scratch6/probe.ts scratch6/p2.yaml   # SEPARATED-QMB, ACF-SPOUSE (F6-1)
npx vite-node scratch6/probe.ts scratch6/p3.yaml   # RETRO-LTC (F6-2)
npx vite-node scratch6/probe.ts scratch6/p4.yaml   # PREADMIT-RETRO (F6-3)
npx vite-node scratch6/probe.ts scratch6/p5.yaml   # AGE65-RETRO-LTC (F6-4)
npx vite-node scratch6/probe.ts scratch6/p11.yaml  # SSI-RETRO (F6-5)
npx vite-node scratch6/probe.ts scratch6/p6.yaml   # INELIG-SPOUSE (F6-6)
npx vite-node scratch6/probe.ts scratch6/p10.yaml  # MARRIED-SPOUSE-NOT-IN-CASE (F6-7)
npx vite-node scratch6/probe.ts scratch6/p8.yaml   # PICKLE-PENSION and control (F6-8)
npx vite-node scratch6/probe.ts scratch6/p12.yaml  # PACE-1619B (F6-9)
npx vite-node scratch6/probe.ts scratch6/p7.yaml   # boundaries (agree)
npx vite-node scratch6/probe.ts scratch6/p9.yaml   # MIA and patient payment (agree)
```

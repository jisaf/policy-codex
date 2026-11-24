# Pattern sweep: non-MAGI Medicaid (month timing, defaults, couples and households)

Sweep of 2026-11-24 on `ccr-9d19bf4c-wmnwcl` from `414d239`, by the product owner's decision to sweep the three patterns most of the six review passes found (coverage6-medicaid-nonmagi.md F6-2 to F6-5 were per-month gaps on the long-term care path) exhaustively instead of another review loop. Scope: the SSI-related aged, blind and disabled groups, Pickle, disabled adult children, disabled widow(er)s, 1619(b), OAP SISC B and OAP health care, long-term care (nursing facility, HCBS, PACE), post-eligibility, transfers, the Medicare Savings Programs and the two buy-ins: every Medicaid or shared derived item those outcomes read, less the MAGI and CHP+ items (the MAGI sweep's), and the supplied facts, record fields and parameters they read.

## 1. Method

- **Candidates, mechanically.** `scripts/audit/pattern-sweep-nonmagi.ts` (committed) walks the dependency graph of the non-MAGI outcomes (ma_ssi_related_category, ma_protected_group_category, ma_oap_health_care_status, ma_msp_category, ma_buy_in_category, ma_ltc_eligibility_status, ma_patient_payment and the four long-term care verification outcomes), stopping at items tagged `magi` or `chp` (the age-in-a-month helpers excepted): 213 derived items, 167 of them month-scoped. It lists, for every swept item:
  - **P1** every read of a person-, case- or global-scope fact or derived item (not a parameter) inside a month-scoped item, every `[at, x, [det_month]]`, and every record sum read without its month or its stream's dates (none was found: every receipt, earnings and holdings sum in scope reads `received_in` and the stream's start and end dates or the holding's disposed date);
  - **P2** every `otherwise` and `unknown`, and every record field read whose schema gives a `default` or a `when_absent`;
  - **P3** every relationship operator (`rel`, `exists_related`, `has_relative_in`, `reachable`, `shared_relative`) and every read of a co-residence or composition fact or group (lives_with, dwelling_id, marital status, the institution facts, the couple, deeming and household groups).
  On `414d239` it listed **623 candidates: P1 186, P2 310, P3 127** (the list is the appendix, each with its verdict; `npx vite-node scripts/audit/pattern-sweep-nonmagi.ts -- --tsv` reproduces it on any commit).
- **Judged against the fetched text**: D-65 (10 CCR 2505-10 § 8.100, current text) §§ 8.100.3.E, 8.100.5.C, H, M, 8.100.6.C, K, L-O, 8.100.7.A-C, K, V; D-53 and D-54 (20 CFR 416 Subparts K and L: 416.1163, 416.1165, 416.1167, 416.1207); D-55 (§ 8.401), D-56 and D-75 (§§ 8.7000-8.7101). New excerpts S5120 to S5122 quote D-53 (416.1167(a)(1), 416.1163(f)(4), 416.1165(g)(3)-(4)); no document was fetched and nothing was written from memory.
- **Probes**: each defect has a household or a rule test with its answer computed by hand from the excerpt (section 4); the scratch runner evaluated each before and after the fix.

## 2. Result

| Pattern | Candidates | Fixed | Right (verdict and citation) | Open question | Not changed here (shared, reported) |
|---|---|---|---|---|---|
| P1 month timing | 186 | 40 | 114 | 12 (OQ-1415) | 20 (residency and status, read by the MAGI groups too) |
| P2 defaults | 310 | 42 | 265 | 0 | 3 (the shared residency fact) |
| P3 couples and households | 127 | 49 | 77 | 1 (OQ-1415) | 0 |

Nineteen defects (PS-1 to PS-19), all fixed: 12 give a wrong answer (2 common, 10 rare edge), 7 are defaults no rule gives (decision 4: the answer becomes cannot determine where the household does not state the fact, never a different determination). One open question, OQ-1415, a state policy choice. The verdict codes are defined in section 3; the defects and their fixes in section 4.

## 3. Verdict codes

Every candidate in the appendix carries one of these codes.

**Fixed** (section 4 names the defect and its tests):

| Code | Defect |
|---|---|
| F-INST | PS-1, PS-11: a medical institution read in the month |
| F-HH | PS-2, PS-8, PS-9, PS-10, PS-13: the SSI household of the month (CO-7505) |
| F-ONSET | PS-3: disability from its onset |
| F-TRUST | PS-4: the income trust from the month it was established |
| F-PARTA | PS-5: Part A entitlement in the month |
| F-1619 | PS-6: SSI status without payment in the month |
| F-OAP | PS-7: OAP receipt in the month |
| F-CS | PS-11: the community spouse in the month |
| F-SSI | PS-12: a family member's SSI eligibility in the month |
| F-REQ | PS-13 to PS-19: a default no rule gives, now required where read (decision 4 of 2026-11-23) |

**Right**, with the reason and the text:

| Code | Why the read is right |
|---|---|
| R-REC | A record sum read by its month: `received_in` with the stream's `start_date` and `end_date` (receipts), `job_start_date` and `job_end_date` (earnings), or the holding's `disposed_date` (holdings, held at the first moment of the month, 20 CFR 416.1207(a), S4501). The script found no record sum in scope without them. |
| R-AGE | `date_of_birth` read through the age-in-a-month items (CO-4978, CO-5402, CO-4790; docs/operators.md, Ages in a month). |
| R-DATED | Already dated by the month: ma_is_institutionalized (CO-640, F6-3), ma_excluded_from_ssi_household (CO-661, N4-7), ma_is_institutionalized_spouse_in_institution (CO-5200), ma_receives_ssi_in_month (CO-7351, F6-5), the onset gate (CO-4888); or the institution entry date itself. |
| R-DET | Fixed by the rule at the determination or at another named date: the CSRA and the couple's resources at the initial application (§ 8.100.7.M.1, S3419, "established at intake only"; CO-888, CO-646), the long-term care resources and transfer penalty at the determination month (ma_ssi_countable_resources_individual CO-4623, transfer penalty months and start date, § 8.100.7.F), home equity at the determination month (CO-650), QMB effective the month after the determination (§ 8.100.6.L.10, S2406; CO-3622, CO-3623's prior category), a finding as it stands at the determination (non-cooperation, § 8.100.5.E.5-7, S3621; § 8.100.7.V.2.c, S3622), court-ordered support, the personal needs allowance and the home maintenance maximum (global figures), and the transfer apportionment read at the determination month (§ 8.100.7.F.8, S1507). |
| R-GUARD | Read only where a per-month guard already decides the month: the community spouse's income, shelter and medical needs (CO-2467, CO-2802, CO-3619) and the family allowance feed the patient payment only in a month the person is an institutionalized spouse in the institution (CO-5200); the income trust's "excluding hospital" setting (CO-642) and the State Veterans Home (CO-4103) only in a month the person is institutionalized (CO-640). |
| R-HIST | A historical fact the rule fixes at its event: the loss of SSI or OAP and the OASDI at that loss (§ 8.100.6.D-E, 42 CFR 435.135(a)(3), S1233), the disabled adult child's entitlement (§ 8.100.6.J), widowhood for the disabled widow(er)s (§ 8.100.6.I). |
| R-CE | A continuous eligibility period as CBMS records it, opened by a determination (§ 8.100.3.Q.2, S1724). |
| R-QDWI | QDWI is effective the month of determination, not retroactive before SSA's approval (§ 8.100.6.O.5, S2410). |
| R-VER | A verification item: whether a document is owed and received at the determination (42 CFR 435.952), not a month's eligibility. |
| R-BLIND | Blindness, SSA's or the State's finding: the retroactive test of § 8.100.5.C.4 (S3623) names age and disability only. |
| R-ONSET603 | ma_is_aged_blind_or_disabled (CO-603) keeps no onset gate: after PS-3 it is read only by the verification items and by the MAGI-family and emergency items (CO-1176, CO-1150), none a month's non-MAGI eligibility. |
| R-STATUS | Emancipation and school attendance as stated (is_emancipated_minor's default is rule-given, F6-10; § 8.100.5.H.2.a). |
| R-BUYIN | The Buy-In findings (the limited disability finding; the employer coverage) as the Buy-In determination states them; the Children's Buy-In covers the whole month (§ 8.100.5.C.3). |
| R-OAP | OAP health care's institution bar reads the setting of the determination (§ 8.100.6.K.7); a month before the application is ineligible_before_application in CO-1156 whatever the setting. |
| R-GROUP | A reader of the couple, deeming or household group: membership is decided per month by the group (CO-3626, CO-4624, CO-4625, CO-7505), so the count or sum reads the month's members. |
| R-UNREACH | An `otherwise` on this person's spouse edge inside a group whose own walk already needs the relationships (ma_ssi_couple_members, a reachable result) or under ma_ltc_couple: never reached with the relationships unstated. |
| R-OPS | Another person's unstated relationships read as none, as docs/operators.md (Relationships) states for every operator that reads another person's relationships. |
| R-SHAREDREL | The shared relationship items (siblings, step_siblings, is_related_to; CO-2609, CO-2610, CO-2845) read inside the MAGI-family items' paths, not by a non-MAGI rule. |
| R-CBWD | The Children's Buy-In household is the MAGI household (§ 8.100.6.Q, its income "as described ... for MAGI"), the MAGI sweep's. |
| R-DEPPART | A veterans benefit's part for a dependent who is a spouse of the case (receipt field `for_person`, coverage pass 4 FS-MA-3): the spouse edge is the relationship, not co-residence. |
| R-SCHEMA-REP | A record field's `when_absent` that states what the record says (a stream in every month, from before the case's months, still held, owned alone, no co-owner, not returned): the record's statement, not a rule default (docs/conventions.md, Receipt records). |
| R-SCHEMA-RULE | A holdings field default the rule gives, declared on the record with its paragraph (coverage pass 4 N4-13, OQ-1243: § 8.100.5.E.3 "deemed available", M.2 exclusions the person establishes; `taxes_on_withdrawal` 20%, § 8.100.5.N.5.b). |
| R-SCHEMA-SHOWN | A receipt or earnings field that is an amount or status the person shows for an exclusion (a PASS set-aside, 20 CFR 416.1112(c)(9) and 416.1124(c)(13); claim expenses, covered costs, a dependent's part, foster care, irregular, retroactive): the exclusion of 416.1112 and 416.1124 (S3412) applies to what is shown, so absent it is not applied. |
| R-DECL | A rule-given default already declared on the fact with its citation (is_emancipated_minor, utility_expenses_actual, the spouse's assigned transfer months, ma_ltc_request_date, the continuous eligibility start month). |
| R-DECL-NEW | A default the rule gives, declared on the fact with its citation by this sweep (PS-19). |
| R-DECL-PACE | is_enrolled_in_pace (CO-885) is derived from ltc_services_received, whose meaning states the enrollment record. |
| R-HISTREC | The prior MSP category as the eligibility history records it: no record is no prior category (§ 8.100.6.L.10-11). |
| R-643 | is_married's (CO-930, shared) own default: after PS-17 no non-MAGI rule reads is_married. |

**OQ-1415** (state policy choice): the Case Management Agency's findings (target group, level of care, PACE service area and safety, the requested setting) are read as stated for every month; no text on file says whether a retroactive month before the assessment is an HCBS or PACE month.

**SHARED** (not changed here; reported): ma_meets_residency (CO-2250), ma_meets_citizenship_requirement (CO-509), ma_meets_status_for_cover_all_coloradans_categories (CO-1174) and is_colorado_resident (CO-505) are person-scope items of the determination date read by the non-MAGI and the MAGI groups alike. A retroactive month before a move to Colorado, or before a qualified non-citizen's five years end, reads the determination date's answer. The fix (a dated residency and status in the month) is one item for both families; it is left to the MAGI sweep and the coordinator, and recorded here so it is not lost.

## 4. Defects fixed

Common or rare is the call on the population the defect reaches. Every changed rule has hand-computed rule tests (the test ids are in the item files, each commented with the computation); the stored households CO-970 to CO-973 are this sweep's probes.

| ID | Pattern | Common / rare | Defect (rule text) | Fix | Tests and households (hand values) |
|---|---|---|---|---|---|
| PS-1 | P1 | rare | Whether the person is in a medical institution was the determination date's in every month for the home's estate recovery and trust tests, the long-term care applicant and the asset disclosure (§ 8.100.7.A.2.c.iii, S1753: benefits "start as of the first day when institutionalization began"; § 8.100.3.E.1, S1503). | New ma_resides_in_medical_institution_in_month (CO-7500), from the month of institution_entry_date for a month before the determination month; read by CO-5203, CO-5204, CO-1631, CO-4631. | CO-7500-T1 to T5; CO-5203-T6, T7 (50, admitted 2026-09-14: August false, September true); CO-1631-T4, T5; CO-4631-T4, T5 |
| PS-2 | P1, P3 | rare | The deeming parents and children and the ineligible child allocations read the homes and any medical-institution stay of the determination date in every month: a child admitted in September had no parent deemed in a retroactive August; a sibling or parent living elsewhere was in or out whatever the month (§ 8.100.7.A.1, S3406: from "the first day of the month following the month during which a child under the age of 18 ceases to live with his or her parent(s)"; 20 CFR 416.1165(g)(4), S5122; 416.1167(a)(1), S5120). | New ma_ssi_lives_with_in_month (CO-7505): the person's home, and a spouse, parent or child living elsewhere through the month they ceased to live together (a facility's entry date, ceased_living_with_spouse_date, or the new neutral ceased_living_with_parent_or_child_date, CO-7506). CO-4624, CO-4625, CO-2277, CO-4633, CO-3626 read it; a stay the person returns from keeps the home (D-M4). | CO-7505-T1 to T12; CO-4624-T7, T8; CO-4625-T2; CO-4633-T5; CO-972 (CHILD-HOSP-DEEMING): [p2] in August and September, [] from October |
| PS-3 | P1 | rare | Disability was read without its onset in the long-term care, HCBS, PACE, protected-group, Pickle, disabled widow(er), Children's Buy-In, ineligible-spouse and deeming-children tests (§ 8.100.5.C.4.b, S3623; § 8.100.7.A.2.b, S1753; disability_onset_date, "the date on which the person's disability began"). | Those readers read ma_is_aged_blind_or_disabled_in_month (CO-5201) or the onset gate (CO-1162, CO-620, CO-4625, CO-5904, CO-6061). | CO-3310-T91, CO-1163-T92, CO-653-T10, CO-654-T11, CO-1159-T94, CO-7353-T8, T9, CO-1162-T90, CO-620-T95; CO-973 (ONSET-LTC): August not_aged_blind_or_disabled, September to November eligible_institutional |
| PS-4 | P1 | common (among income-trust cases: the trust is often set up after the admission, and the application asks for the retroactive months) | The income trust stated on the determination date met the special income group in every retroactive month (§ 8.100.7.A.2.e, S1753, "who establishes an income trust"). | New ma_income_trust_established_date (CO-7501); CO-642 meets the trust route from its month for a month before the determination month. | CO-642-T8 to T10 (3,500 > 2,982; trust 2026-10-05: September false, October true, no date unknown) |
| PS-5 | P1 | common (a person turning 65 who applies for SLMB with retroactive months) | Part A entitlement was the determination date's in every month for QMB, SLMB and QI-1 (§ 8.100.6.M.2.a, M.5, S2407; N.3-4, S1749). | New neutral medicare_part_a_entitlement_date (CO-7502) and ma_is_entitled_to_medicare_part_a_in_month (CO-7503), read by CO-613, CO-614, CO-615. | CO-7503-T1 to T5; CO-613/614/615-T90; CO-971 (SLMB-PARTA): August and September none, October and November slmb (1,480 between 1,330 and 1,596) |
| PS-6 | P1 | rare | 1619(b) status was the determination date's in every month for HCBS, the HCBS/PACE route and the protected groups (§ 8.100.6.C.8, S627). | New ma_retains_ssi_status_in_month (CO-7504), from the SSI award's eligibility date (ssi_eligibility_date). | CO-7504-T1 to T5; CO-4630-T5, T6 |
| PS-7 | P1 | rare | OAP receipt was the determination date's in every month for OAP SISC B (§ 8.100.6.K.2-4, S621: "persons receiving OAP-A or OAP-B"). | New neutral adult_financial_program_start_date (CO-7507) and ma_receives_oap_in_month (CO-7508), read by CO-1177. | CO-7508-T1 to T5; CO-1177-T91 |
| PS-8 | P3 | rare | A spouse who died, still a person of the case, stayed in the SSI couple and stayed the community spouse in every month (20 CFR 416.1163(f)(4), S5121; § 8.100.7.C.2.b, S1759). | CO-7505 keeps a person who died through the month of death; ma_ltc_couple (CO-643) is per month and alive. | CO-3626-T13, T14; CO-643-T90, T91; CO-970 (SPOUSE-DIED): September household 2, 1,680, none; October and November 1, 980, aged |
| PS-9 | P3 | rare | A stepparent was deemed whether or not the child's own parent lived in the household (416.1165(g)(3)-(4), S5122: no deeming from the stepparent "if your natural or adoptive parent has permanently left the household"). | CO-4624 deems a stepparent only in a month the child's parent who is the stepparent's spouse is in the child's household. | CO-4624-T10, T11; CO-228 moves (section 5) |
| PS-10 | P3 | rare | A child not yet born was an unemancipated child in every month before the birth: an Ineligible Child Allocation was taken for a retroactive month before the birth (§ 8.100.5.H.2.a, S1506). | CO-2275 requires the month of birth on or before the month. | CO-2275-T12, T13; CO-2277-T6, T7 (0 before the birth; 497 = 994 / 2 from the month of birth); CO-76 and CO-110 move (section 5) |
| PS-11 | P1, P3 | rare | The community spouse and the home-exemption relatives were read on the determination date in every month (a spouse admitted in September was not in the home in a retroactive August; a relative's age and setting the determination date's). | ma_ltc_couple (CO-643), ma_spouse_or_qualifying_child_lives_in_home (CO-889) and ma_spouse_or_dependent_relative_lives_in_home (CO-4880) per month (CO-7500, CO-7505, age on the first day, born by the month); CO-650 reads CO-889 in the determination month. | CO-889-T90 to T92; CO-4880-T90; CO-643-T90 to T92 |
| PS-12 | P1 | rare | A family member's SSI eligibility was the determination date's in every month for who is an ineligible parent, spouse or child (§ 8.100.5.H.2.b-c, S1506). | ma_is_applying_for_or_eligible_for_ssi (CO-2271) per month, from CO-7351 and CO-7504. | CO-2271-T90, T91 |
| PS-13 | P2 | n/a (decision 4) | The SSI household, the home-exemption relatives and the family allowance read a case with no homes stated as one home (convention rule 17's fallback; CO-889, CO-2277, CO-4624, CO-4633, CO-4880, CO-3626, CO-2469). No text on file presumes one home; 20 CFR 416.1163(a) and 416.1165 deem only from a spouse or parent "living in the same household". | lives_with read as stated, required where read (as C6-10 did for MAGI); conventions rule 17 restated. Stored households whose story has one home state dwelling_id h1 (65 households, 151 persons, every expectation unchanged); households of several units keep none. | CO-7505-T12, CO-3626-T15, CO-2469-T90 |
| PS-14 | P2 | n/a | A person with no relationships stated was read as having no spouse for the transfers, trust and annuity of a spouse (CO-649, CO-1634, CO-1635, CO-2232) and no relative in the home (CO-889). | Read as stated, required where read. | CO-649-T90, CO-1634-T90, CO-1635-T90, CO-2232-T90, CO-889-T92 |
| PS-15 | P2 | n/a | With no spouse in the case, an unstated marital status was read as not married (is_married's default) by the community spouse, the VA personal needs allowance and Aid and Attendance and the CES waiver (CO-643, CO-1986, CO-4103, CO-1164). | The marital status (or a spouse edge) required where read. | CO-643-T92, CO-1986-T5, T6 restated |
| PS-16 | P2 | n/a | An unstated disability onset was read as before every retroactive month (CO-4888, CO-4887 "no program reads a month as before the onset"). | Required for a month before the determination month; the determination month and after are not before the onset. | CO-4888-T90 to T92; CO-4888-T3 restated (unknown) |
| PS-17 | P2 | n/a | An unstated residence setting of a parent or child was read as not in a medical institution in the deeming readers; of a relative, in the home-exemption readers. | Required where read (through CO-7505, CO-7500). | CO-4624-T4 restated |
| PS-18 | P2 | n/a | The SSI method's excluded earned income and in-kind support and maintenance of a spouse, parent or Buy-In household member were read as 0 when unknown (CO-1715, CO-4200, CO-4201, CO-4634, CO-5221, CO-6051, CO-7353 to CO-7356). | Read as computed, required where read. | 14 rule tests restated with the figures stated (0), each commented |
| PS-19 | P2 | n/a | Defaults declared on the fact without the rule that gives them (CO-4637, CO-4638, CO-2820, CO-3311, CO-2447, CO-2446, CO-4884, CO-4885, CO-2411) or not declared at all (CO-821), and the SSI-method reading of the shared work expenses (CO-4616, CO-4617). | Each declared with its paragraph and the reason the rule gives it (an act or finding whose absence is none; an amount the person shows). | (meaning only) |

## 5. Open questions and answer changes

**Open questions.** OQ-1415 (state policy choice, Medicaid policy owner): section 3. IDs OQ-1416 to OQ-1424 unused.

**Answer changes, stored households** (every stored expectation is unchanged or restated as the comment says; the harnesses' entries are scripts/receipts/allowed-differences.yaml under the pattern sweep header, scripts/records/allowed/ps-nonmagi.yaml and h7-ps-nonmagi.yaml, one entry per value with its class):

- Values that move to another value: CO-76 p1, p3, p4 (October: the unborn p3 gives no Ineligible Child Allocation, so the parents' income deemed to the children and p1's own SSI figure rise; p3's own figures before the birth are computed for no rule), CO-110 p3 (June and July, before the birth), CO-228 p2 (the stepfather is not deemed: the child's parent is not a person of the case), CO-306 p2 (October: the OAP client died in September, so the widow's SSI income is her own, 980, aged; was 1,580 with the couple).
- Values that move to cannot determine, each in its class: the homes not stated (households of several units, and figures computed for every person of households whose stories are not one home), a parent and child in two homes with no date (CO-04, CO-191, CO-352), Part A's date in a retroactive month (CO-532, CO-533), the student exclusion of an earner under 22 whose school attendance is not stated, the in-kind support of a deemed parent whose shelter costs paid by others are not stated, the setting of a home-exemption relative (CO-141, CO-178, CO-448 to CO-450), and the 2028 student exclusion maximum (CO-89, no version).
- Stored households restated (every expectation unchanged): 65 one-home households state dwelling_id h1; CO-492 states its home; CO-01, CO-02, CO-06, CO-909 state ma_ltc_couple by month and CO-214 the home-exemption relative by month (the items are now per month).

**Generated households**: the SSI-method and family-allowance figures of generated households that state no homes (ma_title_ii_cola_increase, ma_family_allowance, the SSI income figures) move to cannot determine (class HOMES), and the student exclusion and in-kind support classes as above.

## 6. Gate

After merging origin at `950e322` (the MAGI and CHP+ pattern sweep; fetched again before the gate, no newer commit). `node scripts/sync-manifest.mjs co`: written. `npm run typecheck`: passes. `npx vitest run`: 1,161 tests pass (103 files), with the UI pins re-pinned, each with its reason (the Medicaid policy owner's open questions, + OQ-1415; the question queue, + OQ-1415; CO-191 reaching 118, + CO-972; the households reading the long-term care tests on the unverified sources, + CO-973). `npm run receipts:harness -- --all-programs`: OK, 0 unexplained (stored 4,060 values differ, all allowed; generated 34,800, all allowed); 0 stored households not the translation; metamorphic MA-1 to MA-6 0 violations. `npm run records:harness -- --list earnings --all-programs`: OK, 0 unexplained (stored 4,063; generated 7,125); 0 not the translation; boundary lint 0 findings; metamorphic 0 violations. `npm run records:harness -- --list holdings --all-programs`: OK, 0 unexplained (stored 3,458; generated 2,442); 0 not the translation; joint-holding lint clean; metamorphic 0 violations. Every difference the sweep adds is in its own cited entries, one per value (scripts/receipts/allowed-differences.yaml under the pattern sweep header: 864 entries; scripts/records/allowed/ps-nonmagi.yaml: 504; h7-ps-nonmagi.yaml: 29); no harness's acceptance logic changed. `CHECK_BASE=origin/main npm run check`: OK; 6,166 rule tests and 4,663 household expectations pass; change impact 28 flags, all dispositioned (2026-11-24-pattern-sweep-nonmagi.yaml: 7, three applying to ma_ltc_eligibility_status, the rest re-keyed or not carrying over, each with its reason); conformance self-check OK (6,811 cases, 10,989 checked).

## Appendix: every candidate and its verdict

The sweep script's list on `414d239` (P1 186, P2 310, P3 127), each row a candidate and its verdict code (section 3). An item listed under P1 and P3 for the same read is judged once in each pattern.

| Pattern | Item | Identifier | Candidate | Verdict |
|---|---|---|---|---|
| P1 | CO-603 | ma_is_aged_blind_or_disabled | `reads person supplied is_blind (CO-010)` | R-ONSET603 |
| P1 | CO-603 | ma_is_aged_blind_or_disabled | `reads person supplied meets_ssa_disability_criteria (CO-011)` | R-ONSET603 |
| P1 | CO-611 | ma_is_ssi_related_eligible | `reads person derived ma_meets_residency (CO-2250)` | SHARED |
| P1 | CO-611 | ma_is_ssi_related_eligible | `reads person derived ma_meets_citizenship_requirement (CO-509)` | SHARED |
| P1 | CO-611 | ma_is_ssi_related_eligible | `reads person derived ma_abd_denied_for_noncooperation (CO-4886)` | R-DET |
| P1 | CO-613 | ma_qmb_eligible | `reads person supplied medicare_part_a_entitled (CO-803)` | F-PARTA |
| P1 | CO-614 | ma_slmb_eligible | `reads person supplied medicare_part_a_entitled (CO-803)` | F-PARTA |
| P1 | CO-615 | ma_qi_eligible | `reads person supplied medicare_part_a_entitled (CO-803)` | F-PARTA |
| P1 | CO-616 | ma_qdwi_eligible | `reads person derived ma_qdwi_meets_disability_work_history (CO-1157)` | R-QDWI |
| P1 | CO-618 | ma_wawd_eligible | `reads person derived ma_meets_residency (CO-2250)` | SHARED |
| P1 | CO-618 | ma_wawd_eligible | `reads person derived ma_meets_status_for_cover_all_coloradans_categories (CO-1174)` | SHARED |
| P1 | CO-618 | ma_wawd_eligible | `reads person derived ma_wawd_is_disabled (CO-806)` | R-BUYIN |
| P1 | CO-620 | ma_cbwd_eligible | `reads person derived ma_meets_residency (CO-2250)` | SHARED |
| P1 | CO-620 | ma_cbwd_eligible | `reads person derived ma_meets_status_for_cover_all_coloradans_categories (CO-1174)` | SHARED |
| P1 | CO-620 | ma_cbwd_eligible | `reads person supplied meets_ssa_disability_criteria (CO-011)` | F-ONSET |
| P1 | CO-620 | ma_cbwd_eligible | `reads person supplied employer_family_coverage_employer_premium_share (CO-3630)` | R-BUYIN |
| P1 | CO-620 | ma_cbwd_eligible | `reads person supplied is_enrolled_in_employer_family_coverage (CO-3631)` | R-BUYIN |
| P1 | CO-620 | ma_cbwd_eligible | `reads person supplied ma_continuous_eligibility_program (CO-2446)` | R-CE |
| P1 | CO-640 | ma_is_institutionalized | `reads person derived resides_in_medical_institution (CO-1742)` | R-DATED |
| P1 | CO-640 | ma_is_institutionalized | `reads person supplied expects_institutional_stay_of_thirty_days (CO-822)` | R-DATED |
| P1 | CO-640 | ma_is_institutionalized | `reads person supplied institution_entry_date (CO-008)` | R-DATED |
| P1 | CO-642 | ma_meets_special_income_group | `reads person supplied has_income_trust (CO-823)` | F-TRUST |
| P1 | CO-642 | ma_meets_special_income_group | `reads person supplied residence_setting_type (CO-3330)` | R-GUARD |
| P1 | CO-647 | ma_institutionalized_spouse_countable_resources | `reads person derived ma_ssi_countable_resources_individual (CO-4623)` | R-DET |
| P1 | CO-647 | ma_institutionalized_spouse_countable_resources | `at "ma_ssi_excluded_automobile_equity_in_month" in ["det_month"]` | R-DET |
| P1 | CO-647 | ma_institutionalized_spouse_countable_resources | `at ["of",["P"],"ma_ssi_excluded_automobile_equity_in_month"] in ["det_month"]` | R-DET |
| P1 | CO-647 | ma_institutionalized_spouse_countable_resources | `at "ma_ssi_couple_automobile_equity_in_month" in ["det_month"]` | R-DET |
| P1 | CO-647 | ma_institutionalized_spouse_countable_resources | `at ["of",["P"],"ma_ssi_couple_automobile_equity_in_month"] in ["det_month"]` | R-DET |
| P1 | CO-647 | ma_institutionalized_spouse_countable_resources | `reads person derived ma_csra (CO-646)` | R-DET |
| P1 | CO-648 | ma_meets_ltc_resource_standard | `reads person derived ma_ltc_couple (CO-643)` | F-CS |
| P1 | CO-648 | ma_meets_ltc_resource_standard | `reads person supplied ma_community_spouse_withheld_resources_are_excused (CO-4637)` | R-DET |
| P1 | CO-650 | ma_home_equity_disqualifies | `at "ma_home_equity_interest_in_month" in ["det_month"]` | R-DET |
| P1 | CO-651 | ma_ltc_financially_eligible | `reads person derived ma_home_equity_disqualifies (CO-650)` | R-DET |
| P1 | CO-653 | ma_hcbs_waiver_eligible | `reads person derived ma_meets_residency (CO-2250)` | SHARED |
| P1 | CO-653 | ma_hcbs_waiver_eligible | `reads person derived ma_meets_status_for_cover_all_coloradans_categories (CO-1174)` | SHARED |
| P1 | CO-653 | ma_hcbs_waiver_eligible | `reads person supplied meets_hcbs_waiver_target_group (CO-821)` | OQ-1415 |
| P1 | CO-653 | ma_hcbs_waiver_eligible | `reads person derived ma_meets_hcbs_waiver_condition_criteria (CO-2270)` | OQ-1415 |
| P1 | CO-653 | ma_hcbs_waiver_eligible | `reads person supplied ma_meets_designated_waiver_level_of_care (CO-1178)` | OQ-1415 |
| P1 | CO-653 | ma_hcbs_waiver_eligible | `reads person supplied retains_ssi_status_without_payment (CO-1112)` | F-1619 |
| P1 | CO-654 | ma_pace_eligible | `reads person derived ma_meets_residency (CO-2250)` | SHARED |
| P1 | CO-654 | ma_pace_eligible | `reads person derived ma_meets_citizenship_requirement (CO-509)` | SHARED |
| P1 | CO-654 | ma_pace_eligible | `reads person supplied meets_nursing_facility_level_of_care (CO-820)` | OQ-1415 |
| P1 | CO-654 | ma_pace_eligible | `reads person derived ma_home_equity_disqualifies (CO-650)` | R-DET |
| P1 | CO-654 | ma_pace_eligible | `reads person supplied ma_resides_in_pace_service_area (CO-2412)` | OQ-1415 |
| P1 | CO-654 | ma_pace_eligible | `reads person supplied ma_can_live_in_community_without_jeopardy (CO-2413)` | OQ-1415 |
| P1 | CO-656 | ma_community_spouse_income_allowance | `reads person supplied court_ordered_spousal_support (CO-4619)` | R-DET |
| P1 | CO-657 | ma_family_allowance | `reads person derived ma_family_allowance_members (CO-2469)` | R-DET |
| P1 | CO-660 | ma_transfer_penalty_applies | `reads person derived ma_transfer_penalty_months (CO-649)` | R-DET |
| P1 | CO-660 | ma_transfer_penalty_applies | `reads person supplied transfer_penalty_period_start_date (CO-886)` | R-DET |
| P1 | CO-661 | ma_excluded_from_ssi_household | `reads person derived resides_in_medical_institution (CO-1742)` | R-DATED |
| P1 | CO-661 | ma_excluded_from_ssi_household | `reads person supplied institution_entry_date (CO-008)` | R-DATED |
| P1 | CO-1159 | ma_pickle_eligible | `reads person derived ma_meets_residency (CO-2250)` | SHARED |
| P1 | CO-1159 | ma_pickle_eligible | `reads person derived ma_meets_citizenship_requirement (CO-509)` | SHARED |
| P1 | CO-1159 | ma_pickle_eligible | `reads person derived lost_ssi_or_oap_due_to_social_security_benefits (CO-1108)` | R-HIST |
| P1 | CO-1159 | ma_pickle_eligible | `reads person supplied lost_ssi_or_oap_received_with_social_security (CO-7358)` | R-HIST |
| P1 | CO-1159 | ma_pickle_eligible | `reads person supplied ma_continuous_eligibility_program (CO-2446)` | R-CE |
| P1 | CO-1161 | ma_dac_eligible | `reads person derived ma_meets_residency (CO-2250)` | SHARED |
| P1 | CO-1161 | ma_dac_eligible | `reads person derived ma_meets_citizenship_requirement (CO-509)` | SHARED |
| P1 | CO-1161 | ma_dac_eligible | `reads person derived receives_oasdi_as_disabled_adult_child (CO-1110)` | R-HIST |
| P1 | CO-1161 | ma_dac_eligible | `reads person supplied lost_ssi_due_to_social_security_benefits (CO-1180)` | R-HIST |
| P1 | CO-1161 | ma_dac_eligible | `reads person supplied ma_continuous_eligibility_program (CO-2446)` | R-CE |
| P1 | CO-1162 | ma_disabled_widow_eligible | `reads person derived ma_meets_residency (CO-2250)` | SHARED |
| P1 | CO-1162 | ma_disabled_widow_eligible | `reads person derived ma_meets_citizenship_requirement (CO-509)` | SHARED |
| P1 | CO-1162 | ma_disabled_widow_eligible | `reads person supplied marital_status (CO-844)` | R-HIST |
| P1 | CO-1162 | ma_disabled_widow_eligible | `reads person supplied meets_ssa_disability_criteria (CO-011)` | F-ONSET |
| P1 | CO-1162 | ma_disabled_widow_eligible | `reads person supplied lost_ssi_due_to_social_security_benefits (CO-1180)` | R-HIST |
| P1 | CO-1162 | ma_disabled_widow_eligible | `reads person supplied medicare_part_a_entitled (CO-803)` | F-PARTA |
| P1 | CO-1164 | ma_hcbs_waiver_age_criteria_met | `reads person derived is_married (CO-930)` | R-HIST |
| P1 | CO-1173 | ma_is_cover_all_coloradans_person | `at "ma_is_under_child_age_or_turns_nineteen_this_month" in ["det_month"]` | SHARED |
| P1 | CO-1177 | ma_oap_sisc_b_eligible | `reads person supplied adult_financial_program_received (CO-2710)` | F-OAP |
| P1 | CO-1177 | ma_oap_sisc_b_eligible | `reads person derived ma_meets_residency (CO-2250)` | SHARED |
| P1 | CO-1177 | ma_oap_sisc_b_eligible | `reads person derived ma_meets_citizenship_requirement (CO-509)` | SHARED |
| P1 | CO-1177 | ma_oap_sisc_b_eligible | `reads person derived ma_abd_denied_for_noncooperation (CO-4886)` | R-DET |
| P1 | CO-1631 | ma_is_long_term_care_applicant | `reads person derived resides_in_medical_institution (CO-1742)` | F-INST |
| P1 | CO-1631 | ma_is_long_term_care_applicant | `reads person supplied meets_hcbs_waiver_target_group (CO-821)` | OQ-1415 |
| P1 | CO-1631 | ma_is_long_term_care_applicant | `reads person derived is_enrolled_in_pace (CO-885)` | OQ-1415 |
| P1 | CO-1632 | ma_requires_verification_of_institutional_stay | `reads person supplied expects_institutional_stay_of_thirty_days (CO-822)` | R-VER |
| P1 | CO-1634 | ma_requires_verification_of_trust | `reads person supplied has_income_trust (CO-823)` | R-VER |
| P1 | CO-1636 | ma_institutional_stay_verification_is_pending | `reads person supplied institutional_stay_verification_document_received (CO-1575)` | R-VER |
| P1 | CO-1637 | ma_asset_transfers_verification_is_pending | `reads person supplied asset_transfer_verification_document_received (CO-1576)` | R-VER |
| P1 | CO-1638 | ma_trust_verification_is_pending | `reads person supplied trust_documents_received (CO-1578)` | R-VER |
| P1 | CO-1639 | ma_annuity_verification_is_pending | `reads person supplied annuity_verification_document_received (CO-1580)` | R-VER |
| P1 | CO-1703 | ma_self_employment_business_costs | `reads person supplied earnings (CO-5100)` | R-REC |
| P1 | CO-1748 | ma_oap_is_patient_in_tb_or_mental_health_institution | `reads person supplied residence_setting_type (CO-3330)` | R-OAP |
| P1 | CO-1748 | ma_oap_is_patient_in_tb_or_mental_health_institution | `reads person supplied residence_setting_is_primarily_for_mental_diseases (CO-3333)` | R-OAP |
| P1 | CO-1985 | ma_income_trust_gross_income_limit | `reads person derived ma_ltc_private_pay_region (CO-1980)` | R-DET |
| P1 | CO-2232 | ma_transfer_penalty_is_apportioned_with_spouse | `at ["of",["P"],"ma_is_institutionalized"] in ["det_month"]` | R-DET |
| P1 | CO-2232 | ma_transfer_penalty_is_apportioned_with_spouse | `at ["=",["of",["P"],"ma_ltc_unmet_requirement"],"none"] in ["det_month"]` | R-DET |
| P1 | CO-2275 | ma_is_ssi_unemancipated_child | `reads person supplied is_emancipated_minor (CO-843)` | R-STATUS |
| P1 | CO-2275 | ma_is_ssi_unemancipated_child | `reads person derived ma_is_regularly_attending_school_or_training (CO-2272)` | R-STATUS |
| P1 | CO-2277 | ma_ssi_ineligible_child_allocation | `reads person derived lives_with (CO-1925)` | F-HH |
| P1 | CO-2277 | ma_ssi_ineligible_child_allocation | `reads person derived resides_in_medical_institution (CO-1742)` | F-INST |
| P1 | CO-2277 | ma_ssi_ineligible_child_allocation | `reads person derived ma_is_applying_for_or_eligible_for_ssi (CO-2271)` | F-SSI |
| P1 | CO-2278 | ma_ssi_child_allocation_from_spouse_unearned | `reads person derived ma_is_applying_for_or_eligible_for_ssi (CO-2271)` | F-SSI |
| P1 | CO-2279 | ma_ssi_child_allocation_from_spouse_earned | `reads person derived ma_is_applying_for_or_eligible_for_ssi (CO-2271)` | F-SSI |
| P1 | CO-2448 | ma_child_is_in_non_magi_continuous_eligibility_period | `reads person supplied ma_continuous_eligibility_program (CO-2446)` | R-CE |
| P1 | CO-2448 | ma_child_is_in_non_magi_continuous_eligibility_period | `reads person derived ma_meets_residency (CO-2250)` | SHARED |
| P1 | CO-2448 | ma_child_is_in_non_magi_continuous_eligibility_period | `reads person supplied continuous_eligibility_period_start_month (CO-094)` | R-CE |
| P1 | CO-2448 | ma_child_is_in_non_magi_continuous_eligibility_period | `reads person supplied ma_application_date (CO-088)` | R-CE |
| P1 | CO-2448 | ma_child_is_in_non_magi_continuous_eligibility_period | `reads person derived ma_child_continuous_eligibility_end_month (CO-556)` | R-CE |
| P1 | CO-2467 | ma_community_spouse_income | `reads person derived resides_in_medical_institution (CO-1742)` | R-GUARD |
| P1 | CO-2802 | ma_community_spouse_shelter_costs | `reads person derived resides_in_medical_institution (CO-1742)` | R-GUARD |
| P1 | CO-3616 | ma_patient_payment_available_income | `reads person derived ma_personal_needs_allowance (CO-1987)` | R-DET |
| P1 | CO-3618 | ma_home_maintenance_allowance | `reads global derived ma_home_maintenance_allowance_max (CO-3617)` | R-DET |
| P1 | CO-3619 | ma_community_spouse_medical_needs | `reads person derived resides_in_medical_institution (CO-1742)` | R-GUARD |
| P1 | CO-3619 | ma_community_spouse_medical_needs | `reads person derived ma_family_allowance_members (CO-2469)` | R-DET |
| P1 | CO-3623 | ma_qmb_is_in_effect | `at "ma_prior_msp_category" in ["month_before",["det_month"]]` | R-DET |
| P1 | CO-3623 | ma_qmb_is_in_effect | `reads person derived ma_qmb_effective_month (CO-3622)` | R-DET |
| P1 | CO-3626 | ma_ssi_couple_members | `reads person derived lives_with (CO-1925)` | F-HH |
| P1 | CO-3626 | ma_ssi_couple_members | `reads person supplied ceased_living_with_spouse_date (CO-7352)` | F-HH |
| P1 | CO-3626 | ma_ssi_couple_members | `reads person supplied institution_entry_date (CO-008)` | F-HH |
| P1 | CO-4103 | ma_va_aid_and_attendance_is_patient_payment | `reads person supplied resides_in_state_veterans_home (CO-4102)` | R-GUARD |
| P1 | CO-4103 | ma_va_aid_and_attendance_is_patient_payment | `reads person derived is_married (CO-930)` | R-HIST |
| P1 | CO-4103 | ma_va_aid_and_attendance_is_patient_payment | `reads person derived ma_is_dependent_child (CO-544)` | R-GUARD |
| P1 | CO-4620 | ma_excluded_real_property_value | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-4621 | ma_countable_income_producing_property_value | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-4622 | ma_home_is_countable_resource | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-4623 | ma_ssi_countable_resources_individual | `at "ma_ssi_countable_resources_in_month" in ["det_month"]` | R-DET |
| P1 | CO-4624 | ma_ssi_deeming_parents | `reads person supplied is_emancipated_minor (CO-843)` | R-STATUS |
| P1 | CO-4624 | ma_ssi_deeming_parents | `reads person derived resides_in_medical_institution (CO-1742)` | F-INST |
| P1 | CO-4624 | ma_ssi_deeming_parents | `reads person derived lives_with (CO-1925)` | F-HH |
| P1 | CO-4624 | ma_ssi_deeming_parents | `reads person derived ma_is_applying_for_or_eligible_for_ssi (CO-2271)` | F-SSI |
| P1 | CO-4625 | ma_ssi_deeming_children | `reads person supplied is_emancipated_minor (CO-843)` | R-STATUS |
| P1 | CO-4625 | ma_ssi_deeming_children | `reads person derived resides_in_medical_institution (CO-1742)` | F-INST |
| P1 | CO-4625 | ma_ssi_deeming_children | `reads person supplied is_blind (CO-010)` | R-BLIND |
| P1 | CO-4625 | ma_ssi_deeming_children | `reads person supplied meets_ssa_disability_criteria (CO-011)` | F-ONSET |
| P1 | CO-4630 | ma_reaches_hcbs_without_special_income_group | `reads person supplied ma_ltc_setting_requested (CO-2411)` | OQ-1415 |
| P1 | CO-4630 | ma_reaches_hcbs_without_special_income_group | `reads person supplied retains_ssi_status_without_payment (CO-1112)` | F-1619 |
| P1 | CO-4630 | ma_reaches_hcbs_without_special_income_group | `reads person supplied meets_hcbs_waiver_target_group (CO-821)` | OQ-1415 |
| P1 | CO-4631 | ma_owes_long_term_care_asset_disclosure | `reads person derived resides_in_medical_institution (CO-1742)` | F-INST |
| P1 | CO-4633 | ma_ssi_deeming_ineligible_child_allocation | `reads person derived ma_is_applying_for_or_eligible_for_ssi (CO-2271)` | F-SSI |
| P1 | CO-4633 | ma_ssi_deeming_ineligible_child_allocation | `reads person derived lives_with (CO-1925)` | F-HH |
| P1 | CO-4633 | ma_ssi_deeming_ineligible_child_allocation | `reads person derived resides_in_medical_institution (CO-1742)` | F-INST |
| P1 | CO-4790 | ma_age_before_month | `reads person supplied date_of_birth (CO-001)` | R-AGE |
| P1 | CO-4888 | ma_month_is_before_disability_onset | `reads person supplied disability_onset_date (CO-4887)` | R-DATED |
| P1 | CO-4978 | ma_age_on_first_day_of_month | `reads person supplied date_of_birth (CO-001)` | R-AGE |
| P1 | CO-5170 | ma_ssi_wage_earnings | `reads person supplied earnings (CO-5100)` | R-REC |
| P1 | CO-5172 | ma_ssi_exempt_earned_receipts | `reads person supplied earnings (CO-5100)` | R-REC |
| P1 | CO-5173 | ma_ssi_irregular_earned_receipts | `reads person supplied earnings (CO-5100)` | R-REC |
| P1 | CO-5175 | ma_ssi_self_employment_receipts | `reads person supplied earnings (CO-5100)` | R-REC |
| P1 | CO-5176 | ma_ssi_pass_set_aside_earned_income | `reads person supplied earnings (CO-5100)` | R-REC |
| P1 | CO-5177 | ma_ssi_boarder_earned_income | `reads person supplied earnings (CO-5100)` | R-REC |
| P1 | CO-5178 | ma_ssi_wioa_earned_receipts | `reads person supplied earnings (CO-5100)` | R-REC |
| P1 | CO-5200 | ma_is_institutionalized_spouse_in_institution | `reads person derived resides_in_medical_institution (CO-1742)` | R-DATED |
| P1 | CO-5200 | ma_is_institutionalized_spouse_in_institution | `reads person derived ma_ltc_couple (CO-643)` | F-CS |
| P1 | CO-5200 | ma_is_institutionalized_spouse_in_institution | `reads person supplied institution_entry_date (CO-008)` | R-DATED |
| P1 | CO-5201 | ma_is_aged_blind_or_disabled_in_month | `reads person supplied is_blind (CO-010)` | R-BLIND |
| P1 | CO-5201 | ma_is_aged_blind_or_disabled_in_month | `reads person supplied meets_ssa_disability_criteria (CO-011)` | F-ONSET |
| P1 | CO-5203 | ma_home_is_subject_to_estate_recovery | `reads person derived resides_in_medical_institution (CO-1742)` | F-INST |
| P1 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `reads person derived resides_in_medical_institution (CO-1742)` | F-INST |
| P1 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `reads person supplied meets_hcbs_waiver_target_group (CO-821)` | OQ-1415 |
| P1 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `reads person derived is_enrolled_in_pace (CO-885)` | OQ-1415 |
| P1 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `reads person supplied residence_setting_type (CO-3330)` | F-INST |
| P1 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `reads person derived ma_spouse_or_dependent_relative_lives_in_home (CO-4880)` | F-INST |
| P1 | CO-5221 | ma_pickle_deeming_parents_countable_income | `reads person supplied social_security_income_when_child_lost_ssi_or_oap (CO-5220)` | R-HIST |
| P1 | CO-5320 | ma_ssi_holdings_countable_in_month | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-5321 | ma_ssi_excluded_automobile_equity_in_month | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-5322 | ma_ssi_countable_resources_in_month | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-5323 | ma_real_property_for_sale_excluded_in_month | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-5326 | ma_ssi_retirement_accounts_counted_in_month | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-5327 | ma_home_equity_interest_in_month | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-5329 | ma_holds_trust_interest_in_month | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-5330 | ma_holds_annuity_in_month | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-5402 | ma_age_on_last_day_of_month | `reads person supplied date_of_birth (CO-001)` | R-AGE |
| P1 | CO-5511 | ma_ssi_unearned_receipts | `reads person supplied receipts (CO-5000)` | R-REC |
| P1 | CO-5512 | ma_ssi_gambling_receipts | `reads person supplied receipts (CO-5000)` | R-REC |
| P1 | CO-5513 | ma_ssi_child_support_receipts | `reads person supplied receipts (CO-5000)` | R-REC |
| P1 | CO-5514 | ma_ssi_gross_unearned_receipts | `reads person supplied receipts (CO-5000)` | R-REC |
| P1 | CO-5515 | ma_social_security_receipts | `reads person supplied receipts (CO-5000)` | R-REC |
| P1 | CO-5530 | ma_va_aid_and_attendance_receipts | `reads person supplied receipts (CO-5000)` | R-REC |
| P1 | CO-5531 | ma_spousal_unearned_receipts | `reads person supplied receipts (CO-5000)` | R-REC |
| P1 | CO-5904 | ma_ssi_deeming_share_zeroes_benefit | `reads person supplied is_blind (CO-010)` | R-BLIND |
| P1 | CO-5904 | ma_ssi_deeming_share_zeroes_benefit | `reads person supplied meets_ssa_disability_criteria (CO-011)` | F-ONSET |
| P1 | CO-6052 | ma_pickle_oasdi_disregard | `reads person supplied social_security_income_when_ssi_or_oap_lost (CO-1109)` | R-HIST |
| P1 | CO-6053 | ma_pickle_oasdi_increase_as_spouse | `reads person supplied social_security_income_when_spouse_lost_ssi_or_oap (CO-4635)` | R-HIST |
| P1 | CO-6054 | ma_pickle_child_allocation_from_spouse_unearned | `reads person derived ma_is_applying_for_or_eligible_for_ssi (CO-2271)` | F-SSI |
| P1 | CO-6055 | ma_pickle_child_allocation_from_spouse_earned | `reads person derived ma_is_applying_for_or_eligible_for_ssi (CO-2271)` | F-SSI |
| P1 | CO-6061 | ma_pickle_deeming_share_zeroes_benefit | `reads person supplied is_blind (CO-010)` | R-BLIND |
| P1 | CO-6061 | ma_pickle_deeming_share_zeroes_benefit | `reads person supplied meets_ssa_disability_criteria (CO-011)` | F-ONSET |
| P1 | CO-6250 | ma_ssi_counted_social_security_receipts | `reads person supplied receipts (CO-5000)` | R-REC |
| P1 | CO-6730 | ma_ssi_irregular_unearned_receipts | `reads person supplied receipts (CO-5000)` | R-REC |
| P1 | CO-6733 | ma_ssi_couple_automobile_equity_in_month | `reads person supplied holdings (CO-5300)` | R-REC |
| P1 | CO-7351 | ma_receives_ssi_in_month | `reads person supplied receives_ssi (CO-012)` | R-DATED |
| P1 | CO-7351 | ma_receives_ssi_in_month | `reads person supplied ssi_eligibility_date (CO-7350)` | R-DATED |
| P1 | CO-7353 | ma_ssi_ineligible_spouse_income_is_not_deemed | `reads person derived ma_is_applying_for_or_eligible_for_ssi (CO-2271)` | F-SSI |
| P2 | CO-505 | is_colorado_resident | `otherwise ["=","state_of_residence","colorado_state_code"] -> ["not",["unknown","county_of_residence"]]` | SHARED |
| P2 | CO-505 | is_colorado_resident | `unknown "county_of_residence"` | SHARED |
| P2 | CO-608 | ma_ssi_countable_resources | `otherwise ["rel",["spouse","holds_out_as_spouse_with"],["P"]] -> false` | R-UNREACH |
| P2 | CO-647 | ma_institutionalized_spouse_countable_resources | `otherwise ["rel",["spouse"],["P"]] -> false` | R-UNREACH |
| P2 | CO-648 | ma_meets_ltc_resource_standard | `otherwise "ma_community_spouse_withheld_resources_are_excused" -> false` | R-DECL-NEW |
| P2 | CO-649 | ma_transfer_penalty_months | `otherwise ["rel",["spouse"],["P"]] -> false` | F-REQ |
| P2 | CO-658 | ma_patient_payment | `otherwise "ma_patient_payment_income_committed_elsewhere" -> 0` | R-DECL-NEW |
| P2 | CO-806 | ma_wawd_is_disabled | `otherwise "ma_wawd_limited_disability_finding" -> false` | R-DECL-NEW |
| P2 | CO-888 | ma_spousal_resources_at_snapshot | `otherwise ["rel",["spouse"],["P"]] -> false` | R-UNREACH |
| P2 | CO-889 | ma_spouse_or_qualifying_child_lives_in_home | `otherwise ["exists_related",["spouse","parent"],["all",["any",["rel",["spouse"],["P"]],["<",["of",["P"],"age"],"ma_home_ -> false` | R-UNREACH |
| P2 | CO-889 | ma_spouse_or_qualifying_child_lives_in_home | `otherwise ["of",["P"],"resides_in_medical_institution"] -> false` | F-REQ |
| P2 | CO-889 | ma_spouse_or_qualifying_child_lives_in_home | `otherwise ["in_group",["P"],"lives_with"] -> true` | F-REQ |
| P2 | CO-889 | ma_spouse_or_qualifying_child_lives_in_home | `otherwise ["not",["=","residence_setting_type","private_dwelling"]] -> false` | F-REQ |
| P2 | CO-889 | ma_spouse_or_qualifying_child_lives_in_home | `otherwise ["=",["of",["P"],"residence_setting_type"],"private_dwelling"] -> true` | F-REQ |
| P2 | CO-930 | is_married | `otherwise ["exists_related",["spouse"],true] -> false` | R-643 |
| P2 | CO-930 | is_married | `otherwise "marital_status" -> "single"` | R-643 |
| P2 | CO-1173 | ma_is_cover_all_coloradans_person | `unknown "most_recent_pregnancy_end_date"` | SHARED |
| P2 | CO-1634 | ma_requires_verification_of_trust | `otherwise ["rel",["spouse"],["P"]] -> false` | F-REQ |
| P2 | CO-1635 | ma_requires_verification_of_annuity | `otherwise ["rel",["spouse"],["P"]] -> false` | F-REQ |
| P2 | CO-1703 | ma_self_employment_business_costs | `record field earnings.month when_absent` | R-SCHEMA-REP |
| P2 | CO-1703 | ma_self_employment_business_costs | `record field earnings.job_start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-1703 | ma_self_employment_business_costs | `record field earnings.job_end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-1703 | ma_self_employment_business_costs | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-1703 | ma_self_employment_business_costs | `unknown ["receipt","job_start_date"]` | R-SCHEMA-REP |
| P2 | CO-1703 | ma_self_employment_business_costs | `unknown ["receipt","job_end_date"]` | R-SCHEMA-REP |
| P2 | CO-1715 | ma_wawd_countable_income | `otherwise "ma_ssi_excluded_earned_income" -> 0` | F-REQ |
| P2 | CO-1715 | ma_wawd_countable_income | `otherwise "impairment_related_work_expenses_paid" -> 0` | R-DECL-NEW |
| P2 | CO-2232 | ma_transfer_penalty_is_apportioned_with_spouse | `otherwise "ma_transfer_penalty_months_assigned_from_spouse" -> 0` | R-DECL |
| P2 | CO-2232 | ma_transfer_penalty_is_apportioned_with_spouse | `otherwise ["rel",["spouse"],["P"]] -> false` | F-REQ |
| P2 | CO-2232 | ma_transfer_penalty_is_apportioned_with_spouse | `otherwise "ma_spouse_outside_case_is_institutionalized_and_otherwise_eligible" -> false` | R-DECL-NEW |
| P2 | CO-2275 | ma_is_ssi_unemancipated_child | `otherwise "is_emancipated_minor" -> false` | R-DECL |
| P2 | CO-2277 | ma_ssi_ineligible_child_allocation | `otherwise ["in_group",["P"],"lives_with"] -> ["not",["otherwise",["of",["P"],"resides_in_medical_institut` | F-REQ |
| P2 | CO-2277 | ma_ssi_ineligible_child_allocation | `otherwise ["of",["P"],"resides_in_medical_institution"] -> false` | F-REQ |
| P2 | CO-2448 | ma_child_is_in_non_magi_continuous_eligibility_period | `otherwise "ma_continuous_eligibility_program" -> "magi"` | R-DECL-NEW |
| P2 | CO-2448 | ma_child_is_in_non_magi_continuous_eligibility_period | `otherwise "continuous_eligibility_period_start_month" -> ["month_of","ma_application_date"]` | R-DECL |
| P2 | CO-2448 | ma_child_is_in_non_magi_continuous_eligibility_period | `otherwise "ma_buy_in_enrollment_discontinued_for_premiums" -> false` | R-DECL-NEW |
| P2 | CO-2469 | ma_family_allowance_members | `otherwise ["exists",["of",["P"],"lives_with"],["all",["in_group",["P"],["reachable",["spouse"]]],["not",["of",["P"],"res -> false` | F-REQ |
| P2 | CO-2610 | step_siblings | `otherwise ["has_relative_in",["child"],["filter",["persons"],["rel",["stepchild"],["P"]]]] -> false` | R-OPS |
| P2 | CO-2610 | step_siblings | `otherwise ["has_relative_in",["stepchild"],["filter",["persons"],["rel",["child"],["P"]]]] -> false` | R-OPS |
| P2 | CO-2802 | ma_community_spouse_shelter_costs | `otherwise ["of",["P"],"utility_expenses_actual"] -> 0` | R-DECL |
| P2 | CO-2845 | is_related_to | `otherwise ["has_relative_in",["parent"],["filter",["persons"],["rel",["child"],["P"]]]] -> false` | R-OPS |
| P2 | CO-2845 | is_related_to | `otherwise ["has_relative_in",["child"],["filter",["persons"],["rel",["parent"],["P"]]]] -> false` | R-OPS |
| P2 | CO-3623 | ma_qmb_is_in_effect | `otherwise ["=","ma_prior_msp_category","qmb"] -> false` | R-HISTREC |
| P2 | CO-3623 | ma_qmb_is_in_effect | `otherwise ["=",["at","ma_prior_msp_category",["month_before",["det_month"]]],"qmb"] -> false` | R-HISTREC |
| P2 | CO-3624 | ma_qdwi_is_in_effect | `otherwise ["=","ma_prior_msp_category","qdwi"] -> false` | R-HISTREC |
| P2 | CO-3626 | ma_ssi_couple_members | `otherwise ["in_group",["P"],"lives_with"] -> true` | F-REQ |
| P2 | CO-3626 | ma_ssi_couple_members | `otherwise "ceased_living_with_spouse_date" -> ["otherwise",["of",["P"],"ceased_living_with_spouse_date"],[` | F-REQ |
| P2 | CO-3626 | ma_ssi_couple_members | `otherwise ["of",["P"],"ceased_living_with_spouse_date"] -> ["case",[["not",["=","residence_setting_type","private_dwell` | F-REQ |
| P2 | CO-3628 | ma_msp_december_category | `otherwise ["at","ma_prior_msp_category",["latest_month_of_year",12,["month_before",["month"]]]] -> "none"` | R-HISTREC |
| P2 | CO-4200 | ma_cbwd_household_earned_income | `otherwise ["of",["P"],"ma_ssi_excluded_earned_income"] -> 0` | F-REQ |
| P2 | CO-4200 | ma_cbwd_household_earned_income | `otherwise ["of",["P"],"ma_ssi_excluded_infrequent_earned_income"] -> 0` | F-REQ |
| P2 | CO-4201 | ma_cbwd_household_unearned_income | `otherwise ["of",["P"],"ssi_in_kind_support_and_maintenance"] -> 0` | F-REQ |
| P2 | CO-4620 | ma_excluded_real_property_value | `record field holdings.accessible default true` | R-SCHEMA-RULE |
| P2 | CO-4620 | ma_excluded_real_property_value | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-4620 | ma_excluded_real_property_value | `record field holdings.income_producing default false` | R-SCHEMA-RULE |
| P2 | CO-4620 | ma_excluded_real_property_value | `record field holdings.produces_for_household_use default false` | R-SCHEMA-RULE |
| P2 | CO-4620 | ma_excluded_real_property_value | `record field holdings.ma_sale_efforts_unsuccessful default false` | R-SCHEMA-RULE |
| P2 | CO-4620 | ma_excluded_real_property_value | `record field holdings.co_owner_would_lose_housing default false` | R-SCHEMA-RULE |
| P2 | CO-4620 | ma_excluded_real_property_value | `record field holdings.share when_absent` | R-SCHEMA-REP |
| P2 | CO-4620 | ma_excluded_real_property_value | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-4620 | ma_excluded_real_property_value | `otherwise ["receipt","share"] -> 1` | R-SCHEMA-REP |
| P2 | CO-4621 | ma_countable_income_producing_property_value | `record field holdings.accessible default true` | R-SCHEMA-RULE |
| P2 | CO-4621 | ma_countable_income_producing_property_value | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-4621 | ma_countable_income_producing_property_value | `record field holdings.income_producing default false` | R-SCHEMA-RULE |
| P2 | CO-4621 | ma_countable_income_producing_property_value | `record field holdings.produces_for_household_use default false` | R-SCHEMA-RULE |
| P2 | CO-4621 | ma_countable_income_producing_property_value | `record field holdings.used_in_trade_or_business default false` | R-SCHEMA-RULE |
| P2 | CO-4621 | ma_countable_income_producing_property_value | `record field holdings.share when_absent` | R-SCHEMA-REP |
| P2 | CO-4621 | ma_countable_income_producing_property_value | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-4621 | ma_countable_income_producing_property_value | `otherwise ["receipt","share"] -> 1` | R-SCHEMA-REP |
| P2 | CO-4622 | ma_home_is_countable_resource | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-4622 | ma_home_is_countable_resource | `record field holdings.share when_absent` | R-SCHEMA-REP |
| P2 | CO-4622 | ma_home_is_countable_resource | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-4622 | ma_home_is_countable_resource | `otherwise ["*",["otherwise",["receipt","share"],1],["-",["receipt","value"],["receipt","amount_owed"]]] -> 0` | R-SCHEMA-REP |
| P2 | CO-4622 | ma_home_is_countable_resource | `otherwise ["receipt","share"] -> 1` | R-SCHEMA-REP |
| P2 | CO-4624 | ma_ssi_deeming_parents | `otherwise "is_emancipated_minor" -> false` | R-DECL |
| P2 | CO-4624 | ma_ssi_deeming_parents | `otherwise "resides_in_medical_institution" -> false` | F-REQ |
| P2 | CO-4624 | ma_ssi_deeming_parents | `otherwise ["rel",["child","stepchild"],["P"]] -> false` | F-REQ |
| P2 | CO-4624 | ma_ssi_deeming_parents | `otherwise ["in_group",["P"],"lives_with"] -> true` | F-REQ |
| P2 | CO-4624 | ma_ssi_deeming_parents | `otherwise ["of",["P"],"resides_in_medical_institution"] -> false` | F-REQ |
| P2 | CO-4625 | ma_ssi_deeming_children | `otherwise ["has_relative_in",["child","stepchild"],"ma_ssi_deeming_parents"] -> false` | R-OPS |
| P2 | CO-4625 | ma_ssi_deeming_children | `otherwise ["of",["P"],"is_emancipated_minor"] -> false` | R-DECL |
| P2 | CO-4625 | ma_ssi_deeming_children | `otherwise ["of",["P"],"resides_in_medical_institution"] -> false` | F-REQ |
| P2 | CO-4628 | ma_ssi_impairment_related_work_expenses | `otherwise ["of",["P"],"impairment_related_work_expenses_paid"] -> 0` | R-DECL-NEW |
| P2 | CO-4629 | ma_ssi_earned_income_excluded_after_half | `otherwise ["of",["P"],"blind_work_expenses_paid"] -> 0` | R-DECL-NEW |
| P2 | CO-4630 | ma_reaches_hcbs_without_special_income_group | `otherwise "ma_ltc_setting_requested" -> "none"` | R-DECL-NEW |
| P2 | CO-4630 | ma_reaches_hcbs_without_special_income_group | `otherwise "meets_hcbs_waiver_target_group" -> "none"` | R-DECL-NEW |
| P2 | CO-4631 | ma_owes_long_term_care_asset_disclosure | `otherwise "resides_in_medical_institution" -> false` | F-INST |
| P2 | CO-4633 | ma_ssi_deeming_ineligible_child_allocation | `otherwise ["has_relative_in",["child","stepchild"],"ma_ssi_deeming_parents"] -> false` | R-OPS |
| P2 | CO-4633 | ma_ssi_deeming_ineligible_child_allocation | `otherwise ["in_group",["P"],"lives_with"] -> ["not",["otherwise",["of",["P"],"resides_in_medical_institut` | F-REQ |
| P2 | CO-4633 | ma_ssi_deeming_ineligible_child_allocation | `otherwise ["of",["P"],"resides_in_medical_institution"] -> false` | F-REQ |
| P2 | CO-4634 | ma_ssi_deeming_parents_countable_income | `otherwise ["of",["P"],"ssi_in_kind_support_and_maintenance"] -> 0` | F-REQ |
| P2 | CO-4634 | ma_ssi_deeming_parents_countable_income | `otherwise ["of",["P"],"ma_ssi_excluded_earned_income"] -> 0` | F-REQ |
| P2 | CO-4880 | ma_spouse_or_dependent_relative_lives_in_home | `otherwise ["exists",["filter",["persons"],["otherwise",["has_relative_in",["tax_dependent"],["reachable",["spouse"]]],fa -> false` | R-OPS |
| P2 | CO-4880 | ma_spouse_or_dependent_relative_lives_in_home | `otherwise ["has_relative_in",["tax_dependent"],["reachable",["spouse"]]] -> false` | R-OPS |
| P2 | CO-4880 | ma_spouse_or_dependent_relative_lives_in_home | `otherwise ["of",["P"],"resides_in_medical_institution"] -> false` | F-REQ |
| P2 | CO-4880 | ma_spouse_or_dependent_relative_lives_in_home | `otherwise ["in_group",["P"],"lives_with"] -> true` | F-REQ |
| P2 | CO-4880 | ma_spouse_or_dependent_relative_lives_in_home | `otherwise ["not",["=","residence_setting_type","private_dwelling"]] -> false` | F-REQ |
| P2 | CO-4880 | ma_spouse_or_dependent_relative_lives_in_home | `otherwise ["=",["of",["P"],"residence_setting_type"],"private_dwelling"] -> true` | F-REQ |
| P2 | CO-4886 | ma_abd_denied_for_noncooperation | `otherwise "ma_failed_to_pursue_potential_resources_or_income" -> false` | R-DECL-NEW |
| P2 | CO-4886 | ma_abd_denied_for_noncooperation | `otherwise "ma_refuses_to_release_patient_payment" -> false` | R-DECL-NEW |
| P2 | CO-4888 | ma_month_is_before_disability_onset | `otherwise ["<",["month"],["month_of","disability_onset_date"]] -> false` | F-REQ |
| P2 | CO-5170 | ma_ssi_wage_earnings | `record field earnings.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5170 | ma_ssi_wage_earnings | `record field earnings.job_start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5170 | ma_ssi_wage_earnings | `record field earnings.job_end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5170 | ma_ssi_wage_earnings | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5170 | ma_ssi_wage_earnings | `unknown ["receipt","job_start_date"]` | R-SCHEMA-REP |
| P2 | CO-5170 | ma_ssi_wage_earnings | `unknown ["receipt","job_end_date"]` | R-SCHEMA-REP |
| P2 | CO-5172 | ma_ssi_exempt_earned_receipts | `record field earnings.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5172 | ma_ssi_exempt_earned_receipts | `record field earnings.job_start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5172 | ma_ssi_exempt_earned_receipts | `record field earnings.job_end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5172 | ma_ssi_exempt_earned_receipts | `record field earnings.foster_care default false` | R-SCHEMA-SHOWN |
| P2 | CO-5172 | ma_ssi_exempt_earned_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5172 | ma_ssi_exempt_earned_receipts | `unknown ["receipt","job_start_date"]` | R-SCHEMA-REP |
| P2 | CO-5172 | ma_ssi_exempt_earned_receipts | `unknown ["receipt","job_end_date"]` | R-SCHEMA-REP |
| P2 | CO-5173 | ma_ssi_irregular_earned_receipts | `record field earnings.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5173 | ma_ssi_irregular_earned_receipts | `record field earnings.job_start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5173 | ma_ssi_irregular_earned_receipts | `record field earnings.job_end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5173 | ma_ssi_irregular_earned_receipts | `record field earnings.irregular default false` | R-SCHEMA-SHOWN |
| P2 | CO-5173 | ma_ssi_irregular_earned_receipts | `record field earnings.foster_care default false` | R-SCHEMA-SHOWN |
| P2 | CO-5173 | ma_ssi_irregular_earned_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5173 | ma_ssi_irregular_earned_receipts | `unknown ["receipt","job_start_date"]` | R-SCHEMA-REP |
| P2 | CO-5173 | ma_ssi_irregular_earned_receipts | `unknown ["receipt","job_end_date"]` | R-SCHEMA-REP |
| P2 | CO-5175 | ma_ssi_self_employment_receipts | `record field earnings.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5175 | ma_ssi_self_employment_receipts | `record field earnings.job_start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5175 | ma_ssi_self_employment_receipts | `record field earnings.job_end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5175 | ma_ssi_self_employment_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5175 | ma_ssi_self_employment_receipts | `unknown ["receipt","job_start_date"]` | R-SCHEMA-REP |
| P2 | CO-5175 | ma_ssi_self_employment_receipts | `unknown ["receipt","job_end_date"]` | R-SCHEMA-REP |
| P2 | CO-5176 | ma_ssi_pass_set_aside_earned_income | `record field earnings.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5176 | ma_ssi_pass_set_aside_earned_income | `record field earnings.job_start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5176 | ma_ssi_pass_set_aside_earned_income | `record field earnings.job_end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5176 | ma_ssi_pass_set_aside_earned_income | `record field earnings.pass_set_aside default 0` | R-SCHEMA-SHOWN |
| P2 | CO-5176 | ma_ssi_pass_set_aside_earned_income | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5176 | ma_ssi_pass_set_aside_earned_income | `unknown ["receipt","job_start_date"]` | R-SCHEMA-REP |
| P2 | CO-5176 | ma_ssi_pass_set_aside_earned_income | `unknown ["receipt","job_end_date"]` | R-SCHEMA-REP |
| P2 | CO-5177 | ma_ssi_boarder_earned_income | `record field earnings.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5177 | ma_ssi_boarder_earned_income | `record field earnings.job_start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5177 | ma_ssi_boarder_earned_income | `record field earnings.job_end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5177 | ma_ssi_boarder_earned_income | `record field earnings.foster_care default false` | R-SCHEMA-SHOWN |
| P2 | CO-5177 | ma_ssi_boarder_earned_income | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5177 | ma_ssi_boarder_earned_income | `unknown ["receipt","job_start_date"]` | R-SCHEMA-REP |
| P2 | CO-5177 | ma_ssi_boarder_earned_income | `unknown ["receipt","job_end_date"]` | R-SCHEMA-REP |
| P2 | CO-5178 | ma_ssi_wioa_earned_receipts | `record field earnings.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5178 | ma_ssi_wioa_earned_receipts | `record field earnings.job_start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5178 | ma_ssi_wioa_earned_receipts | `record field earnings.job_end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5178 | ma_ssi_wioa_earned_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5178 | ma_ssi_wioa_earned_receipts | `unknown ["receipt","job_start_date"]` | R-SCHEMA-REP |
| P2 | CO-5178 | ma_ssi_wioa_earned_receipts | `unknown ["receipt","job_end_date"]` | R-SCHEMA-REP |
| P2 | CO-5203 | ma_home_is_subject_to_estate_recovery | `otherwise "resides_in_medical_institution" -> false` | F-INST |
| P2 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `record field holdings.share when_absent` | R-SCHEMA-REP |
| P2 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `otherwise ["*",["otherwise",["receipt","share"],1],["-",["receipt","value"],["receipt","amount_owed"]]] -> 0` | R-SCHEMA-REP |
| P2 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `otherwise ["receipt","share"] -> 1` | R-SCHEMA-REP |
| P2 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `otherwise "resides_in_medical_institution" -> false` | F-INST |
| P2 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `otherwise "meets_hcbs_waiver_target_group" -> "none"` | R-DECL-NEW |
| P2 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `otherwise "is_enrolled_in_pace" -> false` | R-DECL-PACE |
| P2 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `record field holdings.intends_to_return default false` | R-SCHEMA-RULE |
| P2 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `record field holdings.intent_in_writing default false` | R-SCHEMA-RULE |
| P2 | CO-5221 | ma_pickle_deeming_parents_countable_income | `otherwise ["of",["P"],"ssi_in_kind_support_and_maintenance"] -> 0` | F-REQ |
| P2 | CO-5221 | ma_pickle_deeming_parents_countable_income | `otherwise ["of",["P"],"ma_ssi_excluded_earned_income"] -> 0` | F-REQ |
| P2 | CO-5320 | ma_ssi_holdings_countable_in_month | `record field holdings.accessible default true` | R-SCHEMA-RULE |
| P2 | CO-5320 | ma_ssi_holdings_countable_in_month | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5320 | ma_ssi_holdings_countable_in_month | `record field holdings.co_owners when_absent` | R-SCHEMA-REP |
| P2 | CO-5320 | ma_ssi_holdings_countable_in_month | `record field holdings.ma_joint_account_presumption_rebutted default false` | R-SCHEMA-RULE |
| P2 | CO-5320 | ma_ssi_holdings_countable_in_month | `record field holdings.share when_absent` | R-SCHEMA-REP |
| P2 | CO-5320 | ma_ssi_holdings_countable_in_month | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-5320 | ma_ssi_holdings_countable_in_month | `otherwise ["receipt","share"] -> 1` | R-SCHEMA-REP |
| P2 | CO-5320 | ma_ssi_holdings_countable_in_month | `record field holdings.income_producing default false` | R-SCHEMA-RULE |
| P2 | CO-5320 | ma_ssi_holdings_countable_in_month | `record field holdings.produces_for_household_use default false` | R-SCHEMA-RULE |
| P2 | CO-5321 | ma_ssi_excluded_automobile_equity_in_month | `record field holdings.accessible default true` | R-SCHEMA-RULE |
| P2 | CO-5321 | ma_ssi_excluded_automobile_equity_in_month | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5321 | ma_ssi_excluded_automobile_equity_in_month | `record field holdings.share when_absent` | R-SCHEMA-REP |
| P2 | CO-5321 | ma_ssi_excluded_automobile_equity_in_month | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-5321 | ma_ssi_excluded_automobile_equity_in_month | `otherwise ["receipt","share"] -> 1` | R-SCHEMA-REP |
| P2 | CO-5322 | ma_ssi_countable_resources_in_month | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5322 | ma_ssi_countable_resources_in_month | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-5323 | ma_real_property_for_sale_excluded_in_month | `record field holdings.accessible default true` | R-SCHEMA-RULE |
| P2 | CO-5323 | ma_real_property_for_sale_excluded_in_month | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5323 | ma_real_property_for_sale_excluded_in_month | `record field holdings.income_producing default false` | R-SCHEMA-RULE |
| P2 | CO-5323 | ma_real_property_for_sale_excluded_in_month | `record field holdings.produces_for_household_use default false` | R-SCHEMA-RULE |
| P2 | CO-5323 | ma_real_property_for_sale_excluded_in_month | `record field holdings.ma_sale_efforts_unsuccessful default false` | R-SCHEMA-RULE |
| P2 | CO-5323 | ma_real_property_for_sale_excluded_in_month | `record field holdings.co_owner_would_lose_housing default false` | R-SCHEMA-RULE |
| P2 | CO-5323 | ma_real_property_for_sale_excluded_in_month | `record field holdings.share when_absent` | R-SCHEMA-REP |
| P2 | CO-5323 | ma_real_property_for_sale_excluded_in_month | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-5323 | ma_real_property_for_sale_excluded_in_month | `otherwise ["receipt","share"] -> 1` | R-SCHEMA-REP |
| P2 | CO-5325 | ma_uncompensated_transfers_in_lookback | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5325 | ma_uncompensated_transfers_in_lookback | `record field holdings.returned_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5325 | ma_uncompensated_transfers_in_lookback | `record field holdings.share when_absent` | R-SCHEMA-REP |
| P2 | CO-5325 | ma_uncompensated_transfers_in_lookback | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-5325 | ma_uncompensated_transfers_in_lookback | `unknown ["receipt","returned_date"]` | R-SCHEMA-REP |
| P2 | CO-5325 | ma_uncompensated_transfers_in_lookback | `otherwise ["receipt","share"] -> 1` | R-SCHEMA-REP |
| P2 | CO-5325 | ma_uncompensated_transfers_in_lookback | `otherwise "ma_ltc_request_date" -> "ma_application_date"` | R-DECL |
| P2 | CO-5326 | ma_ssi_retirement_accounts_counted_in_month | `record field holdings.accessible default true` | R-SCHEMA-RULE |
| P2 | CO-5326 | ma_ssi_retirement_accounts_counted_in_month | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5326 | ma_ssi_retirement_accounts_counted_in_month | `record field holdings.share when_absent` | R-SCHEMA-REP |
| P2 | CO-5326 | ma_ssi_retirement_accounts_counted_in_month | `record field holdings.taxes_on_withdrawal when_absent` | R-SCHEMA-RULE |
| P2 | CO-5326 | ma_ssi_retirement_accounts_counted_in_month | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-5326 | ma_ssi_retirement_accounts_counted_in_month | `otherwise ["receipt","share"] -> 1` | R-SCHEMA-REP |
| P2 | CO-5326 | ma_ssi_retirement_accounts_counted_in_month | `otherwise ["receipt","taxes_on_withdrawal"] -> ["*","ma_retirement_account_default_tax_rate",["receipt","va` | R-SCHEMA-RULE |
| P2 | CO-5327 | ma_home_equity_interest_in_month | `record field holdings.accessible default true` | R-SCHEMA-RULE |
| P2 | CO-5327 | ma_home_equity_interest_in_month | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5327 | ma_home_equity_interest_in_month | `record field holdings.share when_absent` | R-SCHEMA-REP |
| P2 | CO-5327 | ma_home_equity_interest_in_month | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-5327 | ma_home_equity_interest_in_month | `otherwise ["receipt","share"] -> 1` | R-SCHEMA-REP |
| P2 | CO-5329 | ma_holds_trust_interest_in_month | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5329 | ma_holds_trust_interest_in_month | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-5330 | ma_holds_annuity_in_month | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5330 | ma_holds_annuity_in_month | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `record field receipts.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `record field receipts.start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `record field receipts.end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `record field receipts.retroactive default false` | R-SCHEMA-SHOWN |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `record field receipts.pass_set_aside default 0` | R-SCHEMA-SHOWN |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `record field receipts.spent_on_covered_costs default 0` | R-SCHEMA-SHOWN |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `record field receipts.claim_expense default 0` | R-SCHEMA-SHOWN |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `record field receipts.for_dependent default 0` | R-SCHEMA-SHOWN |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `unknown ["receipt","start_date"]` | R-SCHEMA-REP |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `unknown ["receipt","end_date"]` | R-SCHEMA-REP |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `unknown ["of",["P"],"receipts"]` | R-SCHEMA-REP |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `record field receipts.for_person when_absent` | R-SCHEMA-REP |
| P2 | CO-5511 | ma_ssi_unearned_receipts | `unknown ["receipt","for_person"]` | R-SCHEMA-REP |
| P2 | CO-5512 | ma_ssi_gambling_receipts | `record field receipts.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5512 | ma_ssi_gambling_receipts | `record field receipts.start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5512 | ma_ssi_gambling_receipts | `record field receipts.end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5512 | ma_ssi_gambling_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5512 | ma_ssi_gambling_receipts | `unknown ["receipt","start_date"]` | R-SCHEMA-REP |
| P2 | CO-5512 | ma_ssi_gambling_receipts | `unknown ["receipt","end_date"]` | R-SCHEMA-REP |
| P2 | CO-5513 | ma_ssi_child_support_receipts | `record field receipts.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5513 | ma_ssi_child_support_receipts | `record field receipts.start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5513 | ma_ssi_child_support_receipts | `record field receipts.end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5513 | ma_ssi_child_support_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5513 | ma_ssi_child_support_receipts | `unknown ["receipt","start_date"]` | R-SCHEMA-REP |
| P2 | CO-5513 | ma_ssi_child_support_receipts | `unknown ["receipt","end_date"]` | R-SCHEMA-REP |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `record field receipts.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `record field receipts.start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `record field receipts.end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `record field receipts.retroactive default false` | R-SCHEMA-SHOWN |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `record field receipts.spent_on_covered_costs default 0` | R-SCHEMA-SHOWN |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `record field receipts.claim_expense default 0` | R-SCHEMA-SHOWN |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `record field receipts.for_dependent default 0` | R-SCHEMA-SHOWN |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `unknown ["receipt","start_date"]` | R-SCHEMA-REP |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `unknown ["receipt","end_date"]` | R-SCHEMA-REP |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `unknown ["of",["P"],"receipts"]` | R-SCHEMA-REP |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `record field receipts.for_person when_absent` | R-SCHEMA-REP |
| P2 | CO-5514 | ma_ssi_gross_unearned_receipts | `unknown ["receipt","for_person"]` | R-SCHEMA-REP |
| P2 | CO-5515 | ma_social_security_receipts | `record field receipts.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5515 | ma_social_security_receipts | `record field receipts.start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5515 | ma_social_security_receipts | `record field receipts.end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5515 | ma_social_security_receipts | `record field receipts.retroactive default false` | R-SCHEMA-SHOWN |
| P2 | CO-5515 | ma_social_security_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5515 | ma_social_security_receipts | `unknown ["receipt","start_date"]` | R-SCHEMA-REP |
| P2 | CO-5515 | ma_social_security_receipts | `unknown ["receipt","end_date"]` | R-SCHEMA-REP |
| P2 | CO-5530 | ma_va_aid_and_attendance_receipts | `record field receipts.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5530 | ma_va_aid_and_attendance_receipts | `record field receipts.start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5530 | ma_va_aid_and_attendance_receipts | `record field receipts.end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5530 | ma_va_aid_and_attendance_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5530 | ma_va_aid_and_attendance_receipts | `unknown ["receipt","start_date"]` | R-SCHEMA-REP |
| P2 | CO-5530 | ma_va_aid_and_attendance_receipts | `unknown ["receipt","end_date"]` | R-SCHEMA-REP |
| P2 | CO-5531 | ma_spousal_unearned_receipts | `record field receipts.month when_absent` | R-SCHEMA-REP |
| P2 | CO-5531 | ma_spousal_unearned_receipts | `record field receipts.start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5531 | ma_spousal_unearned_receipts | `record field receipts.end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-5531 | ma_spousal_unearned_receipts | `record field receipts.retroactive default false` | R-SCHEMA-SHOWN |
| P2 | CO-5531 | ma_spousal_unearned_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-5531 | ma_spousal_unearned_receipts | `unknown ["receipt","start_date"]` | R-SCHEMA-REP |
| P2 | CO-5531 | ma_spousal_unearned_receipts | `unknown ["receipt","end_date"]` | R-SCHEMA-REP |
| P2 | CO-6051 | ma_ssi_couple_earned_income_after_exclusions | `otherwise ["of",["P"],"ma_ssi_excluded_earned_income"] -> 0` | F-REQ |
| P2 | CO-6056 | ma_pickle_household_unearned_income_before_deeming | `otherwise ["rel",["spouse","holds_out_as_spouse_with"],["P"]] -> false` | R-UNREACH |
| P2 | CO-6250 | ma_ssi_counted_social_security_receipts | `record field receipts.month when_absent` | R-SCHEMA-REP |
| P2 | CO-6250 | ma_ssi_counted_social_security_receipts | `record field receipts.start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-6250 | ma_ssi_counted_social_security_receipts | `record field receipts.end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-6250 | ma_ssi_counted_social_security_receipts | `record field receipts.retroactive default false` | R-SCHEMA-SHOWN |
| P2 | CO-6250 | ma_ssi_counted_social_security_receipts | `record field receipts.pass_set_aside default 0` | R-SCHEMA-SHOWN |
| P2 | CO-6250 | ma_ssi_counted_social_security_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-6250 | ma_ssi_counted_social_security_receipts | `unknown ["receipt","start_date"]` | R-SCHEMA-REP |
| P2 | CO-6250 | ma_ssi_counted_social_security_receipts | `unknown ["receipt","end_date"]` | R-SCHEMA-REP |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `record field receipts.month when_absent` | R-SCHEMA-REP |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `record field receipts.start_date when_absent` | R-SCHEMA-REP |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `record field receipts.end_date when_absent` | R-SCHEMA-REP |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `record field receipts.irregular default false` | R-SCHEMA-SHOWN |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `record field receipts.retroactive default false` | R-SCHEMA-SHOWN |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `record field receipts.pass_set_aside default 0` | R-SCHEMA-SHOWN |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `record field receipts.spent_on_covered_costs default 0` | R-SCHEMA-SHOWN |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `record field receipts.claim_expense default 0` | R-SCHEMA-SHOWN |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `record field receipts.for_dependent default 0` | R-SCHEMA-SHOWN |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `unknown ["receipt","month"]` | R-SCHEMA-REP |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `unknown ["receipt","start_date"]` | R-SCHEMA-REP |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `unknown ["receipt","end_date"]` | R-SCHEMA-REP |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `unknown ["of",["P"],"receipts"]` | R-SCHEMA-REP |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `record field receipts.for_person when_absent` | R-SCHEMA-REP |
| P2 | CO-6730 | ma_ssi_irregular_unearned_receipts | `unknown ["receipt","for_person"]` | R-SCHEMA-REP |
| P2 | CO-6733 | ma_ssi_couple_automobile_equity_in_month | `record field holdings.accessible default true` | R-SCHEMA-RULE |
| P2 | CO-6733 | ma_ssi_couple_automobile_equity_in_month | `record field holdings.disposed_date when_absent` | R-SCHEMA-REP |
| P2 | CO-6733 | ma_ssi_couple_automobile_equity_in_month | `record field holdings.co_owners when_absent` | R-SCHEMA-REP |
| P2 | CO-6733 | ma_ssi_couple_automobile_equity_in_month | `record field holdings.share when_absent` | R-SCHEMA-REP |
| P2 | CO-6733 | ma_ssi_couple_automobile_equity_in_month | `unknown ["receipt","disposed_date"]` | R-SCHEMA-REP |
| P2 | CO-6733 | ma_ssi_couple_automobile_equity_in_month | `otherwise ["receipt","share"] -> 1` | R-SCHEMA-REP |
| P2 | CO-7353 | ma_ssi_ineligible_spouse_income_is_not_deemed | `otherwise ["rel",["spouse","holds_out_as_spouse_with"],["P"]] -> false` | R-UNREACH |
| P2 | CO-7353 | ma_ssi_ineligible_spouse_income_is_not_deemed | `otherwise ["of",["P"],"ma_ssi_excluded_earned_income"] -> 0` | F-REQ |
| P2 | CO-7354 | ma_ssi_own_countable_income | `otherwise "ma_ssi_excluded_earned_income" -> 0` | F-REQ |
| P2 | CO-7354 | ma_ssi_own_countable_income | `otherwise "impairment_related_work_expenses_paid" -> 0` | R-DECL-NEW |
| P2 | CO-7354 | ma_ssi_own_countable_income | `otherwise "blind_work_expenses_paid" -> 0` | R-DECL-NEW |
| P2 | CO-7355 | ma_ssi_own_countable_income_with_oasdi_disregarded | `otherwise "ma_ssi_excluded_earned_income" -> 0` | F-REQ |
| P2 | CO-7355 | ma_ssi_own_countable_income_with_oasdi_disregarded | `otherwise "impairment_related_work_expenses_paid" -> 0` | R-DECL-NEW |
| P2 | CO-7355 | ma_ssi_own_countable_income_with_oasdi_disregarded | `otherwise "blind_work_expenses_paid" -> 0` | R-DECL-NEW |
| P2 | CO-7356 | ma_pickle_own_countable_income | `otherwise "ma_ssi_excluded_earned_income" -> 0` | F-REQ |
| P2 | CO-7356 | ma_pickle_own_countable_income | `otherwise "impairment_related_work_expenses_paid" -> 0` | R-DECL-NEW |
| P2 | CO-7356 | ma_pickle_own_countable_income | `otherwise "blind_work_expenses_paid" -> 0` | R-DECL-NEW |
| P3 | CO-604 | ma_ssi_household_size | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-608 | ma_ssi_countable_resources | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-608 | ma_ssi_countable_resources | `rel ["spouse","holds_out_as_spouse_with"]` | R-UNREACH |
| P3 | CO-640 | ma_is_institutionalized | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | R-DATED |
| P3 | CO-640 | ma_is_institutionalized | `reads institution_entry_date (CO-008, calendar date, person)` | R-DATED |
| P3 | CO-642 | ma_meets_special_income_group | `reads residence_setting_type (CO-3330, one of, person)` | R-GUARD |
| P3 | CO-643 | ma_ltc_couple | `exists_related ["spouse"]` | F-CS |
| P3 | CO-643 | ma_ltc_couple | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-CS |
| P3 | CO-644 | ma_is_institutionalized_spouse | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | R-GUARD |
| P3 | CO-647 | ma_institutionalized_spouse_countable_resources | `rel ["spouse"]` | R-UNREACH |
| P3 | CO-649 | ma_transfer_penalty_months | `rel ["spouse"]` | F-REQ |
| P3 | CO-657 | ma_family_allowance | `reads ma_family_allowance_members (CO-2469, group of persons, person)` | R-GUARD |
| P3 | CO-661 | ma_excluded_from_ssi_household | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | R-DATED |
| P3 | CO-661 | ma_excluded_from_ssi_household | `reads institution_entry_date (CO-008, calendar date, person)` | R-DATED |
| P3 | CO-663 | ma_ssi_household_unearned_income_sum | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-888 | ma_spousal_resources_at_snapshot | `rel ["spouse"]` | R-UNREACH |
| P3 | CO-889 | ma_spouse_or_qualifying_child_lives_in_home | `exists_related ["spouse","parent"]` | F-HH |
| P3 | CO-889 | ma_spouse_or_qualifying_child_lives_in_home | `rel ["spouse"]` | F-HH |
| P3 | CO-889 | ma_spouse_or_qualifying_child_lives_in_home | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-HH |
| P3 | CO-889 | ma_spouse_or_qualifying_child_lives_in_home | `reads lives_with (CO-1925, group of persons, person)` | F-HH |
| P3 | CO-889 | ma_spouse_or_qualifying_child_lives_in_home | `reads residence_setting_type (CO-3330, one of, person)` | F-HH |
| P3 | CO-930 | is_married | `exists_related ["spouse"]` | R-643 |
| P3 | CO-930 | is_married | `reads marital_status (CO-844, one of, person)` | R-643 |
| P3 | CO-1162 | ma_disabled_widow_eligible | `reads marital_status (CO-844, one of, person)` | R-HIST |
| P3 | CO-1164 | ma_hcbs_waiver_age_criteria_met | `reads is_married (CO-930, yes/no, person)` | F-REQ |
| P3 | CO-1631 | ma_is_long_term_care_applicant | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-INST |
| P3 | CO-1634 | ma_requires_verification_of_trust | `rel ["spouse"]` | F-REQ |
| P3 | CO-1635 | ma_requires_verification_of_annuity | `rel ["spouse"]` | F-REQ |
| P3 | CO-1742 | resides_in_medical_institution | `reads residence_setting_type (CO-3330, one of, person)` | R-DATED |
| P3 | CO-1748 | ma_oap_is_patient_in_tb_or_mental_health_institution | `reads residence_setting_type (CO-3330, one of, person)` | R-OAP |
| P3 | CO-1925 | lives_with | `reads dwelling_id (CO-3350, text, person)` | F-HH |
| P3 | CO-1986 | ma_qualifies_for_veterans_personal_needs_allowance | `rel ["parent"]` | F-REQ |
| P3 | CO-1986 | ma_qualifies_for_veterans_personal_needs_allowance | `reads is_married (CO-930, yes/no, person)` | F-REQ |
| P3 | CO-2232 | ma_transfer_penalty_is_apportioned_with_spouse | `rel ["spouse"]` | F-REQ |
| P3 | CO-2267 | ma_resides_in_sls_setting | `reads residence_setting_type (CO-3330, one of, person)` | OQ-1415 |
| P3 | CO-2277 | ma_ssi_ineligible_child_allocation | `has_relative_in ["child"]` | F-HH |
| P3 | CO-2277 | ma_ssi_ineligible_child_allocation | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-2277 | ma_ssi_ineligible_child_allocation | `reads lives_with (CO-1925, group of persons, person)` | F-HH |
| P3 | CO-2277 | ma_ssi_ineligible_child_allocation | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-HH |
| P3 | CO-2278 | ma_ssi_child_allocation_from_spouse_unearned | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-2278 | ma_ssi_child_allocation_from_spouse_unearned | `rel ["spouse","holds_out_as_spouse_with"]` | R-UNREACH |
| P3 | CO-2279 | ma_ssi_child_allocation_from_spouse_earned | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-2279 | ma_ssi_child_allocation_from_spouse_earned | `rel ["spouse","holds_out_as_spouse_with"]` | R-UNREACH |
| P3 | CO-2467 | ma_community_spouse_income | `reachable ["spouse"]` | R-GUARD |
| P3 | CO-2467 | ma_community_spouse_income | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | R-GUARD |
| P3 | CO-2469 | ma_family_allowance_members | `has_relative_in ["child","parent"]` | F-HH |
| P3 | CO-2469 | ma_family_allowance_members | `reachable ["spouse"]` | F-HH |
| P3 | CO-2469 | ma_family_allowance_members | `has_relative_in ["child"]` | F-HH |
| P3 | CO-2469 | ma_family_allowance_members | `has_relative_in ["parent"]` | F-HH |
| P3 | CO-2469 | ma_family_allowance_members | `has_relative_in ["tax_dependent"]` | F-HH |
| P3 | CO-2469 | ma_family_allowance_members | `reads lives_with (CO-1925, group of persons, person)` | F-HH |
| P3 | CO-2469 | ma_family_allowance_members | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-HH |
| P3 | CO-2609 | siblings | `shared_relative "parent"` | R-SHAREDREL |
| P3 | CO-2610 | step_siblings | `rel ["stepchild"]` | R-SHAREDREL |
| P3 | CO-2610 | step_siblings | `has_relative_in ["child"]` | R-SHAREDREL |
| P3 | CO-2610 | step_siblings | `rel ["child"]` | R-SHAREDREL |
| P3 | CO-2610 | step_siblings | `has_relative_in ["stepchild"]` | R-SHAREDREL |
| P3 | CO-2610 | step_siblings | `reads siblings (CO-2609, group of persons, person)` | R-SHAREDREL |
| P3 | CO-2802 | ma_community_spouse_shelter_costs | `reachable ["spouse"]` | R-GUARD |
| P3 | CO-2802 | ma_community_spouse_shelter_costs | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | R-GUARD |
| P3 | CO-2845 | is_related_to | `rel ["parent","child","stepparent","stepchild","grandparent","gr` | R-SHAREDREL |
| P3 | CO-2845 | is_related_to | `reads siblings (CO-2609, group of persons, person)` | R-SHAREDREL |
| P3 | CO-2845 | is_related_to | `reads step_siblings (CO-2610, group of persons, person)` | R-SHAREDREL |
| P3 | CO-2845 | is_related_to | `has_relative_in ["parent"]` | R-SHAREDREL |
| P3 | CO-2845 | is_related_to | `rel ["child"]` | R-SHAREDREL |
| P3 | CO-2845 | is_related_to | `has_relative_in ["child"]` | R-SHAREDREL |
| P3 | CO-2845 | is_related_to | `rel ["parent"]` | R-SHAREDREL |
| P3 | CO-3619 | ma_community_spouse_medical_needs | `reachable ["spouse"]` | R-GUARD |
| P3 | CO-3619 | ma_community_spouse_medical_needs | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | R-GUARD |
| P3 | CO-3619 | ma_community_spouse_medical_needs | `reads ma_family_allowance_members (CO-2469, group of persons, person)` | R-GUARD |
| P3 | CO-3626 | ma_ssi_couple_members | `reachable ["spouse","holds_out_as_spouse_with"]` | F-HH |
| P3 | CO-3626 | ma_ssi_couple_members | `reads lives_with (CO-1925, group of persons, person)` | F-HH |
| P3 | CO-3626 | ma_ssi_couple_members | `reads ceased_living_with_spouse_date (CO-7352, calendar date, person)` | F-HH |
| P3 | CO-3626 | ma_ssi_couple_members | `reads institution_entry_date (CO-008, calendar date, person)` | F-HH |
| P3 | CO-3627 | ma_title_ii_cola_increase | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-4103 | ma_va_aid_and_attendance_is_patient_payment | `reads is_married (CO-930, yes/no, person)` | F-REQ |
| P3 | CO-4103 | ma_va_aid_and_attendance_is_patient_payment | `rel ["parent"]` | F-REQ |
| P3 | CO-4200 | ma_cbwd_household_earned_income | `reads ma_magi_household_members (CO-500, group of persons, person-month)` | R-CBWD |
| P3 | CO-4201 | ma_cbwd_household_unearned_income | `reads ma_magi_household_members (CO-500, group of persons, person-month)` | R-CBWD |
| P3 | CO-4624 | ma_ssi_deeming_parents | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-HH |
| P3 | CO-4624 | ma_ssi_deeming_parents | `rel ["child","stepchild"]` | F-HH |
| P3 | CO-4624 | ma_ssi_deeming_parents | `reads lives_with (CO-1925, group of persons, person)` | F-HH |
| P3 | CO-4625 | ma_ssi_deeming_children | `has_relative_in ["child","stepchild"]` | F-HH |
| P3 | CO-4625 | ma_ssi_deeming_children | `reads ma_ssi_deeming_parents (CO-4624, group of persons, person-month)` | R-GROUP |
| P3 | CO-4625 | ma_ssi_deeming_children | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-HH |
| P3 | CO-4626 | ma_ssi_parental_income_deemed | `reads ma_ssi_deeming_children (CO-4625, group of persons, person-month)` | R-GROUP |
| P3 | CO-4627 | ma_ssi_parental_resources_deemed | `reads ma_ssi_deeming_parents (CO-4624, group of persons, person-month)` | R-GROUP |
| P3 | CO-4628 | ma_ssi_impairment_related_work_expenses | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-4629 | ma_ssi_earned_income_excluded_after_half | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-4631 | ma_owes_long_term_care_asset_disclosure | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-INST |
| P3 | CO-4633 | ma_ssi_deeming_ineligible_child_allocation | `has_relative_in ["child","stepchild"]` | F-HH |
| P3 | CO-4633 | ma_ssi_deeming_ineligible_child_allocation | `reads ma_ssi_deeming_parents (CO-4624, group of persons, person-month)` | R-GROUP |
| P3 | CO-4633 | ma_ssi_deeming_ineligible_child_allocation | `reads ma_ssi_deeming_children (CO-4625, group of persons, person-month)` | R-GROUP |
| P3 | CO-4633 | ma_ssi_deeming_ineligible_child_allocation | `reads lives_with (CO-1925, group of persons, person)` | F-HH |
| P3 | CO-4633 | ma_ssi_deeming_ineligible_child_allocation | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-HH |
| P3 | CO-4634 | ma_ssi_deeming_parents_countable_income | `reads ma_ssi_deeming_parents (CO-4624, group of persons, person-month)` | R-GROUP |
| P3 | CO-4880 | ma_spouse_or_dependent_relative_lives_in_home | `has_relative_in ["tax_dependent"]` | F-HH |
| P3 | CO-4880 | ma_spouse_or_dependent_relative_lives_in_home | `reachable ["spouse"]` | F-HH |
| P3 | CO-4880 | ma_spouse_or_dependent_relative_lives_in_home | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-HH |
| P3 | CO-4880 | ma_spouse_or_dependent_relative_lives_in_home | `reads lives_with (CO-1925, group of persons, person)` | F-HH |
| P3 | CO-4880 | ma_spouse_or_dependent_relative_lives_in_home | `reads residence_setting_type (CO-3330, one of, person)` | F-HH |
| P3 | CO-5200 | ma_is_institutionalized_spouse_in_institution | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | R-DATED |
| P3 | CO-5200 | ma_is_institutionalized_spouse_in_institution | `reads institution_entry_date (CO-008, calendar date, person)` | R-DATED |
| P3 | CO-5203 | ma_home_is_subject_to_estate_recovery | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-INST |
| P3 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `reads resides_in_medical_institution (CO-1742, yes/no, person)` | F-INST |
| P3 | CO-5204 | ma_home_is_countable_resource_without_beneficiary_deed | `reads residence_setting_type (CO-3330, one of, person)` | F-INST |
| P3 | CO-5206 | ma_msp_countable_resources | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-5221 | ma_pickle_deeming_parents_countable_income | `reads ma_ssi_deeming_parents (CO-4624, group of persons, person-month)` | R-GROUP |
| P3 | CO-5222 | ma_pickle_parental_income_deemed | `reads ma_ssi_deeming_children (CO-4625, group of persons, person-month)` | R-GROUP |
| P3 | CO-5222 | ma_pickle_parental_income_deemed | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-5511 | ma_ssi_unearned_receipts | `reachable ["spouse"]` | R-DEPPART |
| P3 | CO-5514 | ma_ssi_gross_unearned_receipts | `reachable ["spouse"]` | R-DEPPART |
| P3 | CO-5904 | ma_ssi_deeming_share_zeroes_benefit | `reads ma_ssi_deeming_parents (CO-4624, group of persons, person-month)` | R-GROUP |
| P3 | CO-5904 | ma_ssi_deeming_share_zeroes_benefit | `reads ma_ssi_deeming_children (CO-4625, group of persons, person-month)` | R-GROUP |
| P3 | CO-6051 | ma_ssi_couple_earned_income_after_exclusions | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-6054 | ma_pickle_child_allocation_from_spouse_unearned | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-6054 | ma_pickle_child_allocation_from_spouse_unearned | `rel ["spouse","holds_out_as_spouse_with"]` | R-UNREACH |
| P3 | CO-6055 | ma_pickle_child_allocation_from_spouse_earned | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-6055 | ma_pickle_child_allocation_from_spouse_earned | `rel ["spouse","holds_out_as_spouse_with"]` | R-UNREACH |
| P3 | CO-6056 | ma_pickle_household_unearned_income_before_deeming | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-6056 | ma_pickle_household_unearned_income_before_deeming | `rel ["spouse","holds_out_as_spouse_with"]` | R-UNREACH |
| P3 | CO-6059 | ma_ssi_deeming_limit_sum | `reads ma_ssi_deeming_children (CO-4625, group of persons, person-month)` | R-GROUP |
| P3 | CO-6061 | ma_pickle_deeming_share_zeroes_benefit | `reads ma_ssi_deeming_parents (CO-4624, group of persons, person-month)` | R-GROUP |
| P3 | CO-6061 | ma_pickle_deeming_share_zeroes_benefit | `reads ma_ssi_deeming_children (CO-4625, group of persons, person-month)` | R-GROUP |
| P3 | CO-6730 | ma_ssi_irregular_unearned_receipts | `reachable ["spouse"]` | R-DEPPART |
| P3 | CO-7353 | ma_ssi_ineligible_spouse_income_is_not_deemed | `reads ma_ssi_couple_members (CO-3626, group of persons, person-month)` | R-GROUP |
| P3 | CO-7353 | ma_ssi_ineligible_spouse_income_is_not_deemed | `rel ["spouse","holds_out_as_spouse_with"]` | R-UNREACH |

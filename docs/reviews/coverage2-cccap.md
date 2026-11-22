# Coverage review, second pass: CCCAP (8 CCR 1403-1)

Reviewer pass: second exhaustive coverage matrix, 2026-11-22, on HEAD 18dffd5 (branch ccr-9d19bf4c-wmnwcl), after the coverage fix round recorded in docs/reviews/coverage-cccap.md ("Disposition (coverage round)").

Governing text: 8 CCR 1403-1, rule version 12658, effective 2026-08-14 (volumes/co/documents/D-87.md). 12 CCR 2509-4 7.302 (D-305) for 3.120.D.

Method:
- I built this matrix from the D-87 text without reusing the first pass's rows. I read §§ 3.103 (the definitions the program uses), 3.109-3.126 and 3.135-3.147 line by line. I skimmed §§ 3.104-3.108, 3.122-3.123 and the provider sections 3.127-3.134, which get one line each.
- I dumped every CCCAP item (155: 82 derived, 40 supplied, 33 parameters) plus the shared items they read (CO-3913, the income and receipt facts, CO-2810, CO-013, CO-3903) from the YAML in a scratch copy (`git archive HEAD`). I exported the ledger there (`npm run export -- --volume co`: 2,143 items). For every carried row I read the derivation against the paragraph: conditions, "less than" against "at or below", periods, rounding, who the rule applies to, and effective dates.
- Probes: 25 scratch households (Q-* re-run the first pass's probes with the fixed facts; Z-* are new) appended to the scratch copy's `volumes/co/tests/cases.yaml`, evaluated with `npx vite-node scripts/eval-case.ts co <id> cccap_eligibility_status,cccap_household_income,cccap_parent_fee,cccap_verification_status`. Generator: `/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/c2tools/mk2.py`. The base household is the first pass's: mother p1 with $2,000 wages and 120 hours, son p3 aged 6, Denver, application 2026-11-15, entry limit 185%.

## 1. Verdict

**2 P1 found** (C2-1, C2-2). Both are activity pathways the first pass did not read closely. C2-1: a teen parent under eighteen in substance use disorder treatment is never an adult caretaker. C2-2: medical leave during the eligibility period ends eligibility unless the caretaker is incapacitated. There are also 3 P2 and 3 P3. Two of the P2s (C2-3, C2-4) rest on fact meanings that the first fix round's new reads depend on. All 15 first-pass P1s stay fixed (section 5). No open question is misclassified (section 4).

## 2. Findings

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| C2-1 | **P1** | 3.103.IIIII, 3.103.EEEEE, 3.111.G.4.a.3 | cccap_is_in_workforce_training_or_post_secondary_education CO-1518, cccap_is_adult_caretaker CO-992, cccap_is_in_sud_treatment_activity CO-4074, cccap_is_teen_parent CO-981 | IIIII: "Workforce training includes ... effective July 1, 2026, nationally recognized, evidence-based substance use disorder treatment programs ... at an intensive outpatient service level of care or higher." EEEEE: "If the person participates in workforce training or post-secondary education, they are considered to be an adult caretaker." | CO-4074 counts treatment only for `cccap_is_adult_caretaker`. A parent under 18 (or 18 and in high school) is a household child (CO-990), so CO-992 makes her an adult caretaker only through CO-1518, which reads `education_program_type` alone and not `is_in_sud_treatment_iop_or_higher` (CO-1516). She is not a teen parent either: CO-981 needs CO-984, which needs CO-4074, which needs her to be an adult caretaker. The household then has no caretaker in an activity. **Repro Z-1:** a 17-year-old mother in IOP treatment since 2026-09-01, no school or work, with a baby, application 2026-11-15: both members `ineligible_activity`. **Z-1b:** the same mother at 19 gets `eligible_low_income`, fee 0. The rule makes the 17-year-old an adult caretaker in an eligible activity. | Have CO-1518 (or CO-992's second prong) also count `is_in_sud_treatment_iop_or_higher` from 2026-07-01, so the treatment is workforce training (IIIII) and the teen is an adult caretaker (EEEEE). Add a rule test from Z-1. |
| C2-2 | **P1** | 3.112.C.2, 3.125.Q.2, 3.103.FFFFF, 3.103.WWW (against 3.111.D.9) | cccap_caretaker_in_eligible_activity CO-984, temporary_activity_break_reason CO-3903 | 3.112.C: "A temporary break includes ... 2. Any temporary absence from low-income eligible activities ... due to extended verified medical leave". Q: counties "shall not discontinue child care services prior to a household's next eligibility re-determination unless ... 2. The adult caretaker(s) or teen parent(s) is no longer in a qualifying low-income eligible activity for the reasons that do not constitute a temporary break as defined in rule section 3.112(C)". WWW: medical leave is "granted due to a personal illness or injury, or to care for a family member". | CO-984 counts `medical_leave` only with `cccap_caretaker_is_incapacitated`, which is D.9's eligible-household test. It applies that test at every determination type, including a change during the period, where 3.125.Q.2 keeps any temporary break. CO-3903's option covers medical leave "for their own health" only, so leave to care for a family member (WWW) cannot be stated. **Repro Z-2:** at a change, with the child authorized at the last determination, a single mother on medical leave who can still care for her child: `ineligible_activity`, fee 0. **Z-2b** (seasonal interruption instead): `eligible_low_income`. The rule keeps Z-2 eligible until the redetermination. | At `change_during_eligibility_period`, count `medical_leave` without the incapacity conjunct (3.125.Q.2). Keep D.9's conjunct at a redetermination, or record that reading as an open question citing 3.112.C.2, 3.114.B.5 and D.9. Widen CO-3903's `medical_leave` to WWW (own illness or care of a family member), or add an option for family-care leave. |
| C2-3 | P2 | 3.115.C, 3.114.B.6 (the F-12 fix) | cccap_eligibility_status CO-989 (row 7), receives_tanf_cash CO-013 | 3.115.C: a caretaker not work eligible who cares for children receiving basic cash assistance "may be eligible for Low-Income Child Care if the adult caretaker or teen parent is **not a part of the Colorado Works assistance unit**" | The F-12 row bars a household when a caretaker or teen parent has `receives_tanf_cash`. That fact means "The person receives, or is authorized to receive, a cash grant". It does not say "is a member of the assistance unit". The payee of a child-only grant (a grandmother) receives the grant, so a case author may state it true. CO-989's precision intends the opposite reading, but the fact's meaning does not carry it. **Repro Z-3:** a working grandmother, legal guardian, payee of her grandson's child-only grant, with `receives_tanf_cash` true: `ineligible`. **Z-3b**, with it stated false: `eligible_low_income`, fee 47. 3.115.C is written for exactly this household. | State in CO-013's meaning that the fact is true only for a member of the assistance unit whose needs the grant includes, not for a payee or caretaker outside the unit. Alternatively, have row 7 read a unit-membership fact. Add a CO-989 test from Z-3. |
| C2-4 | P2 | 3.111.I.12, I.17 (the F-10 fix) | cccap_excluded_unearned_receipts CO-4463, rental_property_expenses_paid CO-4458, rental_income_received CO-4457 | I.12 "Net rental income"; I.17 "Net income from rental of a house, store, or other property to others" | CO-4458's meaning covers expenses for property "whose rents are rental_income_received (CO-4457) **or are stated in the person's other unearned income facts**". CO-4463, however, subtracts no more than `rental_income_received`, which is 0 when not stated. A case that states the rents only in `other_unearned_income_taxable` therefore loses the expenses. **Repro Z-5:** $2,000 wages, $1,500 of rents stated in other taxable unearned income, $1,000 of expenses: income 3,500, `ineligible_income`. **Z-5b**, with `rental_income_received` 1,500 also stated: income 2,500, `eligible_low_income`, fee 122. | Either say in CO-4458 that the expenses are read only against CO-4457 (and that a case with rents states CO-4457), or cap the expenses at `other_unearned_income_taxable` when CO-4457 is not stated. |
| C2-5 | P2 | 3.103.CCC, 3.121.A-B | cccap_is_family_experiencing_homelessness CO-2814, cccap_is_in_homelessness_stabilization CO-3907, CO-989 row 10, CO-1290, CO-1440 | CCC: families who lack a fixed nighttime residence and "Children who are ..." in the listed settings; the definition is the children's residence | CO-2814 reads the **evaluated person's** `nighttime_residence_type` ("the family shares one residence"). Household members can have different residences, for example a caretaker who is involuntarily absent. **Repro Z-4:** a mother and son in a shelter in the stabilization period, the father in jail (`institution`, involuntarily absent), the mother in no activity: mother and son get `eligible_homelessness_stabilization`; the father gets `ineligible_activity`. The child's answer is right, so this is P2. It is the same class as first-pass F-01 and F-02: one household outcome read per person. | Test `[exists, cccap_household_members, [all, cccap_is_eligible_child, cccap_is_family_experiencing_homelessness]]` in CO-3907. |
| C2-6 | P3 | 3.103.C, 3.111.D.2 (the F-15 fix) | relationship role `contributes_financially_to` (volume.yaml), CO-2607, CO-982 | C: "a person **in the home** who is financially contributing to the welfare of the child" | The new role's label ("contributes financially to the welfare of the child ... whether or not related") does not say the person lives in the home. CO-2607 and CO-982 then rely on `lives_with`, which is read as true when not stated. A non-custodial parent who pays support, stated with this role in a case without a co-residence group, becomes an adult caretaker member: his income counts, and he must be in an activity. | Say in the label that the role is for an adult in the child's home (D.2), or add `lives_with` to the role's meaning. |
| C2-7 | P3 | 3.125.Q (closed list); 3.113.A.1.d; 3.111.H.5.c | cccap_low_income_child_care_eligible CO-987 (asset conjunct) | Assets are self-declared "At application and re-determination"; Q lists six reasons to discontinue before the redetermination, and assets are not one of them | CO-987 tests `cccap_declares_assets_within_limit` at a change during the period as well. Rarely reached, since the declaration is not renewed mid-period. | Test the declaration only at an application, a redetermination or a transition. |
| C2-8 | P3 | 3.117 (A, B, E), 3.116.L | cccap_meets_county_residency CO-2107 | 3.117.A: a household is not transitioned only for an IPV, income over 85% SMI or absences; 3.116.L keeps Colorado Works Child Care for a household that moves county | At `transition_from_colorado_works`, CO-2107 still requires the county of residence to equal the application county, so a Colorado Works family that moved county gets `ineligible`. | Treat the transition like a change (Colorado residency alone), or record the reading. |

Reproductions (scratch copy; p1 = mother, p3 = child, p2 = second adult):

| Probe | Engine | Rule |
|---|---|---|
| Z-1 (17, SUD IOP) | p1, p3 `ineligible_activity` | eligible_low_income (fee 0) |
| Z-1b (19, SUD IOP) | `eligible_low_income`, fee 0 | same |
| Z-2 (change, medical leave, not incapacitated) | `ineligible_activity` | eligible_low_income until the redetermination |
| Z-2b (change, seasonal interruption) | `eligible_low_income` | same |
| Z-3 (payee grandmother, `receives_tanf_cash` true) | `ineligible` | eligible_low_income, fee 47 |
| Z-3b (same, stated false) | `eligible_low_income`, fee 47 | same |
| Z-4 (shelter, father in jail) | p1, p3 `eligible_homelessness_stabilization`; p2 `ineligible_activity` | one status for the household |
| Z-5 (rents in other unearned income) | income 3,500, `ineligible_income` | income 2,500, eligible, fee 122 |
| Z-5b (rents in CO-4457) | income 2,500, eligible, fee 122 | same |

## 3. Coverage matrix

Legend: **C** = carried by the items listed; I read each derivation against the paragraph, and a mismatch is a finding. **NA** = not applicable, with the reason. **OQ** = an open question records the state choice. **GAP** = no item and no recorded reason. "Notes" = docs/colorado-notes.md.

### 3.100-3.110 General
| ¶ | disposition |
|---|---|
| 3.100 authority, 3.101 scope, 3.102 applicability | NA: statements of authority and purpose |
| 3.104 county appropriations and county plans | OQ: OQ-162, OQ-682 (blocked on county plans); otherwise NA (allocation) |
| 3.105 funding, 3.106 anti-discrimination, 3.107 confidentiality | NA: administration |
| 3.108 timely written notice | NA: notice procedure |
| 3.109 appeal rights | NA: hearing procedure |
| 3.110 Low-Income participants: caretaker, guidelines, low income, activity, need | C: CO-989, CO-987, CO-992, CO-981, CO-991, CO-2104, CO-2108 |

### 3.103 Definitions used by the eligibility rules
| ¶ | disposition |
|---|---|
| A accused individual; AA clear and convincing; GGGG preponderance | NA: IPV procedure terms |
| B additional care needs | C: CO-872, CO-4056, CO-321, CO-1686, CO-1581 |
| C adult caretaker (in the home, contributes financially, parent / step / guardian / loco parentis, custody) | C: CO-992, CO-2607, CO-897; OQ-540 (loco parentis). See C2-6 |
| D-G, J adverse action, affidavit, applicant, application, application process | NA: procedure and forms |
| H application date | C: CO-3910, CO-3911 (anchor of the thirty days); OQ-680 |
| I pre-eligibility application date | NA: 3.126 (Notes, coverage round F-24) |
| K assets (K.1 liquid, K.2 non-liquid, home and car excluded) | C: CO-1741 (declaration), CO-1809 |
| L, M, N, O, P, T, U, V, W, X attestation, ATS, authorization, rates, notice, CHATS, provider, CCR&R, staff | NA: provider or authorization terms |
| Q basic education | C: CO-1722 (`basic_education`, secondary, HSE), CO-2111 |
| R Behavioral Health Administration | C: CO-1516 (licensed and endorsed in its meaning) |
| S cash assistance (diversion under four months, county diversion not cash) | NA: no CCCAP item reads a diversion amount as income |
| Y Child Welfare Child Care | C: CO-2576, CO-989 row 2; OQ-710 |
| Z citizen/legal resident (child only) | C: CO-998 (citizen, national or qualified non-citizen; OQ-394 resolved) |
| BB CCCAP's components | C: CO-989 options |
| CC Colorado Works Program | C: CO-013 |
| DD Colorado Works Child Care (referred, work eligible) | C: CO-988, CO-896 |
| EE Colorado Works households (cash or state diversion; caretaker in the unit) | C: CO-988, CO-3931, CO-3932; OQ-682. See C2-3 |
| FF-JJ, LL, NN collateral contact, complaint, abuse, consumer education, county, rate plan, Department | NA: administration |
| KK county plan | OQ: OQ-162 |
| MM custody | C: CO-2607, CO-982 (`lives_with`) |
| OO disaster; VV emergency | C: CO-3505 (3.124.I.8 waiver) |
| PP-SS discovery, drastic change, drop-in day, ECE provider | NA |
| TT eligible activity (job search, employment, self-employment, training and post-secondary, basic education) | C: CO-984 |
| UU eligible child (under 13 needing part-day care; under 19 with additional needs; residing with caretaker; citizen for Colorado Works and Low-Income) | C: CO-4056, CO-980, CO-998, CO-320, CO-321, CO-2108 |
| WW employment (wages, salary, in-kind, commissions) | C: CO-984, CO-4454 |
| XX enrollment freeze | NA: capacity |
| YY entry income level at original application | C: CO-986, CO-870, CO-3004, CO-3005; OQ-121 |
| ZZ equivalent full-time units (part time below 13) | C: CO-2864 (supplied), CO-1288 |
| AAA exit level at redetermination (85% SMI) | C: CO-993, CO-2104 |
| BBB fair market value | C: CO-4454 |
| CCC families experiencing homelessness (1-4) | C: CO-2814, CO-2810 (campground split). See C2-5 |
| DDD FPG; BBBBB SMI | C: CO-3007, CO-1804, CO-1805 |
| EEE, HHH, JJJ, KKK, UUU, XXX, JJJJ, KKKK, LLLLL, NNNN, VVVV, YYYY, ZZZZ, GGGGG background checks, funding concern, high-quality program, hold slots, manual claim, licensing action, projections, prudent person, units, rate notification, audit, slot contracts, age bands, tiered reimbursement | NA: provider or fiscal terms |
| GGG fraud | C: CO-3906 (3.142 verdicts) |
| III Head Start | NA: redetermination scheduling (Notes, F-18); fee waiver CO-3505 |
| LLL household (children under 18; under 19 in high school; caretakers and teen parents) | C: CO-982, CO-990, CO-1721, CO-326, CO-327 |
| MMM in loco parentis | OQ: OQ-540 |
| NNN incapacitated (physician's statement) | C: CO-1744, CO-4466, CO-4467 |
| OOO income eligibility (household income against size) | C: CO-985, CO-983, CO-986 |
| PPP inconsistent | C: attestation facts read by CO-1442 to CO-1444 |
| QQQ IPV | C: CO-3906 |
| RRR involuntarily out of the home | C: CO-898, CO-991 |
| SSS job search | C: CO-871, CO-984 |
| TTT Low-Income Child Care (not Colorado Works, Child Welfare or Protective Services) | C: CO-989 row order |
| VVV maternity/paternity leave | C: CO-3903, CO-984 |
| WWW medical leave (own illness or care of a family member) | C, see C2-2: CO-3903 covers own health only |
| YYY new employment verification | NA: kind of document |
| ZZZ non-traditional hours | C: CO-2397, CO-2398 |
| AAAA, OOOO originating and receiving county | C: CO-2107 (3.125.GG) |
| BBBB, QQQQ, PPPP overpayment, recovery, recipient | NA: 3.145-3.147 |
| CCCC parent (biological, adoptive, step) | C: CO-2607 (`parent`, `stepparent`) |
| DDDD parent fee | C: CO-1290 |
| EEEE pay stubs | NA |
| FFFF post-eligibility stabilization | C: CO-984 job search branch at redetermination |
| HHHH primary adult caretaker | NA: the signer |
| IIII Protective Services Child Care | C: CO-873, CO-989 row 4 |
| LLLL, MMMM qualified exempt facilities and providers | C: CO-2394 (immunization trigger) |
| RRRR, SSSS redetermination form and process | C: CO-3307 (`redetermination`), CO-1451 |
| TTTT regionally accredited institution | C: CO-1722 (`higher_education`, `postsecondary_career_and_technical`) |
| UUUU relative | C: `is_related_to`, read by CO-2396 |
| WWWW self-employment | C: CO-1710, CO-1709, CO-1700 |
| XXXX self-sufficiency standard | OQ: OQ-121 |
| AAAAA state or local public benefit; CCCCC substantiated | NA |
| DDDDD target populations | NA: wait-list priority, not eligibility |
| EEEEE teen parent (under 21, contributes, custody, activity; workforce or post-secondary makes an adult caretaker) | C: CO-981, CO-322, CO-1518, CO-992. **C2-1** (SUD treatment is workforce training) |
| FFFFF temporary absence or break | C: CO-3903, CO-984. See C2-2 |
| HHHHH timely written notice | NA |
| IIIII training and post-secondary (bachelor's or less; workforce training; SUD from 2026-07-01) | C: CO-1722 with CO-4450, CO-4074, CO-1516. **C2-1** |
| JJJJJ transition families | C: CO-3307 (`transition_from_colorado_works`) |
| KKKKK undue burden | NA |
| MMMMM up-to-date immunizations | C: CO-2395, CO-4060 |
| NNNNN voluntarily out of the home | C: CO-982 via `lives_with`; OQ-612 |
| OOOOO wait list; PPPPP willful misrepresentation | NA |

### 3.111 Low-Income Child Care eligibility
| ¶ | disposition |
|---|---|
| Intro | C: CO-987, CO-989 |
| A first sentence: caretakers and teen parents verified county residents at application and redetermination | C: CO-2107, CO-505, CO-2106, CO-987 (every caretaker), CO-1440, CO-1676 |
| A second sentence: remain eligible after leaving the county during the period (3.125.GG) | C: CO-2107 (Colorado residency alone at a change). See C2-8 for the transition |
| B.1 activity; B.2 income guidelines; B.3 custody | C: CO-991, CO-984; CO-2104; CO-2607, CO-982 |
| C, C.1, C.1.a-b application forms; Head Start application | NA: forms |
| C.1.c Head Start redetermination date | NA: scheduling (Notes, F-18) |
| C.2.a residence | C: CO-1440, CO-1676, CO-1313 |
| C.2.b, b.1, b.2.a-c child citizenship, age and identity by attestation unless inconsistent | C: CO-1442, CO-1443, CO-1444, CO-1678 to CO-1680 |
| C.2.c immunizations if applicable | C: CO-4060, CO-2394, CO-2395 |
| C.2.d activity | C: CO-1441, CO-1677, CO-1340 |
| C.2.e schedule when non-traditional hours are requested | C: CO-2397, CO-2398, CO-1447 |
| C.2.f income | C: CO-1445, CO-1681, CO-2873, CO-2590 |
| C.2.g incapacitation | C: CO-4466, CO-4467 |
| C.2.h custody arrangement | C: CO-2399 |
| D.1.a one caretaker; voluntarily absent caretaker stays a member; temporary carer not a member | C: CO-982, CO-991; OQ-612 |
| D.1.b two caretakers, one involuntarily absent = one caretaker | C: CO-991, CO-898 |
| D.1.c.1-3 both in activity; one voluntarily absent and both in activity; one in activity and one incapacitated | C: CO-991, CO-1744 |
| D.2 two caretakers by financial contribution or parental role | C: `contributes_financially_to`, CO-2607, CO-982, CO-992; OQ-540. See C2-6 |
| D.3 shared custody, separate applications | C: CO-2607 (`lives_with`); each household is its own case |
| D.4 every caretaker in an activity has custody and meets guidelines | C: CO-991, CO-985 |
| D.5 unrelated caretaker needs verification from the parent or a court order | C: CO-2396, CO-2846 |
| D.6 not work eligible, caring for children on basic cash assistance: may be Low-Income | C: CO-988, CO-989 row 7 (3.115.C read as governing). See C2-3 |
| D.7 adoptive parents | C: CO-2607 (`parent` is natural or adoptive) |
| D.8 maternity/paternity leave | C: CO-984 (any determination type) |
| D.9 medical leave with an open case, unable to care | C: CO-984 with CO-1744. **C2-2** (at a change 3.125.Q.2 governs) |
| D.10 separated caretaker with a temporary order: not the other spouse's resources | C: CO-4064, CO-4070 |
| E incapacitated single caretaker not in an activity: ineligible | C: CO-991 (needs a caretaker in an activity) |
| F eligible child (ages, part-day, custody) | C: CO-4056, CO-980, CO-4462 |
| F.1 citizenship and identity | C: CO-998, CO-1442, CO-1444 |
| F.2 immunization for exempt unrelated out-of-home care, not attending school | C: CO-4060, CO-2884; OQ-562 |
| G intro (at least one activity) | C: CO-984, CO-991 |
| G.1.a employment full or part time | C: CO-984 |
| G.1.b gross income / hours ≥ federal minimum wage | C: CO-984 (`>=`) |
| G.1.c LLC and S-corporation owners are employees | C: CO-3915 precision (wages) |
| G.2.a self-employment expenses verified or not considered | C: CO-1709 (receipts or other documents) |
| G.2.b weekly schedule at start, application and redetermination | C: CO-1447, CO-1448 (self-employment schedule element) |
| G.2.c income exceeds expenses | C: CO-1710 (`<= 0` gives 0), CO-984 |
| G.2.d taxable gross / hours ≥ minimum wage | C: CO-984 |
| G.2.e launch period: six months or to redetermination; projected income = minimum wage × declared hours | C: CO-2113, CO-1710, CO-4461 |
| G.3.a job search ≥ 13 weeks per non-temporary cessation; not at a first application | C: CO-984, CO-2110, CO-2109, CO-2103; county plans OQ-162 |
| G.3.b start date of job search | NA: authorization start |
| G.3.c-d, e job search continues to employment; regular care; care commensurate | C: CO-984 (weeks used); d-e NA (authorization) |
| G.3.f job search approved for each non-temporary job loss | C: CO-871 |
| G.3.g ineligible when job search used up | C: CO-984 (`<` CO-2110) |
| G.3.h post-eligibility stabilization at redetermination | C: CO-984 job search branch at redetermination |
| G.4.a.1 training and post-secondary, first bachelor's or less, 104 weeks (208 county) | C: CO-1722, CO-4450, CO-2111; OQ-162 |
| G.4.a.2 workforce training, 104 weeks | C: CO-1722 (`workforce_training`), CO-2111 |
| G.4.a.3 SUD treatment IOP or higher, up to one year per instance, from 2026-07-01 | C: CO-4074, CO-3905, CO-3904, CO-1517, CO-2112, CO-1516. **C2-1** (teen parents) |
| G.4.b.1-2 basic education 52 weeks; teen parents no limit | C: CO-1722, CO-2111 (the limit fact excludes teen parents) |
| G.4.c any week with one day counts | C: CO-2111 meaning |
| G.4.d enrollment verification; SUD self-attestation | C: CO-1441 (SUD exempt), CO-1677 |
| G.4.e referral to training resources | NA |
| H.1 gross income not above 85% SMI | C: CO-993, CO-986 (`min` with SMI), `<=` |
| H.1.a entry level, not below 185% FPG | C: CO-870 (`max` with CO-3005), CO-3004; OQ-121 |
| H.1.b exit level 85% SMI | C: CO-993, CO-2104 |
| H.2 table through 2026-09-30 (FPG and SMI, each additional) | C: CO-1804 (2025-10-01 version matches), CO-1805 (294.87), CO-3007 from the 2025 HHS guideline (1,304.17 for one) |
| H.3 table from 2026-10-01 | C: CO-1804 (5,347.35 to 14,191.05 matches), CO-1805 (308.50), CO-3007 (1,330.00; 473.33 each added); OQ-580 resolved |
| H.4 prior thirty days, unless not representative | C: CO-3912, CO-3911, CO-3914; OQ-680 |
| H.4.a-b, d new or changed income; contract income; fluctuating income averaged | C: CO-3914 (county-determined monthly figure) |
| H.4.c self-employment prorated | C: CO-1710, CO-3914 |
| H.4.e rental income: self-employment at 20 hours a week of management, else unearned; averaging; joint ownership | C: CO-4457 (not actively managed), CO-1700 (actively managed); averaging and share CO-3914. See C2-4 |
| H.4.f anticipated cost-of-living changes | C: CO-3914 |
| H.4.g inclusions and exclusions apply | C: CO-3916, CO-4463, CO-4464 |
| H.4.h irregular child support averaged | C: CO-3914 |
| H.4.i lump sums in the month or over twelve months, most beneficial | C: CO-3916, CO-3918; OQ-680 |
| H.5.a.1-3 earned and self-employment income verification, up to twelve months | C: CO-1445, CO-1681, CO-1709; twelve-month choice CO-3914 |
| H.5.b unearned verification | C: CO-2873, CO-2590 |
| H.5.c assets self-declared; over $1 million ineligible | C: CO-1741, CO-987 (every caretaker), CO-1809. See C2-7 |
| H.5.d verbal verification | NA: kind of evidence |
| H.5.e.1.a application denied after fifteen days | C: CO-1354, CO-1450, CO-1451 (`past_due`) |
| H.5.e.1.b new application after sixty days | NA: application validity (3.125.T) |
| H.5.e.2 redetermination closed after fifteen days | C: CO-1451 (`case_closed`) |
| I intro | C: CO-3917 |
| I.1 gross earnings, armed forces pay, tips, bonuses; minimum wage test | C: CO-023 (wages_gross), CO-3912, CO-3915, CO-984 |
| I.2 non-farm self-employment net of verified expenses; a.1-7 allowed; b.1-3 disallowed; c minimum wage and averaging | C: CO-1709, CO-1710, CO-1700 (operating and vehicle costs in their meanings) |
| I.3 farm self-employment; a.1-4 receipts; b.1-6 expenses (interest on farm mortgages); c farm products for family living | C: CO-4465, CO-1709 (farm interest), CO-1710 |
| I.4 in-kind compensation at cost or fair market value | C: CO-4454, CO-4464 |
| I.5 employer vendor payments | C: CO-4455, CO-4464 |
| I.6 railroad retirement; I.7.a-b, d DFAS and VA pensions, GI insurance refunds | C: CO-026, CO-1714 or other unearned facts via CO-3913 |
| I.7.c GI Bill subsistence allowance | C: CO-4456, CO-4464 |
| I.8 pensions and annuities less early-payout penalties | C: CO-026, CO-4459, CO-4463 |
| I.9-11, 13-16, 19 dividends, interest, estates and trusts, royalties, memberships | C: CO-1714, tax_exempt_interest via CO-3913 |
| I.12, I.17 net rental income | C: CO-4457, CO-4458, CO-4463. See C2-4 |
| I.18 boarders | C: CO-4161, CO-4464 |
| I.20 inheritance, gifts, prizes | C: CO-3916 (lump sums, lottery winnings) |
| I.21-22 insurance and lawsuit proceeds less last illness, burial or medical | C: CO-4460, CO-3916 |
| I.23-24 strike benefits; lease bonuses | C: other unearned facts via CO-3913 |
| I.25 Social Security before medical insurance deductions | C: social_security_income in CO-3916 |
| I.26 unemployment; I.27 workers' compensation; I.28 maintenance; I.29 child support; I.30 military allotments | C: CO-3913 (unemployment, child support, other facts) |
| I.31 WIOA wages | C: wages_gross (CO-3815's meaning sends wages there) |
| I.32 AmeriCorps and VISTA | C: CO-3915 precision (VISTA by the join date) |
| I.33 refugee CARES payments | C: other unearned facts via CO-3913 |
| J.1 earnings of a child not a teen parent | C: CO-3915 |
| J.2 SSI; J.26 public cash assistance (OAP, AND, TANF) | C: not in CO-3913's sum (separate facts) |
| J.3, 5-8, 15, 21 Agent Orange, relocation, EHAP, Indian funds, ANCSA, Civil Liberties Act, RECA | C: CO-3913 (`federally_excluded_payments_received`) |
| J.4.a-d SNAP, elderly nutrition, school meals, WIC | C: not income facts |
| J.9 disaster assistance | C: CO-3913 (federally excluded or other excluded) |
| J.10 foster care, kinship and adoption subsidy | C: CO-3821, CO-4451, CO-4463 |
| J.11 volunteer payments below minimum wage | C: CO-3913 (federally excluded) |
| J.12 LEAP | C: CO-3913 (`energy_assistance_received`) |
| J.13 Social Security under a PASS | C: CO-3825, CO-4463 (up to Social Security) |
| J.14 EITC | C: CO-3913 (tax refunds and credits) |
| J.16, J.19, J.20 student grants and loans; earmarked aid; Perkins | C: CO-3360, CO-3913 (GI subsistence counted back, CO-4456) |
| J.17-18 WIA training allowances; youth projects | C: CO-3815, CO-4463 |
| J.22 R&P vendor payments | C: CO-3913 (federally excluded) |
| J.23 Colorado Works supportive services | C: CO-4452, CO-4463 |
| J.24 home care allowance | C: CO-3824, CO-4463 |
| J.25 loans | C: CO-3913 (`loan_proceeds_received`) |
| J.27 settlement reimbursements | C: CO-3913 (`expense_reimbursements_received`) |
| J.28 irregular income under $90 a quarter | C: CO-4076, CO-4075, CO-3822; OQ-713 |
| J.29 early childhood research payments | C: CO-4453, CO-4463 |
| K.1.a-b court-ordered current child support paid, deducted for income and fees | C: CO-3902, CO-985, CO-2578 |
| K.2.a-c verified at approval and each redetermination | C: CO-3902 (`child_support_paid_is_verified`), CO-1446, CO-1683, CO-1688 (`deduction_disallowed`) |

### 3.112-3.114 Responsibilities, redetermination, termination
| ¶ | disposition |
|---|---|
| 3.112.A sign; verify income | C: CO-1451; signature NA |
| 3.112.B pay the fee | NA: payment duty |
| 3.112.C reporting within 10 days (over 85%) and 4 weeks | NA: reporting duty |
| 3.112.C.1-4 temporary breaks (seasonal, medical leave, maternity, scheduled breaks) | C: CO-3903, CO-984. **C2-2** (C.2 medical leave) |
| 3.112.D immunization records | C: CO-4060 |
| 3.112.E provider change | NA |
| 3.112.F schedule only when non-traditional hours | C: CO-2397, CO-2398 |
| 3.112.G child citizenship, age and identity | C: CO-1442 to CO-1444 |
| 3.112.H, 3.114.D, 3.125.TT reopening within thirty days | NA: date care resumes |
| 3.112.I credentials | NA: provider-side disqualification |
| 3.112.J ATS non-cooperation | OQ: OQ-162 (county policy) |
| 3.113.A redetermination every twelve months; forms; failure to return | C: CO-3307, CO-1451 (`case_closed`); scheduling NA (Notes, F-18) |
| 3.113.A.1.a.1-3 earned income at redetermination | C: CO-3912, CO-1709, CO-1445 |
| 3.113.A.1.b unearned | C: CO-3911, CO-3913, CO-2873 |
| 3.113.A.1.c schedule | C: CO-2397, CO-2398 |
| 3.113.A.1.d assets self-declared | C: CO-1741, CO-987 |
| 3.113.A.2 training documentation | C: CO-1441 |
| 3.113.A.3 immunization records | C: CO-4060 |
| 3.113.A.4.a-d collateral contacts | NA: evidence |
| 3.113.B fee review at redetermination; effective the month after | C: CO-1290, CO-2578; effective date NA |
| 3.113.C Head Start alignment | NA: scheduling (Notes, F-18) |
| 3.114.A.1 over 85% SMI during the period | C: CO-993, CO-2104 |
| 3.114.A.2 no longer a state resident | C: CO-2107, CO-505 |
| 3.114.A.3 no activity and job search expired | C: CO-984, CO-2109, CO-2110 |
| 3.114.A.4 minimum wage | C: CO-984 |
| 3.114.A.5 22 unexplained absences with two failed contacts | C: CO-4055, CO-989; OQ-711 |
| 3.114.A.6 IPV disqualification | C: CO-3906, CO-989 row 1 |
| 3.114.B.1 child over age limits (redetermination only) | C: CO-4056, CO-4462 |
| 3.114.B.2 unpaid parent fees | C: CO-4054, CO-989 row 5 |
| 3.114.B.3 time limits (redetermination only) | C: CO-984, CO-2111; OQ-790 |
| 3.114.B.4 redetermination requirements | C: CO-1451 |
| 3.114.B.5 not in an activity | C: CO-991. See C2-2 for medical leave |
| 3.114.B.6 became a Colorado Works participant | C: CO-989 row 7. See C2-3 |
| 3.114.B.7 immunization | C: CO-4060 (not at a change for an authorized child) |
| 3.114.B.8 county or state residency | C: CO-2107 |
| 3.114.B.9 minimum wage | C: CO-984 |
| 3.114.B.10 over 85% SMI | C: CO-993 |
| 3.114.B.11 absences before redetermination | C: CO-4055 |
| 3.114.C closure form; E voluntary withdrawal | NA |

### 3.115-3.117 Colorado Works Child Care and transition
| ¶ | disposition |
|---|---|
| 3.115.A approved and work eligible: Colorado Works Child Care at least twelve months; freeze or wait list | C: CO-988; length NA (authorization); freeze NA |
| 3.115.B.1-5 referral form | C: CO-896 (referral fact); form NA |
| 3.115.C not work eligible, not in the unit: may be Low-Income | C: CO-989 row 7. See C2-3 |
| 3.116.A referral, plan, allowable activity | C: CO-988 (household's caretakers) |
| 3.116.B twelve months | NA: authorization |
| 3.116.C only earned income reported by Colorado Works counts | C: CO-2578, CO-1445 (referred exempt), CO-2873 (referral households exempt) |
| 3.116.D schedule from the referral | NA |
| 3.116.E residency verified by Colorado Works | C: CO-1440 (referred exempt) |
| 3.116.F citizenship, age and identity by the referral | C: CO-1442 to CO-1444 (attestation); the referral as verification NA |
| 3.116.G immunization | C: CO-4060 |
| 3.116.H counties serving diversion households | C: CO-988 diversion arm, CO-3932; OQ-682 |
| 3.116.I-K service level changes, provider change, client agreement | NA |
| 3.116.L county move during the twelve months | NA: case transfer; see C2-8 for the transition |
| 3.117 intro: transition without an application; redetermination twelve months later | C: CO-3307 (`transition_from_colorado_works`), CO-1451 (`not_required`) |
| 3.117.A.1 Colorado Works IPV | C: CO-1730, CO-989 row 8 |
| 3.117.A.2 over 85% SMI | C: CO-2104 (exit limit at a transition), CO-993 |
| 3.117.A.3 absences | C: CO-4055, CO-989 row 9 |
| 3.117.B no additional verification until redetermination | C: CO-1451 (`not_required` at a transition) |
| 3.117.C in an activity other than job search: transitioned | C: CO-984 |
| 3.117.D in job search or no activity: job search at least thirteen weeks | C: CO-871 (meaning names 3.117.D), CO-984 |
| 3.117.E income increase not acted on until redetermination | C: CO-4052 (fee cap at a transition); eligibility reads 85% (A.2) |
| 3.117.F fee no higher than at the last referral | C: CO-4052, CO-4050 |
| 3.117.G twelve months; H subject to 3.110 | NA authorization; C: CO-989 |
| 3.117.I client agreement | NA |
| 3.117.J back to Colorado Works Child Care | C: CO-988 |

### 3.118-3.121 Protective services, Child Welfare, homelessness
| ¶ | disposition |
|---|---|
| 3.118.A protective services households (placement, open case; county plan for CCDF) | C: CO-873 |
| 3.118.B twelve months; C not 24-hour; D school hours; E referral form | NA: authorization and forms; C not 24-hour: CO-2108 |
| 3.119.A household of one; only the placed children's income; no child support | C: CO-3008, CO-994, CO-995 |
| 3.119.B sixty days for the children's income | C: CO-4057, CO-4061; OQ-716 |
| 3.119.C income requirement waived case by case (county plan) | C: CO-4053, CO-995 |
| 3.119.D no activity requirement | C: CO-989 row 4 precedes the activity row; CO-1441 exempt |
| 3.119.E no residency verification | C: CO-1440 exempt; CO-989 row 4 precedes CO-987 |
| 3.119.F.1-3 citizenship, age and identity within six months | C: CO-4059, CO-4061, CO-980 |
| 3.119.G sixty days for immunization | C: CO-4058, CO-4061 |
| 3.119.H extra absences paid | NA: provider payment |
| 3.120.A-C Child Welfare Child Care: temporary, not 24-hour, school hours | C: CO-2576, CO-4056; rest NA |
| 3.120.D eligibility by Child Welfare under 12 CCR 2509-4 7.302 | C: CO-2576, CO-989 row 2; OQ-710 (D-305 read) |
| 3.120.E no residency verification | C: CO-1440, CO-1441, CO-1445, CO-2873 exempt |
| 3.120.F not CCDF | C: CO-989 row 2 (no citizenship test); OQ-710 |
| 3.121.A definition | C: CO-2814. See C2-5 |
| 3.121.B stabilization period of at least sixty days (county plan longer) | C: CO-2577, CO-3907, CO-989 row 10; county length OQ-162 |
| 3.121.B.1 verifications by the end of the period, else ineligible | C: CO-3908, CO-3909, CO-1451 |
| 3.121.B.2 non-recoverable | NA: recovery |
| 3.121.B.3.a no activity required; b sixty days to verify an activity | C: CO-989 row 10 precedes the activity row; CO-3909 |
| 3.121.B.4.a-b residency self-declared | C: CO-1440 exempt during the period |
| 3.121.B.5, a, b.1-3 child citizenship, age and identity self-declared | C: CO-1442 to CO-1444 exempt during the period |
| 3.121.B.6 no immunization during the period | C: CO-4060, CO-1447 exempt |
| (3.124.I.5) no fee during the period | C: CO-1290 |

### 3.122-3.123 Wait lists and freezes
| ¶ | disposition |
|---|---|
| 3.122.A-D, 3.123.A-E | NA: enrollment capacity, not eligibility (Notes) |

### 3.124 Parent fees
| ¶ | disposition |
|---|---|
| A gross countable income, household size, children in care; whole dollars by dropping cents | C: CO-2578, CO-1289, CO-3508 (`-ceil(-x)` = floor) |
| B.1-4 permitted revisions during the period | C: CO-4051, CO-4052; OQ-712 |
| C no higher than the last determination's fee | C: CO-4052, CO-4050 |
| D review at redetermination; 4.33 weekly conversion | C: CO-1290; conversion NA (county method, CO-3914) |
| E Colorado Works in paid employment: income from Colorado Works | C: CO-2578 (earned income only) |
| F Colorado Works fee review at twelve months | C: CO-3307 (`redetermination`) |
| G Head Start dual enrollment waiver (county plan) | C: CO-3505 |
| H, I.2 20% for the top three quality levels (Low-Income and Colorado Works only) | C: CO-3508, CO-3002, CO-1287 |
| I.1, X teen parent hardship waiver | C: CO-2575 |
| I.3 Colorado Works with no paid employment: no fee | C: CO-1290 |
| I.4 Child Welfare: no fee | C: CO-1290 |
| I.5 homelessness stabilization: no fee | C: CO-1290 |
| I.6 protective services: no fee unless the child has income | C: CO-2578, CO-994, CO-1290; OQ-536 |
| I.7 no income: no fee | C: CO-1290 (`<= 0`) |
| I.8 disaster waiver up to twelve months | C: CO-3505 |
| J effective date; no retroactive fee | NA: effective date |
| K-M paid to the provider; split between providers; information | NA |
| N loss at redetermination for unpaid fees; ineligible until paid, arranged or good faith | C: CO-4054, CO-989 row 5 |
| O notice fifteen days ahead | NA |
| P, P.1-3 through 2028-07-31: 1% to 100% FPG, 14% marginal above, $15 per added child above 100% | C: CO-1289 (0.01 × min(income, FPG) + 0.15 × excess, which equals 1% of all income plus 14% of the excess), CO-1284, CO-2115 to CO-2117, CO-1286 |
| Q from 2028-08-01: 1%, 3%, 5%, 7% bands | C: CO-1289 with the 2028 versions of CO-2115 to CO-2119; OQ-254 (band edges) |
| R, T FPG and SMI from H.2-3; update at the next redetermination | C: CO-3007 (October guideline); mid-period decrease noted in CO-4052 (first pass F-26) |
| S $5 hardship reduction up to six months (county plan) | C: CO-3506, CO-3507, CO-1290 |
| U all children part time: 55% | C: CO-1288, CO-3003, CO-2864 |
| V part-time majority over the period | C: CO-2864 (supplied per child) |
| W grades 1-12 part time in the school year | C: CO-2864 |

### 3.125 County responsibilities
| ¶ | disposition |
|---|---|
| A-P administration, contracts, controls, forms, training, CHATS, overrides, records, expenditures, posting, consumer education | NA: county administration |
| Q minimum twelve months; Q.1-6 the only reasons to discontinue before redetermination | C: CO-993, CO-2104 (Q.1); CO-984, CO-871 (Q.2; **C2-2**); CO-2107 (Q.3); CO-984 (Q.4); CO-4055 (Q.5); CO-3906 (Q.6); CO-4056 and CO-4462, CO-4060, CO-2111 not applied at a change. See C2-7 for the asset conjunct |
| R, S wait list policies | NA |
| T application review in fifteen days; valid sixty days; denial | C: CO-1354, CO-1450, CO-1451 |
| U wrong county forwarded | NA |
| V, X, JJ information from other programs; collateral contacts | NA: evidence |
| W immunization at application and redetermination | C: CO-4060 |
| Y, Y.1-3 preponderance; additional verification only if inconsistent | C: CO-1442 to CO-1444 |
| Z no SSN required | C: no CCCAP item reads an SSN fact |
| AA prudent person principle | NA |
| BB, BB.1-2 residence verification; homelessness under 3.121 | C: CO-1440, CO-1313, CO-1676 |
| CC SUD self-attestation | C: CO-1441 (SUD exempt) |
| DD, DD.1-2 reporting duties | NA: reporting |
| EE, EE.1.a-e, EE.2 changes acted on during the period; others wait | C: CO-3307 (`change_during_eligibility_period`), CO-4052; rest NA |
| FF new child: redetermination date | NA: scheduling (Notes, F-18) |
| GG, GG.1-4 county move during the period | C: CO-2107; GG.1 provider agreement NA; GG.3 receiving county's activities OQ-162; GG.4 wait list NA |
| HH response times | NA |
| II redetermination review; fifteen days; denial | C: CO-1451 (`case_closed`) |
| KK 20% quality reduction | C: CO-3508 |
| LL, LL.1-3 unpaid fees acted on only at redetermination | C: CO-4054, CO-989 row 5 |
| MM, NN authorization by need; Head Start blending | NA: authorization |
| OO Head Start redetermination date | NA: scheduling (Notes, F-18) |
| PP school-hours services | NA: authorization |
| QQ, RR authorization start; pre-eligibility payment | NA |
| SS notice in one business day | NA |
| TT reopening; voluntary withdrawal within the period | NA: date care resumes |
| UU-ZZ ATS registration, provider information, exempt provider reviews and screening | NA: provider side |

### 3.126 Pre-eligibility
| ¶ | disposition |
|---|---|
| A-B, D-G pre-eligibility by a provider or county; payment | NA: payment and procedure |
| C documents within thirty days or possibly ineligible | NA: county option, deferred (Notes, first pass F-24) |

### 3.127-3.134 Provider side (one line each)
| ¶ | disposition |
|---|---|
| 3.127 eligible facilities (licensed; qualified exempt; fiscal agreements; payment) | NA: provider eligibility. Qualified exempt care drives only the immunization trigger, CO-2394 |
| 3.128 provider responsibilities | NA. Q (unpaid fees reported within sixty days) is behind CO-4054; R (absences) is behind CO-4055 |
| 3.129 complaints | NA |
| 3.130 reimbursement rates, absences, drop-in, bonuses | NA |
| 3.131 slot contracts | NA |
| 3.132 authorization (twelve months except time-limited activities; ages for payment) | NA: authorization. B.3 is OQ-790; D-E repeat the eligible-child ages, C: CO-4056 |
| 3.133 ATS | NA. A.4 non-cooperation is OQ-162 |
| 3.134 fiscal agreements | NA |

### 3.135-3.147 Program integrity
| ¶ | disposition |
|---|---|
| 3.135-3.138 investigation, criteria, hearings, waiver | NA: procedure (the outcome is the disqualification fact) |
| 3.139.A-C, E-G disqualification periods (12, 24 months, permanent) | C: CO-3906 (serving a disqualification) |
| 3.139.D affects any household the person is a member of | C: CO-989 row 1 (any caretaker or teen parent) |
| 3.140-3.141 notices; referral to the district attorney | NA |
| 3.142.A-C criminal verdict periods | C: CO-3906 |
| 3.143.A-B penalties; provider termination | C: CO-3906; B NA |
| 3.144 hearing rights | NA |
| 3.145-3.147 recovery, timeliness, process | NA: overpayment recovery |

**Matrix size:** 351 rows covering every paragraph of §§ 3.100-3.147 and the 3.103 definitions. Rows group sibling subparagraphs that share a disposition, so the paragraph count is higher than the row count.

| Disposition | Rows |
|---|---|
| Carried (C) | 267, of which 22 point to a finding (C2-1 to C2-8) |
| Not applicable | 79 |
| Open question only | 5 (3.104; 3.103.KK, MMM, XXXX; 3.112.J) |
| GAP | 0. The first pass's gaps (F-05, F-07, F-08, F-11, F-12, F-15, F-18 to F-20, F-24, F-25) are now carried, recorded in the Notes, or in OQ-162 |

## 4. Open-question confirmations

| OQ | Class | Confirmed? |
|---|---|---|
| OQ-121 county entry levels | blocked: CDEC's levels (cdec.colorado.gov) | Yes. H.1.a states only the 185% floor. |
| OQ-162 county plans (job search, education weeks, stabilization length, receiving county's activities, ATS closure) | blocked: county plans under 3.104 | Yes. Carries 3.112.J and 3.133.A.4 since the fix round. |
| OQ-163 teen parent living with her own parent | state policy choice | Yes. 3.103.LLL, EEEEE and 3.111.D do not settle it. |
| OQ-254 post-2028 band edges | state policy choice | Yes. 3.124.Q states whole percentages only. |
| OQ-536 base of a protective services fee | state policy choice | Yes. 3.124.I.6 and 3.119.A state no base. |
| OQ-540 loco parentis; D.2 financial contribution | state policy choice | Yes. The Checked line now cites 3.111.D.1-2 and D.4-5 (first pass F-15). See C2-6 for the role's label. |
| OQ-562 CDE "attending school" | blocked: CDE definition (not an allowed host) | Yes. |
| OQ-612 temporary absence | state policy choice | Yes. The Checked line now cites 3.111.D.1.a and 3.103.NNNNN (first pass F-17). |
| OQ-680 anchor of the thirty days; lump sum | state policy choice | Yes. |
| OQ-682 counties serving diversion households | blocked: county elections | Yes. |
| OQ-710 Child Welfare Child Care and the eligible child | state policy choice | Yes. 12 CCR 2509-4 7.302 is now held (D-305) and cited (first pass F-16). |
| OQ-711 absences: child or case | state policy choice | Yes. |
| OQ-712 permitted increase and the cap | state policy choice | Yes. |
| OQ-713 J.28 by month or by the thirty days | state policy choice | Yes. |
| OQ-716 start of the protective services periods | state policy choice | Yes. |
| OQ-790 time limit reached during the period (new) | state policy choice | Yes. 3.114.B.3, 3.125.Q and 3.132.B.3 were read; the class stands. The same closed-list reading of 3.125.Q that OQ-790 relies on decides C2-2, so C2-2 needs no new open question at a change. |

No open question is misclassified between "blocked" and "state policy choice".

## 5. First-pass P1s (docs/reviews/coverage-cccap.md): all hold

Each was re-run on the HEAD ledger, using the first pass's households with the facts the fix round added.

| First-pass P1 | Probe | Result |
|---|---|---|
| F-01 Colorado Works Child Care read on the child | Q-L | Holds: both members `eligible_colorado_works`, fee 0. |
| F-02 residency and assets per person | Q-K1, Q-K3 | Holds: K1 every member `ineligible`; K3 both `eligible_low_income`, fee 47. |
| F-03 two caretakers with none in an activity | Q-A1, Q-A2 | Holds: both `ineligible_activity` (A1 with the incapacity documents received). |
| F-04 graduate program | Q-B2 | Holds: `ineligible_activity` with CO-4450 true. |
| F-05 county move during the period | Q-C | Holds: `eligible_low_income`, fee 47. |
| F-06 child turned 13 during the period | Q-D2 | Holds: `eligible_low_income`, fee 47 with CO-4462 true. |
| F-07 foster care payment | Q-E | Holds: income 2,000, eligible, fee 47. |
| F-08 boarder | Q-F | Holds: income 3,500, `ineligible_income`. |
| F-09 GI Bill subsistence | Q-G2 | Holds: income 3,500, `ineligible_income`. |
| F-10 net amounts | Z-5b | Holds when rents are stated in CO-4457 (2,500). See C2-4 for rents stated elsewhere. |
| F-11 launch period | Q-H | Holds: income 870, fee 8. |
| F-12 caretaker in the Colorado Works unit | Q-I | Holds: `ineligible`. See C2-3 for the fact the row reads. |
| F-13 campground | Q-M2 | Holds: `eligible_homelessness_stabilization`, fee 0. |
| F-14 Child Welfare Child Care verifications | Q-J | Holds: `eligible_child_welfare`, verification `not_required`. |
| F-15 partner contributing financially | Q-N1 | Holds: the partner who is not working makes the household `ineligible_activity`; stored case CO-174 gives income 3,500, fee 206 (1% of 2,276.67 plus 15% of 1,223.33, floored). |

Earlier P1s from `final-cccap-leap-sebt.md` and `final2-cccap-leap-sebt.md` (spot-check): stored cases CO-125 (income 2,800, fee 101; 3.111.K deduction) and CO-133 (fee cap, fee 47) match their expectations. CO-170 (fee 20) and CO-174 (fee 206) from the fix round also match.

## 6. Notes for the fix round

- C2-1 and C2-2 change answers and need rule tests and household cases from Z-1 and Z-2.
- C2-3 and C2-4 are fact-meaning problems. The first round's new reads depend on these facts, so fix the meanings even if no derivation changes.
- C2-5 is the last household-outcome item read per person (first pass F-01, F-02 class). CO-1290's homelessness row and CO-1440's exemption read the same per-person item.

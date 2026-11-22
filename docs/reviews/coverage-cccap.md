# Coverage-matrix verification: CCCAP (family file `coverage-cccap`)

Reviewer: independent coverage pass (brief: `brief-coverage.md`), 2026-11-22.
Commit reviewed: `5fc915b` (branch `ccr-9d19bf4c-wmnwcl`).
Governing text: 8 CCR 1403-1, rule version 12658, effective 2026-08-14 (D-87, `volumes/co/documents/D-87.md`).

**Currency check (sos.state.co.us, 2026-11-22).** The rule-info page for 8 CCR 1403-1 (`DisplayRule.do?action=ruleinfo&ruleId=3397`) lists the 08/14/2026 permanent rule (adopted 06/25/2026, eDocket 2026-00210, version id 12658) as the current version. The 07/23/2026 emergency rule appears only under archived versions. D-87 is current.

**Method.**
- I read D-87 §§ 3.100-3.126 and 3.135-3.147 line by line, and skimmed the provider sections §§ 3.127-3.134.
- I regenerated the ledger in a scratch copy (`git archive HEAD`; `npm run export -- --volume co`: 1,887 items) and took the closure of every CCCAP item (231 items).
- I read every closure item's derivation in the YAML.
- I confirmed suspected wrong answers with `scripts/eval-case.ts` on probe households RV-A1 to RV-M. The probes are in the scratch copy, built by `/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cov/gen/mk.py` and appended to that copy's `volumes/co/tests/cases.yaml`. Every probe states every fact the items read; the base household is CO-136's shape: mother p1 with $2,000 wages and 120 hours, son p3 aged 6, Denver, application on 2026-11-15, entry limit 185%.
- I fetched 12 CCR 2509-4 (version 12039, effective 07/01/2025) from sos.state.co.us to check OQ-710.

## 1. Verdict

**15 P1 found.** The family is not complete under the stopping rule.

The 23 earlier CCCAP P1s stay fixed (spot-checked, section 5). The new P1s fall in five groups:
- **Household outcome read per person.** Two items read the evaluated person's own facts, so members of one household get different statuses (F-01, F-02).
- **Household composition.** A two-caretaker household passes the activity test with no caretaker in an activity (F-03). A second caretaker who only contributes financially (3.111.D.2) is not modeled (F-15).
- **Activities and the twelve-month period.** A graduate program counts as an activity (F-04). Reasons the rule allows only at redetermination are applied at a change during the period (F-05, F-06). The 3.115.C bar is not modeled (F-12).
- **Income.** Five income sources or amounts are counted wrongly (F-07 to F-11).
- **Pathways and verification.** Families in campgrounds are left out of the homelessness pathway (F-13). Child Welfare Child Care households are asked for Low-Income verifications (F-14).

## 2. Findings

P1: a wrong eligibility or benefit answer, a missing pathway, or an unmodeled or wrong verification requirement. P2: a gap or mismatch with no answer effect in ordinary cases, or an open-question record that is incomplete. P3: a note.

| ID | Pri | Paragraph | Item(s) | Governing text | What is wrong | Proposed fix |
|---|---|---|---|---|---|---|
| F-01 | P1 | 3.115.A, 3.116.A, 3.116.H; 3.103.DD | CO-988 `cccap_colorado_works_child_care_eligible`, read by CO-989 | 3.116.A: caretakers "that have been determined eligible for Colorado Works ... and have been referred for child care by the county Colorado Works worker ... must receive Colorado Works Child Care" | CO-988 tests `receives_tanf_cash`, `is_work_eligible_individual_in_tanf_case` and `is_referred_for_colorado_works_child_care` (and the diversion arm) on the **evaluated person**. CO-989's meaning says a child "reads the household's caretakers' ... facts rather than their own", but here the child reads its own. **RV-L:** the mother is work-eligible, referred and in an unpaid work activity, so she gets `eligible_colorado_works` (fee 0). Her child, the person care is for, gets `ineligible_activity`. No stored case evaluates a child in a Colorado Works household. | Test the conditions over the household: `[exists, cccap_household_members, [all, caretaker-or-teen-parent, receives_tanf_cash, work-eligible, referred]]`, with the diversion arm the same way. Add a rule test evaluated on the child. |
| F-02 | P1 | 3.111.A; 3.111.H.5.c; 3.113.A.1.d | CO-987 `cccap_low_income_child_care_eligible` (reads CO-2107 and CO-1741) | 3.111.A: "The adult caretaker(s) and teen parent(s) shall be verified residents of the county"; H.5.c: "If assets exceed one million dollars **the household** is ineligible" | CO-987 reads `cccap_meets_county_residency` and `cccap_declares_assets_within_limit` of the evaluated person. **RV-K1:** the father declares assets over $1M. The mother and child get `eligible_low_income` (fee 20) and the father gets `ineligible`. **RV-K2:** the mother declares assets over $1M (and the child's fact is stated true). The mother gets `ineligible` and the child `eligible_low_income`, fee 47. **RV-K3:** the child's own asset and residency facts are not stated. The mother is eligible and the child is `ineligible`. The stored cases hide this because they state these caretaker facts on every child. | Test residency and the declaration over the household's adult caretakers and teen parents: `[not, [exists, members, [all, caretaker-or-teen-parent, [not, ...]]]]`. |
| F-03 | P1 | 3.111.D.1.b, D.1.c.3, E | CO-991 `cccap_household_caretakers_in_eligible_activity` | D.1.b: a household with one caretaker involuntarily out of the home "shall be considered a household with one adult caretaker"; D.1.c.3: "One ... is engaged in a low-income eligible activity and the other ... is incapacitated"; E: "Incapacitated single adult caretakers ... who are not in a low-income eligible activity are not eligible" | A caretaker who is incapacitated or involuntarily absent is excused whenever the household has more than one caretaker. Nothing requires a present caretaker to be in an activity. **RV-A1:** two incapacitated parents, neither in an activity: `eligible_low_income`. **RV-A2:** one incapacitated, one involuntarily absent: `eligible_low_income`. The rule makes both households ineligible: A2 is a one-caretaker household (D.1.b) whose caretaker is incapacitated (E). | Require at least one caretaker who is in an eligible activity and not involuntarily absent. Excuse the others only when incapacitated or involuntarily absent. Add tests for A1 and A2. |
| F-04 | P1 | 3.111.G.4.a.1; 3.103.IIIII | CO-1722 `cccap_is_in_education_or_training_activity`, CO-984, CO-2880 | G.4.a.1: "a training or post-secondary education program **for a first bachelor's degree or less**"; IIIII: "regionally accredited institutions of higher education for a Bachelor's degree or less" | `higher_education` ("a college or university") counts as an activity whatever the degree. No item mentions the degree limit: "bachelor" appears in no item, fact or open question. **RV-B:** a mother in a master's program, no work: `eligible_low_income`, fee 0. The rule gives `ineligible_activity`. | Add a neutral fact for the degree pursued, or whether the person already holds a bachelor's degree. CO-1722 counts `higher_education` only for a first bachelor's degree or less. |
| F-05 | P1 | 3.111.A (second sentence); 3.125.GG; 3.114.A.2 vs B.8; 3.125.Q.3 | CO-2107 `cccap_meets_county_residency`, CO-987, CO-989 | 3.111.A: caretakers "shall remain eligible for the duration of the eligibility period if they report that they are no longer residents of the county ... per rule section 3.125(GG)"; 3.114.A.2 terminates during the period only when "no longer a resident of **the state**"; B.8 (county or state) is "at re-determination only" | Any county move fails the test. CO-2107's precision says the carve-out is not modeled because `cccap_is_receiving_assistance` "does not separate a mid-period change from a redetermination". That reason is stale: CO-3307 has had `change_during_eligibility_period` since F-16. **RV-C:** at a change, the family has moved from Denver to Arapahoe: `ineligible`. The rule gives `eligible_low_income`. | At `change_during_eligibility_period`, CO-2107 is met by Colorado residency alone (GG also requires staying under 85% SMI and in an activity, which CO-989 already tests). Update the precision. |
| F-06 | P1 | 3.125.Q (closed list); 3.114.B.1, B.3, B.7 ("at re-determination only"); 3.125.EE.2 | CO-989 (eligible-child row), CO-980/CO-4056 (age), CO-984 (CO-2111 time limit), CO-4060 | 3.125.Q: "Counties shall not discontinue child care services prior to a household's next eligibility re-determination unless" six listed reasons (85% SMI, a non-temporary activity end, the state, minimum wage, absences, IPV); B.1 "Eligible child exceeds age limits" and B.3 time limits only at redetermination | Every test runs at every determination type. **RV-D:** at a change on 2026-11-15, the only child turned 13 on 2026-11-10: `ineligible_child`, fee 0. The rule keeps the household eligible until its redetermination (`eligible_low_income`, fee 47). Reaching an education time limit mid-period (B.3) also gives `ineligible_activity`. An immunization record missing mid-period (B.7) makes the status pending, then `past_due`. | At `change_during_eligibility_period`, do not apply the age part of the eligible-child test (or read a fact that the child was eligible at the last determination) or the education time limit. Record whether 3.132.B.3 (shorter authorizations for time-limited activities) changes B.3. Have CO-4060 ask for immunization only at an application or a redetermination. |
| F-07 | P1 | 3.111.J.10, J.13, J.17, J.18, J.24 | CO-3913 `unearned_income_prior_thirty_days`, CO-3916; facts CO-3821, CO-3825, CO-3815, CO-3824 | J.10 "Payments received from the county or state for providing foster care, kinship care, or for an adoption subsidy"; J.13 Social Security under "an individual plan for self-care and/or self-support"; J.17 WIA training allowances; J.18 youth employment project payments; J.24 "Home Care Allowance" | The volume has neutral facts for these receipts: `foster_care_provider_payments_received`, `pass_set_aside_income`, `workforce_program_payments_received` and `in_home_care_allowance_received`. Each says it is "part of the person's gross unearned income ... If not stated, every program reads it as 0". CO-3913 subtracts only educational aid, loans, reimbursements, energy aid, tax refunds, federally excluded payments and lump sums, so CCCAP counts all four. No fact states an adoption subsidy, so it falls into `other_unearned_income_nontaxable` and is counted too. **RV-E:** a kin foster parent with her own child, $2,000 wages and a $1,500 foster care payment: income $3,500, `ineligible_income` (entry limit $3,336.16). The rule gives $2,000, eligible, fee 47. | Subtract CO-3821, CO-3815 and CO-3824 in CO-3913, and CO-3825 from the Social Security CO-3916 reads. Add or name an adoption-subsidy receipt (J.10). Add rule tests. |
| F-08 | P1 | 3.111.I.18; I.4; I.5 | CO-3916/CO-3913 (no reader of CO-4161) | I.18 "Receipts from boarders or lodgers"; I.4 in-kind compensation for employment "must be counted as other income ... based on the cost or fair market value"; I.5 vendor payments that are "part of the compensation for employment" | `room_and_board_payments_received` (CO-4161) is "Not part of the wages, self-employment or unearned income facts" and only SNAP reads it, so boarder receipts are dropped. No fact states in-kind compensation or vendor payments as compensation (`wages_gross` is cash wages). **RV-F:** $2,000 wages plus a $1,500-a-month boarder: income $2,000, eligible, fee 47. The rule gives $3,500, `ineligible_income`. | Read CO-4161 in CO-3916. Add neutral facts for in-kind compensation at fair market value and employer vendor payments, or name them in `wages_gross`, and count them. |
| F-09 | P1 | 3.111.I.7.c vs J.16, J.19 | CO-3360 `educational_assistance_received`, CO-3913 | I.7.c counts "Subsistence allowances paid to veterans through the GI bill for education and on-the-job training"; J.19 excludes only aid "that preclude[s] ... use for current living costs and ... earmarked for education" | CO-3360's meaning includes "veterans' educational benefits", and CCCAP subtracts all of it. A GI Bill housing or subsistence allowance stated there is excluded. **RV-G:** a veteran student with $2,000 wages and a $1,500 GI Bill housing allowance: income $2,000, eligible. The rule gives $3,500, `ineligible_income`. | Split the veterans' education subsistence allowance out of CO-3360 (a new neutral part-of fact), and do not subtract it for CCCAP. |
| F-10 | P1 | 3.111.I.12, I.17 (net rental income); I.8 (pensions less early-payout penalties); I.21, I.22 (insurance and lawsuit proceeds less last-illness, burial or medical costs) | CO-3913/CO-3916 via CO-1714, CO-026, CO-3367 | I.12 "Net rental income"; I.17 "Net income from rental of a house, store, or other property"; I.8 "(minus the amount deducted for penalties ...)"; I.21 "minus the amount expended ... for ... last illness and burial"; I.22 "to the extent that they exceed the amount ... for medical care" | The facts state gross amounts: `other_unearned_income_taxable` includes "rents ... from property the person does not actively manage", gross. The rule counts each of these net. A landlord with $1,500 rent and $1,000 of property expenses is counted at $1,500 instead of $500. CO-3914 (a county-determined figure) is the only route to a net amount, and its meaning names rental averaging (H.4.e), not the net computation. | Add neutral facts for rental expenses, early-withdrawal penalties and the offsetting medical or burial costs, or state in CO-3914's meaning that the county figure carries these net amounts and record the assumption. |
| F-11 | P1 | 3.111.G.2.e | CO-1710 `cccap_self_employment_net_earnings`, CO-3915; CO-2113 | G.2.e: "**Projected income for the launch period shall be determined based upon the federal minimum wage times the number of declared hours worked.**" | CO-2113 only excuses the minimum-wage test. Income stays the actual receipts. **RV-H:** a launch-period business with $300 of receipts and 120 hours: income $300, fee $3. The rule gives $7.25 × 120 = $870, fee $8. | When `cccap_self_employment_in_launch_period`, count self-employment income as `federal_minimum_wage` × `hours_worked` (the declared hours), not the receipts. |
| F-12 | P1 | 3.115.C; 3.114.B.6; (3.111.D.6) | CO-988, CO-987, CO-989 (no item) | 3.115.C: a caretaker not determined work eligible, caring for children receiving basic cash assistance, "may be eligible for Low-Income Child Care **if the adult caretaker or teen parent is not a part of the Colorado Works assistance unit**"; B.6: terminate at redetermination if the caretaker "has become a participant in Colorado Works" | No CCCAP item reads a caretaker's own `receives_tanf_cash` except CO-988. **RV-I:** a mother in the Colorado Works unit who is not work eligible, working: `eligible_low_income`, fee 47. 3.115.C excludes her. D.6 omits the unit condition, and no open question reconciles the two. | Add a row to CO-989 (or a conjunct to CO-987): a caretaker in the Colorado Works assistance unit (`receives_tanf_cash`) who is not Colorado Works Child Care eligible is not Low-Income eligible, and at a redetermination a caretaker who has become a Colorado Works participant is not either. Or record an open question that cites D.6 and 3.115.C. |
| F-13 | P1 | 3.103.CCC.1; 3.121.A | CO-2814 `cccap_is_family_experiencing_homelessness` | CCC.1: children who "are living in motels, hotels, **or camping grounds** due to the lack of alternative accommodations" | CO-2814 leaves out the option `trailer_park_or_campground_for_lack_of_alternative`. Its precision says CCCAP's list "does not name trailer parks", but the option also covers campgrounds, which the list does name. **RV-M:** a family in a campground in its stabilization period, no activity: `ineligible_activity`. The rule gives `eligible_homelessness_stabilization`, fee 0. | Split the option into trailer park and campground (neutral fact CO-2810) and include the campground, or include the combined option with a precision. |
| F-14 | P1 | 3.120.D-E; 3.111 (Low-Income only) | CO-1441, CO-1445, CO-2873, CO-1684 → CO-1451 | 3.120.D: "Eligibility for Child Welfare Child Care is determined on a case-by-case basis by the Child Welfare division"; E exempts only residency, because the rule has no CCCAP activity or income test for this category | CO-1440 exempts Child Welfare Child Care from residency, but the activity, earned income, unearned income and hours elements are still required. **RV-J:** a Child Welfare Child Care household with a working caretaker and no documents, request 2026-10-01: 3 elements pending, `cccap_verification_status` `past_due` ("the application is denied"), while the status is `eligible_child_welfare`. | Exempt `cccap_is_child_welfare_child_care_household` in CO-1441, CO-1445, CO-2873 and CO-1684, as CO-1440 does. |
| F-15 | P1 | 3.111.D.2 | CO-982, CO-2607, CO-992 (OQ-540 does not cite D.2) | D.2: "Households are considered households with two adult caretakers ... when two adults ... **contribute financially to the welfare of the child and/or** assume parent rights, duties, and obligations similar to those of a biological parent, even without legal adoption" | A co-resident adult who is not a parent, stepparent or guardian, and is not stated with `has_primary_responsibility_for`, is never a member. A partner who contributes financially (D.2's first prong) is left out, along with his income and the activity he must be in. OQ-540 decides "loco parentis" from 3.103.C alone and does not cite D.2. | Cite D.2 in OQ-540 and decide whether financial contribution alone makes a second caretaker. If it does, add a neutral fact (an adult in the home who contributes financially to the child's welfare) that CO-2607 reads. |
| F-16 | P2 | 3.120.D (OQ-710) | OQ-710 | 3.120.D defers to "12 CCR 2509-4, rule section 7.302" | OQ-710's Checked line says 7.302 is a document "this volume does not hold". sos.state.co.us serves it (ruleId 2823, version 12039, effective 07/01/2025; 7.302 is marked "[Rev. eff. 4/1/12]", so it matches the incorporated 2023 edition). 7.302.1 requires that no other child care option exists and that the child is eligible for Program Area 4, 5 or 6. It states no ages. 7.302.2.G: "Follow State rules for the Colorado Child Care Assistance Program". The class (state policy choice) stands after reading it, but the texts were not all checked. | Add 7.302 as a document and cite it in OQ-710's Checked line. Note 7.302.2.G (follow CCCAP rules) and 7.302.2.E ("Assess a client fee when applicable", which 8 CCR 1403-1 3.124.I.4 overrides). |
| F-17 | P2 | 3.111.D.1.a; 3.103.NNNNN (OQ-612) | OQ-612 | D.1.a: a caretaker "voluntarily out of the home temporarily ... with an established intent to return ... [is] considered to be part of the household" | OQ-612 covers CCCAP, but its Checked line cites only 7 CFR 273.1, 8.100.4.E and 9 CCR 2503-7 3.751. | Add 8 CCR 1403-1 3.111.D.1.a and 3.103.NNNNN to the Checked line (they state no limit, so the class stands). |
| F-18 | P2 | 3.111.C.1.c; 3.113.C; 3.125.FF, OO | (none) | Head Start families' redetermination date "aligns with the Head Start ... program year"; FF: a new child resets the redetermination to no earlier than twelve months from the child's addition | No item or recorded reason. The volume evaluates a stated determination type and computes no redetermination date (CO-2379 retired), so this changes when a redetermination happens, not a month's answer. | Record in the CCCAP notes that redetermination scheduling is out of scope, or add a date item. |
| F-19 | P2 | 3.112.J; 3.133.A.4 | (none) | "Non-cooperation with the use of the ATS may result in case closure ... as defined by Department-approved county policy" | A county-policy closure reason with no item and no open question. | Add it to OQ-162 (county plans, blocked) or record it as out of scope. |
| F-20 | P2 | 3.111.I.3 | CO-1710 | Farm income: "gross receipts minus operating expenses", which differ from I.2's (cash rent, farm mortgage interest, farm products used for family living not counted) | CO-1710's precision says farm self-employment "is not distinguished" but records no assumption or open question. | Add a farm flag or record the assumption that farm receipts and costs are stated net of I.3.c. |
| F-21 | P2 | 3.111.C.2.g; D.1.c.3 | CO-1744, CO-1447 | C.2.g lists "Incapacitation, if applicable" among the required verifications | The verification is folded into the fact ("as verified by a physician"). An incapacity reported but not yet documented reads false, giving `ineligible_activity` rather than a pending element. | Add an incapacity-verification element with its own due date. |
| F-22 | P2 | 3.124.H, I.2 | CO-3508 | H: "For a **Low-Income or Colorado Works** Child Care household utilizing a child care provider in the top three levels ..." | The 20% reduction also applies to a protective services household that pays a fee on its children's income (I.6). | Apply H only for `eligible_low_income` and `eligible_colorado_works`. |
| F-23 | P2 | 3.116.C | CO-1445 | "only earned income that is reported and verified by the county Colorado Works worker" | CCCAP asks a Colorado Works Child Care household's earners to verify earned income again. The element clears only if the author states the referral as a document. | Exempt Colorado Works referral households in CO-1445, as CO-1440 and CO-1441 do. |
| F-24 | P2 | 3.126.C | (none) | Pre-eligibility applications: documents "shall be received in thirty (30) calendar-days ... or the application may be determined ineligible" | Not modeled; no reason recorded (county-approved process). | Record as out of scope (county option under 3.104), or add a due-date branch. |
| F-25 | P2 | 3.111.J.23, J.29 | (none) | J.23 "Supportive service payments under the Colorado Works Program"; J.29 "Income received for participation in grant funded research studies on early childhood development" | No fact states either receipt. A case would state them in `other_unearned_income_nontaxable`, and they would be counted. | Add part-of facts and subtract them for CCCAP. |
| F-26 | P3 | 3.124.R, T | CO-1289/CO-3007 | Counties "update parent fees at the next scheduled re-determination" for the new FPG | At a mid-period change after October 1, the fee is computed on the new guideline. The cap (CO-4052) blocks increases, but a decrease goes through. | Note it in CO-4052's precision, or read the guideline in force at the last determination for changes. |
| F-27 | P3 | 3.111.I.32; G.1.c | CO-4016; CO-023 | VISTA payments are excluded "if the client was receiving CCCAP when they joined vista"; LLC and S-corporation owners are employees | Fact-classification points with no item. | Add a precision note. |
| F-28 | P3 | 3.111.H.5.e | CO-1451 | H.5.e covers the application (denial) and the redetermination (closure) | At a change during the period, an unverified element reports `past_due`, which the meaning describes as an application denial. | Report a distinct status, or say in the meaning what `past_due` means at a change. |
| F-29 | P3 | 3.103.S | (none) | State diversion payments of fewer than four consecutive months, and county diversion payments, "are not cash assistance" | They are therefore not excluded by J.26, but they are not in 3.111.I's list either. The volume reads no diversion amount as CCCAP income. Consistent; noted only. | None. |

**Reproductions (scratch copy, `npx vite-node scripts/eval-case.ts co <id> cccap_eligibility_status,cccap_household_income,cccap_parent_fee`).**

| Probe | Engine (p1 / child) | Rule |
|---|---|---|
| RV-A1 | eligible_low_income / eligible_low_income, income 0 | ineligible_activity |
| RV-A2 | eligible_low_income / eligible_low_income | ineligible_activity (3.111.E) |
| RV-B | eligible_low_income | ineligible_activity |
| RV-C | ineligible / ineligible | eligible_low_income |
| RV-D | ineligible_child | eligible_low_income, fee 47 |
| RV-E | income 3,500, ineligible_income | income 2,000, eligible_low_income, fee 47 |
| RV-F | income 2,000, eligible, fee 47 | income 3,500, ineligible_income |
| RV-G | income 2,000, eligible, fee 47 | income 3,500, ineligible_income |
| RV-H | income 300, fee 3 | income 870, fee 8 |
| RV-I | eligible_low_income, fee 47 | not Low-Income eligible (3.115.C) |
| RV-J | eligible_child_welfare; verification past_due (3 pending) | eligible_child_welfare; no activity or income verification |
| RV-K1 | p1 and child eligible (fee 20); p2 ineligible | one household, ineligible (H.5.c) |
| RV-K2 | p1 ineligible; child eligible, fee 47 | ineligible |
| RV-K3 | p1 eligible; child ineligible | eligible for both |
| RV-L | p1 eligible_colorado_works; child ineligible_activity | eligible_colorado_works for both |
| RV-M | ineligible_activity | eligible_homelessness_stabilization, fee 0 |

## 3. Coverage matrix (8 CCR 1403-1, D-87)

Key:
- **C:** carried by the listed items. "C, see F-nn" means carried but with a finding.
- **NA:** not applicable, with the reason.
- **OQ:** an open question records the state choice.
- **GAP:** no item and no recorded reason; the finding gives the priority.

### 3.100-3.102
| Para | Disposition |
|---|---|
| 3.100 Authority | NA: authority statement |
| 3.101 Scope and purpose | NA: purpose statement |
| 3.102 Applicability | NA: applicability statement |

### 3.103 Definitions
| Para | Disposition |
|---|---|
| A Accused individual (1-2) | NA: IPV procedure term |
| B Additional care needs | C: CO-872, CO-4056, CO-1686, CO-1581 |
| C Adult caretaker | C: CO-992, CO-2607, CO-897; OQ-540 (loco parentis); see F-15 |
| D Adverse action | NA: notice procedure |
| E Affidavit; F Applicant | NA: procedural terms |
| G Application (G.1-2) | NA: forms; the application determination is CO-3307 `application` |
| H Application date | C: CO-3910, CO-3911 (anchor of the thirty days); OQ-680 |
| I Application date for pre-eligibility | NA: 3.126 provider pre-eligibility (see F-24) |
| J Application process (J.1-2) | C: CO-1451 (verification); forms NA |
| K Assets (K.1 liquid, K.2 non-liquid; home and car excluded) | C: CO-1741 meaning, CO-1809; see F-02 |
| L Attestation of mental competence | NA: provider-side |
| M ATS; N Authorization; O Authorization start date; P Base reimbursement rate | NA: provider-side, or authorization with no eligibility effect |
| Q Basic education | C: CO-1722 (`basic_education`), CO-2111 |
| R Behavioral Health Administration | C: CO-1516, CO-4074 |
| S Cash assistance (diversion under four months, county diversion: not cash assistance) | NA: no CCCAP item reads a diversion amount as income; see F-29 |
| T Authorization notice; U CHATS; V Child care provider; W CCR&R; X Child care staff | NA: administrative or provider terms |
| Y Child Welfare Child Care | C: CO-2576, CO-989; OQ-710 |
| Z Citizen/legal resident | C: CO-998, CO-1358, CO-506 |
| AA Clear and convincing | NA: IPV standard of proof |
| BB CCCAP (four components) | C: CO-989 statuses |
| CC Colorado Works Program | C: CO-013 |
| DD Colorado Works Child Care | C: CO-988, CO-2709, CO-896; see F-01 |
| EE Colorado Works households (cash or state diversion) | C: CO-988 diversion arm, CO-3931, CO-3932; OQ-682 |
| FF Collateral contact; GG Complaint; HH Confirmed abuse; II Consumer education; JJ County | NA: administrative terms |
| KK County Plan | OQ: OQ-162, OQ-682 (blocked, county plans) |
| LL County Rate Plan | NA: provider rates |
| MM Custody | C: CO-2607, CO-982 (`lives_with`) |
| NN Department | NA |
| OO Disaster; VV Emergency | C: CO-3505 (3.124.I.8 waiver) |
| PP Discovery; QQ Drastic economic change; RR Drop-in day; SS Early care and education provider | NA: administrative or provider terms |
| TT Eligible activity | C: CO-984 |
| UU Eligible child | C: CO-980, CO-4056, CO-998 |
| WW Employment | C: CO-984 (hours, wages) |
| XX Enrollment freeze | NA: enrollment capacity, not eligibility |
| YY Entry income eligibility level | C: CO-870, CO-3004, CO-986; OQ-121 |
| ZZ Equivalent full-time units | C: CO-2864 (supplied), CO-1288 |
| AAA Exit income eligibility level | C: CO-993 |
| BBB Fair market value | GAP: used by I.4, see F-08 |
| CCC Families experiencing homelessness (1-4) | C: CO-2814, CO-2810; see F-13 (campgrounds) |
| DDD Federal poverty level | C: CO-3007, CO-181, CO-182 |
| EEE Fingerprint check; FFF Fiscal agreement | NA: provider-side |
| GGG Fraud (1-3) | C: CO-3906 (3.142 verdicts) |
| HHH Funding concern | NA: funding |
| III Head Start | C: CO-3505 (3.124.G waiver) |
| JJJ High-quality early childhood program | C: CO-1287 |
| KKK Hold slots | NA: provider payment |
| LLL Household | C: CO-982, CO-990, CO-1721, CO-326, CO-327 |
| MMM In loco parentis | C: CO-2607; OQ-540 |
| NNN Incapacitated | C: CO-1744; see F-21 |
| OOO Income eligibility | C: CO-985 |
| PPP Inconsistent | C: CO-1303, CO-1307, CO-1338 |
| QQQ Intentional Program Violation | C: CO-3906 |
| RRR Involuntarily out of the home | C: CO-898; see F-03 |
| SSS Job search | C: CO-871 |
| TTT Low-Income Child Care | C: CO-989; see F-12 |
| UUU Manual claim | NA: provider payment |
| VVV Maternity/paternity leave; WWW Medical leave | C: CO-3903, CO-984, CO-1744 |
| XXX Negative licensing action | NA: provider-side |
| YYY New employment verification | NA: a kind of document (H.5.a.2) |
| ZZZ Non-traditional care hours | C: CO-2397, CO-2398 |
| AAAA Originating county; OOOO Receiving county | GAP: see F-05 (3.125.GG) |
| BBBB Overpayment; QQQQ Recovery | NA: recovery |
| CCCC Parent | C: CO-2607 |
| DDDD Parent fee | C: CO-1290 |
| EEEE Pay stubs | NA: a kind of document |
| FFFF Post-eligibility stabilization period | C: CO-984 (job search at redetermination via CO-2103) |
| GGGG Preponderance; HHHH Primary adult caretaker | NA: standard of proof; the signer |
| IIII Protective Services Child Care | C: CO-873 |
| JJJJ Projections; KKKK Prudent person principle | NA: funding; administration |
| LLLL Qualified exempt facilities; MMMM Qualified exempt provider | C: CO-2394 (immunization trigger) |
| NNNN Rate notification | NA: provider-side |
| PPPP Recipient | NA |
| RRRR Redet form; SSSS Redet process (1-2) | C: CO-3307, CO-1451 |
| TTTT Regionally accredited institution | C: CO-1722; see F-04 |
| UUUU Relative | C: CO-2845 (D.5, immunization) |
| VVVV Risk-based audit | NA |
| WWWW Self-employment | C: CO-1700, CO-1710 |
| XXXX Self-sufficiency standard | OQ: OQ-121 |
| YYYY Slot contracts; ZZZZ Age bands; AAAAA Public benefit | NA: provider or rate terms |
| BBBBB State median income | C: CO-1804, CO-1805 |
| CCCCC Substantiated | NA |
| DDDDD Target population (1-5) | NA: wait-list priority (3.122), not eligibility |
| EEEEE Teen parent | C: CO-981, CO-322, CO-1518 |
| FFFFF Temporary absence or break | C: CO-3903 |
| GGGGG Tiered reimbursement | NA: provider rates |
| HHHHH Timely written notice | NA: notice |
| IIIII Training and post-secondary education (and SUD treatment) | C: CO-1722, CO-4074; see F-04 |
| JJJJJ Transition families | C: CO-3307 `transition_from_colorado_works` |
| KKKKK Undue burden; LLLLL Units | NA |
| MMMMM Up-to-date immunizations | C: CO-2395, CO-4060 |
| NNNNN Voluntarily out of the home | C: CO-991 (still a caretaker); OQ-612 (see F-17) |
| OOOOO Wait list | NA: enrollment capacity |
| PPPPP Willful misrepresentation | NA: recovery and IPV |

### 3.104-3.110
| Para | Disposition |
|---|---|
| 3.104 A-F (appropriations, county plans and disputes) | NA: county funding and plan administration. B.1's exception (the entry floor) is carried by CO-3005 |
| 3.105 A-E (program funding) | NA: funding |
| 3.106 A-C; 3.107 A-C; 3.108 A-E; 3.109 | NA: civil rights, confidentiality, notice, appeal rights |
| 3.110 Low-Income Child Care participants | C: CO-987, CO-989, CO-2108 |

### 3.111 Low-Income Child Care eligibility
| Para | Disposition |
|---|---|
| Intro | C: CO-987 |
| A (verified county residents) | C: CO-2107, CO-1440; see F-02. Second sentence (remain eligible after a county move): see F-05 |
| B.1 activity | C: CO-991, CO-984 |
| B.2 income guidelines | C: CO-2104 |
| B.3 custody | C: CO-982, CO-2607 |
| C intro, C.1, C.1.a-b (application forms) | NA: forms |
| C.1.c Head Start redetermination alignment | GAP: see F-18 |
| C.2.a residence | C: CO-1440, CO-1676, CO-1313 |
| C.2.b, b.1, b.2.a-c child citizenship, age, identity | C: CO-1442 to CO-1444, CO-1678 to CO-1680, attestation facts |
| C.2.c immunizations | C: CO-4060, CO-2395 |
| C.2.d activity | C: CO-1441, CO-1677 |
| C.2.e schedule for non-traditional hours | C: CO-2397, CO-2398, CO-1447, CO-1448 |
| C.2.f income | C: CO-1445, CO-2873, CO-1681, CO-2590 |
| C.2.g incapacitation | C (folded into the fact): CO-1744; see F-21 |
| C.2.h custody arrangement | C: CO-2399 |
| D.1.a one caretaker; voluntary absence; temporary caregivers not members | C: CO-991, CO-982 |
| D.1.b involuntary absence | C: CO-898, CO-991; see F-03 |
| D.1.c.1 both in activity | C: CO-991 |
| D.1.c.2 voluntarily absent, both in activity | C: CO-991 |
| D.1.c.3 one incapacitated | C: CO-991, CO-1744; see F-03 |
| D.2 two caretakers by financial contribution or parental role | GAP: see F-15 |
| D.3 separate applications for shared custody | NA: each household is its own case; custody schedule CO-2399 |
| D.4 every caretaker in an activity has custody and meets guidelines | C: CO-991, CO-982 |
| D.5 unrelated caretaker verification | C: CO-2396, CO-2846 |
| D.6 caretaker not work eligible falls to Low-Income | C: CO-988 (falls through); see F-12 |
| D.7 adoptive parents | C: CO-2607 (`parent` includes adoptive) |
| D.8 maternity/paternity leave | C: CO-984, CO-3903 |
| D.9 medical leave with an open case | C: CO-984, CO-1744, CO-2103 |
| D.10 separated caretaker with a temporary order | C: CO-4063, CO-4064, CO-4070 |
| E incapacitated single caretaker ineligible | C: CO-991; see F-03 |
| F eligible child | C: CO-980, CO-4056, CO-2108, CO-872, CO-320, CO-321 |
| F.1 citizenship verified, identity if inconsistent | C: CO-998, CO-1442 to CO-1444 |
| F.2 immunization record | C: CO-4060, CO-2394, CO-2884; OQ-562 |
| G intro | C: CO-984 |
| G.1.a employment | C: CO-984 |
| G.1.b minimum wage | C: CO-984, CO-160 |
| G.1.c LLC and S-corporation owners are employees | NA: classification on the facts; see F-27 |
| G.2.a expenses verified or not considered | C: CO-1709, CO-3927, CO-4062 |
| G.2.b weekly schedule | C: CO-1447, CO-1448 (self-employment arm) |
| G.2.c income exceeds expenses | C: CO-984 (net at or below 0 fails the wage ratio), CO-1710 |
| G.2.d minimum wage | C: CO-984 |
| G.2.e launch period: activity | C: CO-2113, CO-984 |
| G.2.e launch period: projected income | GAP: see F-11 |
| G.3.a job search, thirteen weeks per instance | C: CO-984, CO-871, CO-2110, CO-2103; OQ-162 |
| G.3.b start of the job search activity | NA: authorization start date |
| G.3.c weeks used | C: CO-2109 |
| G.3.d-e care during job search | NA: authorization amount |
| G.3.f approved while enrolled | C: CO-871, CO-2103 |
| G.3.g ineligible once used | C: CO-984 |
| G.3.h, h.1, h.2 post-eligibility stabilization | C: CO-984 (redetermination reads CO-2103 true) |
| G.4.a.1 post-secondary, 104 weeks | C: CO-1722, CO-2111; OQ-162; see F-04 |
| G.4.a.2 workforce training, 104 weeks | C: CO-1722, CO-1518, CO-2111; OQ-162 |
| G.4.a.3 SUD treatment, one year per instance from 2026-07-01 | C: CO-4074, CO-3905, CO-3904, CO-1517, CO-2112, CO-1516 |
| G.4.b.1 basic education 52 weeks | C: CO-2111; OQ-162 |
| G.4.b.2 teen parents not limited | C: CO-2111 meaning |
| G.4.c a week with one day counts | C: CO-2111, CO-2109 meanings |
| G.4.d enrollment verification; SUD self-attestation | C: CO-1441, CO-4074 |
| G.4.e referral to resources | NA |
| H.1 85% SMI ceiling | C: CO-2104, CO-986, CO-993 |
| H.1.a entry eligibility (185% floor) | C: CO-986, CO-870, CO-3004, CO-3005; OQ-121 |
| H.1.b exit eligibility | C: CO-993, CO-2103, CO-3307 |
| H.2 table through 2026-09-30 | C: CO-1804, CO-1805 (2025-10-01 version), CO-3007 with CO-181 and CO-182 |
| H.3 table from 2026-10-01 | C: CO-1804, CO-1805 (2026-10-01 version), CO-3007 |
| H.4 prior thirty days | C: CO-3910 to CO-3913, CO-3915 to CO-3917; OQ-680 |
| H.4.a-d, f, h other periods | C: CO-3914 |
| H.4.e rental income (self-employment if 20 hours or more; averaging; joint ownership) | C: CO-3914, CO-1714; see F-10 |
| H.4.g inclusions and exclusions used | C: CO-3915, CO-3916 |
| H.4.i lump sums | C: CO-3916, CO-3367, CO-3918, CO-3920; OQ-680 |
| H.5.a.1 earned income, thirty days or twelve months | C: CO-3910, CO-3912, CO-3914 |
| H.5.a.2 new employment verification letter | NA: a kind of document |
| H.5.a.3 self-employment documentation; expenses verified | C: CO-1709, CO-1710, CO-3914 |
| H.5.b unearned income | C: CO-3911, CO-3913, CO-3914 |
| H.5.c assets self-declared, $1M | C: CO-1741, CO-1809; see F-02 |
| H.5.d verbal verification | NA: a kind of document |
| H.5.e.1.a fifteen-day noticing period | C: CO-1450, CO-1354, CO-2120, CO-1451 |
| H.5.e.1.b sixty days, new application | C: CO-1451 (`past_due`) |
| H.5.e.2 redetermination closure | C: CO-1451 (`case_closed`) |
| I intro | C: CO-3917 |
| I.1 gross earnings; minimum wage | C: CO-023, CO-3910, CO-3912, CO-3915, CO-984 |
| I.2 non-farm self-employment | C: CO-1700, CO-1709, CO-1710 |
| I.2.a allowed expenses (1-7) | C: CO-3370, CO-3374 via CO-1709 |
| I.2.b disallowed expenses (1-3) | C: CO-1709 (does not read CO-3372, principal) |
| I.2.c minimum wage; twelve-month average | C: CO-984, CO-3914 |
| I.3, I.3.a-c farm self-employment | GAP: see F-20 |
| I.4 in-kind compensation | GAP: see F-08 |
| I.5 vendor payments as compensation | GAP: see F-08 |
| I.6 railroad retirement | C: CO-026 |
| I.7.a, b, d veterans' pensions and refunds | C: CO-030 |
| I.7.c GI Bill subsistence | C, see F-09 |
| I.8 pensions and annuities (a-e) | C: CO-026, CO-3816; penalties see F-10 |
| I.9-11, 13-16, 19 dividends, interest, estates, royalties, memberships, trusts | C: CO-1714, CO-081 |
| I.12, I.17 net rental income | C, see F-10 |
| I.18 boarders and lodgers | GAP: see F-08 |
| I.20 inheritance, gifts, prizes | C: CO-3916, CO-1181, CO-3367, CO-030 |
| I.21-22 insurance and lawsuit proceeds | C, see F-10 |
| I.23 strike benefits; I.27 workers' compensation; I.28 maintenance; I.30 military allotments; I.33 refugee payments | C: CO-030, CO-1714 |
| I.24 lease bonuses | C: CO-1714 |
| I.25 Social Security before Medicare | C: CO-025, CO-3916 |
| I.26 unemployment | C: CO-027 |
| I.29 child support | C: CO-028 |
| I.31 WIOA wages | C: CO-023 |
| I.32 AmeriCorps and VISTA | C: CO-4016 (VISTA exception, see F-27) |
| J intro | C: CO-3913, CO-3916 |
| J.1 child's earnings | C: CO-3915 |
| J.2 SSI | C: not read by CO-3916 |
| J.3, J.5-9, J.11, J.15, J.21 federally excluded payments | C: CO-3366 |
| J.4 (a-d) nutrition assistance | C: no CCCAP income fact holds benefits in kind |
| J.10 foster, kinship and adoption payments | GAP: see F-07 |
| J.12 LEAP | C: CO-3364 |
| J.13 Social Security under a PASS | GAP: see F-07 |
| J.14 EIC | C: CO-3365 |
| J.16, J.19, J.20 educational grants, loans, work-study, Perkins | C: CO-3360, CO-3361, CO-3912; see F-09 |
| J.17, J.18 WIA training allowances; youth projects | GAP: see F-07 |
| J.22 R&P vendor payments | NA: not a receipt to the household |
| J.23 Colorado Works supportive services | GAP: see F-25 |
| J.24 Home Care Allowance | GAP: see F-07 |
| J.25 loans | C: CO-3362 |
| J.26 public cash assistance | C: `tanf_cash_income`, `adult_financial_cash_income` not read; CO-3920 |
| J.27 settlement reimbursements | C: CO-3363 |
| J.28 irregular income under $90 a quarter | C: CO-4075 to CO-4077; OQ-713 |
| J.29 research-study income | GAP: see F-25 |
| K.1 (a-b) court-ordered current support deducted | C: CO-3902, CO-033, CO-3900, CO-3901, CO-985, CO-2578 |
| K.2.a-b verification of the order and payment | C: CO-1363, CO-1446, CO-1683 |
| K.2.c verification at approval and each redetermination | C: CO-1446, CO-1688, CO-1451 (`deduction_disallowed`) |

### 3.112-3.114
| Para | Disposition |
|---|---|
| 3.112.A sign; verify income | C: CO-1451 (verification); signature NA |
| 3.112.B agree to pay the fee | NA |
| 3.112.C reporting (10 days, 4 weeks) | NA: reporting duty (recovery under 3.145) |
| 3.112.C.1-4 temporary breaks | C: CO-3903, CO-984 |
| 3.112.D immunization | C: CO-4060 |
| 3.112.E provider change | NA |
| 3.112.F schedule verification | C: CO-2397, CO-2398 |
| 3.112.G child citizenship, age, identity | C: CO-1442 to CO-1444 |
| 3.112.H thirty-day reopening after closure | NA: start date of resumed care |
| 3.112.I attendance credentials | NA: provider disqualification |
| 3.112.J ATS non-cooperation closure | GAP: see F-19 |
| 3.113.A no earlier than twelve months; forms; failure to return | C: CO-3307, CO-1451 (`case_closed`) |
| 3.113.A.1.a.1-3 earned and self-employment income at redetermination | C: CO-3910 to CO-3915, CO-1709 |
| 3.113.A.1.b unearned | C: CO-3911, CO-3913 |
| 3.113.A.1.c schedule | C: CO-2397, CO-2398 |
| 3.113.A.1.d assets | C: CO-1741; see F-02 |
| 3.113.A.2 training documentation | C: CO-1441 |
| 3.113.A.3 immunization | C: CO-4060 |
| 3.113.A.4 (a-d) collateral contacts | NA: kinds of document |
| 3.113.B fee review (thirty days, 4.33 weekly) | C: CO-1290, CO-2578; the 4.33 conversion is NA (county method) |
| 3.113.C Head Start alignment | GAP: see F-18 |
| 3.114.A.1 over 85% SMI during the period | C: CO-993, CO-2104 |
| 3.114.A.2 no longer a state resident | C: CO-505 via CO-2107; see F-05 |
| 3.114.A.3 job search expired | C: CO-984, CO-2109 |
| 3.114.A.4 minimum wage | C: CO-984 |
| 3.114.A.5 unexplained absences | C: CO-4055, CO-989; OQ-711 |
| 3.114.A.6 IPV | C: CO-3906 |
| 3.114.B.1 age limits (redetermination only) | C: CO-4056, CO-980; see F-06 |
| 3.114.B.2 parent fees unpaid | C: CO-4054 |
| 3.114.B.3 time limits (redetermination only) | C: CO-2111; see F-06 |
| 3.114.B.4 redetermination requirements | C: CO-1451 |
| 3.114.B.5 not in an activity | C: CO-991 |
| 3.114.B.6 became a Colorado Works participant | GAP: see F-12 |
| 3.114.B.7 immunization records | C: CO-4060; see F-06 |
| 3.114.B.8 county or state residency | C: CO-2107 |
| 3.114.B.9 minimum wage | C: CO-984 |
| 3.114.B.10 over 85% SMI | C: CO-993 |
| 3.114.B.11 absences at redetermination | C: CO-4055 |
| 3.114.C closure form; D thirty days to correct; E voluntary withdrawal | NA: notice, reopening, withdrawal |

### 3.115-3.117 Colorado Works Child Care and transition
| Para | Disposition |
|---|---|
| 3.115.A work-eligible, approved for Colorado Works; twelve months; freeze | C: CO-988; see F-01. Freeze NA |
| 3.115.B, B.1-3, B.5 referral form | NA: form handling |
| 3.115.B.4 transition | C: CO-3307 |
| 3.115.C not work eligible and not in the assistance unit | GAP: see F-12 |
| 3.116.A plan, activity, referral; twelve months | C: CO-988, CO-896, CO-2709 |
| 3.116.B twelve-month authorization | NA: authorization |
| 3.116.C, C.1-2 earned income only | C: CO-2578, CO-2873; see F-23 |
| 3.116.D schedule from the referral | NA |
| 3.116.E residency verified by Colorado Works | C: CO-1440 |
| 3.116.F citizenship, age, identity by the referral | C: CO-1442 to CO-1444 (attestation not questionable) |
| 3.116.G immunization | C: CO-4060 |
| 3.116.H state diversion households (county option) | C: CO-988, CO-3931, CO-3932; OQ-682 |
| 3.116.I-L notices, provider changes, client agreement, moves | NA: administration |
| 3.117 intro: transition without an application | C: CO-3307, CO-2103 |
| 3.117.A.1 Colorado Works IPV | C: CO-989, CO-1730 |
| 3.117.A.2 over 85% SMI | C: CO-2104, CO-993 |
| 3.117.A.3 absences | C: CO-4055 |
| 3.117.B no further verification until redetermination | C: CO-1451 (`not_required`) |
| 3.117.C transition in an activity | C: CO-984 |
| 3.117.D job search for thirteen weeks | C: CO-871, CO-984 |
| 3.117.E income increase not acted on | C: CO-4052 (fee); eligibility follows A.2 |
| 3.117.F fee no higher than at the referral | C: CO-4052, CO-4050 |
| 3.117.G twelve-month authorization | NA: authorization |
| 3.117.H Low-Income requirements apply | C: CO-989 |
| 3.117.I client agreement | NA |
| 3.117.J back to Colorado Works Child Care | C: CO-988 |

### 3.118-3.121 Protective services, Child Welfare, homelessness
| Para | Disposition |
|---|---|
| 3.118.A protective services households | C: CO-873 |
| 3.118.B twelve-month authorization | NA: authorization |
| 3.118.C not 24-hour care | C: CO-4056 (part-day need) |
| 3.118.D school-day services | NA: authorization content |
| 3.118.E, E.1-5 referral form | NA: form handling |
| 3.119.A household of one; children's income; no child support | C: CO-994, CO-995, CO-3008, CO-2578; OQ-536 |
| 3.119.B sixty days for the children's income | C: CO-4057, CO-4061; OQ-716 |
| 3.119.C income requirement waived (county plan) | C: CO-4053 |
| 3.119.D no activity requirement | C: CO-989 (row before the activity test), CO-1441 |
| 3.119.E no residency verification | C: CO-1440 |
| 3.119.F, F.1-3 citizenship, age, identity (six months) | C: CO-4059, CO-4061, CO-1442 to CO-1444; OQ-716 |
| 3.119.G sixty days for immunization | C: CO-4058, CO-4060, CO-4061 |
| 3.119.H extra absences paid | NA: provider payment |
| 3.120.A Child Welfare Child Care | C: CO-2576, CO-989 |
| 3.120.B not 24-hour care | C: CO-4056 |
| 3.120.C school-day services | NA |
| 3.120.D eligibility by the Child Welfare division (12 CCR 2509-4 7.302) | C: CO-2576; OQ-710 (see F-16); verification see F-14 |
| 3.120.E no residency verification | C: CO-1440 |
| 3.120.F not CCDF-funded | C: CO-4056 (no citizenship test); OQ-710 |
| 3.121.A definition | C: CO-2814; see F-13 |
| 3.121.B stabilization period of at least sixty days | C: CO-3907, CO-2577, CO-989 |
| 3.121.B.1 verification within the period | C: CO-3909, CO-3908, CO-1451 |
| 3.121.B.2 not recoverable | NA: recovery |
| 3.121.B.3.a no activity required | C: CO-989 |
| 3.121.B.3.b sixty days for activity verification | C: CO-3909 |
| 3.121.B.4.a self-declared residency | C: CO-1440 |
| 3.121.B.4.b mailing address | NA |
| 3.121.B.5, 5.a, 5.b(1-3) self-declared child facts | C: CO-1442 to CO-1444 |
| 3.121.B.6 no immunization record | C: CO-4060, CO-1447, CO-1448 |

### 3.122-3.124
| Para | Disposition |
|---|---|
| 3.122.A-D (wait lists, priorities, decision process) | NA: enrollment capacity. A family on a wait list is eligible; target populations order enrollment |
| 3.123.A-E (enrollment freezes) | NA: enrollment capacity |
| 3.124.A income compared with size; drop the cents; notices | C: CO-3508, CO-1290, CO-2578. Notices NA |
| 3.124.B, B.1-4 fee revisions during the period | C: CO-4052, CO-4051; OQ-712 |
| 3.124.C cap at the last determination | C: CO-4052, CO-4050 |
| 3.124.D review at redetermination; thirty days; 4.33 | C: CO-985, CO-2578; 4.33 NA (county method) |
| 3.124.E, F Colorado Works fee on verified gross countable income | C: CO-2578 |
| 3.124.G Head Start dual-enrollment waiver | C: CO-3505 |
| 3.124.H 20% quality reduction | C: CO-3508, CO-1287, CO-3002; see F-22 |
| 3.124.I intro | C: CO-1290 |
| 3.124.I.1 teen-parent hardship waiver | C: CO-2575 |
| 3.124.I.2 quality reduction | C: CO-3508 |
| 3.124.I.3 Colorado Works, unpaid activity: no fee | C: CO-1290 |
| 3.124.I.4 Child Welfare Child Care: no fee | C: CO-1290, CO-2576 |
| 3.124.I.5 homelessness stabilization: no fee | C: CO-1290, CO-3907 |
| 3.124.I.6 protective services: fee only on the children's income | C: CO-1290, CO-2578; OQ-536 |
| 3.124.I.7 no income, no fee | C: CO-1290 |
| 3.124.I.8 disaster waiver | C: CO-3505 |
| 3.124.J fee effective date; not retroactive | NA: timing of the notice |
| 3.124.K paid to the provider; L split between providers, not above the reimbursement rate; M informed | NA: payment mechanics, provider rate |
| 3.124.N, N.1-3 ineligible for unpaid fees | C: CO-4054, CO-989 |
| 3.124.O fifteen days' notice | NA |
| 3.124.P, P.1-2 formula through 2028-07-31 | C: CO-1289, CO-1284, CO-2115 to CO-2117 |
| 3.124.P.3 $15 per additional child | C: CO-1286, CO-2579 |
| 3.124.Q formula from 2028-08-01 | C: CO-1289, CO-2115 to CO-2119; OQ-254 |
| 3.124.R FPG and SMI per 3.111.H; update at redetermination | C: CO-3007; see F-26 |
| 3.124.S $5 hardship reduction | C: CO-3506, CO-3507 |
| 3.124.T Department notifies counties each federal fiscal year | C: CO-3006, CO-3007 |
| 3.124.U part-time care at 55% | C: CO-1288, CO-2864, CO-3003 |
| 3.124.V fluctuating part-time and full-time | C: CO-2864 (stated authorization) |
| 3.124.W grades 1-12 part-time | C: CO-2864 meaning |
| 3.124.X teen-parent hardship waiver | C: CO-3505 |

### 3.125 County responsibilities
| Para | Disposition |
|---|---|
| A-P (allocations, contracts, controls, forms, training, CHATS, overrides, records, posting, consumer education P.1-6) | NA: county administration |
| Q, Q.1-6 minimum twelve-month eligibility and its closed list of reasons | C: CO-989, CO-993, CO-505, CO-984, CO-4055, CO-3906; see F-05, F-06 |
| R, S wait-list policies | NA |
| T, T.1-3 fifteen days; applications valid sixty days | C: CO-1450, CO-1451. T.2 start date NA |
| U misdirected applications | NA |
| V information from other programs | NA: data source (the electronic-source facts) |
| W immunization | C: CO-4060 |
| X collateral contact | NA |
| Y, Y.1-3 preponderance of evidence; inconsistency | C: CO-1442 to CO-1444 |
| Z no SSNs required | C: no CCCAP item reads an SSN fact |
| AA prudent person principle | NA |
| BB, BB.1-2 residence verification (documents) | C: CO-1440, CO-1313. Document list NA |
| CC SUD self-attestation | C: CO-1441, CO-4074 |
| DD, DD.1-2 reporting responsibilities | NA: reporting duty |
| EE, EE.1.a-e, EE.2 changes acted on during the period | C: CO-3307 (`change_during_eligibility_period`); see F-06 |
| FF new child: align the redetermination | GAP: see F-18 |
| GG, GG.1-4 move to another county during the period | GAP: see F-05. GG.1 provider agreements NA; GG.3 receiving county's activities OQ-162 |
| HH requests from agencies | NA |
| II redetermination: fifteen days | C: CO-1451 |
| JJ information from other sources | NA |
| KK 20% quality reduction | C: CO-3508 |
| LL, LL.1-3 unpaid fees acted on at redetermination | C: CO-4054 |
| MM, NN authorization by need; Head Start blending | NA: authorization |
| OO Head Start alignment | GAP: see F-18 |
| PP, PP.1-3 school-day services | NA: authorization |
| QQ, RR authorization start dates | NA |
| SS notices | NA |
| TT thirty-day correction; withdrawal and re-request | NA: start date of resumed care |
| UU-SSS (ATS registration, provider information, exempt-provider checks, fiscal agreements, rates, claims, audits, fraud referral, recoveries) | NA: provider-side, fiscal or recovery |

### 3.126 Pre-eligibility determinations
| Para | Disposition |
|---|---|
| Intro, A, B.1-2, D-G | NA: provider reimbursement before the determination (county option) |
| C thirty days for documents | GAP: see F-24 |

### 3.127-3.134 Provider side
| Para | Disposition |
|---|---|
| 3.127 Eligible facilities | NA: provider eligibility |
| 3.128 Child care provider responsibilities | NA: provider duties |
| 3.129 Complaints about providers | NA: provider complaints |
| 3.130 Reimbursement rates | NA: provider rates |
| 3.131 Slot contracts | NA: provider contracting |
| 3.132 A-I Arrangement for services | NA: authorization and payment (the D-E ages agree with CO-4056) |
| 3.133.A.1-3, B ATS | NA: attendance billing |
| 3.133.A.4 ATS non-cooperation closure | GAP: see F-19 |
| 3.134 Fiscal agreement authority | NA: provider agreements |

### 3.135-3.147 Program integrity
| Para | Disposition |
|---|---|
| 3.135, 3.136, 3.137 A-E, 3.138 A-D | NA: investigation and hearing procedure; the finding is CO-3906 |
| 3.139.A start the month after; B runs without interruption; C.1-3 twelve, twenty-four months, permanent; D every household; E until reversed; F across counties; G in addition to court penalties | C: CO-3906, CO-989 |
| 3.140 A-C notification of the decision | NA |
| 3.141 A-D referral to the District Attorney | NA |
| 3.142 A-C criminal verdict disqualification | C: CO-3906 |
| 3.143.A penalties follow the person | C: CO-3906 |
| 3.143.B providers | NA |
| 3.144 hearing rights | NA |
| 3.145-3.147 recovery | NA: recovery |

**Matrix size:** 399 rows, covering every paragraph of §§ 3.100-3.147. Some rows group sibling subparagraphs with the same disposition (for example "I.9-11, 13-16, 19"), so the paragraph count is higher than the row count.

| Disposition | Rows |
|---|---|
| Carried | 229 |
| Carried with a finding | 38 |
| Not applicable | 106 |
| Open question only | 2 (3.103.KK, XXXX) |
| GAP | 24, every one with a finding: F-05, F-07, F-08, F-11, F-12, F-15, F-18, F-19, F-20, F-24, F-25 |

## 4. Open-question confirmations

| OQ | Class | Confirmed? |
|---|---|---|
| OQ-121 (county entry limits) | blocked: CDEC's county levels (cdec.colorado.gov) | Yes. 3.111.H.1.a states no county figure; CDEC is not an allowed host. |
| OQ-162 (county plans: longer job search, education weeks) | blocked: county plans | Yes. 3.104 plans are not published on an allowed host. Should also carry 3.112.J and 3.133.A.4 (F-19). |
| OQ-163 (K-9, teen parent living with her own parent) | state policy choice | Yes. 3.103.C, LLL, EEEEE and 3.111.D do not settle it. |
| OQ-254 (post-2028 band edges) | state policy choice | Yes. 3.124.Q states whole percentages only. |
| OQ-536 (base of a protective services fee) | state policy choice | Yes. 3.124.I.6 and 3.119.A state no base. |
| OQ-540 (loco parentis versus primary responsibility) | state policy choice | Partly. The class stands, but the Checked line omits 3.111.D.2 (F-15), which speaks directly to a second caretaker by financial contribution. |
| OQ-562 (CDE "attending school") | blocked: CDE definition | Yes. cde.state.co.us is not an allowed host. |
| OQ-612 (temporary absence) | state policy choice | Partly. The class stands; the Checked line omits 8 CCR 1403-1 3.111.D.1.a and 3.103.NNNNN (F-17). |
| OQ-680 (anchor of the thirty days; lump sum) | state policy choice | Yes. H.4-5, I.20 and 3.124.D have no anchor. |
| OQ-682 (counties providing Colorado Works Child Care to diversion households) | blocked: county elections | Yes. |
| OQ-710 (Child Welfare Child Care and the eligible child) | state policy choice | The class stands after reading 12 CCR 2509-4 7.302 (no ages; 7.302.2.G "Follow State rules for ... CCCAP"). The Checked line wrongly treats 7.302 as unavailable: sos.state.co.us serves it (ruleId 2823, version 12039). Texts were not all checked (F-16). |
| OQ-711 (absences: child or case) | state policy choice | Yes. |
| OQ-712 (permitted increase and the cap) | state policy choice | Yes. |
| OQ-713 (J.28 by month or thirty days) | state policy choice | Yes. |
| OQ-716 (start of the protective services periods) | state policy choice | Yes. |

No open question is misclassified between "blocked" and "state policy choice". F-12 (3.115.C against D.6) and F-15 (D.2) are gaps that may be closed with a new or extended open question rather than an item.

## 5. Earlier P1s (spot-check)

From `final-cccap-leap-sebt.md` and `final2-cccap-leap-sebt.md`:

| Earlier P1 | Status |
|---|---|
| F-01 (3.111.K deduction) | Holds: CO-3902; CO-125 gives income 2,800, fee 101. |
| F-02 (homelessness pathway) | Holds: the row exists. F-13 is a new gap in the definition. |
| F-03 (Child Welfare Child Care) | Holds. |
| F-04 (leave) | Holds. |
| F-05 (job search not at application) | Holds: CO-08 gives `ineligible_activity`. |
| F-06 (SUD instance) | Holds: CO-3905. |
| F-07 (IPV) | Holds. |
| F-08 (Colorado Works fee on earned income) | Holds: CO-2578. |
| F-09 (thirty days) | Holds. |
| F-11 (prizes and lump sums) | Holds: CO-3916. |
| N-1 (fee cap) | Holds: CO-133 fee 47. |
| N-2 (protective services children's income) | Holds: CO-134, both members `eligible_protective_services`, fee 3. |
| N-3 (eligible-child row order) | Holds. |
| N-4 (unpaid fees; absences) | Holds. |
| N-5 (unverified self-employment costs) | Holds: CO-1709. |
| N-6 (protective services due dates) | Holds: CO-4061. |
| N-7 (spouse join; D.10) | Holds: CO-982, CO-4064. |
| N-10 (protective services income waiver) | Holds: CO-4053. |

No regression in the four stored cases recomputed (CO-08, CO-125, CO-133, CO-134 match their expectations).

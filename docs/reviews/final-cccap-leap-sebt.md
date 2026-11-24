# Final verification pass: CCCAP, LEAP and SUN Bucks (family `cccap-leap-sebt`)

Reviewer: independent final pass (brief: `brief-final.md`), 2026-11-22.
Commit reviewed: `80f2e9e` (branch `ccr-9d19bf4c-wmnwcl`).
Governing text read for this pass:
- CCCAP: 8 CCR 1403-1, version effective 2026-08-14 (D-87), §§ 3.103, 3.109-3.124, 3.139.
- LEAP: 9 CCR 2503-7, version effective 2025-11-01 (D-86), §§ 3.750-3.758, plus the amendments effective 2026-11-01 (D-173).
- SUN Bucks: 7 CFR part 292 (D-88), 292.14 (D-117) and 245.2 (D-187). I also fetched 7 CFR 245.6 from eCFR (versioner, 2026-11-19) to read 245.6(b)(7) and (c)(5)(i).
- Figures: the FNS 2026 Summer EBT benefit notice (D-89) and the CDHS LEAP 2026-2027 income table (D-144).

Method: I read the rule text myself and did not rely on earlier reviews. I checked items against the YAML in `volumes/co/{childcare,energy,sunbucks,parameters,supplied,shared}`. I regenerated the ledger with `npm run export -- --volume co` and recomputed three stored cases by hand, comparing each with `scripts/eval-case.ts`.

## 1. Summary verdict

**13 P1 found.** The family is not complete under the stopping rule.

- **CCCAP (9 P1).** The eligibility outcome has no row for three pathways the rule provides: families experiencing homelessness during the stabilization period (3.121), Child Welfare Child Care (3.120), and caretakers on verified maternity, paternity or medical leave (3.111.D.8-9).
  - The 3.111.K child support deduction is not applied to income.
  - Job search counts at an initial application. As a result, stored case CO-08's CCCAP expectation is wrong.
  - The substance use disorder treatment activity ends for everyone in July 2027.
  - A disqualification for an intentional program violation (3.139) is not read.
  - The Colorado Works Child Care parent fee counts unearned income, which 3.116.C excludes.
  - SW-35 (the prior-thirty-day income period) is **P1**. See F-09.
- **LEAP (3 P1).** SSI is not counted as income, lump sums and prizes are mishandled, and four 3.754.1 denial factors are not modeled. The lump-sum and prize finding also covers CCCAP.
- **SUN Bucks (1 P1, narrow).** Categorical eligibility is read from any member of the economic unit who receives SNAP or TANF. The rule reads it from a child.
- **Elements.** Every identifier the family's 37 outcomes read resolves to a defined item, except the built-in `relationships` input.
- **Open questions.** Every open question in scope carries a defensible Class line. One Checked line needs an extra citation (OQ-163, see section 6).

## 2. Findings

Priorities: P1 means a wrong eligibility or benefit answer, a missing pathway, an undefined element, or an unmodeled verification requirement. P2 is a maintainability or approval risk. P3 is a note.

| ID | Pri | Item(s) | Governing excerpt | What is wrong | Proposed fix |
|---|---|---|---|---|---|
| F-01 | P1 | CO-985 `cccap_household_income`; CO-2578 `cccap_parent_fee_income`; CO-986, CO-993, CO-1289 | 8 CCR 1403-1 3.111.K.1 (D-87): "Verified court-ordered child support payments for children not living in the household shall be deducted prior to applying the monthly gross income to the maximum gross monthly income guidelines and when calculating parent fees." | No item subtracts child support paid. CO-985's own precision says "Does not apply the child-support-paid adjustment of 3.111.K". OQ-162 hands the deduction to OQ-390, and OQ-390 (resolved) never mentions it. The verification half is modeled (CO-1446, CO-1683, CO-1688, status `deduction_disallowed`), but the deduction it gates is not. A household paying $400 a month in current court-ordered support is tested and charged on $400 too much income. | Add `cccap_child_support_paid_deduction`: the sum over the household's caretakers of `child_support_paid_legally_obligated` (current, court-ordered, not arrears, for a child outside the household), when `child_support_paid_is_verified`, otherwise 0. Subtract it in CO-985 (floor 0) so that eligibility (CO-986, CO-993) and the fee (CO-2578) both read it. Restate the fact's meaning if "current order, not arrears" is not already in it. Add tests: verified, unverified, and arrears only. |
| F-02 | P1 | CO-989 `cccap_eligibility_status`, CO-991, CO-987; CO-2577, CO-2814 | 3.121.B: households that meet the definition "must be provided a child care authorization during a stabilization period, which is at least sixty (60) consecutive calendar days"; 3.121.B.3.a: "The adult caretaker(s) or teen parent(s) is not required to participate in a low-income eligible activity during the stabilization period." | The homelessness facts (CO-2814, CO-2577) are read only by the parent fee (CO-1290). CO-1290 first returns 0 for any status other than `eligible_*`. A family experiencing homelessness in its stabilization period with no caretaker in an activity is `ineligible_activity`, although the rule requires an authorization. The 3.121.B.4-6 verification relaxations are not modeled either: residency is self-declared, citizenship, age and identity are self-declared, and immunization is not required during the period. | Add a CO-989 row before the activity row: `[all, cccap_is_in_homelessness_stabilization_period, cccap_is_family_experiencing_homelessness, <eligible child exists>] -> eligible_homelessness_stabilization` (a new option). Have CO-1290 accept the new status. In CO-1440, CO-1441, CO-1442 to CO-1444 and the immunization row, add "not during the stabilization period". Set the verification due date to the period's end (3.121.B.1). |
| F-03 | P1 | CO-989; CO-2576 `cccap_is_child_welfare_child_care_household`; CO-1290 | 3.120.A: "Child Welfare Child Care is used as a temporary service to maintain children in their own homes or in the least restrictive out-of-home care setting ..."; 3.120.D: "Eligibility for Child Welfare Child Care is determined on a case-by-case basis by the Child Welfare division using the criteria outlined in ... 12 CCR 2509-4, rule section 7.302"; 3.124.I.4: such households "shall not have a parent fee". | The rule provides a CCCAP category whose eligibility is a finding made outside this volume (convention rule 13(i)). The volume has that finding (CO-2576) but no eligibility outcome for it. A Child Welfare Child Care household that does not also pass Low-Income tests gets `ineligible_*`, and CO-1290's I.4 branch can never be reached (its first row returns 0 for a non-`eligible_*` status). | Add a CO-989 row `[cccap_is_child_welfare_child_care_household, eligible_child_welfare]` with a new option. Have CO-1290 treat that status as fee 0 (I.4). Exempt it from residency verification (3.120.E). |
| F-04 | P1 | CO-984 `cccap_caretaker_in_eligible_activity`, CO-991 | 3.111.D.8: "Adult caretaker(s) or teen parent(s) who are participating in a low-income eligible activity and go on temporary verified maternity/paternity leave." D.9: the same "with an open and active Low-Income Child Care case who ... go on temporary verified medical leave and are unable to care for their children." 3.112.C: a temporary break "includes but is not limited to" seasonal interruptions, verified medical leave, verified maternity or paternity leave, and holidays or scheduled breaks in education. | No fact or item states leave or a temporary break (searched for maternity, paternity, leave, seasonal and temporary break in every CCCAP item). A caretaker on unpaid maternity leave has `hours_worked` 0, fails CO-984, and makes the household `ineligible_activity`. These are eligible household compositions the rule lists. | Add neutral or CCCAP facts `cccap_caretaker_on_verified_leave_type` (none, maternity_paternity, medical) and `cccap_activity_in_temporary_break` (3.112.C), and make CO-984 true while either applies, with D.9's open-case condition read from `cccap_is_receiving_assistance`. Add a verification element for the leave ("verified"). |
| F-05 | P1 | CO-984 (job-search arm); CO-871 `cccap_is_in_job_search_activity`; case CO-08 | 3.111.G.3.a: "Job search child care is available to eligible adult caretakers or teen parents that met the eligibility criteria on the most recent eligibility determination ... for each instance of non-temporary cessation of activity (per rule section 3.112(C))"; G.3.f: "Job search child care shall be approved in each instance of non-temporary job loss or when adult caretakers or teen parents end their low-income eligible activity while enrolled in the Low-Income program." | CO-984 counts job search with no condition on enrollment, and CO-871's meaning requires only "a non-temporary cessation of another eligible activity". At an initial application there is no earlier determination the caretaker met, so G.3 does not make job search an activity. Transition from Colorado Works (3.117.D) is the one stated entry route. **CO-08** (determination type `application`; p2 laid off in November, in job search) expects `eligible_low_income`. Under G.3, p2 is not in an activity, is neither incapacitated nor involuntarily absent, and 3.111.D.1.c needs both caretakers active, so the result is `ineligible_activity`. | Condition the job-search arm on `cccap_is_receiving_assistance` (CO-2103) or a new `cccap_is_transitioning_from_colorado_works` (3.117.D). Restate CO-871's meaning ("while enrolled, or on transition from Colorado Works Child Care"). Change CO-08's CCCAP expectation, or make it a redetermination. If the owner reads G.3.a as allowing job search at application, record that as a state policy choice with this excerpt. |
| F-06 | P1 | CO-984 (SUD arm); CO-1517 `cccap_sud_treatment_activity_start_date`; CO-2112; test CO-984-T14 | 3.111.G.4.a.3: "Effective July 1, 2026, an adult caretaker enrolled in a licensed ... substance use disorder treatment program ... is eligible for CCCAP for up to one (1) year per instance." | CO-1517 is the rule's effective date (2026-07-01), and CO-984 counts twelve months from that date: `["<", month, months_after(12, month_of(CO-1517))]`. Every instance therefore ends on 2027-06-30, whenever it began. CO-984-T14 expects `false` for July 2027, so the test fixes the error in place. An instance that starts in May 2027 gets two months, not a year. | Add a supplied `cccap_sud_treatment_instance_start_date` (per caretaker). Count twelve months from the later of it and CO-1517. Keep CO-1517 as the "not before" date. Fix T13 and T14 and add a test for an instance that starts in 2027. |
| F-07 | P1 | CO-989 / CO-987 (no item) | 3.114.A.6: terminate when "The adult caretaker(s) or teen parent(s) has been disqualified due to a founded Intentional Program Violation"; 3.139.C: twelve months, twenty-four months, then permanently; 3.139.D: "The disqualification penalties affect any household to which the adult caretaker(s) or teen parent(s) is a member." | No CCCAP item reads a disqualification. SNAP (CO-039) and Colorado Works (CO-1730) have their own. A household with a disqualified caretaker is found eligible. | Add a supplied `cccap_is_serving_ipv_disqualification` (a finding under 3.135-3.143, recorded in CHATS) and a CO-989 row (`ineligible_disqualified`) for any caretaker or teen parent in the household. |
| F-08 | P1 | CO-2578 `cccap_parent_fee_income`; CO-1290 | 3.116.C: "only earned income that is reported and verified by the county Colorado Works worker will be considered countable income for Colorado Works Child Care cases"; 3.124.E: "Colorado Works households in a paid employment activity shall pay parent fees based on gross countable income as verified and shared by the local Colorado Works program." | For `eligible_colorado_works`, CO-2578 applies the fee formula to `cccap_household_income`. That figure includes Social Security, unemployment, child support received and other unearned income. A Colorado Works household with earnings and a child's survivor benefit pays a fee on income the rule does not count. | Add a CO-2578 branch: for `eligible_colorado_works`, the household's earned income only (wages plus CCCAP self-employment income, under the J.1 household-child exclusion). |
| F-09 | **P1 (SW-35)** | CO-985; CO-1002 `leap_household_income`; every person-month income fact | CCCAP 3.111.H.4: "Generally, the expected monthly income amount is based on the income received in the prior thirty (30) day period"; H.5.a.1: "For ongoing employment, income received during the prior thirty (30) day period **shall be used in determining eligibility** unless, on a case-by-case basis, ..."; H.5.b (unearned, the same); 3.124.D (fee: "an average of at least the past thirty (30) days gross income"). LEAP 3.751.1 "Income Verification Period": "from the date of application to the same date of the prior month"; 3.752.22.A-B: unearned income "received in the income verification period"; "earned ongoing income shall be the countable gross income in any four (4) weeks of the eight (8) weeks prior to the application date"; C.1: weekly pay is "Adding four gross weekly income amounts"; bi-weekly is "Adding two". | **Decision: P1.** Both rules name the period as the input to the eligibility test ("shall be used in determining eligibility"), so it is an element the rule reads, not fact assembly. The volume has no such element. CCCAP reads the calendar month being evaluated, which is the determination month and has not yet ended at a determination on its first day. LEAP reads the calendar month containing the application date. The neutral facts are calendar-month receipts that SNAP and others also read, so one case cannot be right for both programs when pay dates straddle a month boundary or income changes in the determination month. Example: a weekly earner of $500 is $2,000 for LEAP (C.1, four times weekly) but $2,500 in a five-Friday calendar month. For CCCAP, a job that ended in the determination month changes the result, against the rule's default of the prior thirty days. CO-1002's `assumption` (CDHS N-2 accepted the simplification) records the gap but does not close it, and it is not a state policy choice: the text is explicit. The audit had SW-35 as P2; the rule text makes it P1. No stored case changes (all use constant month defaults). | Add neutral per-person facts for receipts in the thirty days before the determination date: `earned_income_received_prior_thirty_days` and `unearned_income_received_prior_thirty_days` (or dated receipts, as SW-35 proposed). Add `cccap_expected_monthly_income`, which reads them unless a county-chosen period applies (H.4.a-i, a supplied `cccap_income_averaging_period_amount` when the county finds the thirty days not representative). Add `leap_countable_monthly_income` per 3.752.22.A-C (four of eight weeks, weekly x 4, bi-weekly x 2, semi-monthly x 2). CO-985 and CO-1002 read these in place of the calendar-month facts. |
| F-10 | P1 | CO-1002 `leap_household_income`; CO-2874 `leap_has_countable_unearned_income` | 9 CCR 2503-7 3.752.21.I: "Supplemental Security Income (SSI) benefits received by an applicant or recipient shall be considered income in the month received"; 3.752.211.I (SSI is a countable periodic payment). 3.752.23 excludes only retroactive lump-sum SSI (EE). | `ssi_income` (CO-849) is a separate fact (`adult_financial_cash_income`'s precision: "Not SSI (ssi_income, CO-849)"). CO-1002 sums eleven sources and leaves it out. CO-1002's tests even state `ssi_income: 0`. An SSI recipient's household income is understated for the 60% SMI test and for the Step D band. The SSI verification of 3.755.21.A is also never required. | Add `[of, [P], ssi_income]` to CO-1002 and CO-2874 (dropping cents per 3.752.21.I if the owner wants it; see F-17). Add a test with SSI income. |
| F-11 | P1 | CO-985, CO-1002, CO-2344, CO-2345; facts CO-1181 `lottery_gambling_winnings_received`, `lump_sum_received` | CCCAP 3.111.I.20 "Inheritance, gifts, and prizes" (countable); H.4.i: "Non-recurring lump sum payments ... may be included as income in the month received or averaged over a twelve (12) month period, whichever is most beneficial for the recipient." LEAP 3.752.21.A "Inheritance, gifts, and prizes" (countable); 3.752.23.EE excludes "non-recurring lump sum payments for income tax refunds, rebates, or credits; retroactive lump-sum social security, SSI, and public assistance payments." | (a) Prizes: `other_unearned_income_nontaxable` says lottery and gambling winnings "have their own facts (CO-1181 ...)". Neither CCCAP nor LEAP reads CO-1181, so a prize both rules count is dropped. `lump_sum_received` says the opposite (a lottery win paid at once is part of other_unearned_*), so the facts' meanings conflict. (b) CCCAP counts a lump sum in the month received, never the more favourable twelve-month average H.4.i requires. (c) LEAP counts a retroactive Social Security, SSI or public assistance lump sum (inside other_unearned_* per `lump_sum_received`'s precision) that EE excludes; `leap_excluded_income` subtracts only tax refunds. | Resolve the meaning conflict: winnings are only in CO-1181, and `lump_sum_received` says so. Have CCCAP and LEAP read CO-1181. Split `lump_sum_received` by type (or add `retroactive_benefit_lump_sum_received`) and subtract the retroactive part in `leap_excluded_income`. In CCCAP, count a non-recurring lump sum at the lower of the amount received and one twelfth of it. |
| F-12 | P1 | CO-1007 `leap_is_eligible` | 3.754.1: "Any of the following factors shall be the basis for the denial of an applicant household: ... F. The household has received Heating Fuel Assistance Program benefits from another county; ... L. Refused weatherization services from a state weatherization agency; 3.752.26 ... T. The household refused inspection of the Crisis Intervention Program work; 3.752.27 ... U. The applicant has been convicted of fraud; 3.751.56". 3.752.26.B.1: refusal means the household "shall not be approved for LEAP benefits for the following year and a LEAP denial hold shall be placed". | CO-1007's precision says these reasons are not modeled. OQ-163's K-8 resolution leaves them "outside leap_is_eligible's precision". No open question with a Class line records them, and they are not policy choices: the rule states them. A household under a weatherization or CIP denial hold, a fraud conviction, or a benefit already received from another county this season is found eligible. | Add supplied findings `leap_has_denial_hold` (weatherization or CIP refusal hold placed by the State LEAP office, 3.752.26.B, 3.752.27.B), `leap_applicant_convicted_of_fraud` (3.751.563) and `leap_received_benefit_in_another_county_this_season` (3.756.17), each read as false when not stated (rule 12), as conjuncts of CO-1007. |
| F-13 | P1 (narrow) | CO-2708 `sebt_household_child_receives_snap_or_tanf` (read by CO-1298, CO-1633, CO-1699) | 7 CFR 292.2 "Categorically eligible": "documentation that a child is a member of a household ... and **one or more children in that household** are receiving assistance under SNAP, TANF, or FDPIR"; 245.6(b)(7) (fetched): "If any child is identified as a member of a household receiving assistance under SNAP, FDPIR, or TANF, all children in the Family ... shall be categorically eligible"; 292.2 "Adult means ... any individual 18 years of age or older." | CO-2708 reads the receipt of any member of the economic unit. OQ-552's resolution reasons that SNAP and TANF units "hold the unit's children with the adults who receive", which is not always true. An elderly grandparent who is a separate SNAP household (7 CFR 273.1(b)(2)) can share the school-meal economic unit while no child is certified. The child is then categorical under the item but not under 292.2 or 245.6(b)(7), and would need the income test. | Read receipt only for unit members under 18 (`[<, age, 18]`, the 292.2 "adult" boundary), the child included. Record that in CO-2708's precision and in OQ-552. |
| F-14 | P2 | CO-982 `cccap_household_members` | 3.103.LLL: "'Household' includes: all children in the home who are under eighteen (18) years of age; all children under nineteen (19) years of age who are still in high school and the responsibility of the adult caretaker(s); and the adult caretaker(s) or teen parent(s)." 3.103.C: an adult caretaker is "financially contributing to the welfare of the child". | CO-982 joins any `spouse` of a member unconditionally, so a spouse who is not an adult caretaker (not financially contributing, no custody) is a member and their income is counted. | Join a spouse only when that spouse is `cccap_is_adult_caretaker` or `cccap_is_teen_parent`, or state why a spouse is always one. |
| F-15 | P2 | CO-994 `cccap_protective_services_income` | 3.119.A: "The only countable income for a protective services household is the income that is received by the child(ren) that have been placed"; 3.111.J.1 excludes "Earnings of a child in the household when not a teen parent". | CO-994 counts a placed child's wages and subtracts no 3.111.J exclusion. | Apply the J.1 earnings rule and `cccap_excluded_income` in CO-994. |
| F-16 | P2 | CO-988; CO-3307 `cccap_determination_type` | 3.116.H: "Counties that provide Colorado Works Child Care for households approved for Colorado Works state diversions require the same eligibility as outlined in this rule section." 3.117: transition "without requiring the household to complete the Low-Income Child Care application"; 3.117.A.2 uses the 85% SMI level. | A diversion household is not `receives_tanf_cash`, so the county-elected diversion route never reaches `eligible_colorado_works`. CO-3307 has no transition option, and its meaning does not tell an author that a 3.117 transition is not an `application` (otherwise the entry limit is wrongly applied). A P1 if the owner counts county-elected pathways as provided by the rule. | Add a `receives_cw_state_diversion` arm to CO-988 (county election as a parameter or supplied fact). Add the transition option, or a meaning sentence, to CO-3307. |
| F-17 | P2 | CO-1440, CO-1442 to CO-1444, CO-1450, CO-1709 | 3.116.E-F (residency, citizenship, age and identity verified by Colorado Works; the referral serves as verification); 3.119.B, E, F (protective services: sixty days for child income, no residency verification, six months for citizenship and identity); 3.120.E; 3.111.G.2.a ("The county shall obtain verification of all expenses ... or they will not be considered"). | Residency verification is required of every caretaker, including referred Colorado Works, protective services and child welfare cases. The due date is fifteen days for every route. Unverified self-employment expenses are still deducted. These are status-only errors (no eligibility row reads verification), except the expenses. | Exempt the referral routes in CO-1440 to CO-1444. Add route-specific due dates. Gate CO-1709 on `cccap_activity_schedule_received` or an expense-verification fact. |
| F-18 | P2 | CO-1000, CO-1009 | 3.751.2.D.3: "Individuals that enter into civil unions" cannot be separate households; 3.751.2.E: a separate household for a parent living with an ex-spouse after "legal separation or divorce". | `spouse` is "legally married to". A civil-union couple is joined only if `shares_heat_with` is stated. A legally separated couple is always joined, and CO-1000's precision says E is not modeled. | Add a `civil_union_partner` role (or extend `spouse`'s label) and a `legally_separated` exception for E. |
| F-19 | P2 | CO-1002 | 3.752.21.I and 3.752.211.H-I: "When determining income, do not consider cents in the gross benefit amount" (SSI, Social Security). | Cents are kept. This matters only at the limit. | `floor` Social Security and SSI before summing. |
| F-20 | P2 | CO-1294, CO-1295 vs the `lives_as_one_economic_unit_with` role | 7 CFR 292.2 "Household" (one economic unit); 292.5(a) "household size and income standards". | The household is stated twice: as a group (the role, read for categorical receipt) and as a count and income (case facts). The two can disagree. | Derive `school_meal_household_size` as the count of the child's economic unit, and state the income per member or keep it as the application's figure with a check that warns when the size disagrees. |
| F-21 | P2 | CO-1699, CO-1299 | 292.14(f)(1): verification is not required "if all children in the household are determined eligible based on documentation ... SNAP, FDPIR, TANF ... or if all children in the household are determined to be foster, homeless, migrant, or runaway"; 292.14(f)(9) and 292.15(c)(1)(iv): no benefits until verification is complete. | CO-1699 excepts any categorical child, Head Start included, child by child. The rule names no Head Start exception and tests the whole household. `sebt_benefit_amount` shows the amount while verification is pending. | Exclude Head Start from the exception and test "all children of the application". Have CO-1299 return 0 (or a `withheld` status) while `sebt_verification_status` is `pending`. |
| F-22 | P3 | CO-1809 `cccap_asset_limit`, CO-2379 `cccap_redetermination_date` | | Both have no `used_by`. | Retire them, or read them (CO-2379 in the redetermination status rows). |
| F-23 | P3 | CO-1244 | | Summer 2027 has no row (the FNS notice is not yet published), so every SUN Bucks benefit determined now is unknown. The item's precision says so, but there is no open question or `review_by` date. | Add `review_by` (or an open question blocked on the FNS 2027 benefit levels notice, fns.usda.gov). |
| F-24 | P3 | CO-08 case header, CO-1000 precision | | Both still refer to `shares_heating_fuel_with` (CO-895) and OQ-132's "engine limitation". The role `shares_heat_with` has replaced them. | Rewrite the comments. |
| F-25 | P3 | (none) | 9 CCR 2503-7 3.750.13 (Crisis Intervention Program), 3.114 (CCCAP terminations for unexplained absences and unpaid fees) | The CIP has no eligibility test in the rule beyond "approved Heating Fuel Assistance Program applicants", and the 3.114 reasons are case-management events. Not modeled; noted for completeness. | None needed. |

## 3. Coverage map

### CCCAP (8 CCR 1403-1, version effective 2026-08-14)

| Pathway or computation (rule) | Items | Status |
|---|---|---|
| Low-Income Child Care eligibility (3.110, 3.111) | CO-987, CO-989 (`eligible_low_income`) | Carried |
| Eligible child: under 13, or under 19 with additional care needs; part-day care; citizen or legal resident (3.111.F, F.1) | CO-980, CO-320, CO-321, CO-872, CO-2108, CO-998 | Carried |
| Household (3.103.LLL), household child, adult caretaker (C), teen parent (EEEEE) | CO-982, CO-983, CO-990, CO-1721, CO-2607, CO-992, CO-981, CO-897, CO-322, CO-326, CO-327, CO-1518 | Carried (F-14) |
| Household compositions (3.111.D.1-3, E) | CO-991, CO-898, CO-1744 | Carried |
| Household compositions D.8-9 (leave) and temporary breaks (3.112.C) | none | **F-04 (P1)** |
| County residency (3.111.A) | CO-2107, CO-2106, CO-1979 | Carried |
| Activities: employment with minimum wage (G.1); self-employment and launch (G.2) | CO-984, CO-160, CO-1709, CO-1710, CO-2113 | Carried |
| Activities: job search (G.3) | CO-871, CO-2109, CO-2110 | **F-05 (P1)**; county extension is OQ-162 |
| Activities: education and training limits (G.4) | CO-1722, CO-2111 | Carried; county extension is OQ-162 |
| Activities: SUD treatment (G.4.a.3) | CO-1516, CO-1517, CO-2112 | **F-06 (P1)** |
| Entry limit (H.1.a) and exit limit (H.1.b); FPG and 85% SMI tables (H.2-3) | CO-986, CO-870, CO-3004, CO-3005, CO-993, CO-2104, CO-2103, CO-3307, CO-1804, CO-1805, CO-3007, CO-3006 | Carried (county figures are OQ-121) |
| Income period (H.4-5) | none | **F-09 (P1)** |
| Income inclusions and exclusions (I, J) | CO-985, CO-2344 | Carried, except F-11 |
| Child support paid deduction (K) | verification only (CO-1446, CO-1683, CO-1688) | **F-01 (P1)** |
| Asset self-declaration (H.5.c) | CO-1741 (CO-1809 unused) | Carried |
| Colorado Works Child Care (3.115, 3.116) | CO-988, CO-896, CO-2709, CO-013 | Carried (diversion is F-16) |
| Transition off Colorado Works (3.117) | CO-3307 only | F-16 (P2) |
| Protective Services (3.118, 3.119) | CO-873, CO-994, CO-995, CO-3008 | Carried (F-15) |
| Child Welfare Child Care (3.120) | CO-2576 (fee only) | **F-03 (P1)** |
| Families experiencing homelessness (3.121, 3.103.CCC) | CO-2814, CO-2577 (fee only) | **F-02 (P1)** |
| IPV disqualification (3.114.A.6, 3.139) | none | **F-07 (P1)** |
| Parent fee formula P (to July 2028) and Q (from August 2028); additional child (P.3) | CO-1289, CO-1284, CO-1286, CO-2115 to CO-2119, CO-2579 | Carried (band edges are OQ-254) |
| Fee reductions H (quality) and U (part-time); cents dropped (A) | CO-3508, CO-1287, CO-3002, CO-1288, CO-2864, CO-3003 | Carried |
| Fee waivers I.1-I.8, G, S, X | CO-1290, CO-2575, CO-2576, CO-2577, CO-3505, CO-3506, CO-3507, CO-2578 | Carried (F-08; OQ-536) |
| Verification (3.111.C.2, F.1-2, G, H.5, K.2; 3.112) | CO-1440 to CO-1451, CO-1676 to CO-1688, CO-2396, CO-2395, CO-2398, CO-2399, CO-2585, CO-2590, CO-2873, CO-1354, CO-2120 | Carried (F-02, F-04, F-17) |

### LEAP (9 CCR 2503-7, effective 2025-11-01, as amended 2026-11-01)

| Pathway or computation (rule) | Items | Status |
|---|---|---|
| Heating Fuel Assistance eligibility (3.752.2) as of the date of application (3.751.1 Point in Time) | CO-1007, CO-2122 | Carried (F-12) |
| Season and eligibility period (3.751.1, 3.752.1) | CO-1006, CO-1008, CO-1806, CO-1807 | Carried |
| Household (3.751.1, 3.751.2.A-D) | CO-1000, CO-1009, CO-1001, CO-1005, CO-2100, CO-325 | Carried (F-18) |
| Citizenship (3.753.16-18); SSN and SAVE (3.751.1 Completed Application B, 3.753.15) | CO-1010, CO-1694 | Carried (OQ-550) |
| Residency (3.753.21) | CO-505 | Carried |
| Income (3.752.21-23) | CO-1002, CO-1712, CO-1711, CO-2345 | **F-09, F-10, F-11 (P1)** |
| Income limit, 60% SMI for FFY 2026 (3.752.22.D as amended; D-144) | CO-875, CO-1003 | Carried |
| Vulnerability (3.752.25) | CO-1004, CO-876, CO-1283, CO-2815, CO-3342, CO-877 | Carried (OQ-561, OQ-610) |
| Benefit Steps A-G (3.758.47) | CO-1281, CO-1280, CO-1279, CO-1278, CO-3000, CO-3001, CO-1282, CO-1271, CO-1273, CO-1274 | Carried (OQ-253) |
| Program-year figures: statewide adjustment, minimum and maximum (3.758.48) | CO-1272, CO-1276, CO-1277 (no versions) | Blocked (OQ-532) |
| Denial factors (3.754.1) | duplicate household only (CO-2100) | **F-12 (P1)** |
| Verification (3.755, 3.756.12) | CO-1455 to CO-1462, CO-1689 to CO-1694, CO-2586, CO-2591, CO-1342, CO-1355, CO-2124 | Carried |
| Crisis Intervention Program (3.750.13) | none | F-25 (no computation in the rule) |

### SUN Bucks (7 CFR part 292; no Colorado rule, D-143)

| Pathway or computation (rule) | Items | Status |
|---|---|---|
| School-aged and categorically eligible (292.6(a)) | CO-1298, CO-1292, CO-2101, CO-2102, CO-2605 | Carried |
| Enrolled in an NSLP or SBP school, including special provision schools (292.6(b)-(c)) | CO-1293, CO-1298 | Carried |
| Categorical eligibility (292.2): SNAP or TANF in the household | CO-2708, `lives_as_one_economic_unit_with` | **F-13 (P1)** |
| Categorical eligibility (292.2): foster, homeless, migrant, runaway, Head Start, FDPIR, other | CO-1296, CO-2813, CO-2852 | Carried (OQ-255: Colorado's optional sources) |
| Income eligibility (292.5): 185% of the guideline in force July 1, by household size | CO-1297, CO-1291, CO-3015, CO-1294, CO-1295, CO-181, CO-182 | Carried (F-20) |
| Benefit: $40 a month for three months (292.15) | CO-1299, CO-1244, CO-3013, CO-2581, CO-3014 | Carried (OQ-535; F-23) |
| Verification (292.14) | CO-1590 to CO-1593, CO-1633, CO-1695 to CO-1699, CO-2587 | Carried (F-21; OQ-377) |
| Citizenship test | none, by design | OQ-551 |

## 4. Rules checked against the text (45)

These were checked against the excerpt and the governing document. "OK" means the derivation and figures match the rule. Where an entry says "OK except", the exception is the finding named.

| # | Item | Rule | Result |
|---|---|---|---|
| 1 | CO-980 eligible child | 3.111.F, F.1 (13; 19 with additional needs; part-day; citizenship) | OK |
| 2 | CO-990 household child | 3.103.LLL (under 18; under 19 in high school) | OK |
| 3 | CO-992 adult caretaker | 3.103.C; EEEEE (teen in workforce training or post-secondary is an adult caretaker) | OK |
| 4 | CO-981 teen parent | 3.103.EEEEE (under 21; contributing; in an activity) | OK |
| 5 | CO-982 household | 3.103.LLL | OK except F-14 |
| 6 | CO-991 caretakers in activity | 3.111.D.1.a-c, E | OK except F-04 |
| 7 | CO-984 eligible activity | 3.111.G.1-4 | F-04, F-05, F-06 |
| 8 | CO-160 federal minimum wage $7.25 | 3.111.G.1.b | OK |
| 9 | CO-2107 county residency | 3.111.A | OK |
| 10 | CO-986 entry limit (min of entry %, 85% SMI) | 3.111.H.1, H.1.a | OK |
| 11 | CO-3005 185% floor | H.1.a | OK |
| 12 | CO-993 exit limit | H.1.b | OK |
| 13 | CO-2104 entry or exit by receipt | H.1.a-b; 3.114.A.1 | OK (F-16 on transition) |
| 14 | CO-1804 and CO-1805: 85% SMI to and from 2026-10-01; each additional $294.87 and $308.50 | H.2, H.3 | OK (every figure compared) |
| 15 | CO-3007 FPG monthly: 2026 HHS guideline from October 1 ($1,330.00 for 1 ... $4,643.33 for 8; $473.33 each) | H.3 | OK |
| 16 | CO-985 household income | 3.111.I, J.1 | F-01, F-09, F-11 |
| 17 | CO-2344 excluded income | 3.111.J.3-19 | OK for the sources it names |
| 18 | CO-1710 self-employment income | I.2 | OK (F-17 on expense verification) |
| 19 | CO-1741 assets self-declared | H.5.c | OK |
| 20 | CO-988 Colorado Works Child Care | 3.115.A, 3.116.A | OK except F-16 |
| 21 | CO-995 protective services, household of one | 3.119.A | OK |
| 22 | CO-994 protective services income | 3.119.A | F-15 |
| 23 | CO-1289 fee formula: 1% plus 14% marginal equals 1% of FPG plus 15% of the excess; $15 per additional child above 100%; Q from August 2028 | 3.124.P, P.3, Q | OK (OQ-254 band edges) |
| 24 | CO-3508 reductions (20%, 55%), cents dropped | 3.124.A, H, U | OK |
| 25 | CO-1290 parent fee waivers | 3.124.I.1-8, G, S, X | OK except F-03, F-08 |
| 26 | CO-2814 families experiencing homelessness | 3.103.CCC | OK |
| 27 | CO-1450 and CO-1354: 15-day verification period | 3.111.H.5.e | OK (F-17 for the other routes) |
| 28 | CO-1451 status (`past_due`, `case_closed`, `deduction_disallowed`) | H.5.e.1-2; K | OK |
| 29 | CO-1442 to CO-1444 questionable citizenship, age, identity | 3.111.C.2.b.1-2 | OK |
| 30 | CO-1686 additional care needs verified | 3.111.F ("verified additional care needs") | OK |
| 31 | LEAP CO-1008 and CO-1006: November to April | 3.751.1 Eligibility Period; 3.752.1 | OK |
| 32 | LEAP CO-1007 point in time | 3.751.1; 3.752.2 | OK except F-12 |
| 33 | LEAP CO-875: 2026-2027 table ($3,774 for 1 ... $11,541 for 15) | 3.752.22.D (as amended, D-173); D-144 | OK (sizes 1-15 compared) |
| 34 | LEAP CO-1000 and CO-1009 household | 3.751.1 Household; 3.751.2.A-D; 3.753.18 | OK except F-18 |
| 35 | LEAP CO-1010 qualified alien list | 3.753.16.A-L (Amerasian is covered as LPR) | OK |
| 36 | LEAP CO-1694 SSN and SAVE exclusion with income kept | 3.751.1 Completed Application B; 3.753.15, 3.753.17.A | OK |
| 37 | LEAP CO-1002 income | 3.752.21, 3.752.22, 3.752.23.Q | F-09, F-10, F-11 |
| 38 | LEAP CO-1004 and CO-876 vulnerability | 3.752.25.A.1-6, B.1-8 | OK |
| 39 | LEAP CO-3000 bands (0-75 0%; 75.01-125 10%; 125.01-175 20%; 175.01 and above 30%) | 3.758.47 Step D | OK |
| 40 | LEAP CO-3001 electric heat portions (62, 48, 43, 50%) | Step C | OK |
| 41 | LEAP CO-1282 $180 subsidized allowance; CO-1280 Step E division | Steps E, F | OK |
| 42 | LEAP CO-1355 and CO-2124: two weeks plus up to two weeks | 3.756.12.D | OK |
| 43 | SUN Bucks CO-1297: ceil(ceil(1.85 x FPG)/12) with the July guideline year; $5,088 for 4 | 292.5(a)-(b) | OK |
| 44 | SUN Bucks CO-1292 school aged: 6 by August 1, under 17 | 292.2; C.R.S. 22-33-104(1)(a) | OK |
| 45 | SUN Bucks CO-1298, CO-1299, CO-1244, CO-3013: $40 for 2024-2026, three months | 292.6; 292.15; D-89 | OK except F-13 |

## 5. Cases recomputed by hand

All three are computed with `npx vite-node scripts/eval-case.ts co <case> ...`. In every case the engine matched my hand computation and the stored expectation, except where F-05 changes the expectation.

**CO-08** (2026-12-01, Denver, CCCAP application).
- CCCAP household: p1, p2, p3, p4. p4 is 18 and in high school (3.103.LLL), so 4 members.
- CCCAP income: p1's $2,600. p4's $400 is excluded under J.1 as a household child's earnings. Total $2,600.
- Entry limit: 1.85 x $2,750 (2026 guideline, size 4, from October 1) = $5,087.50. The 85% SMI cap is $10,283.37.
- Activities: p1 earns $2,600 / 150 h = $17.33 an hour, above $7.25. p2 is in job search (4 of 13 weeks). p3, aged 14 with additional care needs, is the eligible child. Engine: `eligible_low_income`, income 2600. Matches.
- **Under F-05 the expectation is wrong.** At an application p2's job search is not an activity (3.111.G.3.a, f), and D.1.c needs both caretakers active, so the result should be `ineligible_activity`.
- LEAP household: p1, p2, p3, plus p4 through `shares_heat_with`.
- LEAP income: $2,600 + $400 (p4 is 18, so 3.752.23.Q does not apply) = $3,000, against $7,258 for 4. Eligible. Engine: 3000, true. Matches.
- p6 (undocumented brother): his own CCCAP household is `ineligible_child`. Under LEAP he has no countable member but $1,500 of income is counted. Engine matches.
- The CCCAP fee for this case (not stored) would be 1% x $2,600 = $26. The engine gives null because `uses_top_quality_rated_provider` is not stated.

**CO-02** (2026-11-01, Adams).
- CCCAP household: p3 (41), p4 (17, teen parent), p5 (infant), so 3 members. This follows OQ-163's choice to join a teen parent to her own parent.
- CCCAP income: p3's $2,380. Entry limit: 1.85 x $2,276.67 = $4,211.84. p4 is the active teen parent and p5 the eligible child, so `eligible_low_income`.
- Parent fee: 1% x $2,276.67 + 15% x ($2,380 - $2,276.67) = 22.7667 + 15.4995 = $38.2662. The quality reduction gives x 0.8 = $30.61, and dropping the cents gives **$30**. Engine: formula 38.2662, fee 30. Matches.
- LEAP household: p2, p4, p5. p1 is in a nursing facility. p3 is excluded for status, but her income counts (3.753.18).
- LEAP income: p2's $1,180 + p3's $2,380 = $3,560, against $6,097 for 3. Eligible. $3,560 x 12 / $27,320 = 156.4% of the guideline, so Step D takes 20%. The benefit is unknown because OQ-532's figures have no versions. Engine matches.
- SUN Bucks: p4 is enrolled in an NSLP school and receives SNAP, so `eligible_categorical`. The limit for 4 is ceil(ceil(1.85 x $33,000) / 12) = ceil($5,087.50) = **$5,088**. The benefit is unknown because summer 2027 has no row (F-23). p5 (not school aged, not enrolled) and p3 are `ineligible`. Engine matches.

**CO-13** (2026-11-01).
- p4 was born 2018-02-11, so he was 8 on 2026-08-01 and is school aged (6 to 16).
- He receives Colorado Works cash himself, so he is `eligible_categorical`. The benefit for summer 2027 is unknown.
- p1 to p3 are not school aged or enrolled. Engine matches. F-13 does not change this case: the receipt is the child's own.

## 6. Open-question confirmations

Every open or partly resolved question in scope was read, and the governing text was checked again for each.

| OQ | Class line | Confirmation |
|---|---|---|
| OQ-121 CCCAP county entry level | blocked on a named document | Right. 3.111.H.1.a has the Department set the level "based on the self-sufficiency standard, not to be set below" 185%, and no county figure is in D-87. The schedule is CDEC's (cdec.colorado.gov refused). |
| OQ-162 county plans for longer job search or education | blocked on a named document | Right. G.3.a and G.4.a.1-2 refer to "a county plan ... subject to ... Department approval as described in rule section 3.104", and the plans are not published on an allowed host. F-05 and F-06 are separate defects, not part of this question. |
| OQ-163 K-9: does a teen parent living with her parent share her household? | state policy choice | Defensible, but the Checked line should also cite 3.103.C. An adult caretaker must have "custody of the child during the period of time child care is being requested", and 3.103.LLL's household is the children plus "the adult caretaker(s) or teen parent(s)". Read together, these lean toward the teen parent's own household **without** her parent, who is not a caretaker of the child in care. CDHS has returned it as a blocker, so the owner's answer is still required. Keep the class and add the citation (P2 note). |
| OQ-253 how LEAP Steps B, D and F combine; the FPG table for Step D | state policy choice | Right. Step G says "subtracting the applicable adjustments ... in Steps B-F" without an order, and Step D names no table. D-173 adds nothing. |
| OQ-254 post-2028 band edges | state policy choice | Right. 3.124.Q writes "101%-130", "131%-160%" and "161% and above", leaving the dollars between bands unstated. |
| OQ-255 Colorado's optional streamlined-certification sources | blocked on a named document | Right. 292.12(d)(2) leaves this to the agency and the Plan for Operations and Management. No Colorado rule exists (D-143), and C.R.S. 26-2-309 states none. |
| OQ-377 SUN Bucks response period | blocked on a named document | Right. 292.14(f)(2)(i) says "by the date determined by the Summer EBT agency" and the POM is not on an allowed host. The body's statement that the foster, migrant and runaway exception "has no fact" is outdated: CO-1296 carries it now. Also see F-21 (Head Start). |
| OQ-532 LEAP program-year figures | blocked on a named document | Right. 3.758.48 has the State give "advance written notice", and neither D-86 nor D-173 states the figures. |
| OQ-535 which summer a July or August determination is for | blocked on a named document | Right. 292.2 has the agency set the summer operational period in its POM. |
| OQ-536 protective services fee income | state policy choice | Right. 3.124.I.6 says "unless the child(ren) has countable income" and gives no base. |
| OQ-540 one primary-responsibility role for "loco parentis" | state policy choice | Right. 3.103.MMM defines in loco parentis but does not say whether care shared with a parent counts. |
| OQ-550 immigration options against the SAVE list (LEAP part) | blocked on a named document | Right. The LEAP list in 3.753.16 is matched (row 35 above). The question concerns SAVE's category list. |
| OQ-551 no SUN Bucks status test | state policy choice | Right. 8 U.S.C. 1615(b) neither requires nor forbids a status test, 292 states none, and Colorado has no rule. |
| OQ-561 LEAP "considered homeless" | state policy choice | Right. 3.752.25.B.6 and 3.754.1.W use the term without a definition or a cross-reference. |
| OQ-562 "attending school as defined by" the Colorado Department of Education | blocked on a named document | Right. 3.111.F.2 names CDE's definition without restating it, and C.R.S. 22-33-104 states ages only. |
| OQ-610 LEAP hotel "will live" arm | state policy choice | Right. 3.752.25.B.8 leaves the proof of a future stay undefined. |
| OQ-612 temporary absence | state policy choice | Right for SNAP, MAGI and LEAP. For CCCAP, 3.111.D.1.a states the voluntary-absence rule (an eligible activity, uniformed service or medical treatment, with intent to return), which agrees with the volume's reading. |
| OQ-614 LEAP mileage at "the county rate" | blocked on a named document | Right. 3.755.21.I names a county rate, and no allowed host publishes it. |

**No open question records** F-01 to F-13. Each is a defect against explicit text, not a policy choice. The item-level notes that acknowledge F-01, F-09 and F-12 (the CO-985 precision, the CO-1002 `assumption`, the CO-1007 precision) do not meet stopping-rule item 2.

## 7. Same-word audit SW-35: decision

**P1.** 8 CCR 1403-1 3.111.H.5.a.1 says the prior-thirty-day income "shall be used in determining eligibility", and H.5.b says the same for unearned income. 3.124.D bases the fee on "at least the past thirty (30) days gross income". LEAP's 3.751.1 and 3.752.22.A-C define the income verification period, the four-of-eight-weeks rule for earned income, and the weekly x 4 conversion. Each is part of the eligibility test the rule states, and the volume has no element for any of them. The calendar-month facts give a different figure whenever pay dates straddle a month boundary or income changes in the determination month, and one case cannot state both the SNAP and the CCCAP/LEAP figures. See F-09 for the fix.

## Disposition

Fix track for CCCAP, LEAP and SUN Bucks, 2026-11-22. Commits on the track's branch: 70bafc1 (excerpts S2700-S2721, D-250), 8d451e7 (the P1 fixes and the cheap P2 and P3 fixes), 7fd0df3 (OQ-163, OQ-377 text). Every governing text was re-read; 8 CCR 1403-1 (version 12658) and 9 CCR 2503-7 (version 12221, and the 11/01/2026 amendments) were re-fetched from the Secretary of State and match D-87, D-86 and D-173. No finding was judged not P1.

| ID | Pri | Disposition |
|---|---|---|
| F-01 | P1 | Fixed (8d451e7). `cccap_child_support_paid_deduction` (CO-3902): current court-ordered support paid by an adult caretaker or teen parent, when verified (CO-1363), less the arrears part; subtracted from the household total in CO-985 (floor 0), so the entry/exit tests (CO-986, CO-993) and the fee (CO-2578, CO-1289) read it. New neutral facts `child_support_paid_toward_arrears` (CO-3900) and `child_support_paid_order_type` (CO-3901). Tests CO-3902-T1 to T7, CO-985-T6, case CO-125. |
| F-02 | P1 | Fixed (8d451e7). CO-989 row `eligible_homelessness_stabilization` (after the eligible-child row, before the activity row) on `cccap_is_in_homelessness_stabilization` (CO-3907); CO-1290 accepts the status (fee 0, I.5). Residency (CO-1440), citizenship, age and identity (CO-1442 to CO-1444) and the immunization element (CO-1447, CO-1448) are not required during the period; CO-1451 uses a sixty-day due date (CO-3908, CO-3909, B.1, B.3.b). |
| F-03 | P1 | Fixed (8d451e7). CO-989 row `eligible_child_welfare` on CO-2576 (3.120.D); CO-1290 reaches its I.4 row; residency not verified (3.120.E, CO-1440). |
| F-04 | P1 | Fixed (8d451e7). Neutral `temporary_activity_break_reason` (CO-3903); CO-984 counts verified maternity/paternity leave (D.8, application or enrolled), medical leave with an open case and inability to care for the children (D.9, CO-1744 restated), and, while enrolled, a seasonal interruption, temporary layoff or scheduled education break (3.112.C). The leave is verified as the eligible activity (CO-1441). |
| F-05 | P1 | Fixed (8d451e7). CO-984's job-search arm requires `cccap_is_receiving_assistance` (redetermination, change, or the new `transition_from_colorado_works` option of CO-3307, 3.117.D); CO-871 restated. **Case CO-08: CCCAP eligible_low_income -> ineligible_activity for p1-p4** (derivation in the case). |
| F-06 | P1 | Fixed (8d451e7). Neutral `sud_treatment_start_date` (CO-3904); `cccap_sud_treatment_instance_start_date` (CO-3905) is the later of it and CO-1517; CO-984 counts twelve months from it. T13/T14 state the instance start; T15/T16 test a May 2027 instance. |
| F-07 | P1 | Fixed (8d451e7). `cccap_is_serving_ipv_disqualification` (CO-3906, a county or court finding); CO-989 first row `ineligible_disqualified` for any caretaker or teen parent in the household (3.139.D). |
| F-08 | P1 | Fixed (8d451e7). CO-2578: a Colorado Works household's fee base is the household's earned income (`cccap_person_earned_income`, CO-3915) less the K deduction (3.116.C, 3.124.E). |
| F-09 | P1 (SW-35) | Fixed (8d451e7). Neutral receipts for the thirty days before the application (`wages_gross_received_prior_thirty_days`, `unearned_income_received_prior_thirty_days`, CO-3910, CO-3911), read through CO-3912 and CO-3913 (the month's receipts when a case states only those). CCCAP: `cccap_person_earned_income`, `cccap_person_unearned_income`, `cccap_person_countable_income` (CO-3915 to CO-3917) and the county's other-period finding (CO-3914, H.4-5). LEAP: four weeks of pay by schedule (`wages_pay_frequency`, `wages_gross_per_pay_period`, `employment_began_or_ended_prior_thirty_days`, CO-3921 to CO-3923; `leap_pay_periods_per_month`, CO-3924; `leap_person_wages`, CO-3925), unearned of the verification period (CO-3926), self-employment of the full month before the application (3.755.21.I.1 as amended). CO-1002's `assumption` removed. Readings recorded: OQ-680 (CCCAP: the thirty days' anchor, the lump-sum count), OQ-681 (LEAP: the period as thirty days, "any four weeks", the self-employment month), both state policy choices with texts checked. No stored expectation changes (constant monthly incomes); CO-125 exercises a five-payday window. |
| F-10 | P1 | Fixed (8d451e7). `ssi_income` counted (CO-3926; CO-2874 for verification). Tests CO-3926-T1, CO-1002-T5, CO-2874-T3, case CO-125. |
| F-11 | P1 | Fixed (8d451e7). Lottery winnings are only in CO-1181 and `lump_sum_received` (CO-3367) no longer lists them or tax refunds; CCCAP counts a lump sum or prize at one twelfth in the month received (H.4.i, CO-3918) less a retroactive SSI or public assistance payment (J.2, J.26); LEAP counts prizes and lump sums except retroactive Social Security, SSI and public assistance payments (EE; new `retroactive_social_security_lump_sum_received`, `retroactive_ssi_or_public_assistance_lump_sum_received`, CO-3919, CO-3920). CO-2344 and CO-2345 retired (their receipts are left out of the thirty-day figure). |
| F-12 | P1 | Fixed (8d451e7). `leap_has_denial_hold`, `leap_applicant_is_serving_fraud_penalty`, `leap_received_benefit_in_another_county` (CO-3928 to CO-3930, findings read as false when not stated) are conjuncts of CO-1007; its precision now maps every 3.754.1 factor. |
| F-13 | P1 | Fixed (8d451e7). CO-2708 reads receipt from unit members under `sebt_adult_min_age` (CO-3933, 18, 292.2 "Adult") only; 245.6(b)(7) fetched (D-250, S2720). Test CO-2708-T7 (a grandparent in a separate SNAP household). OQ-552 unchanged in substance (the household is still the economic unit). |
| F-14 | P2 | Deferred: a spouse of a parent is the child's stepparent (an adult caretaker relation) in every stored case; restricting the spouse join to caretakers needs the 3.103.C financial-contribution test inside the household closure, which reads the household (a cycle). Fix later with a non-cyclic contribution fact. |
| F-15 | P2 | Fixed (8d451e7). CO-994 reads CCCAP's own earned (J.1: nothing for a placed child who is not a teen parent) and unearned income (J exclusions), less child support. CO-994-T2 now expects 0 for a 15-year-old's wages; CO-989-T3 states the child's birth date. |
| F-16 | P2 | Fixed (8d451e7). CO-988 adds the county-elected diversion route (`receives_tanf_diversion_payment`, CO-3931; `cccap_county_provides_cw_child_care_for_diversion_table`, CO-3932, no version: OQ-682, blocked on the counties' elections). CO-3307 gains `transition_from_colorado_works` (3.117; exit limit, job search, no verification until the redetermination, CO-1451). |
| F-17 | P2 | Partly fixed (8d451e7): residency is not required of Colorado Works referrals, protective services, Child Welfare Child Care or stabilization-period households (CO-1440). Deferred: route-specific due dates (3.119.B, F; 3.121 done) and gating CCCAP self-employment expenses on their verification (G.2.a), which needs a neutral "expenses verified" fact distinct from LEAP's receipts (CO-3927). |
| F-18 | P2 | Deferred: civil unions and the legally-separated exception (3.751.2.D.3, E) need a relationship role; the role list is shared across programs (fix later with the household track). |
| F-19 | P2 | Fixed (8d451e7): Social Security and SSI lose their cents in CO-3926 (3.752.21.I, 3.752.211.H). |
| F-20 | P2 | Deferred: deriving the school-meal household size and income from the economic-unit role changes SUN Bucks' application figures for every case; fix later with a size check. |
| F-21 | P2 | Deferred: the "all children in the household" test and the Head Start point need the set of children on one application, which no fact states; and 292.14(f)(9) withholds benefits for sample verification but not for cause, which the volume's single selection fact does not distinguish. Fix later. |
| F-22 | P3 | CO-2379 retired (8d451e7; V-12, OQ-373 updated). CO-1809 accepted: it is the figure CO-1741's self-declaration names. |
| F-23 | P3 | Fixed (8d451e7): CO-1244 carries `review_by: "2027-02-28"` for the FNS 2027 benefit levels notice. |
| F-24 | P3 | Fixed (8d451e7): CO-08 comments and CO-1000/CO-1009 precisions now describe the `shares_heat_with` role. |
| F-25 | P3 | No change needed (agreed). |
| Section 6: OQ-163 | P2 note | Fixed (7fd0df3): the Checked line cites 3.103.C and 3.103.LLL; class unchanged. |
| Section 6: OQ-377 | P2 note | Fixed (7fd0df3): the stale "has no fact" sentence corrected. |

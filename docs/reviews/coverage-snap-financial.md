# Coverage matrix: SNAP financial eligibility (family `snap-financial`)

Reviewer: independent coverage reviewer, family `snap-financial`. Read-only pass on HEAD `5fc915b`, run on a `git archive` snapshot in scratch (node_modules symlinked). In that snapshot `npm run check -- --volume co` reports check OK, rule tests 3311/3311, household cases 2793/2793, conformance self-check 6263/6263. `npm run export -- --volume co` wrote 1,887 items to `conformance/co/ledger.json`; the item lists below come from it.

Texts read in full for this family:
- D-82, 10 CCR 2506-1, effective 2026-10-01: 4.207.2-4.207.3 (proration, benefit computation, minimum allotment), 4.400-4.411 (lines 5687-8738), 4.500-4.504.61 and 4.506-4.507 (lines 8740-9306, 9823-10037). 4.505 (verification of non-financial information) belongs to the non-financial family; it is listed in the matrix only as that.
- D-83 and D-84, the FY 2027 COLA and income standards.
- Cross-checks: D-12 (7 CFR 273.8), D-13 (273.9), D-14 (273.10), D-15 (273.11), D-95 (273.2(f)), D-116 (273.2(f)(8)).

How households were reproduced: `scripts/eval-mod.ts`, a scratch copy of `eval-case.ts`, takes a household case and overrides some of its facts. It was used on CO-115, a homeless father earning $1,000 with a six-year-old, evaluated 2027-02-10 (base: gross 1,000, net 583, allotment 387), and on CO-83. Neither script is in the repo.

## 1. Verdict

**12 P1 found.** Under the stopping rule the financial half of the SNAP chapter is not complete.

All nine P1s of final2-snap (N-1 to N-8 and V-13) in this family's scope stay fixed. Section 5 has the checks.

## 2. Findings

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| CF-1 | P1 | 4.405.A, B, D.1-2, F.2; 4.405.2.A.4, A.6, A.8-A.13, A.15, A.22, A.27; 4.403.B.2 | CO-2338, CO-2339 (closed sums); CO-331 assumption | 4.405: "Only the following will not be considered as income". 4.405.2.A.27: "payments received under this Program must be excluded from income for SNAP purposes". A.6: "Payments, allowances and earnings under the Workforce Innovation and Opportunity Act (WIOA) are excluded as income". F.2: "Monies received from a Reverse Annuity Mortgage (RAM) loan program should be treated as a loan and excluded from income". A.10: "cash donations, based upon need, from one or more private, nonprofit charitable organizations, but not exceeding three hundred dollars ($300) in the aggregate, per fiscal quarter". A.12: "Military combat payments ... shall be excluded". | CO-2338 and CO-2339 are closed sums of seven facts. The cash review (FC-2, FC-3) added neutral receipt facts for these exclusions, but SNAP does not read them. So SNAP counts, in full:<br>- crime victim compensation (CO-3813);<br>- WIOA and YIEPP payments (CO-3815);<br>- WIOA on-the-job-training wages of a member under 19 under parental control (CO-3817);<br>- reverse mortgage payments (CO-3820);<br>- infrequent or irregular income of $30 or less in three months (CO-3822; CO-331's assumption says "no receipt fact states" it, which is now stale);<br>- PASS set-asides (CO-3825);<br>- AmeriCorps/NCSA payments (CO-4016);<br>- recoupments withheld to repay an overpayment (CO-3605, read by Medicaid only).<br>No fact at all exists for: need-based nonprofit donations of $300 or less a quarter; combat pay; SCSEP (Older Americans Act Title V); the ex-spouse's share of military retirement; mandatory military education deductions; money for a non-household beneficiary (B); child support passed to IV-D (D.2).<br>Two mismatches in the other direction:<br>- CO-3366's Domestic Volunteer Service Act arm excludes payments "below the minimum wage", but SNAP excludes Title I/VISTA only for a person receiving SNAP or PA on joining (A.3).<br>- CO-3364 makes nonprofit and energy-supplier cash assistance excluded in full, but 4.405 excludes it only within the $300 charitable cap (H.7 counts state and local energy cash).<br>**Reproduced** on CO-115 (base allotment 387): $500 crime victim compensation gives 237; $500 WIOA gives 237; $400 reverse mortgage gives 267; $300 AmeriCorps gives 297; $300 PASS gives 297; $20 irregular income gives 381. Each should be 387. | Make CO-2339 and CO-2338 read CO-3813, CO-3815, CO-3820, CO-3822 (through a SNAP $30-in-three-months test like `infrequent_or_irregular_income_in_quarter`), CO-3825, CO-4016, CO-3605 (less IPV recoupments), and CO-3817 for under-19 OJT. Add neutral facts for:<br>- need-based charitable cash, with a SNAP $300-a-quarter cap;<br>- combat pay;<br>- SCSEP;<br>- the ex-spouse's share of military retirement;<br>- money held for a non-household beneficiary.<br>Restrict CO-3364 to federal energy assistance. Cite each 4.405.2 item. Update CO-331's assumption. |
| CF-2 | P1 | 4.404.D; 4.403.E.1; 273.9(b)(2)(ii) | CO-331, CO-1714, CO-1701, CO-1702 | 4.404.D: "Rental income is total income, less the cost of doing business, from rental property in which a household member ... is not actively managing the property an average of at least twenty (20) hours a week." | Passive rents are stated gross in `other_unearned_income_taxable` (CO-1714: "rents ... from property the person does not actively manage"). CO-331 counts them gross. The cost facts (CO-3370-3372) are read only through CO-1702, which returns 0 unless `self_employment_gross_receipts` > 0.<br>Stating the rents as self-employment receipts instead would make them earned income and give them the 20% deduction, which is also wrong.<br>**Reproduced** on CO-115: $1,000 rent with $600 of costs gives allotment 87; net rent of $400 gives 267. | Add neutral facts `passive_rental_income_gross` (a part of CO-1714) and `passive_rental_costs`. Add SNAP `snap_passive_rental_income` = max(0, gross − costs allowed under 4.403.11.B-C). In CO-331, subtract the gross and add the net. |
| CF-3 | P1 | 4.402.A.2, 4.402.B, 4.402.2.A-C, 4.403.3, 4.403.11.D, 4.403.12.A-D; 273.10(c)(2)(i), (c)(3)(ii)-(iii) | CO-330, CO-331, CO-1702, CO-023, CO-1700; CO-3041 (read only for work hours) | 4.402.A.2: "households shall have income converted to a monthly amount ... Weekly Multiply Weekly Average by 4.3. Bi-Weekly ... by 2.15". 4.402.2.A.1: self-employment "annualized over a twelve (12) month period even if the income is received within a shorter period". 4.403.3.D: school contract income "averaged over a twelve (12) month period". 273.10(c)(3)(ii): such households "shall have that income averaged over a 12-month period". | SNAP reads the month's receipts: `wages_gross` and `self_employment_gross_receipts` are each "the gross amount received for the month". No SNAP item converts weekly or biweekly pay, or averages self-employment, contract, school-year or educational income, or capital gains (÷12). No convention, note or open question records this.<br>LEAP's pay facts (`wages_pay_frequency`, `wages_gross_per_pay_period`, CO-3921, CO-3922) exist, but SNAP ignores them.<br>**Reproduced** on CO-115: weekly pay of $250 with five paydays (`wages_gross` 1,250) gives allotment 327; 4.3 × 250 = 1,075 gives 369.<br>A seasonal self-employed farmer paid in one month is counted in that month and nothing in the others. | Add `snap_person_wages` that converts by `wages_pay_frequency` with 4.3 and 2.15, and SNAP-specific averaged facts for self-employment, contract and school-year income (or a stated `snap_annualized_*` amount). Alternatively, record a convention that SNAP's monthly facts are the 4.402-converted, 4.402.2-averaged anticipated amounts. That alternative clashes with LEAP's reading of the same facts, so a SNAP-specific fact is the cleaner fix. |
| CF-4 | P1 | 4.407.5.A; 4.411.1.B.2.c; 273.9(c)(17) | CO-332, CO-2003 | "A household shall receive an exclusion from income for legally binding child support payments made to or for non-household members. The child support exclusion will be made from the household's total countable gross income ... Legally obligated child support paid by a household member under the age of eighteen (18) shall be an allowable exclusion, even if the income of the child is considered exempt". | CO-332 subtracts the exclusion from the payer's own income and floors it at 0. When the obligated member's own counted income is below the payment, the household loses the exclusion. This happens when a spouse's wages pay the support, and in the minor-payer case the rule names expressly, since the minor's exempt earnings are 0.<br>**Reproduced** on CO-83 (2026-11):<br>- the earner p2 pays $300: gross 1,200, allotment 808;<br>- the no-income stepparent p1 pays $300: gross 1,500, allotment 743.<br>Both should be 808. | Exclude at household level. CO-334 subtracts the sum of the eligible members' CO-2003, plus the counted share for prorated members, from the household gross, floored at 0. Keep the per-person order for the ineligible member's proration (4.411.1.B.2.c). |
| CF-5 | P1 | 4.405.C (second paragraph) | CO-2569, CO-2338, CO-300 | "If the student becomes eighteen (18) years of age in the month of application, the income shall be excluded for the month of application and counted the following month. If the student turns eighteen (18) during the certification period, their income shall be excluded until the month following the month in which the student turns eighteen (18)." | CO-2569 tests `age < 18`, and age is taken on the determination date (conventions.md line 71). Earnings in the month the student turns 18 are counted when the birthday falls before the determination date. Later months are mis-timed the same way.<br>**Reproduced** on CO-115: child p2 born 2009-02-05 earns $400; in 2027-02 she is counted, giving allotment 291. Born 2009-02-15, she is excluded, giving 387; both should be 387. | Test the age at the first day of the month evaluated (or "turns 18 after the month before"), not `age`. Add a test for each sentence. |
| CF-6 | P1 | 4.407.6.A.8; 273.9(d)(3)(x) | CO-376, CO-2895 (none carries it) | "an amount equal to the maximum allotment for one (1) person is allowed if the household furnishes the majority of the attendant's meals. The allotment shall be the one in effect at the time of certification". | No item, fact or record. A household with an elderly or disabled member that feeds an attendant loses a medical expense equal to the one-person maximum allotment ($306), so the excess medical deduction is too low. | Add a supplied `snap_household_furnishes_majority_of_attendant_meals` (person, for the elderly/disabled member). In CO-2895, add `snap_maximum_allotment_table` row 1, as in force at certification. |
| CF-7 | P1 | 4.410.F.2, 4.410.G, 4.410.F.1, 4.410.B, 4.410.E.2; 273.8(e)(8), (e)(19) | CO-074, CO-3393 | F.2: "Non-exempt, non-liquid resource ... that would have a net return of one thousand five hundred dollars ($1,500) or less if sold, shall be considered an inaccessible resource." F.1: real property the household is making "a good faith effort to sell". B: property "on which the household intends to build ... a permanent home shall be exempt". E.2: "Installment contracts for the sale of land or buildings ... producing income consistent with its fair market value shall be an exempt resource." | CO-074 counts `real_property_other_than_home_equity` in full. That fact's meaning includes "mortgages and promissory notes the person holds", so an exempt installment contract is counted. None of F.1, F.2, G, B or E.2 is applied.<br>**Reproduced** on CO-115, made a standard-eligibility household with a disabled member (SSDI $4,000, medical $2,400): $4,000 savings plus land with $1,200 equity gives `over_resource_limit`, allotment 0. Without the land it is `eligible`, allotment 106. The land is inaccessible under F.2, so the answer should be eligible, 106. | Make real property per resource, or add neutral facts: `real_property_held_for_sale_value`, `real_property_lot_to_build_home_value`, `installment_contract_value` (producing income at fair market value), and a per-resource "net return ≤ $1,500" exclusion via a SNAP item. Subtract them in CO-074. Add a dated parameter for the $1,500. |
| CF-8 | P1 | 4.409.C; 273.8(d) | CO-4176, CO-343, CO-3390 | "Nonexempt liquid and non-liquid resources owned jointly by separate households shall be considered available in their entirety to each household, unless it can be demonstrated by the applicant household that it does not have access to such resources." | `liquid_resources_value` and `real_property_other_than_home_equity` state "the person's share of a jointly held one". SNAP sums the shares, so an account held with someone outside the SNAP household counts at the person's share, not in its entirety.<br>Example: a $6,000 account held with an adult child elsewhere counts $3,000; the rule counts $6,000 unless the household shows the rest is inaccessible.<br>Wrong eligibility for standard-eligibility households. | Add `jointly_held_resources_other_owners_share_value` (the other owners' part, outside the household). Add it in CO-4176 and CO-074, less what CO-4175 states inaccessible. |
| CF-9 | P1 | 4.207.3; 4.408.2.B ("The period of disqualification shall begin in the month of application"); 273.1(e) | CO-385, CO-2307, CO-2308 | 4.207.3.A: "After eligibility has been established, the monthly SNAP benefit allotment will be determined." | `snap_allotment`, a declared outcome, is positive for ineligible households:<br>- CO-2307 has no striker gate, though CO-386 and CO-387 have one;<br>- CO-2308 has no lottery or transfer gate. N-1 and N-4 were added to CO-2307, CO-386 and CO-387 only, so the initial month still issues a benefit.<br>**Reproduced:**<br>- CO-115 with p1 striking and the household not eligible the day before: `snap_eligibility_status` = `striking_member`, `snap_allotment` = 387.<br>- CO-115 as a standard household with a $3,000 knowing transfer in October, applying 2026-11-02 and evaluated 2026-11: status `resource_transfer_disqualification`, `snap_allotment` = 232 (the prorated amount). | Gate CO-385 (or both CO-2307 and CO-2308) on `snap_is_eligible`, or add the striker, lottery and transfer conditions to CO-2308's gate and the striker condition to CO-2307's. Add tests. |
| CF-10 | P1 (verification) | 4.405.J; 4.403.F; 4.506 | CO-1376 | 4.405.J: "Verification of exempt income is necessary only if the income is questionable." 4.403.F: "Client statement of LLC and S-Corporation income is acceptable, unless questionable." 4.506: "gross nonexempt income shall be verified". | CO-1376 requires wage verification whenever `wages_gross` > 0. That catches:<br>- a child student's earnings, excluded in full (CO-2569);<br>- work-study (CO-3361);<br>- an LLC or S-corporation owner's pay, which 4.403.F treats as wages but accepts on statement.<br>**Reproduced** on CO-115: child p2 with $200 of excluded wages and no document. Income is unchanged (1,000), but `snap_verification_status` moves from `expenses_disallowed` to `past_due` (3 pending). | Test the countable earned income (CO-330 less the excluded parts) > 0, not `wages_gross`. Add a fact for LLC or S-corporation owner income and accept the statement unless questionable. |
| CF-11 | P1 (verification) | 4.502.B.3; 4.507.D.5; 273.2(f)(8)(i)(A) | CO-1382, CO-1597 | Federal: "the State agency shall require the household to verify any changes in the legal obligation to pay child support, the obligated amount, and the amount of legally obligated child support a household member pays". 4.507.D.5: "At recertification or periodic report, the local office shall require the household to re-verify the amount of legally obligated child support ... and the actual monthly child support payments made." 4.502.B.3: "if the source has changed, or the amount has changed by more than twenty-five dollars ($25)". | CO-1382 applies the $25 threshold to child support. The federal rule verifies any change, and 4.507.D.5 re-verifies at every recertification. The conflict between 4.502.B.3 and D.5 is unrecorded.<br>**Reproduced** on CO-115 as a recertification, child support 300 against 280 last verified: `snap_requires_verification_of_child_support_paid` = false. | Verify any change in child support at recertification, citing 273.2(f)(8)(i)(A), with a `statute_override` over 4.502.B.3. Record 4.507.D.5 against B.3 (an open question on whether unchanged support is re-verified; the federal text says only when incomplete or outdated). |
| CF-12 | P1 (verification) | 4.502.C.1-2; 4.507.C.3; 4.504.5.D; 4.506 ("periodic report") | none | "The household shall verify the following changes in circumstances at the time of periodic report: a. A change of more than $100 in the amount of unearned income. b. A change in the source of income ... d. A change in liquid resources ... f. If a member of the household won substantial lottery or gambling winnings. g. Allowable medical expenses ..." | The volume has determination types for application and recertification only (`snap_determination_is_recertification`). The 24-month certification's periodic report has its own verification list, and neither an item nor a scope record covers it. Change processing during certification (4.507.C.3) is likewise unrecorded. | Either model a periodic-report determination (fact `snap_determination_is_periodic_report`, plus arms in CO-1376, CO-1377, CO-1378, CO-1380, CO-1382 with a $100 unearned threshold parameter), or record in colorado-notes that mid-certification processing (4.502.C, 4.6xx) is out of scope, with the reason. Recording it would make this P2. |
| CF-13 | P2 | 4.206.C.3.b.1-2 ("must have resources below the limit"); 273.8(b) ("shall not exceed") | CO-344 | (as quoted) | CO-344 uses at-or-below, which follows the federal text. The State's "below" is not recorded. A household exactly at $3,000 or $4,750 passes. | Add a `statute_override` or a precision note citing 273.8(b) and 7 U.S.C. 2014(g)(1). |
| CF-14 | P2 | 4.504.6.D.4, D.6 | CO-1318 precision, CO-1361 | D.4: "PA benefit amounts ... obtained from the State Department." D.6: "Child support income and expense amounts obtained through the ACSES." Both are VUR. | CO-1318's precision says "Colorado SNAP treats only SSA and SSI benefit, death and unemployment insurance data as verified upon receipt ... A SNAP case states this fact true only for an SSA or UIB match". A case that follows it marks a Colorado Works or child support income match unverified for SNAP and asks for documents. | Correct the precision to include PA and ACSES. |
| CF-15 | P2 | 4.407.3.E.1-3 | CO-035 | E.1: "condo, and association fees or other continuing charges leading to the ownership of the shelter such as loan repayments for the purchase of a mobile home"; E.1.b second mortgage and home equity loans; E.3 disaster repair costs. | CO-035's meaning names only rent or mortgage, property tax and home insurance. A case following it leaves out allowable SNAP shelter costs. | Widen the meaning, or add a SNAP-read part fact for other continuing charges. |
| CF-16 | P2 | 4.506.C; 273.2(f)(1)(i) | CO-1376 | 4.506.C: "A household's statement of self-employment income shall be accepted unless questionable." 273.2(f)(1)(i): "Gross nonexempt income shall be verified for all households prior to certification." | CO-1376 follows the State text, with no `statute_override` and no open question. If no FNS waiver supports 4.506.C, the federal text governs and self-employment income must be verified. | Record an open question (blocked on Colorado's waiver, if any) or a reasoned precision. |
| CF-17 | P2 | 4.407.61.A table; 4.407.B-C; 4.407.61.C; 4.507.C.4 | CO-376, CO-3740 | "If the household chooses not to provide verification of expenses exceeding the SMED, then allow the SMED instead of actual expenses." Averaging of expenses and of one-time medical expenses is a household election. | Medical verification is all-or-nothing: verified $35-plus but not the full claim gives 0 after thirty days, where the rule gives the SMED. Expense averaging is not recorded as stated in the facts. | Add `medical_expenses_verified_amount`, or record the limit. Record that averaged expenses are stated as the month's figure. |
| CF-18 | P2 | 4.407.2.B | CO-373 | "The earned income deduction will not be applied to any portion of income earned under a work supplementation or work support program that is attributable to a federal, state, or local public assistance program." | No item and no record. Colorado's work supplementation statute, C.R.S. 26-2-111.3, is repealed (D-59), so this is likely not applicable, but that is not recorded. | Record it as not applicable in the CO-373 precision. |
| CF-19 | P2 | 4.207.2.A (SSI joint applicants released from a public institution) | CO-2305 | "will have their eligibility determined for the month in which the applicant household was released from the institution". | Recorded only in CO-2305's precision ("not modeled"), with no open question or scope note. | Move it to colorado-notes or an open question. |
| CF-20 | P2 (stopping rule) | OQ-371 | CO-1619, CO-1596 | 273.2(f)(8)(i)(A): "The State agency shall not verify income if the source has not changed and if the amount is unchanged or has changed by $50 or less". | The $50 boundary is classed as a state policy choice, but the federal text settles it: a change of exactly $50 is not verified, and 4.502.B.2's second sentence agrees. The volume already does this. | Resolve OQ-371 with a reasoned `statute_override` on CO-1619. |
| CF-21 | P3 | 4.403.2.B.1 | CO-4165 | "The value of the maximum allotment for the household size that is equal to the number of boarders" | It reads `lookup_extended` without the 18+ row (CO-3726). This matters only for 18 or more boarders. | Read `snap_maximum_allotment` the way CO-383 does. |
| CF-22 | P3 | 4.406, 4.406.1.B (recertification) | CO-4168 | "may be considered destitute upon initial certification or recertification, but only for the first month of each certification period" | CO-4168 applies only in the month of the application date, so a destitute household at recertification is not covered. | Record or extend. |

Totals: 12 P1, 8 P2, 2 P3.

## 3. Coverage matrix

Legend: **C** = carried by (item checked against the text; "ok" unless a finding is named). **NA** = not applicable, with the reason. **OQ** = the open question that holds it. **GAP** = no item and no recorded reason. "Fact-level" means the paragraph says how the supplied amount is formed, the fact's meaning carries it, and no computation follows.

### 3.1 Benefit computation (4.207.2-4.207.3)

| paragraph | disposition |
|---|---|
| 4.207.2.A, initial month based on the day applied; prorated from the date of application | C: CO-2305, CO-2308, CO-385 (ok) |
| 4.207.2.A, joint SSI applicants released from a public institution | Recorded in docs/colorado-notes.md, not modeled (CF-19, P2 deferred) (coverage round) |
| 4.207.2.A, full allotment in every other month | C: CO-385, CO-2307 (ok) |
| 4.207.2.B, migrant or seasonal farmworker in the job stream with a break of 30 days or less | C: CO-2305, CO-2306 (ok) |
| 4.207.2.C.1-4, exact-days formula | C: CO-2308. ok: days_between(application date, first of the next month) × full ÷ days in month; floor per 273.10(a)(1)(iii) |
| 4.207.3.A.1-3, 30% of net income, subtracted from the maximum, rounded down | C: CO-384, CO-2307 (ok; same as 273.10(e)(2)(ii)(A)(2)) |
| 4.207.3.A, "after eligibility has been established" | C: CO-2307 (striker gate added), CO-2308 (winnings, transfer and striker gates added), CO-385. CF-9 fixed (coverage round) |
| 4.207.3.B, initial month under the minimum: none issued | C: CO-385, CO-3700 (ok; $10 `statute_override`, F-1) |
| 4.207.3.B, certify from the month of application when later months pay | C: CO-386 reads the full month (ok) |
| 4.207.3.B, 3+ members at zero denied unless BCE/ECE; not for proration zeros | C: CO-386, CO-387 (ok) |
| 4.207.3.C, 1-2 person minimum except the initial month | C: CO-2307, CO-135, CO-140 (ok); N-7 cap CO-4182 |
| 4.207.3.D, maximum allotment table, 9-17, 18+ | C: CO-130, CO-131, CO-3726, CO-3727, CO-383 (ok against D-83) |
| 4.207.3.D, minimum $25 | C: CO-135 (ok against D-83) |

### 3.2 Income standards (4.400-4.401.2)

| paragraph | disposition |
|---|---|
| 4.400, prospective income; resources only for SE | C: CO-342, CO-344. Conversion and averaging C: CO-4324, CO-1702, CO-331 (CF-3 fixed) (coverage round) |
| 4.401.A, gross and net by composition | C: CO-347, CO-382 (ok) |
| 4.401.A.1, ECE "below" 200% | OQ-356 (ok); C: CO-339, CO-340 |
| 4.401.A.2, BCE deemed to meet both limits | C: CO-342, CO-347, CO-382 (ok) |
| 4.401.A.3.a, SE without elderly or disabled member: gross ≤130%, net ≤100% | C: CO-345, CO-346, CO-347, CO-382 (ok, at or below) |
| 4.401.A.3.b, SE with elderly or disabled member: net only | C: CO-347 (OQ-13 resolved, 273.10(e)(2)(i)(B)) (ok) |
| 4.401.A.4, 165% separate household | C: CO-419, CO-114, CO-3043, CO-2304 (ok) |
| 4.401.B, ineligible members left out of the size | C: CO-312, CO-313 (ok) |
| 4.401.1 table (130/200/165%) | C: CO-110, CO-111, CO-122, CO-123, CO-114, CO-3043 (ok, FY 2027 from 2026-10-01) |
| 4.401.2 table (100%) | C: CO-112, CO-113 (ok) |

### 3.3 Household income (4.402-4.402.2)

| paragraph | disposition |
|---|---|
| 4.402.A.1, prospective at application and on changes | NA: caseworker anticipation, stated in the month's facts; see CF-3 |
| 4.402.A.2, conversion (4.3, 2.15, 2, 0.5, 0.333333, 0.166666, 0.083) | C: CO-4323; wages CO-4324 (pay frequency, CO-3921, CO-3922); unearned income paid less often than monthly CO-4330 to CO-4332, CO-331. CF-3 fixed (coverage round) |
| 4.402.A.3, all income unless 4.405; disqualified share; counted in the month received | C: CO-330, CO-331, CO-333, CO-334 (ok); exclusions CO-2338, CO-2339 (CF-1 fixed) (coverage round) |
| 4.402.B.1-3, pay-date variations | C: CO-4324 (B.1: converted from the regular pay schedule, not the pay dates); B.2-3 fact-level (the unearned facts state the month's regular benefit) (coverage round) |
| 4.402.C.1, IEVS, IRS and DOLE data verified independently before adverse action | C: CO-1376 precision, CO-1604 (wage data not VUR); CO-1318 (ok) |
| 4.402.1.A, prospective budgeting for all | NA: facts are the issuance month's anticipated amounts (CF-3 for conversion) |
| 4.402.1.B, uncertain income not counted | NA: caseworker judgment in the stated amount |
| 4.402.1.C, last 30 days or a longer period as an indicator; no past income attributed except strikers | NA: caseworker method. Strikers C: CO-3503, CO-330 |
| 4.402.2 intro; A.1 self-employment annualized; A.2 contract income; A.3 educational income; A.4 elective averaging | A.1 C: CO-4327, CO-4328, CO-4329, CO-4342, CO-4344, CO-4349, CO-1702, CO-3722. A.2 C: CO-4325, CO-4326, CO-4324. A.3 NA: education assistance is excluded in full (4.405.1, CO-3360 in CO-2339). A.4 fact-level: an elected average is stated as the month's figure (colorado-notes). CF-3 fixed (coverage round) |
| 4.402.2.A, no averaging for destitute migrants | C: CO-4329 (not averaged for a destitute household) (coverage round) |
| 4.402.2.B-C, add averaged amounts; adjust on change | B C: CO-1702, CO-4324 (averaged amounts in earned income). C's adjustment on a change: change processing, out of scope (colorado-notes, CF-12) (coverage round) |

### 3.4 Earned income (4.403-4.403.3)

| paragraph | disposition |
|---|---|
| 4.403.A.1, wages including garnishments and diverted payments | C: CO-023 (gross), CO-330 (ok) |
| 4.403.A.1, state work-study not earned income | C: CO-2338 via CO-3361 (ok) |
| 4.403.A.2, ASCS payments and VISTA earned; VISTA excluded if on SNAP when joined | Fact-level (wages). VISTA C: CO-4303, CO-4304, CO-330, CO-2339 (CF-1 fixed) (coverage round) |
| 4.403.A.3, held wages and advances | Fact-level (CO-023 month received) |
| 4.403.A.4, sick, vacation and bonus pay while employed | Fact-level (CO-023) |
| 4.403.B.1, training allowances (not WIOA) | C: CO-4300, CO-330 (earned income); WIOA excluded CO-3815 in CO-2339 (CF-1 fixed) (coverage round) |
| 4.403.B.2, WIOA OJT earned; under 19 under parental control excluded | C: CO-4301, CO-4318, CO-2338 (CF-1 fixed) (coverage round) |
| 4.403.C, Title I UYA earned with the deduction | C: CO-4303, CO-330 (earned income, with the deduction); exclusion CO-4304 (CF-1 fixed) (coverage round) |
| 4.403.D, strikers | C: CO-3503, CO-330, CO-3504 (ok; non-financial family owns 4.307) |
| 4.403.E, self-employment income; E.2 capital goods counted in full | C: CO-1700, CO-1702 precision (ok) |
| 4.403.E.1, rental is self-employment; earned only at 20+ hours a week | C: CO-4320, CO-4321, CO-4322, CO-331 (passive rent unearned, net); 20+ hours: self_employment_gross_receipts. CF-2 fixed (coverage round) |
| 4.403.F, LLC/S-corporation owners are employees; statement accepted unless questionable | Fact-level (wages). Verification C: CO-4341, CO-1376 (CF-10 fixed; OQ-760) (coverage round) |
| 4.403.G, boarder income includes shelter contributions; third-party payments not counted | C: CO-4161, CO-4165 (ok) |
| 4.403.1.A-B, definition of self-employment; work registration | NA here; work registration is the non-financial family (CO-407 etc.) |
| 4.403.11 intro and A, gross plus capital gains less costs; capital gains counted in full | C: CO-1702, CO-1701 (ok) |
| 4.403.11.B, allowable costs | C: CO-1701, CO-3370, CO-3371, CO-3372 (ok) |
| 4.403.11.C.1, boarder cost capped at the payment | C: CO-4165 (min) (ok) |
| 4.403.11.C.2-3, no prior losses, income taxes or retirement savings | C: CO-1701 meaning, CO-3370 (ok) |
| 4.403.11.D, capital gains anticipated over 12 months ÷ 12 | C: CO-4329, CO-4349, CO-1702 (capital gains in the averaged receipts); not averaged: the month received (CO-1702). CF-3 fixed (coverage round) |
| 4.403.12.A-D, self-employment averaging | A, C, D C: CO-4327, CO-4328, CO-4329, CO-4342, CO-4349, CO-1702, CO-3722. B: recorded limit, stated by month (CO-4327). CF-3 fixed (coverage round) |
| 4.403.12.E.1-2.c, farm loss offset order; the $1,000 farmer test | C: CO-3720 to CO-3725, CO-334, CO-372, CO-378 (ok; `statute_override` 273.11(a)(2)(ii)(B)) |
| 4.403.2 intro, boarders excluded; commercial boarding house to 4.403.11 | C: CO-2567, CO-304, CO-4165 precision (ok) |
| 4.403.2.A, all direct payments | C: CO-4161 (ok) |
| 4.403.2.B.1-3, cost of doing business: maximum allotment for the number of boarders, actual cost, foster care | C: CO-4162, CO-4163, CO-4164, CO-4165 (ok; CF-21 for 18+) |
| 4.403.2.C, added to earned income; 20% deduction | C: CO-330, CO-373 (ok) |
| 4.403.2.D, actual shelter costs count; third-party payments by the boarder do not | C: CO-035 meaning, CO-2300 (ok) |
| 4.403.3.A-D, school employees' contract income averaged over 12 months | C: CO-4325, CO-4326, CO-4324, CO-4344. CF-3 fixed (coverage round) |

### 3.5 Unearned income (4.404)

| paragraph | disposition |
|---|---|
| 4.404.A, assistance payments (SSI, Colorado Works, need-based programs) | C: CO-331 (`ssi_income`, `tanf_cash_income`, `adult_financial_cash_income`) (ok) |
| 4.404.B, retirement, disability, UI, Social Security, strike benefits | C: CO-331 (SS, pension, UI, other) (ok) |
| 4.404.C, support and alimony | C: CO-331 (`child_support_received`, CO-030 and CO-1714 alimony) (ok) |
| 4.404.D, rental income net of costs when passive | C: CO-4322, CO-331 (CF-2 fixed) (coverage round) |
| 4.404.E, sponsor income | C: CO-3701, CO-332 (ok; non-financial family owns 4.305.2) |
| 4.404.F, post-termination installments unearned; lump sum a resource | Fact-level (CO-030, CO-3367) (ok) |
| 4.404.G, gifts; nonprofit gifts over $300 a quarter | Gifts C: CO-030. Nonprofit cap C: CO-4308, CO-4317, CO-2339 (CF-1 fixed) (coverage round) |
| 4.404.H, dividends, interest, royalties, trust withdrawals | C: CO-1714, CO-081, CO-331 (ok) |
| 4.404.I, substantial winnings in the month received; the member's share only | C: CO-4150, CO-4151, CO-331 (ok) |

### 3.6 Exempt income (4.405-4.405.2)

| paragraph | disposition |
|---|---|
| 4.405 intro, "Only the following" | C: CO-2338, CO-2339 (CF-1 fixed; OQ-390 extended) (coverage round) |
| 4.405.A, irregular income of $30 or less in 3 months | C: CO-3822, CO-4010, CO-4077, CO-4316, CO-2338, CO-2339 (calendar quarter). CF-1 fixed (coverage round) |
| 4.405.B, money for non-household beneficiaries; pro rata | C: CO-4314, CO-2339 (CF-1 fixed) (coverage round) |
| 4.405.C, first paragraph: children's earnings | C: CO-2569, CO-2338 (ok) |
| 4.405.C, second paragraph: the 18th-birthday month | C: CO-2569 (per month: age on the last day of the month before). CF-5 fixed (coverage round) |
| 4.405.D.1, recoupments (except IPV recoupments from means-tested programs) | C: CO-4305, CO-4306, CO-2339 (CF-1 fixed) (coverage round) |
| 4.405.D.2, IV-A child support passed to IV-D | C: CO-4307, CO-2339 (CF-1 fixed) (coverage round) |
| 4.405.E, nonrecurring lump sums, refunds, retroactive payments, prison release money, diversion payments | C: CO-3367, CO-3365, CO-2339 (ok); diversion is fact-level |
| 4.405.F.1, loans | C: CO-3362, CO-2339 (ok) |
| 4.405.F.2, reverse annuity mortgage | C: CO-3820, CO-2339 (CF-1 fixed) (coverage round) |
| 4.405.G, in-kind | NA: facts are money received |
| 4.405.H.1-10, vendor payments | NA: not money received (fact-level); H.2 and H.4 diverted wages C: CO-023 gross. H.7 C: CO-4309, CO-2339 (state, local, nonprofit and supplier energy cash counted; CF-1 fixed) (coverage round) |
| 4.405.I.1-4, reimbursements | C: CO-3363, CO-2339 (ok); I.2 TANF work-expense portion is fact-level |
| 4.405.J, verification of exempt income only when questionable | C: CO-1376 (earned income net of CO-2338; CF-10 fixed). Unearned C: CO-1377 (ok) (coverage round) |
| 4.405.1, education assistance, work-study | C: CO-3360, CO-3361, CO-2338, CO-2339 (ok) |
| 4.405.2.A.1, Child Nutrition Act | NA: in-kind |
| 4.405.2.A.2, Uniform Relocation Act | C: CO-3366 (ok) |
| 4.405.2.A.3, DVSA Title II; Title I/VISTA conditional on receiving SNAP or PA on joining | Title II C: CO-3366. Title I C: CO-4303, CO-4304, CO-330 (CF-1 fixed) (coverage round) |
| 4.405.2.A.4, NCSA/AmeriCorps; disaster assistance | AmeriCorps C: CO-4016, CO-2339 (CF-1 fixed); disaster C: CO-3366 (coverage round) |
| 4.405.2.A.6, WIOA; under-19 OJT; summer youth | C: CO-3815, CO-2339; CO-4301, CO-4302, CO-4318, CO-2338 (CF-1 fixed) (coverage round) |
| 4.405.2.A.7, federal energy assistance | C: CO-3364 less CO-4309, in CO-2339 (federal part only) (coverage round) |
| 4.405.2.A.8, YIEPP, YCCIP, CETA Title IV | C: CO-3815, CO-2339 (CF-1 fixed) (coverage round) |
| 4.405.2.A.9, SCSEP (Older Americans Act Title V) | C: CO-4311, CO-2338 (CF-1 fixed) (coverage round) |
| 4.405.2.A.10, charitable cash ≤ $300 a quarter | C: CO-4308, CO-4317, CO-2339 (CF-1 fixed) (coverage round) |
| 4.405.2.A.11, ex-spouse's share of military retirement | C: CO-4312, CO-2339 (CF-1 fixed) (coverage round) |
| 4.405.2.A.12, combat pay | C: CO-4310, CO-2338 (CF-1 fixed) (coverage round) |
| 4.405.2.A.13, mandatory military education deductions | C: CO-4313, CO-2338 (CF-1 fixed) (coverage round) |
| 4.405.2.A.14, Civil Liberties Act | C: CO-3366 |
| 4.405.2.A.15, emergency assistance to migrants in the job stream | C: CO-4315, CO-2339 (CF-1 fixed) (coverage round) |
| 4.405.2.A.16, WIC | NA: in-kind |
| 4.405.2.A.17, A.19, A.24, child-care payments or value (IV-A, at-risk, CCDBG) | NA: vendor or in-kind. Reimbursements C: CO-3363 |
| 4.405.2.A.18, Agent Orange | C: CO-3366 |
| 4.405.2.A.20, EITC | C: CO-3365, CO-2339 |
| 4.405.2.A.21, Employment First payments | C: CO-3363 (reimbursements) |
| 4.405.2.A.22, PASS | C: CO-3825, CO-2339 (CF-1 fixed) (coverage round) |
| 4.405.2.A.23, RECA | C: CO-3366 |
| 4.405.2.A.25, Family Investment Centers services; HUD demonstration (Chicago) | NA: in-kind or out of state |
| 4.405.2.A.26, Nazi persecution payments | C: CO-3366 |
| 4.405.2.A.27, crime victim compensation | C: CO-3813, CO-2339 (CF-1 fixed) (coverage round) |
| 4.405.2.A.28, spina bifida allowance | C: CO-3366 ("and the like") |
| 4.405.2.B.1-21, Indian claims, judgment and trust payments ($2,000 per-capita caps) | C: CO-3366 (fact-level; the caps are not stated in the meaning, P3) |

### 3.7 Destitute households (4.406-4.406.1)

| paragraph | disposition |
|---|---|
| 4.406 intro, first month of each certification period | C: CO-055, CO-4168 (a recertification reads the month of its own application date; CF-22 recorded in the precision) (coverage round) |
| 4.406.A.1-3, B, terminated and new sources ($25, 10 days, the grower) | C: CO-055 (supplied finding), CO-348 (ok) |
| 4.406.C, repeated destitute status after postponed verification | C: CO-348 expedited (non-financial family) |
| 4.406.1.A, income from the 1st to the date of application; proration | C: CO-4166, CO-4167, CO-4168, CO-330, CO-331, CO-2308 (ok) |
| 4.406.1.B, new source over $25 not received in 10 days disregarded | C: CO-4168 precision (ok) |
| 4.406.1.C, travel advances | Fact-level (CO-3363) |

### 3.8 Deductions (4.407-4.407.61)

| paragraph | disposition |
|---|---|
| 4.407.A, deductions give net income; no deduction for vendor-paid or reimbursed expenses | C: CO-381; CO-034, CO-032, CO-035 (out of pocket, billed or paid) (ok) |
| 4.407.B-C, elective averaging and anticipation of expenses; weekly conversion | Recorded: averaged expenses are stated as the month's figure (CO-3740 precision; CF-17) (coverage round) |
| 4.407.D, child support is an exclusion | C: CO-332, CO-2003, CO-4333, CO-334 (CF-4 fixed) (coverage round) |
| 4.407.E, only five deductions | C: CO-378, CO-381 (ok) |
| 4.407.1, standard deduction by size, 6+ | C: CO-132, CO-370 (ok against D-83) |
| 4.407.2.A, 20% of earned income, including the prorated disqualified share | C: CO-136, CO-372, CO-373, CO-371 (ok) |
| 4.407.2.B, work supplementation; IHE claims | Recorded not applicable: C.R.S. 26-2-111.3 repealed (CO-373 precision; CF-18). Claims NA (coverage round) |
| 4.407.3.A, shelter over 50% of adjusted income; disqualified members' costs | C: CO-138, CO-377, CO-378, CO-379, CO-2300 (ok; OQ-30) |
| 4.407.3.B, cap except with an elderly or disabled member | C: CO-133, CO-379 (ok, $769) |
| 4.407.3.C, homeless shelter deduction $205.66; needs shelter costs; actual costs if higher | C: CO-134, CO-380, CO-381, CO-037 (ok; OQ-24 assumption) |
| 4.407.3.D, unoccupied home costs | C: CO-1585, CO-1379; conditions fact-level (ok) |
| 4.407.3.E.1, continuing charges (condominium fees, mobile home loans, home equity loans; pets excluded) | C: CO-035, CO-4345, CO-2300 (CF-15 fixed) (coverage round) |
| 4.407.3.E.2, property tax and insurance on the structure | C: CO-035 (ok) |
| 4.407.3.E.3, disaster repair | C: CO-4345, CO-2300 (CF-15 fixed) (coverage round) |
| 4.407.3.E.4-5, utilities and telephone; no internet | C: CO-1241, CO-1500 (ok) |
| 4.407.31 intro, mandatory SUA, one allowance, no actual costs | C: CO-1500, CO-377 (ok) |
| 4.407.31.A.1.a, c, d, e, HCUA routes | C: CO-1239, CO-1243, CO-3300, CO-3301 (ok) |
| 4.407.31.A.1.b, LEAP or E-EBT within 12 months | C: CO-1240, CO-1243 (H.R.1 sec. 10103 `statute_override`; OQ-251, OQ-533) |
| 4.407.31.A.2-3, irregular heating; supplemental heat does not qualify | C: CO-1239 precision (ok) |
| 4.407.31.A.4, HCUA $616 | C: CO-1235 (ok) |
| 4.407.31.B.1-3, BUA for 2+ utilities, shared, $390 | C: CO-1236, CO-1241, CO-3042, CO-1500 (ok) |
| 4.407.31.C.1-3, OUA for one non-phone utility, $73 | C: CO-1237, CO-1500 (ok) |
| 4.407.31.D.1-2, telephone only, $100 | C: CO-1238, CO-1500 (ok) |
| 4.407.4 intro, attendant care for an elderly or disabled member is medical | Fact-level (CO-034 against CO-032) |
| 4.407.4.A, dependent care; disqualified members' share | C: CO-032, CO-2301, CO-374 (ok) |
| 4.407.4.A.1-3, B, allowable costs, no cap | C: CO-032, CO-374 (ok) |
| 4.407.4.C-D, money only; JOBS/TCC-paid care not deductible | Fact-level (CO-032, out of pocket) |
| 4.407.5.A, exclusion from household gross before the gross test; minor payer | C: CO-2003, CO-4333, CO-334 (household level; CF-4 fixed) (coverage round) |
| 4.407.5.B-C, third-party payments and arrears included; alimony not | C: CO-033 (ok) |
| 4.407.5.D-E, average 3+ months or estimate | C: CO-2002, CO-2003, CO-3039 (ok; OQ-22 resolved) |
| 4.407.5.F, not reported or verified, not allowed | C: CO-2003, CO-1382, CO-3739 (ok) |
| 4.407.6 intro, over $35, elderly or disabled members only | C: CO-137, CO-376, CO-2895, CO-3740 (ok) |
| 4.407.6.A.1-7, allowable costs; premiums | C: CO-034, CO-835, CO-2895 (fact-level, ok) |
| 4.407.6.A.8, attendant wages | C: CO-034 |
| 4.407.6.A.8, attendant meals (one-person maximum allotment) | C: CO-4334, CO-2895 (table row in force on the application date; CF-6 fixed) (coverage round) |
| 4.407.6.A.8, unverified reimbursement: no deduction until known | Fact-level (out of pocket) |
| 4.407.6.B.1-6, non-allowable costs; carried-forward bills | Fact-level (CO-034) |
| 4.407.61.A, SMED $165 against actual expenses | C: CO-1514, CO-376 (ok; OQ-353) |
| 4.407.61.A table (application and recertification verification) | C: CO-1380, CO-3740. Partial verification: recorded limit (CO-3740 precision; CF-17) (coverage round) |
| 4.407.61.B, weekly conversion; excess over $35 | C: CO-376; conversion fact-level, recorded (CF-17) (coverage round) |
| 4.407.61.C, averaging one-time expenses | Recorded: stated as the month's averaged figure (CO-3740 precision; CF-17) (coverage round) |

### 3.9 Resources (4.408-4.410)

| paragraph | disposition |
|---|---|
| 4.408.A, BCE/ECE exempt from the resource test | C: CO-342, CO-344 (ok) |
| 4.408.B, resources available in the issuance month | C: CO-343 (as of the determination date, ok) |
| 4.408.B, sponsor resources less $2,000 | C: CO-3704 (records 4.305.2.D.6 $1,500 against 4.408.B $2,000; follows $1,500 with the federal text) (ok) |
| 4.408.C, declared liquid resources for expedited service | C: CO-1740, CO-348 (ok; non-financial family owns 4.205) |
| 4.408.D-E, two limits; $4,500 stated | C: CO-118, CO-119 ($4,750 `statute_override`, OQ-251 part 2 resolved) (ok) |
| 4.206.C.3.b, resources "below" the limit | C: CO-344, at or below, statute override by 7 CFR 273.8(b) (CF-13 fixed) (coverage round) |
| 4.408.1 intro, A-B, valuation (redemption value, fair market value less encumbrances, assessor) | Fact-level (CO-3390, CO-3393: equity) (ok) |
| 4.408.2 intro, A.1-4, B, C, transfer disqualification | C: CO-4155 to CO-4160, CO-3834, CO-3835, CO-4009, CO-4157 (ok); initial month C: CO-2308 (CF-9 fixed) (coverage round) |
| 4.409.A, liquid resources | C: CO-3390, CO-4176 (ok) |
| 4.409.B, non-liquid at equity | C: CO-3393, CO-074 (ok) |
| 4.409.C, jointly owned counted in entirety unless inaccessible | C: CO-4340, CO-4343, CO-4176, CO-074 (CF-8 fixed); inaccessible part CO-4175 (coverage round) |
| 4.409.D, commingled exempt funds keep the exclusion 6 months | Fact-level (CO-4172 to CO-4174 "still held") (P3, unrecorded) |
| 4.410.A, all vehicles | C: CO-074 (vehicles not read) (ok) |
| 4.410.B, home and surrounding property; temporarily unoccupied | C: CO-3393 meaning excludes the home (ok) |
| 4.410.B, lot to build a home | C: CO-4336, CO-074 (CF-7 fixed) (coverage round) |
| 4.410.C, prorated income exempt as a resource | C: CO-4319, CO-4176 (coverage round) |
| 4.410.D.1, household goods, burial plot, life insurance cash value, livestock | C: CO-074 (not read) (ok) |
| 4.410.D.2, retirement accounts | C: CO-3392 (not read by SNAP) (ok) |
| 4.410.D.3, education accounts | C: CO-4174, CO-4176 (ok) |
| 4.410.D.4, one funeral agreement per member up to $1,500 | C: CO-3856, CO-4177, CO-074 (ok; burial-plot portion P3) |
| 4.410.E.1, 3, income-producing property and vehicles | C: CO-3393 meaning ("not used to produce income") (ok) |
| 4.410.E.2, installment contracts | C: CO-4337, CO-074 (CF-7 fixed) (coverage round) |
| 4.410.E.4, farm property one year after self-employment ends | C: CO-4346, CO-4347, CO-4348, CO-074 (CF-7 fixed) (coverage round) |
| 4.410.F.1, irrevocable trusts, probate, liens, real property for sale | Liquid C: CO-4175. Real property for sale C: CO-4335, CO-074 (CF-7 fixed) (coverage round) |
| 4.410.F.2, non-liquid ≤ $1,500 net return inaccessible | C: CO-4339, CO-074 (one holding per person: recorded limit; CF-7 fixed) (coverage round) |
| 4.410.F.3.a-e, trusts | C: CO-4175 (liquid trusts) (ok); withdrawals as income C: CO-1714 |
| 4.410.G, no significant return (over $1,500) | C: CO-4338, CO-4339, CO-074 (after the costs of sale; CF-7 fixed) (coverage round) |
| 4.410.H, battered women in shelters | C: CO-4175 meaning (ok) |
| 4.410.I, exclusions apply to ineligible and disqualified members' resources | C: CO-343 sums all members (ok) |
| 4.410.J.1, 2, 4, 5, 6, 9, 10, 11, 13, 14, 16, government payments excluded as resources | Fact-level: held proceeds are not stated in CO-3390 as excluded. A receipt in the month is income-excluded, and a remainder still held has no exclusion fact. P3: no SNAP fact for excluded-statute funds held; combine with CF-1's new facts |
| 4.410.J.3, disaster restoration payments | Same as J.1 (P3) |
| 4.410.J.7, HUD rental refunds in the month received and the next | Same (P3) |
| 4.410.J.8, military education deductions | NA: not held |
| 4.410.J.12, federal EITC (month and the next); 12 months while participating | C: CO-4172, CO-4173, CO-4176 (ok) |
| 4.410.J.15, crime victim compensation | **CF-1** (income); held balance P3 |
| 4.410.J.17, federal tax refunds for 12 months | C: CO-4172, CO-4176 (ok) |

### 3.10 Disqualified and non-household members (4.411)

| paragraph | disposition |
|---|---|
| 4.411.1.A, grounds | C: CO-2302, CO-2565, CO-311 (ok) |
| 4.411.1.B.1.a, IPV, work sanction, fleeing felon: income, resources and deductions in full | C: CO-333, CO-343, CO-371, CO-2300, CO-2301, CO-376 (ok) |
| 4.411.1.B.1.b, excluded from size; no increase (273.11(c)(1)(ii)) | C: CO-313, CO-4169 to CO-4171, CO-4182 (ok; N-7 spot-checked) |
| 4.411.1.B.2.a, resources in full | C: CO-343 (ok) |
| 4.411.1.B.2.b, pro rata income; ineligible non-citizen who is also an ineligible student | C: CO-333, CO-3714 (ok) |
| 4.411.1.B.2.c, EID on the prorated share; shelter and dependent care prorated; child support before proration; SUA not prorated | C: CO-371, CO-2300, CO-2301, CO-332, CO-377 (ok); medical OQ-641 |
| 4.411.1.B.2.d, excluded from size | C: CO-313 (ok) |
| 4.411.2.A, non-household members: income and resources not available; cash payments counted; shared expenses | C: CO-3714, CO-305, CO-2300 (ok); cash payments fact-level |
| 4.411.2.B.1-2, combined wages | Fact-level (P3) |
| 4.411.2.C, ineligible students | C: CO-3714, CO-343, CO-333, CO-336 (ok) |

### 3.11 Verification (4.500-4.504.61, 4.506-4.507)

| paragraph | disposition |
|---|---|
| 4.500.A-B, definitions; case record | NA: definitions and case documentation |
| 4.500.C, verification notice | NA: notice procedure |
| 4.500.D, household responsibility; agency assists | NA: procedure |
| 4.500.E, refusal to cooperate in a review: ineligible | NA: quality control and review procedure, outside determination (P3; unrecorded) |
| 4.501, prudent person | NA: worker judgment |
| 4.502.A.1, expedited: identity only, other verification postponed | C: CO-1370, CO-1387, CO-3729 to CO-3731, CO-1393 (non-financial family) |
| 4.502.A.2.a, c, d, e, identity, IEVS and SSN, non-citizen status, residency | Non-financial family (CO-1370, CO-1373 to CO-1375) |
| 4.502.A.2.b, gross nonexempt income | C: CO-1376, CO-1377, CO-1604, CO-1605 (CF-10) |
| 4.502.A.3, expenses unverified at 30 days determined without the deduction | C: CO-1595, CO-1618, CO-3739, CO-2003, CO-2300, CO-2301, CO-3740 (ok) |
| 4.502.A.3.a-d, medical, child support, dependent care, shelter if questionable | C: CO-1380, CO-1382, CO-1381, CO-1379 (ok) |
| 4.502.A.4, BCE/ECE relief | C: CO-1374 to CO-1378, CO-1616 (OQ-311 resolved) (ok) |
| 4.502.A.5, declaration over the limit is verification | C: CO-1378 (resources verified only if questionable) (ok) |
| 4.502.B.1, recertification: only what is incomplete, inaccurate, questionable or outdated | C: CO-2321 to CO-2331 arms (ok) |
| 4.502.B.2, income change of $50 | C: CO-1596, CO-1619 (OQ-371: CF-20, owned by the non-financial track) (coverage round) |
| 4.502.B.3, expenses: source change or more than $25 | C: CO-1597, CO-1380, CO-1381. CO-1382: any change, statute override by 273.2(f)(8)(i)(A) (CF-11 fixed) (coverage round) |
| 4.502.B.4, SSNs | Non-financial family |
| 4.502.B.5, declaration over the limit | C: CO-1378 (ok) |
| 4.502.B.6, unverified expense at recertification | C: CO-3739 (ok) |
| 4.502.C.1.a-g, periodic report verification | Out of scope, recorded in docs/colorado-notes.md (CF-12) (coverage round) |
| 4.502.C.2, 24-month expenses continue | Out of scope, recorded in docs/colorado-notes.md (CF-12) (coverage round) |
| 4.503, case documentation | NA: case record |
| 4.504 intro, 4.504.1, 4.504.2.A-C, 4.504.3, any pertinent evidence; documents; collateral contacts; home visits | C: the document and collateral facts (CO-1316, CO-1324 etc.) (ok); procedure NA |
| 4.504.2.D-E, third party fails to cooperate; discrepancies | NA: procedure; worker arrives at a figure (P3, unrecorded) |
| 4.504.4, SAVE | Non-financial family |
| 4.504.5.A-C, IEVS notice and requests | NA: agency procedure |
| 4.504.5.D, H.3.b, DOLE check before approval | NA: agency-side check with no household verification (wage data not VUR: C CO-1376) |
| 4.504.5.E, no delay for IEVS | NA: processing standard |
| 4.504.5.F, act within 45 days | NA: change processing |
| 4.504.5.G.1-2, DOLE wages and IRS unearned not verified | C: CO-1376 precision; CO-1318 (ok) |
| 4.504.5.H.1-4, match sources | C: CO-1318, CO-1361 (ok) |
| 4.504.6.A-C, VUR acted on and verified | C: CO-1318, CO-1361 (CF-14) |
| 4.504.6.D.1, D.3, SSA, SSI and UIB | C: CO-1318 (ok) |
| 4.504.6.D.4, D.6, PA and ACSES | C: CO-1318 (precision corrected, CF-14), CO-1328 (coverage round) |
| 4.504.6.D.2, D.5, D.7-D.12 (death, PA changes, EF non-compliance, IPV, SAVE, composition, fleeing felon) | NA here (non-financial or change processing) |
| 4.504.61.A-B.1-10, not VUR | C: CO-1376 (DOLE wages), CO-1318 meaning (VA and railroad retirement through IEVS not listed as electronic sources) (ok) |
| 4.505, 4.505.1-4.505.8 | Other family (non-financial verification) |
| 4.506 intro, gross nonexempt income before initial certification; recertification at $50 or a source change | C: CO-1376, CO-1377, CO-1619 (CF-10 fixed; CF-20 non-financial track) (coverage round) |
| 4.506.A.1-3, means of verification | C: document and collateral facts (ok) |
| 4.506.A.4, a cooperating client not denied for a third party's refusal | NA: worker estimates a figure (P3, unrecorded) |
| 4.506.B, continuing employment: last month's pay | NA: anticipation method (CF-3) |
| 4.506.C, self-employment statement accepted unless questionable | C: CO-1376 (OQ-760, CF-16) (coverage round) |
| 4.506.D, educational assistance needs no verification | C: CO-1377 reads income net of exclusions (ok) |
| 4.506.E.1-3, terminated employment | Non-financial family (voluntary quit, CO-2310 etc.) |
| 4.506.F, no-income statement accepted | C: CO-1376, CO-1377 (no income, nothing required) (ok) |
| 4.507.A, dependent care verified to grant the deduction | C: CO-1381, CO-1614, CO-2301 (ok) |
| 4.507.B.1, shelter declaration accepted unless questionable | C: CO-1379 (ok) |
| 4.507.B.2, unoccupied home: actual utility costs | C: CO-1379, CO-1585 (OQ-312) (ok) |
| 4.507.B.3, shelter not verified in 30 days: no deduction | C: CO-2300, CO-3739 (ok) |
| 4.507.B.4, restoration | NA: restoration of lost benefits |
| 4.507.C.1, medical before initial certification; recertification at $25 | C: CO-1380, CO-1597 (ok) |
| 4.507.C.2, anticipated medical changes | NA: anticipation, fact-level |
| 4.507.C.3, changes during certification | Out of scope, recorded in docs/colorado-notes.md (CF-12) (coverage round) |
| 4.507.C.4, averaging one-time expenses in 24-month periods | Recorded (CO-3740 precision; CF-17) (coverage round) |
| 4.507.D.1-3, documents for obligation and payment | C: CO-1363, CO-1328 (fact-level; D.3 distinction P3) |
| 4.507.D.4, agency obtains CSE data | C: CO-1328 (ok) |
| 4.507.D.5, re-verify at recertification and periodic report | C: CO-1382 (statute override: unchanged support verified only if outdated; CF-11 fixed); periodic report out of scope (CF-12) (coverage round) |

### 3.12 Federal cross-check (where the volume follows federal text)

| paragraph | disposition |
|---|---|
| 273.8(b), limits "shall not exceed" | C: CO-118, CO-119, CO-344 (statute override; CF-13 fixed) (coverage round) |
| 273.8(c), resources considered | C: CO-3390, CO-343 (ok) |
| 273.8(d), jointly owned | C: CO-4340, CO-4343 (CF-8 fixed) (coverage round) |
| 273.8(e)(1)-(19), exclusions | As in 3.9; (e)(8) and (e)(19) C: CO-4335 to CO-4339, CO-074 (CF-7 fixed) (coverage round) |
| 273.8(f), (h), (i), transfers and resources of non-household members | C: CO-4155 to CO-4160, CO-3714 (ok) |
| 273.9(a), income standards | C: CO-110 to CO-114, CO-345, CO-346 (ok) |
| 273.9(b)(1), earned income, rental earned at 20 hours, boarders | C: CO-330, CO-1702, CO-4165 (CF-2 for passive rental) |
| 273.9(b)(2), unearned income including net passive rental | C: CO-331, CO-4322 (CF-2 fixed) (coverage round) |
| 273.9(c)(1)-(19), exclusions | C: CO-2338, CO-2339 (CF-1 fixed); (c)(17) child support CO-4333 (CF-4 fixed) (coverage round) |
| 273.9(d)(1), standard deduction | C: CO-370 (ok) |
| 273.9(d)(2), earned income deduction | C: CO-373 (ok) |
| 273.9(d)(3), medical; attendant meals (x) | C: CO-376, CO-2895, CO-4334 (CF-6 fixed) (coverage round) |
| 273.9(d)(4), dependent care | C: CO-374 (ok) |
| 273.9(d)(6), shelter, homeless, SUA | C: CO-379, CO-380, CO-1500 (ok) |
| 273.10(a)(1)-(2), month of application, proration, initial month | C: CO-2305, CO-2308, CO-385 (CF-9 fixed) (coverage round) |
| 273.10(c)(1)-(3), anticipation, conversion, averaging | C: CO-4324, CO-4323, CO-1702, CO-4329, CO-4349, CO-331 (CF-3 fixed) (coverage round) |
| 273.10(e)(1), computation order and rounding | C: CO-334, CO-378, CO-381 (ok) |
| 273.10(e)(2)(i)-(iii), eligibility tests, allotment, minimum, zero-benefit 3+ | C: CO-347, CO-382, CO-384, CO-2307, CO-386 (ok) |
| 273.10(e)(3), destitute households | C: CO-4168 (ok; CF-22) |
| 273.11(a), self-employment and farm loss | C: CO-1700 to CO-1702, CO-3720 to CO-3725 (ok); averaging (a)(1) C: CO-4329, CO-4349 (CF-3 fixed) (coverage round) |
| 273.11(b), boarders | C: CO-4165 (ok) |
| 273.11(c)(1)-(3), disqualified and non-household members | C: as in 3.10 (ok) |
| 273.11(r), substantial winnings | C: CO-4150 to CO-4153 (ok) |
| 273.2(f)(1)(i), gross nonexempt income | C: CO-1376, CO-1377 (CF-10 fixed; CF-16 OQ-760) (coverage round) |
| 273.2(f)(1)(iii)-(iv), (xii), utility, medical, child support | C: CO-1379, CO-1380, CO-1382 (ok at application) |
| 273.2(f)(2)-(3), questionable items; unverified expenses | C: CO-1378, CO-1379, CO-3739 (ok) |
| 273.2(f)(8)(i)(A), recertification | C: CO-1619, CO-1380, CO-1381 (ok); CO-1382 (CF-11 fixed); OQ-371 CF-20 (non-financial track) (coverage round) |
| 273.2(f)(8)(ii), changes during certification | Out of scope, recorded (CF-12) (coverage round) |

Matrix size: 293 rows.
- 265 rows cover 4.207.2-4.207.3, 4.400-4.411, 4.500-4.504.61 and 4.506-4.507.
- 28 rows are the federal cross-check.
- 69 of the 293 rows point at a gap or a finding (CF-1 to CF-22).
- The rest are carried by items read against the text, fact-level, not applicable with a reason, or owned by the other family (4.505, 4.502.A.2.a/c/d/e, 4.506.E).

## 4. Open-question confirmations (financial scope)

| OQ | class in the volume | confirmation |
|---|---|---|
| OQ-30 (shelter intermediate floor) | state policy choice | Correct. 273.10(e)(1)(i)(H) and 4.407.3 are silent, and F-21 shows no outcome changes. |
| OQ-251 (H.R.1 sec. 10103 date) | blocked on a named document | Correct. The FNS implementation page (fns.usda.gov, now redirecting to fna.usda.gov/working-families-tax-cuts/snap/implementation, fetched 2026-11-22) links its memorandum only on www.usda.gov. |
| OQ-353 (SMED $165-$200) | state policy choice | Acceptable. The body itself names Colorado's SMED demonstration terms as the deciding text and says it is not on an allowed host. "Blocked on a named document (Colorado SMED demonstration approval)" would be the more exact class (P3). |
| OQ-356 (ECE "below" or "at or below") | state policy choice | Correct. No federal text sets the BBCE comparison word; 4.206.C.2.a.1 and 4.401.A.1 conflict. |
| OQ-371 ($50 boundary at recertification) | state policy choice | **Misclassified (CF-20).** 273.2(f)(8)(i)(A) forbids verifying a change of $50 or less, and 4.502.B.2's second sentence agrees. The volume's reading is required by federal text, not chosen. |
| OQ-533 (H.R.1 implementation dates) | blocked on a named document | Correct, for the same reason as OQ-251. CDHS's agency letter is not on an allowed host. |
| OQ-641 (medical expenses of a prorated member) | state policy choice | Correct. 4.411.1.B.2.c and 273.11(c)(2)(iii) are silent on medical expenses. |
| OQ-13, OQ-22, OQ-311, OQ-312 | resolved | Resolutions hold against the texts (sections 3.2, 3.8, 3.11). |
| OQ-390 | resolved | The resolution's premise, that SNAP's exclusion input states the part of the gross that 4.405 excludes, no longer holds: CO-2338 and CO-2339 became closed sums and miss the facts the cash round added (**CF-1**). Reopen it or extend it. |

Not reviewed here, because they belong to the non-financial family: OQ-1, OQ-12, OQ-640, OQ-730.

## 5. Earlier P1s (final-snap, final2-snap): spot-check

All checks were run on the snapshot.

| id | result | evidence |
|---|---|---|
| N-1 (lottery) | fixed | CO-115 with $5,000 winnings gives `substantial_lottery_winnings`. CO-4150 to CO-4153 are read by CO-331, CO-386, CO-387 and CO-2307. CF-9 notes CO-2308 lacks the gate; it is moot here because the winnings fail the income test. |
| N-4 (transfer) | fixed for the full month | CO-4155 to CO-4160 are correct. The initial month still issues a benefit: **CF-9**. |
| N-5 (boarders) | fixed | CO-115 with $700 from one boarder gives gross 1,394 (700 − 306). CO-330-T6 passes. |
| N-6 (destitute) | fixed | CO-4166 to CO-4168. CO-330-T7 passes. |
| N-7 (exclusion must not raise the allotment) | fixed | CO-4169 to CO-4171, CO-4182 in CO-2307. |
| N-8 (exclusions held as liquid) | fixed | CO-115 with $5,500 liquid, of which $2,500 is a refund, gives countable resources 3,000. |
| F-1 ($10 initial month) | fixed | CO-385, CO-3700. |
| F-8 (farm loss) | fixed | CO-3720 to CO-3725. |
| F-10 / V-5 (unverified expenses) | fixed | CO-115 base: 1000 / 583 / 387 / `expenses_disallowed`. |
| F-11 (18+ row) | fixed | CO-3726, CO-383. |

All 3,311 rule tests and 2,793 household expectations pass at `5fc915b`.

## Disposition (coverage round)

Fix track: SNAP financial, 2026-11-22, on `ccr-9d19bf4c-wmnwcl` at `a2ed7f0`. Governing text re-read from 10 CCR 2506-1 (rule version 12718, effective 10/01/2026, re-downloaded from the Secretary of State 2026-11-22) and 7 CFR 273.8, 273.9 and 273.10 (eCFR versioner, as of 2026-11-18); new excerpts S3100-S3130. Every reproduction in section 2 was re-run on CO-115 and CO-83 with the reviewer's overrides and now gives the expected figure; the matrix rows in section 3 are updated in place (marked "coverage round"). Commits: `608bed2` (income), `dade8fd` (computation, resources, allotment), `7fe7415` (verification), `5219795` (households, notes, UI counts).

| id | sev | disposition |
|---|---|---|
| CF-1 | P1 | Fixed (`608bed2`). CO-2338 and CO-2339 read CO-3813, CO-3815, CO-3820, CO-3822 and CO-4010 (calendar quarter, $30, CO-4316), CO-3825, CO-4016, and new neutral facts CO-4300 to CO-4315 (non-WIOA training allowances, WIOA OJT with the under-19 test CO-4318, summer youth wages, VISTA and the joined-on-SNAP fact, recoupments less the intentional-violation part, IV-D child support, need-based charitable cash with the $300 quarterly limit CO-4317, nonprofit and supplier energy cash, combat pay, SCSEP, a former spouse's military retirement, military education deductions, money for a beneficiary living elsewhere, migrant emergency assistance). VISTA and non-WIOA training allowances move to earned income (CO-330). CO-3366 and CO-3364 keep their meanings; SNAP subtracts the parts it counts. CO-331's stale assumption removed. Reproduced: 237, 237, 267, 297, 297, 381 now 387 each. Recoupment (CO-3605) is not read: it is Medical Assistance's federal-assistance garnishment, not SNAP's same-source recoupment, so SNAP reads CO-4305. |
| CF-2 | P1 | Fixed (`608bed2`). rental_income_received (part of CO-1714) and rental_property_costs, netted in snap_rental_income (CO-4320 to CO-4322) and swapped in CO-331. Reproduced: 87 now 267. |
| CF-3 | P1 | Fixed (`608bed2`). Wages by pay frequency at 4.3, 2.15, 2 (CO-4323, CO-4324, reading CO-3921, CO-3922); annual contract pay over twelve months (CO-4325, CO-4326); self-employment that is annual support averaged over the twelve months before the application month or its months in operation, unless business changed substantially (CO-4327 to CO-4329, CO-4342, CO-4344, CO-4349, in CO-1702 and the farm loss CO-3722); unearned income paid every other month to annually converted (CO-4330 to CO-4332); prorated income held exempt as a resource (CO-4319, 4.410.C). Educational income is excluded in full (NA); elective averaging and part-support self-employment are stated by month (recorded). Reproduced: 327 now 369. |
| CF-4 | P1 | Fixed (`dade8fd`). snap_counted_child_support_exclusion (CO-4333) is subtracted from the household total in CO-334, the prorated member's share as "deducted before prorating" gives; CO-332 no longer subtracts it. Reproduced on CO-83: 743 now 808 (both payers). |
| CF-5 | P1 | Fixed (`608bed2`). CO-2569 is per month and tests the age on the last day of the month before. Reproduced: 291 now 387 in February; counted from March. |
| CF-6 | P1 | Fixed (`dade8fd`). furnishes_majority_of_attendant_meals (CO-4334) adds the one-person row of snap_maximum_allotment_table in force on the application date (CO-2895). |
| CF-7 | P1 | Fixed (`dade8fd`). Parts of real_property_other_than_home_equity for sale, the lot for a home, installment contracts and former farm property within a year (CO-4335 to CO-4337, CO-4346 to CO-4348) are subtracted, and what remains is inaccessible at $1,500 or less after the costs of sale (CO-4338, CO-4339) in CO-074. Recorded limit: a person's real property is one figure, so several parcels are tested together. Reproduced: the $1,200 land counts 0. |
| CF-8 | P1 | Fixed (`dade8fd`). Joint owners' shares the person can reach (CO-4340 in CO-4176, CO-4343 in CO-074). |
| CF-9 | P1 | Fixed (`dade8fd`). CO-2307 adds the striker condition; CO-2308 adds the winnings, transfer and striker conditions. (Gating CO-385 on snap_is_eligible gave the same answers but buried the allotment's walkthrough under the eligibility step, so the gates went into the two computations, the reviewer's second option.) Reproduced: striker 387 now 0; the transfer's initial month 232 now 0 (CO-2308-T5). |
| CF-10 | P1 | Fixed (`7fe7415`). CO-1376 tests SNAP wages net of CO-2338 and accepts an LLC or S-corporation owner's statement (CO-4341) unless questionable. Reproduced: 3 pending now 2. |
| CF-11 | P1 | Fixed (`7fe7415`). CO-1382 verifies child support at recertification on any change or when outdated, with a statute override of 4.502.B.3 and 4.507.D.5 by 7 CFR 273.2(f)(8)(i)(A); the federal text settles D.5 (unchanged support "only if ... outdated"), so no open question. Reproduced: false now true. |
| CF-12 | P1 | Recorded out of scope in docs/colorado-notes.md (`5219795`), the reviewer's second option, which makes it P2: the volume determines at application and recertification; the periodic report and changes during certification are case maintenance between determinations. Deferred P2: a periodic-report determination needs its own case action fact and an arm in every SNAP verification item, financial and non-financial. |
| CF-13 | P2 | Fixed (`dade8fd`): statute override on CO-344 by 7 CFR 273.8(b) (S3120). |
| CF-14 | P2 | Fixed (`7fe7415`): CO-1318's precision names the PA and ACSES matches (S3125); meaning unchanged. |
| CF-15 | P2 | Fixed (`dade8fd`): shelter_other_continuing_charges (CO-4345) read in CO-2300; CO-035 unchanged. |
| CF-16 | P2 | Open question OQ-760 (blocked on FNS's approval of a Colorado waiver of 273.2(f)(1)(i), if any; the FNS waiver page lists none). |
| CF-17 | P2 | Deferred: recorded in CO-3740's precision (a case states the verified part to give the SMED; averaged expenses are stated as the month's figure). A verified-amount fact needs an ID the range no longer had. |
| CF-18 | P2 | Fixed (`7fe7415`): recorded in CO-373's precision (C.R.S. 26-2-111.3 repealed). |
| CF-19 | P2 | Deferred: recorded in docs/colorado-notes.md; modeling needs a joint-SSI-application fact and a release date. |
| CF-20 | P2 | Not taken: OQ-371 is the SNAP non-financial track's, per the round's assignment. |
| CF-21 | P3 | Fixed (`dade8fd`): CO-4165 reads the 18-or-more figure as CO-383 does. |
| CF-22 | P3 | Recorded (`7fe7415`): CO-4168's precision; a recertification reads the month of its own application date. |
| OQ-390 | - | Extended, still resolved (`608bed2`): the closed-sum premise is replaced by the full 4.405 reading, and the remainder (in-kind, vendor, reimbursements, Indian payments) is accounted for. |
| matrix P3 notes | - | Not taken: 4.409.D commingled funds, 4.410.J held government payments, 4.411.2.B combined wages, 4.504.2.D-E, 4.506.A.4 stay as the matrix records them. |

Households: CO-155 to CO-159 added from the reviewer's probes (CF-1/CF-2, CF-3, CF-4, CF-9, CF-5), each with a hand derivation; no existing household expectation changed. Rule tests changed only by added givens (CO-385-T2 to T8, CO-2307 and CO-2308 tests state the new gate facts) and CO-332-T3 (1,700 to 2,000: the exclusion now comes off the household total, CO-4333).

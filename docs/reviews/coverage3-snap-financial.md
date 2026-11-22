# Coverage matrix, third pass: SNAP financial eligibility (family `snap-financial`)

Reviewer: independent coverage reviewer, third exhaustive pass, after the coverage pass 2 fix round. Read-only, on HEAD `5e955da`, run in a `git archive` snapshot in scratch with node_modules symlinked. `npm run export -- --volume co` wrote 2,190 items to `conformance/co/ledger.json`; item derivations below were read from it (plain-English derivations, meanings and precisions). The matrix was rebuilt from the rule text; the two earlier matrices (`coverage-snap-financial.md`, `coverage2-snap-financial.md`) were opened only for their findings, dispositions and recorded P3s.

Texts read in full:
- D-82, 10 CCR 2506-1 (rule version effective 2026-10-01): 4.207.2-4.207.3 (lines 2553-2661); 4.400-4.411.2 (lines 5687-8738); 4.500-4.504.61 (lines 8740-9306); 4.506-4.507 (lines 9823-10037). 4.505 (non-financial verification) belongs to the non-financial family.
- D-83 and D-84, the FNS FY 2027 tables (maximum and minimum allotments, deductions, asset limits, income standards).
- Cross-checks: D-12, D-13, D-14, D-15 (7 CFR 273.8-273.11); D-95 and D-116 (273.2(f), (f)(8)).

How households were reproduced: `scripts/evm.ts`, a scratch copy of `eval-case.ts` (not in the repo) that overrides a stored case's person facts (`p1`), month defaults (`p1@default`), month facts (`p1@2027-02`) and case facts before evaluating. Base households:
- CO-115: a homeless father earning $1,000 with a six-year-old, applied 2026-11-02, evaluated 2027-02. Base: gross 1,000, allotment 387, `expanded_categorical`, 5 required verifications for p1.
- CO-115 as a recertification: `snap_determination_is_recertification` true, plus the recertification facts the stored case lacks (income, source, child support and outdated-information facts as of the last certification). With wages 1,000 and `snap_income_at_last_certification` 1,000, unchanged source: `snap_income_changed_since_last_certification` false, earned-income verification false.
- CO-83 for child support; CO-195 for the C2-4 recertification.

## 1. Verdict

**5 P1 found.** Three are verification requirements (C3-1 to C3-3), one a benefit amount (C3-4), one resource eligibility (C3-5).
- C3-2 is a regression of the pass-2 fix of C2-4 (CO-1619).
- C3-3 sits on a fact the pass-1 fix round added (CO-4345) that the verification item never read.
- C3-1 and C3-4 are in paragraphs both earlier passes marked carried.
- C3-5 is a severity reclassification, not a new defect: both earlier passes recorded the gap as P3 and it was not taken. It affects the resource test, so under this brief's rule it is P1 unless a reason is recorded in the volume. The caller may prefer to record a reason in colorado-notes and keep it P3. That is a decision for the policy owner, not a code fix the reviewer can wave through.

Every earlier P1 (CF-1 to CF-12, C2-1 to C2-4) stays fixed (section 5). No regression was found in CO-4682, CO-2338, CO-2339, CO-2569, CO-4176, CO-4324, CO-2307, CO-2308, CO-4680 or CO-330 to CO-344. The fix items CO-4300 to CO-4349 implement what they cite, except the two gaps above that read them (C3-1, C3-3).

## 2. Findings

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| C3-1 | P1 (verification) | 4.506 (first paragraph); 4.502.A.2.b; 4.403.A.2, B.1, C; 273.2(f)(1)(i) | CO-1376 (`snap_requires_verification_of_earned_income`), CO-1377 (`snap_requires_verification_of_unearned_income`), CO-330, CO-2339, CO-4300, CO-4303 | 4.506: "Monthly, gross nonexempt income shall be verified prior to initial certification". 4.502.A.2: "The following information shall be verified prior to certification: ... b. Household's gross nonexempt income". | Since CF-1, two receipts stated in the unearned income facts are counted as earned income: training allowances other than WIOA (4.403.B.1) and Title I (VISTA) payments to a person not on SNAP or PA on joining (4.403.A.2, C). CO-2339 removes them from unearned income and CO-330 adds them to earned income. Neither verification item sees them:<br>- CO-1376 asks for earned income only when `snap_person_wages` less LLC wages and excluded earnings is above 0, or for questionable self-employment;<br>- CO-1377 asks only when `snap_person_unearned_income`, which no longer holds them, is above 0.<br>So counted nonexempt income is never verified.<br>**Reproduced** on CO-115: p1 has no wages and a $1,000 vocational training allowance (`workforce_program_payments_received` = `vocational_training_allowance_received` = 1,000). Earned income 1,000, gross 1,000, allotment 387. Both verification items are false and p1's required count is 4. With $1,000 of wages instead, earned-income verification is true and the count is 5. | In CO-1376's countable-earned test, add the earned income CO-330 adds beyond wages: `vocational_training_allowance_received`, and `dvsa_title_i_volunteer_payments_received` when `received_snap_or_public_assistance_when_joined_vista` is false. Or read CO-330 less self-employment and boarder income. Add tests for an allowance-only and a VISTA-only member. |
| C3-2 | P1 (verification; regression of the C2-4 fix) | 4.506 ("verified at recertification when ... the amount of income has changed more than fifty dollars ($50), or the source of income has changed"); 4.502.B.1-2; 273.2(f)(8)(i)(A) | CO-1619 (`snap_income_changed_since_last_certification`), CO-1568, CO-1376, CO-1377 | 273.2(f)(8)(i)(A): "The State agency shall not verify income if the source has not changed and if the amount is unchanged or has changed by $50 or less". 4.502.B.1: "Unchanged information shall not be verified unless the information is outdated." | The C2-4 fix made CO-1619 compare "the month's income as SNAP counts it" with CO-1568, whose meaning asks for the same figure as last verified. But CO-1619 builds that figure as wages plus net self-employment, less excluded earnings, plus unearned income. It leaves out what CO-330 adds: training allowances, Title I payments counted as earned, and net boarder income (4.403.2.C). The stored figure includes them and the comparison does not, so every unchanged recertification of such a member shows a change of more than $50.<br>**Reproduced** on the CO-115 recertification: p1 has wages 1,000 and a $500 training allowance, CO-1568 = 1,500, unchanged source. CO-1619 is true and `snap_requires_verification_of_earned_income` is true; both should be false. Control: wages 1,000 only, CO-1568 = 1,000 gives false and false. | Compare `snap_person_earned_income` + `snap_person_unearned_income`, less `snap_striker_income_above_current`, which CO-1568 does not hold. Or add the three missing terms to both sides of CO-1619. Say in CO-1568's meaning that training allowances, counted VISTA and net boarder income are included. Add a recertification test with an allowance. |
| C3-3 | P1 (verification) | 4.507.B.1 ("unless questionable"); 4.502.A.3.d; 4.407.3.E.1-3; 273.2(f)(2)(i) | CO-1379 (`snap_requires_verification_of_shelter_costs`), CO-2300, CO-4345 | 4.507.B.1: "A household's declaration of its responsibility to pay shelter and utility costs ... shall be considered an acceptable source of verification, unless questionable". 4.502.A.3: "d. Shelter expenses, if questionable and verification has been requested." | The pass-1 fix of CF-15 added `shelter_other_continuing_charges` (CO-4345): condominium and association fees, mobile-home loans, home-equity and second-mortgage payments, reverse-mortgage repayments and disaster repairs. CO-2300 counts it as shelter cost, but CO-1379 requires verification only when `shelter_cost_monthly` (CO-035) is above 0. When those charges are the household's only shelter cost and are questionable, verification is never asked for. CO-2300's disallowance of shelter costs still unverified after 30 days (4.507.B.3) then cannot apply either.<br>**Reproduced** on CO-115: p1 has $400 of `shelter_other_continuing_charges` and `shelter_costs_attestation_is_questionable` true. `snap_shelter_costs` is 400, the allotment 419 (387 without them), and verification is false. The same attestation with a stated `shelter_cost_monthly` gives true. | In CO-1379's amount test, read `shelter_cost_monthly` + `shelter_other_continuing_charges`. Add a test. |
| C3-4 | P1 (benefit) | 4.402.A.2; 273.10(c)(2)(i) | CO-331 (`snap_person_unearned_income`), CO-4323, CO-4330, CO-027, CO-028 and the other unearned receipt facts | 4.402.A.2: "When determining if a household is eligible under gross and/or net income limits, households shall have income converted to a monthly amount by using a conversion as specified below ... Weekly Multiply Weekly Average by 4.3. Bi-Weekly ... by 2.15." 273.10(c)(2)(i): income "received on a weekly or biweekly basis" is converted by 4.3 and 2.15. | The conversion covers income, not only wages. The unearned facts are "the gross amount received for the month" (CO-027 unemployment, CO-028 child support received, and the others). CO-331 converts only income paid less often than monthly: CO-4330's options are every other month, quarterly, twice a year and annual. Weekly or biweekly unearned income (unemployment compensation, child support withheld from a payer's biweekly pay, a weekly private pension or annuity) is therefore counted at the month's 4 or 5 (2 or 3) receipts, not at 4.3 (2.15). No fact or recorded reason covers it. 4.402.B.2 (two monthly benefit payments by mailing cycle) is a different paragraph and stays fact-level.<br>**Reproduced** on CO-115 in January 2027 (five Fridays): p1 has no wages and is paid $400 of unemployment weekly, so `unemployment_income` is 2,000. Gross 2,000, net 1,783, allotment 27. Converted (400 × 4.3 = 1,720): gross 1,720, net 1,503, allotment 111. | Let the person state a weekly, biweekly or semimonthly unearned income: add those options to `periodic_unearned_income_frequency` and widen its meaning, or add a separate unearned pay-frequency fact with a per-payment amount. Extend CO-331's conversion term to it; CO-4323 already has the weekly, biweekly and semimonthly rows. Add a five-payment-month test. |
| C3-5 | P1 (eligibility; reclassified from the earlier passes' P3) | 4.410.J.1-7, J.9-11, J.13-16; 273.8(e)(7), (e)(11) | CO-4176 (`snap_countable_liquid_resources`), CO-3390, CO-343, CO-344 | 4.410.J: "The following government payments are received for a specific purpose or services and shall be excluded as a resource for SNAP eligibility." For example, J.3, disaster restoration payments; J.7, HUD rental refunds "in the month received and the following month"; J.14, Nazi persecution payments; J.16, spina bifida allowances. 273.8(e)(11): "Resources which are excluded for SNAP purposes by express provision of Federal statute". | CO-3390 (`liquid_resources_value`) includes any such payment still held, and CO-4176 subtracts only tax refunds, EITC, education accounts, inaccessible funds, prorated income and ABLE accounts. A standard-eligibility household holding excluded federal-statute or disaster money is counted over the limit. The first pass (rows 4.410.J.1-16) and the second (row 4.410.J.1-11, 13-16) recorded this as P3 "not taken". No reason is recorded in the volume or in colorado-notes, and the paragraph decides resource eligibility.<br>**Reproduced at the resource figure** on a CO-115 variant (p1 on SSDI): liquid 4,000 gives countable 4,000; liquid 6,000 of which 2,000 is held disaster assistance gives countable 6,000 against the $4,750 limit, where it should be 4,000. The status probe could not isolate the resource ground (the variant fails the net test for want of stated verified medical expenses), but CO-344 compares exactly this figure. | Add a liquid-resource part, for example `excluded_government_payments_held_value` (part of CO-3390, not added to it): the J.1-7, J.9-11 and J.13-16 payments still held within their periods. Subtract it in CO-4176, with a test. Or record in colorado-notes why held excluded payments are out of scope, and keep it P3. |
| C3-6 | P3 | 4.404.D; 4.403.2 | CO-4830 (`room_only_payments_received`), CO-4832, CO-331, CO-4322 | 4.404.D: "Rental income is total income, less the cost of doing business, from rental property" | The Colorado Works pass-3 round split lodger (room-only) and meals-only payments out of `room_and_board_payments_received` into CO-4830 and CO-4832. Both are "Part of other_unearned_income_taxable", which SNAP counts gross. Neither meaning says whether a lodger's rent is also part of `rental_income_received` (CO-4457), the only place where SNAP nets the cost of doing business (CO-4322). This is not a regression: room-only payments were never boarder income. | Say in CO-4830's precision whether a lodger's rent is stated in `rental_income_received` as well, so SNAP nets it. |
| C3-7 | P3 | 4.403.2; 4.506.C; 4.504 | CO-1376, CO-4165 | 4.506.C: "A household's statement of self-employment income shall be accepted unless questionable." | Boarder income is self-employment income (4.403.2), and CO-1376's questionable-statement branch reads only `self_employment_gross_receipts` and LLC wages. Questionable boarder income is never asked for. | Add `room_and_board_payments_received` to the questionable branch of CO-1376. |
| C3-8 | P3 | 4.402.2.A.4 (last paragraph) | CO-4324 | "Self-employment income, contract income, and fluctuating income ... shall not be averaged or annualized for migrant households that are destitute of income" | CO-4329 withholds averaging of self-employment from a destitute migrant, but CO-4324's annual-contract branch does not check destitution. | Gate CO-4324's contract branch on `is_destitute_migrant_or_seasonal_farmworker`. |
| C3-9 | P3 (note) | 4.410.F.2, G | CO-074 | "Non-exempt, non-liquid resource ... that would have a net return of one thousand five hundred dollars ($1,500) or less if sold, shall be considered an inaccessible resource." | Recorded simplification: the parcels are tested together (CO-074's precision). Two separate parcels each netting $1,000 are counted at $2,000, though each is inaccessible. | Optional: a per-parcel low-return fact. |

Totals: 5 P1, 0 P2, 4 P3.

Earlier deferred or accepted items are unchanged and not counted again:
- CF-12, periodic report: recorded out of scope.
- CF-17, the verified part of medical expenses: recorded in CO-3740's precision.
- CF-19, joint SSI applicants released from an institution: recorded in colorado-notes, pointing to CO-1746.
- C2-6, Title I payments at or above the minimum wage: accepted.
- 4.409.D commingled funds and 4.411.2.B combined wages stay fact-level, as recorded.

## 3. Coverage matrix

Legend:
- **C**: carried by; the item's derivation was read against the text and is "ok" unless a finding is named.
- **FL**: fact-level; the supplied fact's meaning states how the amount is formed, and no computation follows.
- **NA**: not applicable, with the reason.
- **OQ**: the open question that holds it.
- **GAP**: no item and no recorded reason.

Matrix size: 285 rows covering every numbered paragraph and subparagraph of the listed texts that states a condition, figure, computation, exception, period or verification requirement, plus 30 FNS-table and federal cross-check rows (315 in all).

### 3.1 Proration and allotment (4.207.2-4.207.3)

| paragraph | disposition |
|---|---|
| 4.207.2.A, initial month prorated from the application date | C: CO-2305, CO-4269, CO-2308, CO-385 |
| 4.207.2.A, joint SSI/SNAP applicants released from an institution: from the release date | Recorded (CF-19; colorado-notes, CO-1746) |
| 4.207.2.A, full allotment in every other month | C: CO-385 (else branch), CO-2307 |
| 4.207.2.B, migrant or seasonal farmworker in the job stream, break of 30 days or less: no proration | C: CO-2306, CO-2305 |
| 4.207.2.C.1-4, (days in month + 1 − application day) × full ÷ days in month | C: CO-2308 (days from the begin date to the 1st of next month; floor per 273.10(a)(1)(ii)) |
| 4.207.3.A, "After eligibility has been established" | C: CO-4680 gates CO-2307, CO-2308, CO-386, CO-387 |
| 4.207.3.A.1-3, max − 30% of net, rounded down | C: CO-384, CO-2307 (floor of max − reduction, equal to max − ceil(0.3 × net)) |
| 4.207.3.B, initial month under the minimum: nothing issued | C: CO-385 with CO-3700 ($10, 7 U.S.C. 2017(c)(1) override) |
| 4.207.3.B, certify from the month of application when later months pay | C: CO-386 reads the full month allotment |
| 4.207.3.B, 3+ members at $0 denied unless BCE/ECE; not for proration or initial-month zeros | C: CO-386, CO-387 (zero_allotment reads CO-2307) |
| 4.207.3.C, minimum for 1-2 persons except an initial month | C: CO-2307 (floor), CO-2308 (no floor), CO-135, CO-140; cap CO-4182 |
| 4.207.3.D, maximum allotments FY2027 1-8, +$225, 18+ $3,887 | C: CO-130, CO-131, CO-3726, CO-3727, CO-383; match D-83 |
| 4.207.3.D, minimum $25 | C: CO-135; matches D-83 |

### 3.2 Income standards (4.400-4.401.2)

| paragraph | disposition |
|---|---|
| 4.400, prospective income; resources only under Standard Eligibility | C: CO-344 (categorical bypass); FL for the anticipated amounts |
| 4.401.A, gross and net standards by composition | C: CO-347, CO-382 |
| 4.401.A.1, ECE gross "below" 200% | C: CO-339, CO-340; OQ-356 (comparison word) |
| 4.401.A.2, BCE deemed to meet both limits | C: CO-338, CO-342, CO-347, CO-382 |
| 4.401.A.3.a, SE without elderly/disabled: gross ≤130%, net ≤100% | C: CO-345, CO-346, CO-347, CO-382 ("at most") |
| 4.401.A.3.b, SE with elderly/disabled: net ≤100% only | C: CO-347 (elderly/disabled bypass) |
| 4.401.A.4, elderly disabled member's separate household; others' income ≤165% | C: CO-419, CO-2304, CO-3712, CO-114, CO-3043 (age 60+ per 273.1(b)(2), recorded) |
| 4.401.B, ineligible students and disqualified members left out of the size | C: CO-312, CO-313, CO-3714, CO-4169 |
| 4.401.1, 130%/200%/165% tables and add-ons | C: CO-110, CO-111, CO-122, CO-123, CO-114, CO-3043; match D-84 |
| 4.401.2, 100% net table and +$474 | C: CO-112, CO-113; match D-84 |

### 3.3 Household income (4.402-4.402.2)

| paragraph | disposition |
|---|---|
| 4.402.A.1, prospective anticipation; on changes | FL: the monthly receipt facts are the anticipated amounts |
| 4.402.A.2, conversion of income by frequency: weekly 4.3, biweekly 2.15, semimonthly 2 | C for wages: CO-4324, CO-4323, CO-4682 (C2-1 fix holds). **GAP for weekly, biweekly or semimonthly unearned income: C3-4** |
| 4.402.A.2, every other month 0.5, quarterly 0.333333, twice a year 0.166666, annual .083 | C: CO-331, CO-4330 to CO-4332, CO-4323 (values match) |
| 4.402.A.2, cents of weekly or biweekly pay used when a full month is anticipated | C: CO-4324 (per-period amount in cents; precision: no conversion in a start or end month) |
| 4.402.A.3, all income unless 4.405 exempts it; disqualified member's attributed income; month received | C: CO-330, CO-331, CO-2338, CO-2339, CO-333 |
| 4.402.B.1, early or late regular pay counted on schedule | C/FL: CO-4324 (converted schedule); monthly pay FL |
| 4.402.B.2, two monthly benefit payments by mailing cycle | FL: CO-025 and the other benefit facts are the "monthly" benefit |
| 4.402.B.3, armed services pay on a holiday | FL: as B.2 |
| 4.402.C.1, IEVS/IRS/DOLE data independently verified before adverse action | NA: case-maintenance procedure (verification sources); no determination effect |
| 4.402.1.A, prospective budgeting for all | C: as 4.400 |
| 4.402.1.B, uncertain income not counted | FL: receipt facts are amounts anticipated with reasonable certainty |
| 4.402.1.C, last 30 days or a longer or seasonal period; no automatic past income except strikers | FL: CO-3922's averaging; strikers C: CO-3502, CO-3503 |
| 4.402.2 intro, income for a period divided by the months it covers | C: CO-4324, CO-1702, CO-4349 |
| 4.402.2.A.1, self-employment that is annual income averaged over 12 months | C: CO-4327, CO-4329, CO-4349, CO-4344, CO-1702 |
| 4.402.2.A.2, annual contract income averaged over 12 months; not hourly or piecework | C: CO-4325, CO-4326, CO-4324 |
| 4.402.2.A.3, educational income prorated | NA for income: 4.405.1 excludes all education assistance (CO-2339); resource C: CO-4319, CO-4176 |
| 4.402.2.A.4, others may elect averaging of fluctuating income | FL: the month's stated amount is the elected average |
| 4.402.2.A.4 (last paragraph), no averaging for a destitute migrant household | C: CO-4329 (self-employment); contract income not gated: C3-8 (P3) |
| 4.402.2.B, averaged amounts added to other income | C: CO-330, CO-332 |
| 4.402.2.C, the averaging period need not equal the certification period; adjust on a verified change | FL |

### 3.4 Earned income (4.403-4.403.3)

| paragraph | disposition |
|---|---|
| 4.403.A.1, wages, garnishments, diverted wages; state work-study not earned income | C: CO-023 (gross before garnishment), CO-3361, CO-2338 |
| 4.403.A.2, ASCS payments and VISTA; VISTA excluded if on SNAP when joining; temporary interruptions | C: CO-4303, CO-4304, CO-330, CO-2339. Verification: C3-1 |
| 4.403.A.3, wages held at the employee's request; advances; employer's general practice; repayment disregarded | FL: CO-023 (wages paid or payable in the month) |
| 4.403.A.4, sick, vacation and bonus pay while employed | FL: CO-023 |
| 4.403.B.1, training allowances other than WIOA, not reimbursements | C: CO-4300, CO-330, CO-2339. Verification: C3-1; recertification: C3-2 |
| 4.403.B.2, WIOA OJT earned; not for members under 19 under parental control | C: CO-4301, CO-4318, CO-2338 |
| 4.403.C, Title I counted, earned income deduction applies, except 4.405.2 | C: CO-330, CO-372 (C2-6 accepted) |
| 4.403.D, strikers: higher of pre-strike and current income added | C: CO-3500 to CO-3504, CO-330 |
| 4.403.E intro, gross self-employment income | C: CO-1700, CO-1702 |
| 4.403.E.1, rental property actively managed 20 hrs/week is self-employment | FL: CO-4457 (rents from property not managed as a business); managed rents are CO-1700 |
| 4.403.E.2, sale of capital goods counted in full | FL: CO-1700 (receipts include sale proceeds) |
| 4.403.F, LLC/S-corp owners are employees; draw and salary; statement unless questionable | C: CO-4341, CO-1376 |
| 4.403.G, boarder payments include shelter contributions; not those paid outside | C: CO-4161, CO-4165 |
| 4.403.1.A-B, self-employment definition; work registration | NA here (work registration: non-financial family) |
| 4.403.11 intro, month of application: anticipated gross + capital gains − costs | C: CO-1702 |
| 4.403.11.A, net divided by months covered; full capital gains | C: CO-1702, CO-4349 |
| 4.403.11.B, allowable costs (labor, stock, principal, interest, insurance, taxes) | C: CO-3370 to CO-3372, CO-1701 |
| 4.403.11.C.1, costs above boarder payments not allowed | C: CO-4165 (cost capped at the payments) |
| 4.403.11.C.2, prior-period net losses not allowed | C: CO-1702 floors each month at 0 |
| 4.403.11.C.3, income taxes, retirement, personal work expenses not costs | FL: CO-3370's meaning |
| 4.403.11.D, capital gains anticipated over 12 months ÷ 12; non-annualized proceeds in the month received | FL: CO-1700 receipts averaged with the enterprise (CO-4349 precision) |
| 4.403.12.A, annual support averaged over 12 months; substantial change: anticipated | C: CO-4327, CO-4342, CO-4329, CO-4349 |
| 4.403.12.B, partial support averaged over the self-employment months | FL: CO-4327's precision (each month stated already averaged over the season) |
| 4.403.12.C, monthly receipts that are annual support averaged over 12 | C: as A |
| 4.403.12.D, a business under a year averaged over its months | C: CO-4328, CO-4349 |
| 4.403.12.E.1, a farmer's loss offset against other income | C: CO-3720, CO-3722, CO-3723 |
| 4.403.12.E.2, farmer = $1,000 or more gross a year | C: CO-3721, CO-3722 |
| 4.403.12.E.2.a, loss first from other self-employment | C: CO-3724, CO-334, CO-372 |
| 4.403.12.E.2.b-c, remaining loss from other earned income before the deduction | C: CO-3725, CO-378 (override to 273.11(a)(2)(iii)(B): after the deduction; recorded) |
| 4.403.2 intro, boarders not household members; commercial boarding house is self-employment | C: CO-2567 (non-financial); CO-4165's precision |
| 4.403.2.A, payments include shelter contributions | C: CO-4161 |
| 4.403.2.B.1, cost = maximum allotment for the number of boarders | C: CO-4165, CO-4162, CO-130, CO-3726 |
| 4.403.2.B.2, documented actual costs if higher | C: CO-4165 |
| 4.403.2.B.3, foster care boarder payments disregarded in full | C: CO-4165 |
| 4.403.2.C, net added to earned income; 20% deduction | C: CO-330, CO-372. Recertification: C3-2; verification: C3-7 (P3) |
| 4.403.2.D, the household's own shelter costs | C: CO-2300 |
| 4.403.3.A-D, school employees' annual contract averaged over 12 months | C: CO-4325, CO-4326, CO-4324, CO-4344 |

### 3.5 Unearned income (4.404)

| paragraph | disposition |
|---|---|
| 4.404.A, assistance payments (SSI, Colorado Works, need-based, workfare) | C: CO-331 (CO-849, CO-029, Adult Financial, CO-3812 via other unearned) |
| 4.404.B, retirement, disability, UI, Social Security, strike benefits | C: CO-331 (CO-025, CO-026, CO-027); weekly or biweekly receipts: C3-4 |
| 4.404.C, support and alimony received | C: CO-331 (CO-028, other unearned); D.2 transfer: CO-4307 |
| 4.404.D, rental income net of costs when not actively managed | C: CO-4457, CO-4321, CO-4322, CO-331. Lodgers: C3-6 (P3) |
| 4.404.E, sponsor's income | C: CO-3701, CO-3707 to CO-3711, CO-332 |
| 4.404.F, post-termination vacation/sick/bonus pay: installments unearned, lump sum a resource | FL: other unearned; CO-3367 lump sum |
| 4.404.G, nonprofit gifts over $300 a quarter; other anticipated gifts | C: CO-4308, CO-4317, CO-2339 (limit applied in receipt order) |
| 4.404.H, dividends, interest, royalties; trust withdrawals; dividends available | FL: other unearned, CO-3366 excluded; trust withdrawals in other unearned |
| 4.404.I, substantial lottery or gambling winnings in the month; shared ticket share | C: CO-4151, CO-4152, CO-331 |

### 3.6 Exempt income (4.405-4.405.2)

| paragraph | disposition |
|---|---|
| 4.405 intro, only the listed sources are excluded | C: CO-2338, CO-2339 (closed lists) |
| 4.405.A, irregular income ≤$30 in three months | C: CO-4010, CO-3822, CO-4316, CO-2338, CO-2339 (calendar quarter, S3128) |
| 4.405.B, money for non-household members; identifiable portion or lesser of pro rata share and amount used | C: CO-4314 (FL for the share), CO-2339 |
| 4.405.C, children under 18, with a parent or under parental control, students at least half-time; through the month of turning 18 | C: CO-2568, CO-2569, CO-2338, CO-330 (C2-3 and CF-5 fixes hold) |
| 4.405.D.1, recoupments of overpayments excluded; means-tested intentional-failure recoupment counted | C: CO-4305, CO-4306, CO-2339 |
| 4.405.D.2, child support turned over to IV-D | C: CO-4307, CO-2339 |
| 4.405.E, nonrecurring lump sums (refunds, retroactive benefits, inmate release money) | C: CO-3367, CO-3365, CO-2339; resource FL CO-3390 |
| 4.405.E, Colorado Works diversion ≤90 days, not again within 12 months | C: CO-3367's precision (C2-5 fix holds) |
| 4.405.E, lump sums are resources in the month received and later | FL: CO-3390 (a lump sum still held) |
| 4.405.F.1-2, loans; reverse annuity mortgage | C: CO-3362, CO-3820, CO-2339 |
| 4.405.G, in-kind benefits | NA: not money; no receipt fact holds them |
| 4.405.H.1, HUD and housing subsidies paid to landlords; child-care vendor payments | FL: receipt facts are money paid to the household |
| 4.405.H.2, diverted legally obligated money counted | FL: CO-023, CO-028 count it as received |
| 4.405.H.3, emergency PA/GA to a third party for a migrant in the job stream | C: CO-4315, CO-2339 |
| 4.405.H.4, garnished wages counted; employer-paid rent and employer housing excluded | FL: CO-023 |
| 4.405.H.5-6, assistance in lieu of a regular IV-A or GA benefit counted; medical, child-care, emergency vendor payments excluded | FL: as H.1-2 |
| 4.405.H.7, state or local energy assistance counted except LEAP and one-time furnace or weatherization; IV-A energy counted | C: CO-3364, CO-4309, CO-2339 |
| 4.405.H.8, demonstration-project cash conversions excluded | FL: CO-3366 |
| 4.405.H.9-10, court-ordered third-party support | FL: not received by the household |
| 4.405.I.1, 3, 4, reimbursements not above actual expenses | C: CO-3363, CO-2339 (FL for the excess) |
| 4.405.I.2, IV-A work and child-care adjustments not excluded | FL: CO-029 is the grant |
| 4.405.J, exempt income verified only if questionable | C: CO-1376, CO-1377 (net of exclusions). Counted training and VISTA: C3-1 |
| 4.405.1, education assistance, work-study | C: CO-3360, CO-3361, CO-2338, CO-2339 |
| 4.405.2.A.1, Child Nutrition Act assistance | FL: in-kind or CO-3366 |
| 4.405.2.A.2, Uniform Relocation Act | C: CO-3366, CO-2339 |
| 4.405.2.A.3, Title II volunteers; Title I if on SNAP or PA when joining | C: CO-3366, CO-4303, CO-4304, CO-2339, CO-330 |
| 4.405.2.A.4, NCSA / AmeriCorps | C: CO-4016, CO-2339 |
| 4.405.2.A.(5), disaster and emergency assistance; not FEMA without a disaster | C: CO-3366 (FL for the FEMA carve-out) |
| 4.405.2.A.6, WIOA payments excluded; OJT counted except under-19 under parental control; summer youth | C: CO-3815, CO-4301, CO-4302, CO-4318, CO-2338, CO-2339 |
| 4.405.2.A.7, federal energy assistance; one-time weatherization or furnace | C: CO-3364, CO-2339 |
| 4.405.2.A.8, youth projects (YIEPP, YCCIP, CETA IV) | C: CO-3815, CO-2339 |
| 4.405.2.A.9, SCSEP | C: CO-4311, CO-2338 (converted by CO-4682) |
| 4.405.2.A.10, need-based charitable cash ≤$300 a fiscal quarter | C: CO-4308, CO-4317, CO-2339 |
| 4.405.2.A.11, military retirement to a former spouse | C: CO-4312, CO-2339 |
| 4.405.2.A.12, combat zone pay | C: CO-4310, CO-2338 |
| 4.405.2.A.13, military education deductions; Vietnam-era study stipends counted | C: CO-4313, CO-2338 |
| 4.405.2.A.14, Japanese-American and Aleut payments | C: CO-3366 |
| 4.405.2.A.15, emergency assistance to migrants in the job stream | C: CO-4315, CO-2339 |
| 4.405.2.A.16, WIC | NA: in-kind |
| 4.405.2.A.17, IV-A child-care payments | FL: not household income |
| 4.405.2.A.18, Agent Orange settlement; VA Agent Orange Act benefits counted | C: CO-3366; VA in other unearned |
| 4.405.2.A.19, at-risk child care block grant; no deduction for covered costs | FL: CO-032 is the household's own cost |
| 4.405.2.A.20, EITC | C: CO-3365, CO-2339 |
| 4.405.2.A.21, Employment First participant payments | C: CO-3363, CO-2339 |
| 4.405.2.A.22, PASS | C: CO-3825, CO-2339 |
| 4.405.2.A.23, RECA | C: CO-3366 |
| 4.405.2.A.24, CCDBG child care | FL: as A.17 |
| 4.405.2.A.25, Family Investment Center services; HUD demonstration increases | NA: services in kind; demonstration sites outside Colorado |
| 4.405.2.A.26, Nazi persecution payments | C: CO-3366 |
| 4.405.2.A.27, crime victim compensation | C: CO-3813, CO-2339 (CF-1 holds) |
| 4.405.2.A.28, spina bifida allowances | C: CO-3366 |
| 4.405.2.B.1-21, American Indian and Alaska Native statutes; per capita limits of $2,000 | C: CO-3366 (FL for the per-payment $2,000 cap) |

### 3.7 Destitute households (4.406-4.406.1)

| paragraph | disposition |
|---|---|
| 4.406 intro, migrant or seasonal farmworkers, first month of each certification only | C: CO-055, CO-4168 |
| 4.406.A.1, A.1.a-b, terminated source | FL: CO-055's meaning |
| 4.406.A.2, A.2.a-b, new source over $25 not received by the 10th day | FL: CO-055 |
| 4.406.A.3, a combination | FL: CO-055 |
| 4.406.B, the grower is the source | FL |
| 4.406.C, no limit, provided verification was completed | NA: expedited processing (non-financial family) |
| 4.406.1.A, income from the 1st through the application date only; initial month prorated | C: CO-4166, CO-4167, CO-4168, CO-330, CO-331, CO-2308 |
| 4.406.1.B, new-source income over $25 not within 10 days disregarded | C: as A (CO-4166 holds only later receipts) |
| 4.406.1.C, relocation travel advances exempt; wage advances counted | FL: CO-3363 reimbursement; CO-023 |

### 3.8 Deductions (4.407-4.407.61)

| paragraph | disposition |
|---|---|
| 4.407.A, deductions from gross; not if paid by vendor payments or reimbursements | C: CO-378; FL: CO-034, CO-035, CO-032 are the household's own unreimbursed costs |
| 4.407.B-C, fluctuating or infrequent expenses averaged; weekly/biweekly expenses converted | FL: the monthly expense facts |
| 4.407.D, child support an income exclusion | C: CO-2003, CO-4333, CO-334 |
| 4.407.E.1-5, only these deductions | C: CO-378, CO-381 |
| 4.407.1, standard deduction by size, 6+ uses the 6 figure; FY2027 217/229/268/308 | C: CO-370, CO-132; match D-83 |
| 4.407.2.A, 20% of gross nonexempt earned income, including disqualified members' prorated earnings | C: CO-372, CO-373, CO-371, CO-136 |
| 4.407.2.B, no deduction on work supplementation attributable to PA; IHE claims | NA: recorded (CF-18; C.R.S. 26-2-111.3 repealed; claims out of scope) |
| 4.407.3.A, excess over 50% of income after other deductions | C: CO-379, CO-138, CO-378 |
| 4.407.3.A, costs billed to a member or disqualified person; IPV in full; non-citizen or SSN pro rata | C: CO-2300 |
| 4.407.3.B, cap $769 unless elderly or disabled | C: CO-379, CO-133; matches D-83 |
| 4.407.3.C, homeless shelter deduction $205.66 when all members are homeless with costs; higher verified actual costs | C: CO-380, CO-381 (greater of the two), CO-134; matches D-83 |
| 4.407.3.D, an unoccupied home's costs (intend to return, not leased) | FL: CO-1585; CO-035 |
| 4.407.3.E.1, rent, mortgage, condo and association fees, mobile home loans | C: CO-035, CO-4345, CO-2300. Verification: C3-3 |
| 4.407.3.E.1.a-b, reverse-mortgage repayments if continuing; liens such as second mortgages | C: CO-4345 |
| 4.407.3.E.1.c, separately billed pet costs not allowed | FL: CO-035's meaning |
| 4.407.3.E.2, property tax, assessments, structure insurance | FL: CO-035 |
| 4.407.3.E.3, unreimbursed disaster repair | C: CO-4345 |
| 4.407.3.E.4, utility costs | C: by mandatory SUA (4.407.31), CO-1500 |
| 4.407.3.E.5, telephone; not internet | C: CO-1238, CO-1241, CO-1500 |
| 4.407.31 intro, mandatory SUA, one of four; none for self-employment costs | C: CO-1500 |
| 4.407.31.A.1.a-e, HCUA conditions | C: CO-1239, CO-3300, CO-1243 |
| 4.407.31.A.1.b, LEAP within 12 months | C: CO-1240, CO-1243 (Pub. L. 119-21 sec. 10103 override; OQ-251) |
| 4.407.31.A.2-3, irregular billing; space heaters qualify for the BUA only | C/FL: CO-1239 |
| 4.407.31.A.4, HCUA $616 | C: CO-1235 |
| 4.407.31.B.1-3, BUA for 2+ non-heating utilities; shared; $390 | C: CO-1241, CO-3042, CO-1236, CO-1500 |
| 4.407.31.C.1-3, OUA for one utility, not phone only; shared; $73 | C: CO-1500, CO-1237 |
| 4.407.31.D.1-2, telephone allowance $100 | C: CO-1500, CO-1238 |
| 4.407.4 intro, attendant care of an elderly or SSI/SSDI member is medical | FL: CO-034 vs CO-032 |
| 4.407.4.A, dependent care needed for work, training or education; disqualified-member shares | C: CO-032, CO-2301, CO-374 |
| 4.407.4.A.1-3, provider cost, transportation (IRS rate), activity fees | FL: CO-032 |
| 4.407.4.B-D, total owed; direct monetary payments only; JOBS/TCC-paid care not deductible | FL: CO-032 |
| 4.407.5.A, legally binding child support excluded before the gross test; a minor's payments allowed | C: CO-2003, CO-4333, CO-334 (CF-4 holds) |
| 4.407.5.B, payments to third parties under the order | FL: CO-033 (`child_support_paid_legally_obligated`) |
| 4.407.5.C, arrearages allowed; alimony not | FL: CO-033 |
| 4.407.5.D, 3+ months history averaged | C: CO-2002, CO-2003, CO-3039 |
| 4.407.5.E, under 3 months: estimate | C: CO-2003 |
| 4.407.5.F, not reported and verified: no exclusion | C: CO-2003 (pending past the period gives 0), CO-1615 |
| 4.407.6 intro, medical over $35 for elderly or disabled members only | C: CO-376, CO-137, CO-301, CO-302 |
| 4.407.6.A.1-7, allowable medical costs less reimbursements | FL: CO-034, CO-835 |
| 4.407.6.A.8, attendant wages; one-person maximum allotment for the majority of meals | C: CO-4334, CO-2895 (CF-6 holds: 2,400 + 306) |
| 4.407.6.A.8, both medical and dependent care: medical | FL |
| 4.407.6.A.8, unknown reimbursement: no deduction until known | FL: CO-034 out of pocket; CO-3740 |
| 4.407.6.B.1-6, non-allowable costs; carry-forward conditions | FL: CO-034's meaning |
| 4.407.61.A, SMED $165 for $35-$165; actual above | C: CO-376, CO-1514; OQ-353 ($165-$200 band) |
| 4.407.61.A, table: verification at application and recertification | C: CO-1380, CO-1597, CO-1571, CO-2328, CO-2325 |
| 4.407.61.B, weekly/biweekly medical converted; excess over $35 | FL: CO-034 monthly |
| 4.407.61.C, one-time costs averaged or lump; SMED per averaged month | FL: CO-034 |

### 3.9 Resources (4.408-4.410)

| paragraph | disposition |
|---|---|
| 4.408.A, BCE and ECE exempt from resources | C: CO-344 |
| 4.408.B, nonexempt resources anticipated in the issuance month | C: CO-343 |
| 4.408.B, sponsor's resources less $2,000 | C: CO-3702, CO-3704, CO-343 |
| 4.408.C, declared liquid resources for expedited service | NA: expedited service (non-financial family, CO-348) |
| 4.408.D.1-2, two limits indexed by CPI | C: CO-118, CO-119, CO-344 |
| 4.408.E, $4,500 / $3,000 | C: CO-119 takes D-83's $4,750 from 2026-10-01 (OQ-251 part 2 resolved); CO-118 $3,000 |
| 4.408.1 intro, valued at the filing date from statements; documents when questionable | C: CO-1378, CO-1323 |
| 4.408.1.A, liquid: redemption value less encumbrances | FL: CO-3390 |
| 4.408.1.B, non-liquid: fair market value less encumbrances; real property by assessor's value | FL: CO-3393 (equity) |
| 4.408.2 intro, transfers within 3 months before application or after eligibility, knowingly to qualify | C: CO-4155, CO-4159 |
| 4.408.2.A.1, transfers that would not affect eligibility | C: CO-4158 (excess ≤ 0 gives 0 months) |
| 4.408.2.A.2-4, fair market value, within the household, other reasons | FL: the uncompensated-value facts and CO-4155 |
| 4.408.2.B, begins in the month of application, or after notice for participants; length by excess | C: CO-4156, CO-4160, CO-4158 |
| 4.408.2.C, chart 1/3/6/9/12 months | C: CO-4157 (bands match) |
| 4.409.A, liquid resources | C: CO-3390, CO-4176 |
| 4.409.B, non-liquid at equity value | C: CO-3393, CO-074 |
| 4.409.C, jointly owned resources available in full unless inaccessible; partial access | C: CO-4340, CO-4343, CO-4175 (CF-8 holds: 7,000) |
| 4.409.D, commingled exempt funds keep the exclusion for six months | FL: the exclusion facts state what is still excluded (recorded) |
| 4.410.A, vehicles | NA: no vehicle value enters SNAP resources |
| 4.410.B, home and surrounding property; temporary absence; a lot to build on | C: CO-4336, CO-074; home equity is not in CO-3393 |
| 4.410.C, prorated income exempt while counted | C: CO-4319, CO-4176 |
| 4.410.D.1, household goods, burial plot, life insurance cash value, livestock | NA: not stated in CO-3390 or CO-3393 |
| 4.410.D.2.a-l, retirement accounts; 529A ABLE | C: retirement_accounts_value not read; CO-4415, CO-4176 (C2-2 holds) |
| 4.410.D.3.a-b, education accounts | C: CO-4174, CO-4176 |
| 4.410.D.4, one funeral agreement per member up to $1,500 equity | C: CO-074, CO-4177 |
| 4.410.E.1, income-producing property; work equipment; vehicles; livestock | FL: not in CO-3393 (S3477); business cash counted (C2-7) |
| 4.410.E.2, installment contracts | C: CO-4337, CO-074 |
| 4.410.E.3, income-producing vehicles | NA: as A |
| 4.410.E.4, former farm property for one year | C: CO-4346, CO-4347, CO-4348, CO-074 |
| 4.410.F.1, irrevocable trusts, probate, liens; property for sale in good faith | C: CO-4175, CO-4335, CO-074 |
| 4.410.F.2, non-liquid with a net return of $1,500 or less | C: CO-074, CO-4339, CO-4338 (CF-7 holds); per parcel: C3-9 (P3) |
| 4.410.F.3.a-e, trusts inaccessible; withdrawals and dividends are income | C: CO-4175; income FL |
| 4.410.G, resources with no significant return (>$1,500) | C: as F.2 |
| 4.410.H, a battered woman's shelter resources | C: CO-4175 |
| 4.410.I, exclusions extend to disqualified members' resources | C: CO-343 sums the same items for every member |
| 4.410.J.1-11, J.13-16, government payments excluded as resources | **GAP: C3-5 (P1, reclassified from P3)** |
| 4.410.J.12, federal EITC; state or local EITC for 12 months while participating | C: CO-4172, CO-4173, CO-4176 |
| 4.410.J.17, federal tax refunds for 12 months | C: CO-4172, CO-4176 |

### 3.10 Disqualified and non-household members (4.411)

| paragraph | disposition |
|---|---|
| 4.411.1.A, grounds for disqualification | C: CO-2302, CO-2565, CO-311 |
| 4.411.1.B.1.a, IPV, work sanction, fleeing felon: income, resources and deductions in full | C: CO-333, CO-371, CO-2300, CO-2301, CO-343 |
| 4.411.1.B.1.b, left out of the size for the benefit and every standard | C: CO-312, CO-313; CO-4169 to CO-4171, CO-4182 (273.11(c)(1)(ii) cap) |
| 4.411.1.B.2.a, non-citizen, SSN, ABAWD: resources in full | C: CO-343 |
| 4.411.1.B.2.b, pro rata income; an ineligible student non-citizen prorated as a non-citizen | C: CO-333, CO-3714 |
| 4.411.1.B.2.c, earned income deduction on prorated earnings; shelter and dependent care prorated; child support before prorating; full SUA | C: CO-371, CO-2300, CO-2301, CO-4333, CO-377 (SUA not prorated); medical: OQ-641 |
| 4.411.1.B.2.d, left out of the size | C: CO-312, CO-313 |
| 4.411.2.A, non-household members' income not available; cash paid to the household counted; shared expenses | FL: CO-2300's meaning; telephone exception via the SUA |
| 4.411.2.B.1-2, combined wages: identified share or prorated | FL (recorded) |
| 4.411.2.C, ineligible students are non-household members | C: CO-3714, CO-343, CO-376 |

### 3.11 Verification (4.500-4.504.61)

| paragraph | disposition |
|---|---|
| 4.500.A-D, definition, case record, notice, household responsibility | NA: case procedure |
| 4.500.E, refusal to cooperate in a later review: ineligible | C: CO-4267, CO-4680 |
| 4.501, prudent person principle | NA: no determination rule |
| 4.502.A.1, expedited: identity only; postponed | NA: non-financial family (CO-1370, CO-1393) |
| 4.502.A.2.a, c-e, identity, IEVS/SSN, non-citizen status, residency | NA: non-financial family |
| 4.502.A.2.b, gross nonexempt income verified before certification | C: CO-1376, CO-1377. **C3-1** (counted training allowances and VISTA not verified) |
| 4.502.A.3, expense verification; 30 days; without the deduction; a-d | C: CO-1618, CO-3739, CO-2003, CO-2300, CO-2301, CO-3740. Shelter: **C3-3** |
| 4.502.A.4, BCE/ECE: no re-verification unless questionable | C: CO-1376, CO-1377, CO-1378 (category tests) |
| 4.502.A.5, a declaration over the resource limit is verification | C: CO-1378 (questionable only) |
| 4.502.B.1, recertification: only incomplete, inaccurate, questionable, inconsistent or outdated factors | C: CO-2321 to CO-2331, CO-1376 to CO-1382 |
| 4.502.B.2, income change of $50 or more / $50 or less | C: CO-1619, CO-1596 (OQ-371: "more than $50"). **C3-2** |
| 4.502.B.3.a-c, dependent care, medical, child support if source changed or more than $25 | C: CO-1381, CO-1380, CO-1597; child support CO-1382 (any change: recorded, CF-11) |
| 4.502.B.4, new SSNs through IEVS | NA: non-financial family |
| 4.502.B.5, declaration over the resource limit | C: as A.5 |
| 4.502.B.6, unverified changed expense at recertification: no deduction | C: CO-3739, CO-2300, CO-2301, CO-3740 |
| 4.502.C.1-2, periodic report | Recorded out of scope (CF-12) |
| 4.503, case documentation | NA |
| 4.504 intro, 4.504.1-3, sources: documents, collateral contacts, home visits | NA: means of verification, not whether |
| 4.504.4, SAVE | NA: non-financial family |
| 4.504.5.A-H, IEVS; DOLE checks; act within 45 days; IEVS data not verified | NA: agency procedure; no determination effect |
| 4.504.6.A-D, verified upon receipt list (SSA, UIB, PA, ACSES and others) | C/NA: CO-1318 (ACSES child support, S3125); the others are interface procedure |
| 4.504.61.A-B, not verified upon receipt | NA: as 4.504.5 (DOLE wage data recorded in CO-1376's precision) |

### 3.12 Income and expense verification (4.506-4.507)

| paragraph | disposition |
|---|---|
| 4.506 intro, gross nonexempt income before initial certification unless expedited | C: CO-1376, CO-1377, CO-1393. **C3-1** |
| 4.506 intro, recertification: changed more than $50 or source changed | C: CO-1619, CO-1569. **C3-2** |
| 4.506.A.1-3, responsibility; means; acceptable collateral | NA: means of verification |
| 4.506.A.4, a third party refuses: not denied; best estimate | NA (recorded earlier as procedure) |
| 4.506.B, continuing employment: previous month | FL: CO-3922 |
| 4.506.C, self-employment statement accepted unless questionable | C: CO-1376 (OQ-760). Boarders: C3-7 (P3) |
| 4.506.D, educational income not verified | C: CO-1376, CO-1377 read countable income |
| 4.506.E.1-3, terminated employment verified if questionable | NA: no termination item in the financial family; work-rule verification is non-financial |
| 4.506.F, no reported income accepted unless questionable | C: CO-1376, CO-1377 (no income, no verification) |
| 4.507.A, dependent care verified to grant the deduction | C: CO-1381, CO-2301 |
| 4.507.B.1, shelter declaration accepted unless questionable | C: CO-1379. **C3-3** |
| 4.507.B.2, an unoccupied home: actual utility costs | C: CO-1379, CO-1585 (OQ-312 resolved: the SUA is mandatory) |
| 4.507.B.3, questionable shelter not verified in 30 days: no deduction | C: CO-2300, CO-3739 |
| 4.507.B.4, restoration when not given 10 days | NA: restoration of lost benefits (claims procedure) |
| 4.507.C.1, medical before initial certification; recertification if source changed or more than $25 | C: CO-1380, CO-1597 |
| 4.507.C.2-4, anticipated medical changes; changes in the period; 24-month one-time expenses | FL: CO-034 monthly figure |
| 4.507.D.1-4, child support obligation and payment documents; agency obtains IV-D payments | NA: means of verification |
| 4.507.D.5, re-verify child support at recertification | C: CO-1382 (any change; CF-11; S3123) |

### 3.13 FNS FY2027 tables (D-83, D-84)

| table | disposition |
|---|---|
| D-83 Table 1, maximum allotments 306 ... 1,841, +225, 18+ 3,887 | C: CO-130, CO-131, CO-3726, CO-3727 (match) |
| D-83 Table 2, standard deductions 217/217/217/229/268/308 | C: CO-132 (match) |
| D-83 Table 3, shelter cap $769 | C: CO-133 (match) |
| D-83 Table 4, homeless shelter deduction $205.66 | C: CO-134 (match) |
| D-83 asset limits $4,750 / $3,000 | C: CO-119, CO-118 (match) |
| D-83 minimum allotment $25 | C: CO-135 (match) |
| D-84 Table 1, net 100% 1,330 ... 4,644, +474 | C: CO-112, CO-113 (match) |
| D-84 Table 2, gross 130% 1,729 ... 6,037, +616 | C: CO-110, CO-111 (match) |
| D-84 Table 3, 165% 2,195 ... 7,662, +781 | C: CO-114, CO-3043 (match) |
| 200% (state table 4.401.1; not in D-84) 2,660 ... +948 | C: CO-122, CO-123 (match 4.401.1) |

### 3.14 Federal cross-checks (7 CFR 273.8-273.11, 273.2(f))

| provision | disposition |
|---|---|
| 273.8(b), resource limits | C: CO-118, CO-119 |
| 273.8(c), (d), countable resources; joint ownership | C: CO-4176, CO-074, CO-4340, CO-4343 |
| 273.8(e)(1)-(5), home, household goods, life insurance, income-producing property | C/NA as 4.410.B, D, E |
| 273.8(e)(7), (e)(11), disaster restoration; statute-excluded resources | **C3-5** |
| 273.8(e)(8), inaccessible resources | C: CO-4175, CO-074 |
| 273.8(e)(18)-(19), education accounts, retirement and ABLE | C: CO-4174, CO-4415, CO-4176 |
| 273.8(i), transfer of resources | C: CO-4155 to CO-4160 |
| 273.9(b)(1), earned income: wages, self-employment, training allowances, boarders | C: CO-330. Verification: C3-1 |
| 273.9(b)(2), unearned income; (b)(2)(ii) rent net | C: CO-331, CO-4322 |
| 273.9(c)(1)-(19), exclusions | C: CO-2338, CO-2339 (as 4.405) |
| 273.9(c)(7), children's student earnings at least half-time | C: CO-2569 |
| 273.9(d)(1)-(6), deductions; homeless shelter deduction; SUA | C: as 4.407 |
| 273.10(c)(2)(i), weekly 4.3, biweekly 2.15 for all income | C for wages; **C3-4** for unearned |
| 273.10(c)(3), averaging | C: CO-4324, CO-4349 |
| 273.10(e)(2), benefit computation; rounding; minimum | C: CO-384, CO-2307 |
| 273.10(a)(1)(ii), proration and rounding; under $10 not issued | C: CO-2308, CO-385, CO-3700 |
| 273.11(a), self-employment; farm loss | C: CO-1702, CO-3722 to CO-3725 (override of 4.403.12.E.2.b-c) |
| 273.11(b), boarders | C: CO-4165 |
| 273.11(c)(1)-(2), disqualified and prorated members | C: CO-2302, CO-2565, CO-333, CO-4182 |
| 273.2(f)(1)(i), (f)(8)(i)(A), income verification; recertification over $50 | C: CO-1376, CO-1377, CO-1619. **C3-1, C3-2**; OQ-760 |

## 4. Open-question confirmations (financial scope)

| OQ | class in the volume | confirmation |
|---|---|---|
| OQ-30 (shelter: floor intermediate income at $0) | state policy choice | Correct. 4.407.3 and 273.10(e)(1)(i)(H) are silent. |
| OQ-251 (H.R.1 sec. 10103 date) | blocked on a named document | Correct. Re-checked 2026-11-22: www.fns.usda.gov/snap/obbb-implementation redirects to fna.usda.gov's implementation page, whose only memorandum link goes to www.usda.gov, which is not an allowed host. Part (2), $4,750 over the state's stale $4,500, holds against D-83. |
| OQ-353 (SMED $165-$200) | blocked on a named document | Correct, since C2-8: Colorado's SMED demonstration approval is not on an allowed host. |
| OQ-356 (ECE "below") | state policy choice | Correct. No federal text sets the comparison word. |
| OQ-371 ($50) | resolved | Holds: "more than $50" in CO-1619 matches 273.2(f)(8)(i)(A) and 4.506. The comparison's income figure is short: C3-2. |
| OQ-533 (H.R.1 dates) | blocked on a named document | Correct: the memoranda are on www.usda.gov and the CDHS letter is on cdhs.colorado.gov. |
| OQ-641 (medical expenses of a prorated member) | state policy choice | Correct. 4.411.1.B.2.c and 273.11(c)(2)(iii) name only shelter, dependent care and child support. |
| OQ-760 (self-employment statement against 273.2(f)(1)(i)) | blocked on a named document | Correct as classed. |
| OQ-390, OQ-13, OQ-22, OQ-311, OQ-312 | resolved | The resolutions hold against the text. OQ-390's 4.405 reading holds; the conversion of unearned income (C3-4) is a 4.402 question, not a 4.405 one. |

OQ-1, OQ-12, OQ-640, OQ-730 and OQ-835 belong to the non-financial family. OQ-560 and OQ-612 belong to the Medicaid families.

## 5. Earlier P1s: confirmation

Each reproduction was re-run on this HEAD.

| id | result | evidence |
|---|---|---|
| CF-1 (exclusions) | fixed | CO-115 with $500 crime victim compensation: gross 1,000, allotment 387 |
| CF-2 (passive rent) | fixed | $1,000 rent with $600 costs: gross 1,400, allotment 267 |
| CF-3 (conversion and averaging) | fixed | $250 weekly: 1,075 (see C2-1). Averaging months read in CO-4349 (12 months, or from the start month) |
| CF-4 (child support exclusion) | fixed | CO-83 in 2026-11, $300 paid by p1 or by p3: gross 1,200, allotment 808 (base 1,500, 743) |
| CF-5 (turning 18) | fixed | Born 2009-02-05 with $400: February 1,000 and 387; March 1,400 and 291 |
| CF-6 (attendant meals) | fixed | Medical 2,400 plus meals 306 = 2,706 |
| CF-7 (real property) | fixed | $1,200 of land: countable 4,000 (low-return) |
| CF-8 (joint resources) | fixed | Other owners' reachable share of $3,000: countable 7,000 |
| CF-9 (ineligible allotment) | fixed | CO-2307 and CO-2308 return 0 unless CO-4680 is none |
| CF-10 (excluded wages) | fixed | p2's $200 of summer youth wages: no earned-income verification for p2 |
| CF-11 (child support at recertification) | fixed | CO-1382 verifies any change (derivation read) |
| CF-12 (periodic report) | recorded out of scope | unchanged |
| C2-1 (converted wages and exclusions) | fixed | $250 weekly with a $20 odd job in February: gross 1,075, allotment 369 |
| C2-2 (ABLE) | fixed | Liquid 6,000 of which ABLE 2,000: countable 4,000 |
| C2-3 (half-time) | fixed | p2 in GED classes less than half time with $400: gross 1,400, allotment 291 |
| C2-4 (recertification income) | fixed for wages; regression C3-2 | CO-195: `snap_income_changed_since_last_certification` and earned-income verification false. A member with a training allowance, VISTA or boarder income: C3-2 |

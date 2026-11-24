# Coverage review, sixth pass: CCCAP, LEAP and SUN Bucks (family `coverage6-care-energy`), 5db41ba

Reviewer pass: sixth exhaustive coverage matrix, 2026-11-24, on 5db41ba (origin/ccr-9d19bf4c-wmnwcl), read in a detached scratch worktree. Review only: nothing was written to the branch. It follows coverage pass 5 (docs/reviews/coverage5-care-energy.md) and its field sweep (docs/reviews/field-sweep-care-energy.md), whose fixes were merged before this commit. The matrix in section 4 was built again from the fetched rule text, not from pass 5's list.

Governing text read from `volumes/co/documents/`:

- CCCAP: 8 CCR 1403-1, rule version 12658, effective 2026-08-14 (D-87): 3.103.C, K, S, UU, YY, AAA, LLL, EEEEE; 3.111.A-K line by line (H.1-5, I.1-33, J.1-29, K.1-2); 3.113.A; 3.116; 3.119.A.
- LEAP: 9 CCR 2503-7 effective 2025-11-01 (D-86): 3.751.1 (every definition), 3.751.2, 3.751.21-22, 3.752.1, 3.752.2, 3.752.21 A-N, 3.752.211 A-K, 3.752.212, 3.752.22 A-E, 3.752.23 A-HH, 3.752.24, 3.752.25, 3.753.1-3.753.22, 3.755.21 A-K, 3.758.47; with the amendments effective 2026-11-01 (D-173: 3.752.211.J, 3.752.22.D, 3.755.21.I.1 and J, 3.756.12.B).
- SUN Bucks: 7 CFR 292.2, 292.5-292.7, 292.12, 292.14, 292.15 (D-88, D-117), C.R.S. 22-33-104(1)(a) (D-141), C.R.S. 26-2-309 (D-142), 7 CFR 245.2 and 245.6 (D-250). Colorado has no Summer EBT rule (D-143).

Method:

- Every CCCAP (98 items), LEAP (63) and SUN Bucks (20) derivation was printed and read against its paragraph, with the counting tables (CO-5001, CO-5102, CO-5720, CO-5105, CO-5730) row by row, and the record schemas (receipts CO-5000, earnings CO-5100) field by field.
- `npx vite-node scripts/check.ts --no-conformance` passes at 5db41ba in the scratch copy (`check: OK`; 32 non-blocking warnings, the known missing figures CO-1277, CO-3004, CO-3932 and CO-875 outside its season among them).
- Probe households were written in the scratch copy (`scripts/cov6/p1.yaml`, `p2.yaml`, `p3.yaml`, `p3b.yaml`) and run with a small runner (`scripts/cov6/run.ts`, which evaluates a probe that extends a stored case or another probe). LEAP probes build on CO-712's adult (application 2026-11-10, income verification period 2026-10-10 to 2026-11-10, heat paid to a vendor, limit $3,774 for one and $4,936 for two). CCCAP probes build on CO-806 (mother and son aged 6, Denver, application 2026-11-15, thirty days 2026-10-16 to 2026-11-14, entry level 185% of the poverty guideline: $3,336.16 for two, $4,211.84 for three). Each P1 below has its rule answer computed by hand from the quoted text.

## 1. Verdict

**Not clean. 4 P1 (1 common, 3 rare), 2 P2, 1 P3.** Pass 5's fixes are right on the households they were written for (section 3); two of them stop short of a sibling the same text reaches: the stream-date fix (L5-1) was made in LEAP's receipt readers but not in its wage readers, and the joint-property fix (X5-1) counts each co-owner's share on her own list, so two co-owners in one household count the same rent twice.

- **R6-1 (P1, common)** LEAP cannot determine a household that states a job by a stream whose job ended before the income verification period, or begins after the application date. The rule's answer is that the job gives no income in the period (3.752.22.C.3.a, C.3.c); the engine asks for the dates of pays that do not exist. A recently unemployed applicant, the program's routine shape, cannot be determined.
- **R6-2 (P1, rare)** CCCAP and LEAP count the income of jointly owned property twice when both co-owners are in the household and the rent is paid to one of them: the larger of the share and the amount received is taken on each co-owner's list, so the one who received nothing still adds her share. The answer depends on whether the case states her zero receipt.
- **R6-3 (P1, rare)** LEAP counts a passive landlord's rent (a `rental_income` receipt) gross. 3.755.21.I.2.D allows a rental property's maintenance costs as its expenses, and no LEAP item reads any expense against a `rental_income` receipt. The same rent stated as a business is netted.
- **R6-4 (P1, rare)** CCCAP never applies 3.111.H.4.e's twenty-hour test: rental property income is self-employment only when the caretaker manages the property at least twenty hours a week. No record field says that a business is rental property, so a landlord who manages her units ten hours a week and is stated as self-employed passes the eligible-activity test the rule denies her.

## 2. Findings

| id | sev | common/rare | paragraph | items | quoted text | repro (engine vs rule by hand) | proposed fix |
|---|---|---|---|---|---|---|---|
| R6-1 | **P1** | **common**: a job lost more than a month before applying, or a job offer that starts after the application date, is a routine LEAP shape. The shared earnings list keeps the ended job as a stream with its `job_end_date` (docs/conventions.md, "A record's time") because programs that look back further (Medicaid's retroactive months, SNAP) need it. | 9 CCR 2503-7 3.752.22.C.3.a, C.3.c, 3.752.22.B; 3.751.1 "Income Verification Period" | leap_wages_in_income_verification_period CO-3912, leap_scsep_wages CO-5122 (first sum), and through them leap_person_wages CO-3925, leap_household_income CO-1002, leap_is_eligible CO-1007, leap_requires_verification_of_earned_income CO-1455 | C.3.a: "If a household member's income is terminated as of the application date, use actual income received in the income verification period." C.3.c: "If a household member has not received his/her first check from this source of income as of the income verification period, do not count any income from this source." Conventions: "an earnings stream from the month of its `job_start_date` through the month of its `job_end_date` ... Pay received after a job ended is stated with its date". | CO-3912 selects every pay whose job began on or after the period's first day or ended on or before the application date, and then reads that pay's `date`. A stream has no date, so the whole sum is unknown. **LW1** (CO-712's adult): a current wage stream of $3,000 and an old job's stream of $1,500 with job_end_date 2026-09-30. Engine: leap_person_wages **unknown**, leap_is_eligible **cannot determine** (missing earnings[1].date). Rule: the old job paid nothing in 2026-10-10 to 2026-11-10 (C.3.a), so $3,000 ≤ $3,774, **eligible**. **LW2**: the second stream has job_start_date 2026-12-01 instead. Engine **cannot determine**; rule (C.3.c, no check received) $3,000, **eligible**. **LW4**: a 70-year-old with $1,500 of Social Security and an SCSEP stream that ended 2026-08-31. Engine **cannot determine**, because CO-5122's first sum is unknown before the age test. Rule: SCSEP pay is excluded at 55 or older (3.752.23.CC) and none was received in the period: $1,500, **eligible**. LW3 (the same old job stated by dated pays before the period) gives $3,000, eligible, so the defect is the stream statement only. LEAP's receipt readers (L5-1: CO-5003 to CO-5008, CO-5124) and CCCAP's wage readers (C5-1, probe CW1: $2,000, eligible_low_income) already give 0 here. | In CO-3912 and CO-5122's first sum, do not read a record whose `job_end_date` is before leap_income_verification_period_start or whose `job_start_date` is after leap_application_date, as CO-5003 does for a receipt stream. Read a job that began or ended inside the period from its dated pays, as now. Add LW1, LW2 and LW4 as stored households. Restate OQ-681 (1) for the stream. |
| R6-2 | **P1** | **rare**: joint property income is uncommon among CCCAP and LEAP applicants, and the double count needs both co-owners in the household with the money paid unevenly between them and stated on both lists. Among couples who own a rental, though, this is the usual shape. | CCCAP 3.111.H.4.e; LEAP 3.752.21.F | cccap_counted_recurring_receipts CO-5721, cccap_one_time_receipts_averaged CO-5722, cccap_excluded_unearned_receipts CO-4463; leap_counted_recurring_receipts CO-5003, leap_one_time_receipts_in_period CO-5009, leap_requires_verification_of_unearned_income CO-4526; receipts fields `ownership_share`, `property_income` (CO-5000) | H.4.e and F: "Income from jointly owned property shall be considered as a percentage at least equal to the percentage of ownership or, if receiving more than percentage of ownership, the actual amount received." | Each reader takes max(amount, share × property_income) per record on the record's own list. With two co-owners in one household, the one who received the rent counts what she received and the other counts his share again. **CJ1** (CCCAP; CO-806 plus the father as a second caretaker with $1,500 of wages): mother $2,000 of wages, a half-owned rental with $600 of rent paid to the mother (amount 600, share 0.5, property_income 600), the father's record amount 0, share 0.5, property_income 600. Engine: 600 + 300 + 3,500 = **$4,400 > $4,211.84, ineligible_income**. Rule: the household's income from the property is the $600 it produced (the father's half is inside the mother's "actual amount received"), so 3,500 + 600 = **$4,100, eligible_low_income**. **CJ2**: the same household with the father's zero record left out: engine $4,100, eligible_low_income, so the answer depends on the statement. **LJ1** (LEAP; CO-712's adult and her husband in one household): wages $2,500, a 50/50 rental with $2,000 of rent paid to her, and his record amount 0, share 0.5. Engine: 2,500 + 2,000 + 1,000 = **$5,500 > $4,936, ineligible**. Rule: 2,500 + 2,000 = **$4,500, eligible** (LJ2, his record left out: engine $4,500, eligible). | Count the property's income once per household. Name the co-owner on the record (a `co_owner` person field, as holdings already have), and apply the at-least-the-share test to the household's combined share against what the household's co-owners received together; or let only owners outside the household raise the count. Until then, record the reading in OQ-1316 with CJ1 and LJ1, and state in CO-5000's `ownership_share` meaning how two co-owners in one case state the rent. |
| R6-3 | **P1** | **rare**: a few LEAP applicants (mostly elderly) rent out a second property; the answer changes only when the maintenance costs bring income under the limit. | 9 CCR 2503-7 3.755.21.I.2.D; 3.752.21 opening | leap_receipt_treatment_table CO-5001 row `rental_income` (`counted_no_rule_excludes`), CO-5003; no LEAP reader of rental_property_expenses_paid (CO-4458) or of any maintenance figure | I.2: "Receipts for business-related expenses are required in order to be considered as deductions: ... D. Rental property allowable expenses shall be limited to the costs of maintenance of the property." 3.752.21: "payments from any other source, which is considered to be a gain or benefit". | The schema states a landlord who does not run the property as a business as a `rental_income` receipt ("Rent or royalties from property the person owns and does not actively manage as a business"). LEAP counts that receipt gross in the period, and signs the row as one "no rule excludes". The only text on rental property, I.2.D, gives it an allowable expense. Coverage pass 2 N-9 read rental property as LEAP self-employment and limited the business-cost records to maintenance; a `rental_income` receipt never reaches those readers. **LRent** (CO-712's adult): wages $3,000, rent $1,000 a month from a house she owns, $400 of receipted maintenance (rental_property_expenses_paid 400, all repairs). Engine: **$4,000 > $3,774, ineligible**. Rule (I.2.D): 3,000 + (1,000 − 400) = **$3,600, eligible**. The same rent stated as `self_employment_receipts` with a `business_cost_operating` record of $400 is netted, in the month before the application (3.755.21.I.1). OQ-1316's body says "LEAP counts gross unearned income" without I.2.D. | Read a `rental_income` receipt in LEAP net of the property's maintenance costs (a neutral figure for maintenance, since rental_property_expenses_paid also holds taxes, insurance, interest and fees that I.2.D does not allow), and say whether rent is read in the income verification period or the full month prior (3.755.21.I.1). If the LEAP owner reads I.2.D as reaching only self-employed landlords, record that as an open question with LRent and correct OQ-1316's body. |
| R6-4 | **P1** | **rare**: a caretaker whose only work is managing rental property is uncommon in CCCAP. | 8 CCR 1403-1 3.111.H.4.e, G.2, 3.103.WWWW | cccap_caretaker_in_eligible_activity CO-984, cccap_self_employment_gross_receipts CO-5156, cccap_self_employment_hours CO-6404, cccap_earnings_treatment_table CO-5105; earnings kinds `self_employment_receipts` (CO-5100), receipts kind `rental_income` (CO-5000) | H.4.e: "For income from rental property to be considered as self-employment income, the adult caretaker(s) or teen parent(s) shall actively manage the property at least an average of twenty (20) hours per week. Income from rental property will be considered as unearned income if the adult caretaker(s) or teen parent(s) are not actively managing the property an average of at least twenty (20) hours per week." | No item reads the twenty hours, and no field says that a business is rental property, so the element H.4.e turns on is undefined. The case's choice of list decides it, and the schema's words ("does not actively manage as a business") do not carry CCCAP's twenty-hour line. **CR1** (CO-806's mother): her only work is managing two rental units about ten hours a week, stated as self_employment_receipts $1,800 (hours 43 in the month) and a business_cost_operating record of $300, receipts for costs received. Engine: cccap_caretaker_in_eligible_activity **true**, income $1,500, **eligible_low_income**. Rule: at under twenty hours a week the rent is unearned income, not self-employment, so she has no eligible activity (3.111.B.1, G): **not eligible**. Unearned income also changes 3.116.C's fee income (earned only) and J.1. | Add a neutral property of the business record (e.g. `rental_property: yes/no`, required where read) and have CCCAP read a rental business with an average under twenty hours a week (hours ÷ weeks in the month) as unearned rental income, net under I.12 and I.17, and not as an eligible activity. Add CR1. |
| R6-5 | P2 | — | 9 CCR 2503-7 3.751.1 "Point in Time", 3.752.2; 3.755.11; docs/conventions.md "Scopes" (L5-5) | leap_verification_status CO-1462 (`["<=", ["det_date"], leap_verification_due_date]`), leap_verification_due_date CO-1461, the pending items CO-1689 to CO-1693, CO-2591; leap_determination_is_as_of_application_date CO-7000 | Conventions: "A LEAP determination's determination date is its application date ... leap_is_eligible (CO-1007) cannot determine a case stated for another day" | The time contract fixes a LEAP case's determination date at the application date, but the verification outcomes read the determination date as the day the county looks. Stated as the contract requires, a case reads documents "received" on the application date and can never be past due. Stated later, its eligibility cannot be determined. **LV1** (CO-712, verification requested 2026-11-12, due 2026-11-26, wages unverified), stated as of 2026-11-10: status **pending**, eligible. **LV2**, the same stated as of 2027-01-05: status **past_due**, eligibility **cannot determine**. One case cannot give both outcomes, and CO-91 and CO-92 (stored, no LEAP application date) are the only households that test past-due and pending verification. No eligibility answer changes, because CO-1007 does not read verification. | Give the verification items their own date (a stated `leap_verification_as_of_date`, or read them only on cases not bound by CO-7000) and say so in the time contract. Or record that LEAP's verification status is reported on a separate evaluation of the case as of the day the county looks. |
| R6-6 | P2 | — | 3.752.211.E; 3.751.2.B-D | leap_counted_recurring_receipts CO-5003 precision ("a dependent living with the veteran is in the veteran's household ... `for_dependent` needs no reading"); receipts `for_dependent`, `for_person` | E: "Any portion of a VA pension that is paid to a veteran for support of a dependent shall be considered countable unearned income to the dependent rather than the veteran." 3.751.2.B: "Each person living at a dwelling must be counted as either a member of the applicant's household or a member of a separate household." | L5-2's premise does not always hold in LEAP, whose households are drawn by heat bought in common, not by residence. An adult dependent (a disabled adult child or a dependent parent) living with the veteran may be a separate LEAP household (3.751.2.D bars only spouses, civil union partners and children under eighteen from being one). The dependent's part of the award is then counted to the veteran's household although it is the dependent's income. This is contrived (a VA dependent in the same dwelling who does not share heat) and changes no stored answer. | Read `for_dependent` with `for_person` against membership in leap_household_members_for_income (CO-1009): take the dependent's part off when the dependent is a person of the case outside the household, as the cash programs read the same sentence. |
| R6-7 | P3 | — | 3.752.21.I, 3.752.211.H-I | leap_social_security_whole_dollars CO-5005, leap_ssi_whole_dollars CO-5006 | "When determining income, do not consider cents in the gross benefit amount." | The items drop the cents of the period's total (floor of the sum), not of each benefit amount. Two Social Security amounts of $500.60 and $300.70 count $801; the text drops each amount's cents, $800. This is a dollar at most, and only for a person with two benefits in the period. | Floor each record's amount inside the sum, or say in the precision that the cents are dropped from the total. |

P1: R6-1 to R6-4 = **4** (common 1: R6-1; rare 3: R6-2, R6-3, R6-4). P2: R6-5, R6-6 = **2**. P3: R6-7 = **1**.

### Probe results (scratch copy, 5db41ba)

| Probe | Engine | Rule (by hand) |
|---|---|---|
| L0: CO-712 as stored | $3,000, eligible | same |
| LW1: wage stream with job_end_date 2026-09-30 beside the current $3,000 stream | cannot determine (earnings[1].date) | $3,000, eligible (R6-1) |
| LW2: wage stream with job_start_date 2026-12-01 | cannot determine | $3,000, eligible (R6-1) |
| LW3: the old job stated by dated pays before the period | $3,000, eligible | same |
| LW4: 70-year-old, ended SCSEP stream, $1,500 Social Security | cannot determine | $1,500, eligible (R6-1) |
| LRent: $1,000 rent, $400 maintenance, $3,000 wages | $4,000, ineligible | $3,600, eligible (R6-3) |
| LJ1 / LJ2: couple, 50/50 rental, $2,000 rent paid to her, his zero record stated / not stated | $5,500 ineligible / $4,500 eligible | $4,500, eligible in both (R6-2) |
| CJ1 / CJ2: two parents, 50/50 rental, $600 rent paid to the mother, his zero record stated / not stated | $4,400 ineligible_income / $4,100 eligible_low_income | $4,100, eligible_low_income in both (R6-2) |
| CW1: CCCAP, old job stream ended 2026-09-30, wages $2,000 | $2,000, eligible_low_income | same (C5-1 holds) |
| CR1: CCCAP, rental business about ten hours a week as the only activity | activity true, eligible_low_income | no eligible activity, not eligible (R6-4) |
| LV1 / LV2: verification requested 2026-11-12, stated as of 2026-11-10 / 2027-01-05 | pending, eligible / past_due, cannot determine | (R6-5) |

## 3. Status of earlier fixes (pass 5, section 7; field sweep)

| Pass 5 finding | Fix right? | Evidence at 5db41ba |
|---|---|---|
| C5-1 CCCAP stream dates | **Yes** | CO-3915, CO-5152, CO-4464, CO-5156, CO-1709, CO-6404, CO-984, CO-5721, CO-5725, CO-4463 and CO-4076 read the source's dates against the thirty days (stands for them only when the source ran through all of them: start on or before the first day, end on or after the day before the application date); CO-5723 and CO-6150 by month. Probe CW1 gives $2,000. |
| C5-2 early-payout penalty | Yes | `early_withdrawal_penalty` is taken off in CO-5721 and CO-5722 for `pension` and `savings_account_distribution`, recurring or paid once; CO-4459 has no reader. |
| L5-1 LEAP stream dates | **Yes for receipts, business and boarders; missed in the wage readers** | CO-5003 to CO-5008 and CO-5124 do not count a stream that ended before the period or began after the application date, and ask for dated receipts when it began or ended inside the period. CO-5126, CO-1711 and CO-1712 read a business stream in the months its job dates cover. LEAP's wage readers CO-3912 and CO-5122 were left as they were ("already read job dates"), and they ask for dates for a stream outside the period: **R6-1**. |
| L5-2 allotment or award for a person elsewhere | Yes for persons living elsewhere | CO-5003 and CO-5009 take off `for_person_living_elsewhere`. The premise that a dependent living with the veteran is always in the veteran's LEAP household is not always true: **R6-6** (P2). |
| L5-3 EE's retroactive kinds | Yes | CO-5009 excludes a retroactive one-time payment only of social_security, ssi, colorado_works_cash and adult_financial_cash (OQ-1320). CO-800 passes. |
| L5-4 insurance cash value | Yes | CO-5001 row `excluded` (GG, BB); CO-803 passes. |
| L5-5 determination date = application date | **Yes for eligibility**; verification left out | CO-7000 (`det_date = leap_application_date`) is read by CO-1007 before the point-in-time factors. Every stored household with a LEAP application date is stated as of that date, except CO-805, which is built to cannot determine. The income table is read as of the first day of the application's program year (CO-1003; CO-875 runs from 2026-11-01 to 2027-11-01). The poverty guideline of Step D is read on the application date (CO-1278), as OQ-253 records. The verification outcomes still read the determination date as the day the county looks, which the contract makes the application date: **R6-5** (P2). |
| S5-1 TANF stream before the period | Yes | CO-5731 reads a stream only in months from its start_date's through its end_date's, and excludes retroactive payments. |
| S5-2 another member's age by month | Yes | CO-2708 reads `years_between(date_of_birth, first_day(month))` for the other member; CO-807 passes. |
| X5-1 jointly owned property | **Yes for a co-owner outside the household; double count inside it** | Every reader takes max(amount, ownership_share × property_income) (CO-5721, CO-5722, CO-4463, CO-4076, CO-5723, CO-5003, CO-5009, CO-4526); CO-806 and CO-808 pass. Two co-owners in one household each take the larger figure on their own lists: **R6-2**. |
| L5-6 gift and support verification | Yes | CO-4526 takes off gifts and declared support with CO-5003's and CO-5009's placement. |
| C5-3 AmeriCorps earned; J.1 for in-kind and vendor pay | Yes | CO-5720 row `counted_as_earned`; CO-3915 and CO-4464 apply J.1. |
| X5-2 candidate paragraphs; OQ-1317 to OQ-1319 | Yes | Cited in CO-5001 and CO-5720. The `rental_income` row was not given I.2.D as its candidate paragraph: **R6-3**. |
| C5-4 "all children in the home" | Recorded (OQ-1315) | Class confirmed. |
| X5-3 Colorado Works Child Care referral without a default | Yes | CO-1440 to CO-1445 and CO-2873 read cccap_colorado_works_child_care_eligible (CO-988). |
| C5-5, C5-6 | Yes | CO-1710 precision; CO-993 reads the SMI table as of the determination date, as CO-986 does. |
| Field sweep (spent_on_covered_costs, pass_set_aside, OQ-1321) | Yes | CO-5721, CO-5003, CO-5009 and CO-5124 read them as the sweep records. |

Earlier passes' stored repro households (CO-175 to CO-179, CO-209 to CO-211, CO-215, CO-216, CO-224, CO-225, CO-372, CO-373, CO-710 to CO-719, CO-800 to CO-809) hold: `check: OK` at 5db41ba.

## 4. Coverage matrix

Legend: **C** carried by the items listed (derivation read against the paragraph; a mismatch is a finding); **NA** not applicable, with the reason; **OQ** an open question records the choice; **GAP** no item and no recorded reason.

### 4.1 CCCAP, 8 CCR 1403-1

| ¶ | disposition |
|---|---|
| 3.103.C adult caretaker; EEEEE teen parent (under 21) | C: CO-992, CO-981, CO-2607; OQ-540 (loco parentis), OQ-163 K-9 (teen parent with her own parent) |
| 3.103.K assets; 3.111.H.5.c $1 million self-declared | C: CO-987 (cccap_declares_assets_within_limit) |
| 3.103.S cash assistance; diversions | C: CO-5720 `counted_unless_cash_assistance`, CO-4463; OQ-873 |
| 3.103.LLL household | C: CO-982, CO-983; OQ-1315, OQ-163, OQ-872 |
| 3.103.UU, 3.111.F eligible child; F.1 citizenship; F.2 immunizations | C: CO-980, CO-4056, CO-998, CO-4060; OQ-394 (resolved), OQ-710, OQ-1163, OQ-562 |
| 3.103.YY, AAA entry and exit levels | C: CO-2103, CO-2104, CO-986, CO-993, CO-870; OQ-121 |
| 3.111.A county residence | C: CO-2107, CO-987, CO-1440 |
| B.1-3 activity, income, custody | C: CO-991, CO-984, CO-2104, CO-2607 |
| C.1-2 application, verification list | NA (forms) / C: CO-1440 to CO-1451, CO-1676 to CO-1688, CO-4467, CO-5154, CO-5155 |
| D.1.a-c, D.2-10; E | C: CO-982, CO-991, CO-4064, CO-4070, CO-2396; OQ-871, OQ-872, OQ-850 |
| G.1.a-c employment, minimum wage, LLC owners as employees | C: CO-984, CO-5152 (owners' pay stated as wages) |
| G.2.a-d self-employment documents, schedule, income over expenses, minimum wage | C: CO-1709, CO-1710, CO-6404, CO-984, CO-5154 |
| G.2.e launch period | C: CO-1710, CO-984 |
| G.3 job search; G.4 education, training, SUD treatment, basic education | C: CO-984, CO-1722, CO-1518, CO-4074, CO-3905; OQ-162, OQ-790 |
| H.1.a-b, H.2-3 levels and tables | C: CO-986, CO-993, CO-3007 and the SMI tables |
| H.4 prior thirty days; H.4.a, d, f county period | C: CO-5150, CO-5151, the readers named in section 3; CO-3914; OQ-680 |
| H.4.b contract employment | C: CO-3915, CO-5152; OQ-1221 |
| H.4.c self-employment | C: CO-5156, CO-1709, CO-1710 (OQ-680 (3)) |
| H.4.e rental property: twenty hours | **GAP → R6-4** |
| H.4.e jointly owned property | C: X5-1 fields and readers; OQ-1316. Co-owners in one household: **R6-2** |
| H.4.g-i inclusions and exclusions, irregular support, lump sums | C: CO-5720, CO-5105, CO-5725, CO-5722; OQ-680 (4) |
| H.5.a-b thirty days at application; H.5.d-e verbal verification, deadlines | C: as H.4; CO-1450, CO-1451 |
| I.1 gross earnings, armed forces pay | C: CO-5105 wages, uniformed_services_special_pay |
| I.2-3 self-employment and farm, verified expenses | C: CO-5105 cost rows, CO-1709, CO-1710 |
| I.4-5 in-kind, vendor payments | C: CO-4464 (J.1 applied) |
| I.6-8 railroad, veterans, pensions less early-payout penalties | C: CO-5720, CO-5721, CO-5722 (`early_withdrawal_penalty`); OQ-1321 |
| I.9-19 dividends, interest, estates, rents net, royalties, boarders | C: CO-5720, CO-4463 (rent net), CO-4464 (boarders) |
| I.20-22 inheritance, gifts, prizes; insurance and lawsuit proceeds net | C: CO-5722, CO-5721 (`spent_on_covered_costs`) |
| I.23-30, I.33 | C: CO-5720 rows, CO-5721, CO-5725 |
| I.31 WIOA wages; I.32 AmeriCorps and VISTA | C: CO-5105; CO-3915, CO-6407; OQ-1222 |
| J.1 child's earnings | C: CO-3915, CO-4464 |
| J.2-J.27, J.29 | C: CO-5720 rows; OQ-990, OQ-991, OQ-992, OQ-1318 |
| J.28 irregular under $90 a quarter | C: CO-4076, CO-5723, CO-5724, CO-6150, CO-6151, CO-6401 to CO-6403; OQ-713 |
| K.1-2 child support paid | C: CO-3902 (support for a person outside the household, CO-4458's meaning), CO-985, CO-1446, CO-1683 |
| 3.113.A redetermination income | C: as H.4-5 (cccap_determination_type) |
| 3.116 Colorado Works Child Care; C earned income only | C: CO-988, CO-2578; OQ-682, OQ-536 |
| 3.119.A protective services, the child's income | C: CO-994, CO-995 |
| 3.112, 3.114, 3.115, 3.117, 3.118, 3.120-3.125 | Re-read for income and household inputs only; carried as in pass 3's matrix (coverage3-cccap.md section 3); no new paragraph uncarried |

### 4.2 LEAP, 9 CCR 2503-7

| ¶ | disposition |
|---|---|
| 3.751.1 Completed Application B (SSN) | C: CO-1000, CO-1694, CO-1009 (income still counted) |
| 3.751.1 Date of Application; 3.752.1 application period, postmark, public assistance households | C: CO-2122, CO-4514 to CO-4518; OQ-800 |
| 3.751.1 Eligibility Period, Program Year | C: CO-1006, CO-1008, CO-1007 |
| 3.751.1 Household; 3.751.2.A-E; 3.751.21-22 | C: CO-1000, CO-1009, CO-4520, CO-6400; OQ-801, OQ-163. 3.751.2.C (at most fifteen members, nine households): NA, an administrative ceiling; CO-1274 precision |
| 3.751.1 Income Verification Period | C: CO-5002; OQ-886, OQ-681 (1) |
| 3.751.1 Point in Time; 3.752.2 factors as of the date of application | C: CO-7000, CO-1007, CO-6400 (L5-5 holds). Verification: **R6-5** |
| 3.751.1 Public Assistance Income; 3.752.21.L | C: CO-4518, CO-5007 |
| 3.751.1 Non-Traditional, Traditional Dwelling, Tiny Home, Subsidized Housing | C: CO-2815, CO-1283, CO-1280; OQ-561 |
| 3.752.21 A-E, G-N | C: CO-5001, CO-5003, CO-5005 to CO-5009 |
| 3.752.21.F jointly owned property | C: X5-1 fields; OQ-1316. Co-owners in one household: **R6-2** |
| 3.752.211.A-D, F-K (J: FAMLI, D-173) | C: CO-5001, CO-5003, CO-5005, CO-5006, CO-5008, CO-5009 |
| 3.752.211.E VA dependent's portion | C for a dependent elsewhere (CO-5003). Dependent in a separate household in the same dwelling: **R6-6** |
| 3.752.212 military allotment | C: CO-5001, CO-5003 (`for_person_living_elsewhere`) |
| 3.752.22.A unearned in the period, one month's income | C: CO-5003 to CO-5009, CO-5124; OQ-681 (4) |
| 3.752.22.B, C.1-2 four of eight weeks, conversion | C: CO-5120, CO-5121 (per job), CO-5122; OQ-681 (2), OQ-1160 |
| 3.752.22.C.3.a-b terminated, new earned income | C for dated pays (CO-3912). Wage streams outside the period: **R6-1** |
| 3.752.22.C.3.c first check | C for receipts (CO-5003 to CO-5008). Wage streams beginning after the application: **R6-1** |
| 3.752.22.C.4 in-kind | C: CO-5102 `counted_at_value` |
| 3.752.22.D 60% SMI, FFY 2026 (D-173) | C: CO-1003, CO-875; OQ-532 |
| 3.752.22.E reapplication | NA (a new application; 3.751.1 "Reapplication") |
| 3.752.23.A-HH exclusions | C: CO-5001 and CO-5102 rows; Q CO-5123; CC CO-5122; DD `pass_set_aside`; F CO-5004; EE CO-5009 (OQ-1317, OQ-1320); GG and BB (L5-4); V read as a non-member's receipt (coverage passes 1-3); OQ-863, OQ-885, OQ-1162, OQ-1319 |
| 3.752.24 no resources | NA |
| 3.752.25.A-D vulnerability | C: CO-876, CO-1004, CO-1283, CO-2815, CO-1274; OQ-610, OQ-561 |
| 3.753.1-3.753.18 citizenship, qualified alien, income of a non-member | C: CO-1010, CO-1694, CO-1009, CO-1691, CO-1457; OQ-550 |
| 3.753.21-22 residency | C: is_colorado_resident (CO-505) read by CO-1007 |
| 3.754.1 denial factors | C: CO-1007 (CO-2100, CO-3928 to CO-3930); OQ-714 |
| 3.755.21.A-H verification | C: CO-1455, CO-2591, CO-4526, CO-1689 to CO-1693, CO-1462. Its date: **R6-5** |
| 3.755.21.I.1 (2026-11-01) self-employment, the full month prior | C: CO-1002 (CO-1712 at month_before), CO-5126; OQ-681 (3) |
| 3.755.21.I.2.a-c receipted expenses | C: CO-1711, CO-5102; OQ-614 |
| 3.755.21.I.2.D rental property maintenance | C for a landlord stated as a business (coverage 2 N-9). A `rental_income` receipt: **GAP → R6-3** |
| 3.755.21.J LLC and S-corporation owners | C: CO-1712 precision (wages) |
| 3.755.21.K gifts by declaration | C: CO-4526 |
| 3.758.47 Steps A-G benefit | C: CO-1280, CO-1278, CO-1279, CO-1281; OQ-253, OQ-532 (figures blocked) |

### 4.3 SUN Bucks

| ¶ | disposition |
|---|---|
| 292.2 Categorically eligible | C: CO-2708, CO-5731, CO-1296, CO-4527, CO-4528, CO-4072; OQ-255, OQ-993 |
| 292.2 Household | C: CO-2708, CO-4523 |
| 292.2 Instructional year, Period of eligibility, Summer operational period; 292.7 | C: CO-2581, CO-2708 (`some_month` from the instructional year's first month); OQ-535 |
| 292.2 School aged; C.R.S. 22-33-104(1)(a) | C: CO-1292 (per month) |
| 292.5(a)-(b) reduced-price guideline in effect on the date of application | C: CO-1297 (the guideline as of July 1 of the application's year; the determination month when no application) |
| 292.6(a), (b)(1)-(4), (c)(1)-(3) | C: CO-1298 |
| 292.12(b), (d)(1)-(4), (e) | C: CO-4522, CO-1633, CO-1696, CO-4521, CO-1298 |
| 292.14(a)-(f) verification | C: CO-1699, CO-1695, CO-1698, CO-4073, CO-4854; OQ-377 |
| 292.15(c)-(f) benefit | C: CO-1299, CO-3013; OQ-1220 (blocked) |
| 245.2 foster, homeless, migrant, runaway, Head Start; 245.6 | C: CO-2813, CO-4527, CO-1296 |
| Receipt table CO-5730; no earnings read | C: colorado_works_cash as TANF assistance; every other kind `not_read` |

Rows: CCCAP 37, LEAP 37, SUN Bucks 11. GAP rows: 2 (CCCAP H.4.e twenty hours, LEAP 3.755.21.I.2.D for a `rental_income` receipt), both P1 above. R6-1 and R6-2 sit in C rows whose items mis-read the paragraph.

## 5. Open-question classification check

Every open question an item of the three programs carries (55) was read for its class, its "Checked" text and its body against the engine.

| OQ | Class recorded | Confirmed? | Note |
|---|---|---|---|
| OQ-121, OQ-162, OQ-255, OQ-377, OQ-532, OQ-535, OQ-550, OQ-562, OQ-614, OQ-682, OQ-1220 | blocked on a named document | Yes | Each names the document (county entry levels and plans, Colorado's Summer EBT POM, CDHS's program-year notice and training manual, the SAVE list, CDE's definition, county mileage rates and diversion elections, the FNS 2027 benefit levels). |
| OQ-163, OQ-253, OQ-254, OQ-536, OQ-540, OQ-561, OQ-610, OQ-680, OQ-710, OQ-711, OQ-712, OQ-713, OQ-714, OQ-716, OQ-790, OQ-800, OQ-801, OQ-850, OQ-863, OQ-871, OQ-872, OQ-873, OQ-885, OQ-886, OQ-990, OQ-991, OQ-992, OQ-993, OQ-1020, OQ-1160, OQ-1162, OQ-1163, OQ-1221, OQ-1222, OQ-1315, OQ-1317, OQ-1318, OQ-1319, OQ-1320, OQ-1321 | state policy choice | Yes | Each turns on words the State's text leaves open, quoted in its body. |
| OQ-681 | state policy choice | Yes, **text incomplete** | Point (1) reads a job that began or ended from its dated pays. It does not say what a wage stream whose job ended before the period, or begins after the application date, means, and the engine cannot determine it (R6-1). Point (4) covers the same question for receipts. |
| OQ-1316 | state policy choice | Yes, **text incomplete** | Its body says "LEAP counts gross unearned income" for rent, which leaves out 3.755.21.I.2.D (R6-3). It does not cover two co-owners in one household (R6-2). |
| OQ-134, OQ-394 | resolved | Yes | OQ-134's contradiction was removed in pass 5 (X5-3). |
| (none) | — | **Needed** | R6-4 (H.4.e's twenty hours) until a field exists; R6-3 if the LEAP owner reads I.2.D as reaching only self-employed landlords; R6-2's household reading until the readers count a property once. |

No open question is misclassified. Two need their text widened (OQ-681, OQ-1316), and three readings need an open question or a fix (R6-2, R6-3, R6-4).

## 6. Notes for the fix round

- R6-1 is L5-1's class in the two LEAP wage readers that L5-1 did not touch. The condition CO-5003 writes (a stream not counted when its source ended before the period or began after the application date) belongs in CO-3912 and in CO-5122's first sum. CCCAP's wage readers already have it (C5-1).
- R6-2 needs the co-owner named on the record, as holdings name it (`co_owner`, docs/conventions.md "Holdings records"), so the at-least-the-share test can be applied once per property per household.
- R6-3 and R6-4 are both about rental property: LEAP's I.2.D and CCCAP's H.4.e each give rental property a treatment that the schema's `rental_income` kind and generic business records cannot express. One neutral field on the business record (`rental_property`) and one maintenance figure on the rent's record would carry both.
- Promote the probes (LW1, LW2, LW4, LJ1, CJ1, LRent, CR1) to stored households with the rule answer as the expectation.

## 7. Dispositions (fix round, 2026-11-24)

Fixed on branch cov6-snap-ce from 7275700 (commit a9330f7; change record volumes/co/changes/2026-11-24-coverage6-snap-ce.yaml). Every changed rule has rule tests computed by hand from the fetched text; the probes are stored households CO-865 to CO-870.

| ID | Disposition |
|---|---|
| R6-1 | **Fixed.** CO-3912 and CO-5122's first sum do not read a record stated as a stream (no date) whose job_end_date is before leap_income_verification_period_start or whose job_start_date is after leap_application_date (3.752.22.C.3.a, C.3.c), as CO-5003 does for a receipt stream; a dated pay is read by its date (a last paycheck received in the period after the job ended counts), and a stream of a job that began or ended inside the period still needs its dated pays. OQ-681 (1) restated. Rule tests CO-3912-T9 to T12, CO-5122-T5; stored CO-865 (LW1), CO-866 (LW2), CO-867 (LW4): cannot determine -> eligible ($3,000, $3,000, $1,500). |
| R6-2 | **Fixed, with the residual reading recorded.** Neutral receipts field `co_owner` (person; absent: the property's other owners are outside the case), as holdings name a co-owner; each co-owner of the case states the income on the own list with what that co-owner received. CCCAP (CO-5721, CO-5722, CO-5723, CO-4076, CO-4463) and LEAP (CO-5003, CO-5009, CO-4526) apply the share test once per property in the household: a record whose co-owner is another member of the household (cccap_household_members, leap_household_members_for_income, read as the record owner's fact, P60) counts what was received; the share is the floor against owners outside the household. OQ-1316 records the reading and the case the text leaves open (co-owners in the household who together receive less than their combined shares because an owner outside keeps more). Rule tests CO-5721-T19 to T21, CO-5003-T17, T18; stored CO-868 (CJ1: $4,400 ineligible_income -> $4,100 eligible_low_income) and CO-869 (LJ1: $5,500 ineligible -> $4,500 eligible). |
| R6-3 | **Recorded: OQ-1365** (state policy choice). LEAP's text names rent only in 3.755.21.I.2.D, inside the self-employment verification paragraph, and counts unearned income gross (3.752.22.A); whether I.2.D reaches a landlord's rent stated as unearned income is the owner's reading. Assumption: gross, as now (LRent: $4,000, ineligible; the other reading $3,600, eligible). OQ-1316's body corrected (it said only that LEAP counts gross unearned income); CO-5001's rental_income row cites I.2.D as its candidate paragraph. |
| R6-4 | **Fixed.** Neutral earnings field `rental_property` (yes/no, required where read). CCCAP reads a business's receipts record that is rental property and whose hours average under cccap_rental_property_self_employment_min_hours_per_week (CO-7252, twenty) a week as unearned rent (cccap_rental_property_receipts_as_unearned, CO-7251, counted in CO-3916 and net of the landlord's expenses in CO-4463) and not as self-employment (CO-5156) or an activity's hours (CO-6404); the field is read only on a record under the line. The weekly average over the month's days divided by seven is OQ-1366 (state policy choice). Rule tests CO-7251-T1 to T5, CO-5156-T8, T9, CO-6404-T5; stored CO-870 (CR1: eligible_low_income -> ineligible_activity). Decision 4: CO-136 and CO-716 now state that their businesses are not rental property; nineteen CCCAP rule tests state it on their business records or state an empty earnings list. |
| R6-5 | **Fixed by the time contract (P2).** docs/conventions.md (Scopes) and CO-1462's precision: LEAP's verification status is reported on a separate evaluation of the same facts stated as of the day the county looks; it is not part of the eligibility determination, which CO-7000 fixes at the application date. No item's decision changes. |
| R6-6 | **Fixed (P2).** CO-5003 takes off the part of a veterans benefit paid for a dependent who is a person of the case outside the veteran's LEAP household (for_dependent, for_person); new leap_dependent_part_of_awards_to_others (CO-7253) counts it to the dependent (3.752.211.E), read into leap_person_unearned_income (CO-3926). Rule tests CO-5003-T19, T20, CO-7253-T1, T2. A one-time award's part (CO-5009) is not split; no case states one. |
| R6-7 | **Fixed (P3).** CO-5005 and CO-5006 drop the cents of each amount before adding (3.752.211.H, 3.752.21.I). Rule tests CO-5005-T6 ($500.60 + $300.70 -> 800), CO-5006-T3. |

Open-question classes: OQ-681 and OQ-1316 widened as section 5 asks; new OQ-1365 (R6-3) and OQ-1366 (R6-4), both state policy choices with the text checked.

**Gates** at the round's final commit (origin ccr-9d19bf4c-wmnwcl merged; no newer commit at the last fetch): `node scripts/sync-manifest.mjs co` written; `npm run typecheck` passes; `npx vitest run` 1,161 tests pass (103 files; pins moved with their reasons: open questions 214, departures 45, figures 480); `npm run receipts:harness -- --all-programs`, `npm run records:harness -- --list earnings --all-programs` and `--list holdings --all-programs` each 0 unexplained differences and 0 metamorphic violations, every answer change an enumerated, cited entry (scripts/receipts/allowed-differences.yaml, scripts/records/allowed/coverage6-snap-ce.yaml, h6-coverage6-snap-ce.yaml). Two relations carry the round's fields: the earnings split halves `recouped`, and the month relation leaves a stream whose job dates do not cover the month a stream; the receipts split cuts Social Security and SSI at a whole dollar (LEAP drops each benefit amount's cents, R6-7). `CHECK_BASE=origin/main npm run check`: OK, every change-impact flag dispositioned in volumes/co/changes/2026-11-24-coverage6-snap-ce.yaml.

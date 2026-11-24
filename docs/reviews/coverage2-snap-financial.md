# Coverage matrix, second pass: SNAP financial eligibility (family `snap-financial`)

Reviewer: independent coverage reviewer, second exhaustive pass after the coverage fix round. Read-only, on HEAD `65ed7c8`, run in a `git archive` snapshot in scratch with node_modules symlinked. `npm run export -- --volume co` wrote 2,143 items to `conformance/co/ledger.json`; the item lists below come from it. The matrix was rebuilt from the rule text, not copied from the first pass (`coverage-snap-financial.md`).

Texts read in full:
- D-82, 10 CCR 2506-1 (rule version 12718, effective 2026-10-01):
  - 4.207.2-4.207.3 (lines 2553-2610);
  - 4.400-4.411.2 (lines 5687-8738);
  - 4.500-4.504.61 (lines 8740-9306);
  - 4.506-4.507 (lines 9823-10037).
  - 4.505 (verification of non-financial information) belongs to the non-financial family.
- D-83 and D-84, the FNS FY 2027 tables: maximum and minimum allotments, deductions, asset limits and income standards.
- Cross-checks:
  - D-12, D-13, D-14 and D-15 (7 CFR 273.8-273.11);
  - D-95 and D-116 (273.2(f) and (f)(8)).

How households were reproduced:
- `scripts/eval-mod.ts` is a scratch copy of `eval-case.ts`. It overrides a case's person facts (`p1`), month facts (`p1@2027-02`) and case facts, and is not in the repo.
- Base households:
  - CO-115: a homeless father earning $1,000 with a six-year-old, applied 2026-11-02, evaluated 2027-02. Base: gross 1,000, allotment 387, `expanded_categorical`.
  - CO-83, for child support.
  - A standard-eligibility variant of CO-115: p1 receives SSDI of $4,000, has $2,400 of verified medical expenses and $4,000 of savings. That gives `standard`, `eligible`, allotment 136.

## 1. Verdict

**4 P1 found.** Three change an eligibility or benefit answer and one changes a verification requirement. All four are new: each lies in code or facts the coverage fix round added, or in a paragraph the first pass marked as carried. Every first-pass P1 (CF-1 to CF-12) stays fixed (section 5).

## 2. Findings

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| C2-1 | P1 | 4.402.A.2; 4.405.A; 4.405.2.A.6, A.9, A.12 | CO-4324 (`snap_person_wages`), CO-2338 (`snap_excluded_earned_income`), CO-3922, CO-4010 | 4.402.A.2: "Weekly Multiply Weekly Average by 4.3. Bi-Weekly ... by 2.15." 4.405.A: "Any income ... received too infrequently or irregularly to be reasonably anticipated, but not in excess of thirty dollars ($30) in three (3) months." | With a weekly, biweekly or semimonthly schedule, CO-4324 builds the wages from `wages_gross_per_pay_period` × the rate. That figure is "the regular gross pay" and leaves out the month's `wages_gross`. CO-2338 then subtracts the month's own excluded receipts, which are defined as parts of `wages_gross`; CO-4324's precision says so on purpose.<br>- An excluded receipt that is not regular pay is subtracted from a figure that never held it. Example: an odd job's irregular earnings (CO-4010).<br>- An excluded receipt that is part of regular pay is subtracted at the month's 4 or 5 paydays, not at the 4.3 or 2.15 of the conversion. Examples: SCSEP, combat pay, WIOA OJT of a member under 19, summer youth wages.<br>**Reproduced** on CO-115: p1 is paid $250 weekly, and in February also gets a $20 odd-job payment (`wages_gross` 1,020, CO-4010 = 20, nothing else in the quarter). `snap_person_wages` = 1,075 and the exclusion = 20, so gross = 1,055 and the allotment is 373. The $20 is excluded and was never in the 1,075, so gross should be 1,075 and the allotment 369. | In the converted branch, convert the excluded regular-pay parts the same way, or define the per-period pay as net of SNAP-excluded regular earnings. Subtract only the excluded receipts that are not regular pay (irregular earnings, work-study as now) when they are in the month's `wages_gross`. Simplest: move the subtraction into CO-4324, so its converted branch is (per-period pay − excluded per-period parts) × rate, with CO-2338 applying only to the monthly branch. Add a test with irregular earnings and a weekly schedule. |
| C2-2 | P1 | 4.410.D.2.i; 273.8(e)(2) and ABLE Act sec. 103 (26 U.S.C. 529A note) | CO-4176 (`snap_countable_liquid_resources`), CO-4415 (`able_account_value`), CO-3390 | "All retirement accounts with Federal tax preferred retirement status are exempt resources. The following retirement accounts are exempt: ... i. 529A funds including funds in a qualified ABLE program" | The Adult Financial coverage round (F-6) made the ABLE account a part of `liquid_resources_value` (CO-4415: "Part of liquid_resources_value, not added to it"). CO-4176 subtracts tax refunds, EITC, education accounts, inaccessible funds and prorated income, but not CO-4415, so SNAP counts an ABLE balance as a liquid resource.<br>**Reproduced** on the standard-eligibility variant:<br>- liquid 4,000: countable 4,000, `eligible`, allotment 136;<br>- liquid 6,000 of which `able_account_value` 2,000: countable 6,000, `over_resource_limit`, allotment 0.<br>Should be countable 4,000, `eligible`, 136. | Subtract `able_account_value` in CO-4176 and cite 4.410.D.2.i. Check the other parts the AF round split out of CO-3390 (CO-4413 state refunds, CO-4414 retroactive SSA, CO-4416 business cash, CO-4417 replacement proceeds) and record that SNAP counts them (see C2-7 for business cash). Add a test. |
| C2-3 | P1 | 4.405.C; 273.9(c)(7) | CO-2569 (`snap_student_earnings_are_excluded`), CO-2568 | 4.405.C: "children who are under eighteen (18) years of age ... and are students **at least half-time** in elementary school, high school, or classes to obtain a General Equivalency Diploma (GED), will be considered exempt income." 273.9(c)(7): "students at least half-time" | CO-2568 tests only `education_program_type` (elementary, secondary, GED and so on), and CO-2569 adds age and parental control. Neither reads `education_enrollment_intensity`, which exists (full_time, half_time, less_than_half_time) and which CO-020 reads for work registration. A child enrolled less than half time has all earnings excluded.<br>**Reproduced** on CO-115: p2, 16, in high-school-equivalency classes at `less_than_half_time`, earns $400. `snap_student_earnings_are_excluded` = true, gross 1,000, allotment 387. The earnings count, which gives gross 1,400 and an allotment of about 291, as in CF-5's counted month. | In CO-2569 (or CO-2568 as used there), require `education_enrollment_intensity` in {full_time, half_time}. Add a test for each value. |
| C2-4 | P1 (verification) | 4.506 ("verified at recertification when a household reports that the amount of income has changed more than fifty dollars ($50)"); 4.502.B.1-2; 273.2(f)(8)(i)(A) | CO-1619 (`snap_income_changed_since_last_certification`), CO-1376, CO-1377, CO-1568 | 273.2(f)(8)(i)(A): "The State agency shall not verify income if the source has not changed and if the amount is unchanged or has changed by $50 or less". 4.502.B.1: "Unchanged information shall not be verified unless the information is outdated." | CO-1619 compares `wages_gross + snap_self_employment_income + snap_person_unearned_income` with CO-1568, "the person's total monthly gross income ... as last verified for SNAP". After CF-3, SNAP's monthly wages are CO-4324, but CO-1619 still reads the raw `wages_gross`. In a five-payday month the unchanged pay of a weekly or biweekly earner shows as a change of more than $50. Raw wages also include excluded work-study and other excluded parts, while the unearned side is net of exclusions. CO-1376 and CO-1377 both read CO-1619.<br>**Reproduced** on CO-115 as a recertification: p1 paid $250 weekly (`wages_gross` 1,250 in the month), CO-1568 = 1,075, same source. `snap_person_wages` = 1,075, but CO-1619 = true and `snap_requires_verification_of_earned_income` = true. It should be false: unchanged.<br>The same raw `wages_gross` is read by CO-3503 (a striker's current income against pre-strike income), which is P3 by itself. | Read `snap_person_wages` (or CO-330 before the exclusions it applies) in CO-1619 and CO-3503, and say in CO-1568's meaning that it is the SNAP-converted figure. Add a recertification test with five weekly paydays. |
| C2-5 | P2 | 4.405.E (second paragraph) | CO-3367 (`lump_sum_received`), CO-2339, CO-029 | "State and county diversion payments under Colorado Works shall be excluded as a non-recurring lump sum payment if the payment does not cover more than ninety (90) days of expenses and is not expected to occur again in a twelve (12) month period." | No SNAP fact or meaning says where a Colorado Works diversion payment goes. CO-029 is basic cash only, and CO-3367's list does not name diversion payments. A case can state a diversion payment as `other_unearned_income_*`, where SNAP counts it in full, or as a lump sum, where it is excluded whatever period it covers. Either can give the wrong answer, and the 90-day condition is not modeled. | Name diversion payments of 90 days or less (not expected again within 12 months) in CO-3367's meaning, and say a longer one is counted. Or add a receipt fact. |
| C2-6 | P3 | 4.405.2.A.3; 4.403.A.2 | CO-4303, CO-330, CO-3366 | "Payments under Title I (... VISTA ...) to volunteers shall be excluded for those individuals receiving SNAP or PA at the time they joined" | CO-4303's precision sends a Title I payment at or above the minimum wage to `wages_gross`. SNAP then counts it as earned income even for a volunteer who joined while on SNAP or PA. VISTA stipends are almost always below the minimum wage. | Let CO-4303 state every Title I payment, whatever its rate, and subtract it from `wages_gross` in CO-330 when the person joined on SNAP or PA. |
| C2-7 | P3 | 4.410.E.1; 273.8(e)(5) | CO-4176, CO-4416 | "Property ... essential to the employment or self-employment of a household member" | `business_cash_and_convertible_assets_value` (part of CO-3390, added for Adult Financial) is counted by SNAP. Whether a business operating account is "property essential to self-employment" for SNAP is not recorded. | Record the SNAP reading in CO-4176's precision, or subtract it. |
| C2-8 | P3 | OQ-353 | CO-376, CO-1514 | (class) | Still classed "state policy choice". The question names the deciding text itself: Colorado's SMED demonstration approval, which is not on an allowed host. This repeats the first pass's P3. | Reclassify as blocked on a named document. |

Totals: 4 P1, 1 P2, 3 P3. The deferred P2s of the first pass stay as their disposition records them:
- CF-12, periodic report: recorded out of scope.
- CF-17, the verified part of medical expenses: recorded in CO-3740's precision.
- CF-19, joint SSI applicants released from an institution: recorded in colorado-notes.

They are not counted again.

## 3. Coverage matrix

Legend:
- **C**: carried by; checked against the text and "ok" unless a finding is named.
- **FL**: fact-level; the supplied fact's meaning states how the amount is formed, and no computation follows.
- **NA**: not applicable, with the reason.
- **OQ**: the open question that holds it.
- **GAP**: no item and no recorded reason.

Matrix size: 251 rows covering every numbered paragraph and subparagraph of the listed texts that states a condition, figure, computation, exception, period or verification requirement, plus 14 federal and FNS cross-check rows.

### 3.1 Proration and benefit computation (4.207.2-4.207.3)

| paragraph | disposition |
|---|---|
| 4.207.2.A, initial month prorated from the date of application | C: CO-2305, CO-2308, CO-4269, CO-385 |
| 4.207.2.A, joint SSI and SNAP applicants released from a public institution | Recorded in colorado-notes (CF-19, deferred P2) |
| 4.207.2.A, full allotment in all other months | C: CO-2307, CO-385 |
| 4.207.2.B, migrant or seasonal farmworker in the job stream, break of 30 days or less: no proration | C: CO-2305 |
| 4.207.2.C.1-4, (days in month + 1 − application day) × full ÷ days in month | C: CO-2308. The day count from the begin date to the next month is the same quantity; the floor follows 273.10(a)(1)(ii) |
| 4.207.3.A, "after eligibility has been established" | C: CO-2307, CO-2308 gates (gross, net, resources, lottery, transfer, striker) |
| 4.207.3.A.1-3, max − 30% of net, rounded down | C: CO-384, CO-2307 |
| 4.207.3.B, initial month under the minimum: nothing issued | C: CO-385, CO-3700 ($10, statute override, 7 U.S.C. 2017(c)(1)) |
| 4.207.3.B, certify from the month of application when later months pay | C: CO-386, which reads the full month |
| 4.207.3.B, 3+ members at zero denied unless BCE or ECE; not for proration zeros | C: CO-386, CO-387 |
| 4.207.3.C, minimum for 1-2 persons except the initial month | C: CO-2307, CO-135, CO-140; cap CO-4182 |
| 4.207.3.D, maximum allotment FY2027 (306 ... 1,841; +225; 18+ 3,887) | C: CO-130, CO-131, CO-3726, CO-3727, CO-383; all match D-83 |
| 4.207.3.D, minimum $25 | C: CO-135 (matches D-83) |

### 3.2 Income standards (4.400-4.401.2)

| paragraph | disposition |
|---|---|
| 4.400, prospective income; resources only under Standard Eligibility | C: CO-344 (categorical bypass), CO-4324, CO-331 |
| 4.401.A, gross and net standards by composition | C: CO-347, CO-382 |
| 4.401.A.1, ECE gross "below" 200% | C: CO-339, CO-340; OQ-356 (comparison word) |
| 4.401.A.2, BCE deemed to meet both limits | C: CO-338, CO-342, CO-347, CO-382 |
| 4.401.A.3.a, Standard Eligibility without elderly or disabled: gross ≤130%, net ≤100% | C: CO-345, CO-346, CO-347, CO-382 |
| 4.401.A.3.b, Standard Eligibility with elderly or disabled: net test only | C: CO-347 |
| 4.401.A.4, elderly or disabled separate household; others' income ≤165% | C: CO-419, CO-2304, CO-114, CO-3043 |
| 4.401.B, ineligible students and disqualified members left out of the size | C: CO-312, CO-313, CO-3714 |
| 4.401.1, 130% / 200% / 165% FY2027 tables and add-ons | C: CO-110, CO-111, CO-122, CO-123, CO-114, CO-3043; all match 4.401.1 and D-84 |
| 4.401.2, 100% net table and +$474 | C: CO-112, CO-113 (match D-84) |

### 3.3 Household income (4.402-4.402.2)

| paragraph | disposition |
|---|---|
| 4.402.A.1, prospective anticipation | FL: monthly receipt facts are the anticipated amounts |
| 4.402.A.2, conversion weekly 4.3, biweekly 2.15, semimonthly 2, every other month 0.5, quarterly 0.333333, twice a year 0.166666, annual .083 | C: CO-4323 (values match), CO-4324 (wages), CO-331 (periodic unearned). C2-1 fixed (CO-4682; irregular earnings added back in CO-4324) |
| 4.402.A.3, all income unless 4.405 excludes; disqualified member's share; month received | C: CO-330, CO-331, CO-333, CO-334 |
| 4.402.B.1-3, early or late pay; two benefit payments in one month; armed services | FL: the month's anticipated amount; conversion by schedule (CO-4324) |
| 4.402.C.1, IEVS and IRS data verified before adverse action | NA: case-maintenance procedure; no determination effect |
| 4.402.1.A, prospective budgeting for all households | C: as 4.400 |
| 4.402.1.B, uncertain income not counted | FL: CO-023 and the receipt facts are amounts "anticipated with reasonable certainty" |
| 4.402.1.C, last 30 days or a longer or seasonal period as indication | FL: CO-3922 (eight-week average when pay varies) |
| 4.402.2, averaging over the period intended | C: CO-4324, CO-1702, CO-4331 |
| 4.402.2.A.1, self-employment annual support over 12 months | C: CO-4327, CO-4329, CO-4349, CO-1702 |
| 4.402.2.A.2, annual contract income over 12 months; not hourly or piecework | C: CO-4325, CO-4326, CO-4324 |
| 4.402.2.A.3, educational income prorated | NA: all educational assistance is excluded (4.405.1; CO-2339) |
| 4.402.2.A.4, elective averaging of fluctuating income; not for destitute migrants | FL: an elected average is stated as the month's figure (recorded, CF-3 disposition); CO-4329 excludes destitute migrants |
| 4.402.2.B, averaged income added to other income | C: CO-330, CO-332 |
| 4.402.2.C, averaging method | FL |

### 3.4 Earned income (4.403-4.403.3)

| paragraph | disposition |
|---|---|
| 4.403.A.1, wages, garnishments and diverted wages | FL: CO-023 (gross before withholding) |
| 4.403.A.1, state work-study not earned income | C: CO-3361, CO-2338 |
| 4.403.A.2, ASCS payments; VISTA earned unless joined on SNAP | C: CO-4303, CO-4304, CO-330 (C2-6, P3) |
| 4.403.A.3, held wages, advances, repayment disregarded | FL: CO-023 |
| 4.403.A.4, sick, vacation and bonus pay while employed | FL: CO-023 |
| 4.403.B.1, non-WIOA training allowances are earned | C: CO-4300, CO-330 |
| 4.403.B.2, WIOA OJT earned except under 19 under parental control | C: CO-2338 (CO-4318 at 19, first-of-month age) |
| 4.403.C, DVSA Title I earned, with the 20% deduction | C: CO-330, CO-372 |
| 4.403.D, strikers: the higher of pre-strike and current income | C: CO-3500, CO-3502, CO-3503, CO-3504 (P3 note in C2-4) |
| 4.403.E.1, rental property actively managed 20+ hours is self-employment | FL: CO-1700, with the passive rent split CO-4457 |
| 4.403.E.2, sale proceeds of capital goods counted in full | FL: CO-1700 |
| 4.403.F, LLC or S-corporation owners are employees; draw net of expenses; statement accepted | C: CO-4341, CO-1376 |
| 4.403.G, boarder payments incl. shelter contributions; third-party payments excluded | C: CO-4161, CO-4165 |
| 4.403.1.A-B, self-employment definition; work registration | NA: definition; work registration belongs to the non-financial family |
| 4.403.11, gross + capital gains − costs | C: CO-1702, CO-1701 |
| 4.403.11.A, divide over the months covered; 50% tax caution | C: CO-1702 (averaging); FL for capital gains |
| 4.403.11.B, allowable costs | FL: CO-1701 meaning |
| 4.403.11.C.1-3, disallowed costs (boarder excess, prior losses, income taxes) | FL: CO-1701; boarder cap C: CO-4165 |
| 4.403.11.D, capital gains over 12 months | FL: stated in the averaged receipts |
| 4.403.12.A, annual support over 12 months unless substantial change | C: CO-4329, CO-4342 |
| 4.403.12.B, partial support over the self-employment months | FL: recorded in the CF-3 disposition (stated by month) |
| 4.403.12.C, monthly receipts that are annual support | C: CO-4329 |
| 4.403.12.D, new enterprise: months in operation | C: CO-4349 (checked: a start in June 2026 gives June-October) |
| 4.403.12.E.1-2, farm loss; $1,000 farmer test; offset order | C: CO-3721, CO-3722 to CO-3725, CO-372, CO-378. B-C overridden by 273.11(a)(2)(ii)(B) (statute override on CO-3725) |
| 4.403.2, boarders excluded from the household; commercial boarding house | Non-financial (household composition), CO-2567 |
| 4.403.2.A, boarder income definition | C: CO-4161 |
| 4.403.2.B.1-3, cost: max allotment for the number of boarders, or actual if higher; foster care in full; capped at payment | C: CO-4165 |
| 4.403.2.C, net boarder income earned; 20% deduction | C: CO-330, CO-372 |
| 4.403.2.D, household's shelter costs; not those the boarder pays to third parties | FL: CO-035 |
| 4.403.3.A-D, annual school contract averaged over 12 months | C: CO-4325, CO-4326, CO-4324 |

### 3.5 Unearned income (4.404)

| paragraph | disposition |
|---|---|
| 4.404.A, SSI, TANF, need-based assistance, workfare | C: CO-331 (CO-849, CO-029, CO-1713) |
| 4.404.B, annuities, pensions, VA, workers' compensation, UI, SS, strike benefits | C: CO-331 (social security, pension, unemployment, other) |
| 4.404.C, support and alimony paid directly | C: CO-331 (child support received; other) |
| 4.404.D, passive rent net of costs | C: CO-4457, CO-4321, CO-4322, CO-331 |
| 4.404.E, sponsor income | C: CO-3701, CO-332 (deeming belongs to the non-financial family) |
| 4.404.F, vacation, sick or bonus pay after termination: installments unearned, lump sum a resource | FL: other unearned; CO-3367 |
| 4.404.G, gifts: nonprofit over $300 a quarter; others anticipated | C: CO-2339 (CO-4317) |
| 4.404.H, dividends, interest, royalties, trust withdrawals | C: CO-331 (tax-exempt interest, other) |
| 4.404.I, substantial winnings counted the month received; shared ticket | C: CO-1181, CO-4150, CO-4151, CO-331; share FL |

### 3.6 Exempt income (4.405-4.405.2)

| paragraph | disposition |
|---|---|
| 4.405.A, irregular income ≤$30 in three months | C: CO-2338, CO-2339, CO-3822, CO-4010, CO-4077, CO-4316 (calendar quarter = federal quarter). C2-1 fixed |
| 4.405.B, money for a non-household beneficiary; pro rata rule | C: CO-2339 (income received for a person living elsewhere); pro rata FL |
| 4.405.C, child student earnings; turning 18 | C: CO-2569 (age timing ok, CF-5). C2-3 fixed (half time required) |
| 4.405.D.1, recoupments except means-tested IPV recoupment | C: CO-4305, CO-4306, CO-2339 |
| 4.405.D.2, child support passed to IV-D | C: CO-2339 |
| 4.405.E, nonrecurring lump sums a resource | C: CO-3367, CO-2339, CO-3390 |
| 4.405.E, Colorado Works diversion payments ≤90 days | C: CO-3367 precision, S3476 (C2-5 fixed) |
| 4.405.F.1-2, loans; reverse mortgage | C: CO-2339 (loan proceeds, reverse mortgage CO-3820) |
| 4.405.G, in-kind benefits | FL: the receipt facts are money only |
| 4.405.H.1-10, vendor payments; diverted legally obligated money counted; energy H.7; court-ordered third-party support H.9-10 | FL: the receipt facts are money paid to the household. H.7: CO-3364 minus nonprofit and supplier energy, counted (CO-2339). H.4 employer housing: in-kind |
| 4.405.I.1-4, reimbursements | C: CO-3363, CO-2339 |
| 4.405.J, exempt income verified only if questionable | C: CO-1376 and CO-1377 read countable income |
| 4.405.1, educational assistance | C: CO-2339 (educational assistance) |
| 4.405.2.A.1, child nutrition assistance | FL: in-kind |
| 4.405.2.A.2, Uniform Relocation Act | C: CO-3366, CO-2339 |
| 4.405.2.A.3, DVSA Title II; Title I if on SNAP or PA when joining | C: CO-3366, CO-4303, CO-4304, CO-330 (C2-6, P3) |
| 4.405.2.A.4, NCSA and AmeriCorps; disaster assistance | C: CO-4016, CO-3366, CO-2339 |
| 4.405.2.A.6, WIOA; OJT counted except under 19; summer youth | C: CO-3815, CO-2338, CO-2339 (C2-1 fixed: converted with the pay, CO-4682) |
| 4.405.2.A.7, federal energy assistance; weatherization and furnace | C: CO-3364, CO-2339 |
| 4.405.2.A.8, YIEPP, YCCIP, CETA Title IV | C: CO-3815 |
| 4.405.2.A.9, SCSEP | C: CO-2338 |
| 4.405.2.A.10, need-based charitable cash ≤$300 a fiscal quarter | C: CO-2339, CO-4317 |
| 4.405.2.A.11, ex-spouse's share of military retirement | C: CO-2339 |
| 4.405.2.A.12, combat pay | C: CO-2338 |
| 4.405.2.A.13, mandatory military education deductions | C: CO-2338 |
| 4.405.2.A.14, Civil Liberties Act | C: CO-3366 |
| 4.405.2.A.15, migrant emergency assistance in the job stream | C: CO-2339 |
| 4.405.2.A.16, WIC | FL: in-kind |
| 4.405.2.A.17, 19, 24, IV-A, at-risk and CCDBG child care | FL: vendor or in-kind; a deduction is allowed only for the out-of-pocket part (CO-032) |
| 4.405.2.A.18, Agent Orange settlement | C: CO-3366 |
| 4.405.2.A.20, EITC | C: CO-2339 (tax refunds and credits) |
| 4.405.2.A.21, Employment First reimbursements | C: CO-3363 |
| 4.405.2.A.22, PASS | C: CO-3825, CO-2339 |
| 4.405.2.A.23, Radiation Exposure Compensation | C: CO-3366 |
| 4.405.2.A.25, Family Investment Center services | FL: services, not money |
| 4.405.2.A.26, Nazi persecution payments | C: CO-3366 |
| 4.405.2.A.27, crime victim compensation | C: CO-3813, CO-2339 |
| 4.405.2.A.28, spina bifida allowance | C: CO-3366 |
| 4.405.2.B.1-21, American Indian and Alaska Native payments (incl. $2,000 per-capita limits) | C: CO-3366 ("Indian judgment and trust fund payments, Alaska Native Claims Settlement Act distributions"); per-payment $2,000 limits are FL (only the excluded part is stated) |

### 3.7 Destitute households (4.406-4.406.1)

| paragraph | disposition |
|---|---|
| 4.406, migrant or seasonal destitute; first month of each certification period | C: CO-055, CO-4168 (recertification reads its own application date, CF-22) |
| 4.406.A.1-3, terminated or new source; $25; 10th day | FL: CO-055 meaning |
| 4.406.B, source is the grower | FL |
| 4.406.C, no limit on the number of times | NA: expedited processing (non-financial) |
| 4.406.1.A, only income received from the 1st to the application date; proration | C: CO-4166, CO-4167, CO-330, CO-331, CO-2308 |
| 4.406.1.B, new-source income over $25 not received within 10 days disregarded | FL: CO-4166 and CO-4167 |
| 4.406.1.C, relocation travel advances | FL: reimbursement (CO-3363) |

### 3.8 Deductions (4.407-4.407.61)

| paragraph | disposition |
|---|---|
| 4.407.A, deductions from gross; no deduction for vendor- or reimbursement-covered costs | C: CO-378; FL (out-of-pocket meanings of CO-032, CO-034, CO-035) |
| 4.407.B, elected averaging of expenses | FL (CO-3740 precision, CF-17) |
| 4.407.C, anticipated expenses; weekly and biweekly converted | FL |
| 4.407.D, child support is an exclusion | C: CO-2003, CO-4333, CO-334 |
| 4.407.E, only five deductions | C: CO-378, CO-381 |
| 4.407.1, standard deduction FY2027 217/229/268/308; six or more use six | C: CO-132, CO-370 (match D-83) |
| 4.407.2.A, 20% of earned income incl. a prorated disqualified member's | C: CO-372, CO-373, CO-371 |
| 4.407.2.B, work supplementation | NA: recorded in CO-373 (C.R.S. 26-2-111.3 repealed) |
| 4.407.2.B, IHE claim without the 20% | NA: claims |
| 4.407.3.A, excess over 50% of income after deductions | C: CO-378, CO-379, CO-138 |
| 4.407.3.A, disqualified person's shelter: IPV in full; non-citizen or SSN pro rata | C: CO-2300, CO-2302, CO-2565 |
| 4.407.3.B, cap $769 unless elderly or disabled | C: CO-133, CO-379 |
| 4.407.3.C, homeless shelter deduction $205.66; all members homeless; incurring costs; actual if higher | C: CO-134, CO-380, CO-381 |
| 4.407.3.D, unoccupied home costs | C: CO-1585, CO-035 (FL), CO-1379 |
| 4.407.3.E.1-3, rent, mortgage, condo fees, loans to buy, second mortgage, reverse-mortgage repayment, disaster repair | C: CO-035, CO-4345, CO-2300 |
| 4.407.3.E.4-5, utilities; telephone, VOIP, no internet | C: CO-1241, CO-1500 |
| 4.407.31, mandatory SUA; one allowance | C: CO-1500 |
| 4.407.31.A.1.a, c-e, HCUA by heating or cooling arrangement | C: CO-3300, CO-1239, CO-1243 |
| 4.407.31.A.1.b, HCUA by LEAP or E-EBT within 12 months | C: CO-1240, CO-1243 (H.R.1 sec. 10103 override: elderly or disabled only; OQ-251, OQ-533) |
| 4.407.31.A.2-3, irregular heating costs; space heaters only for BUA | FL: CO-3300 meaning |
| 4.407.31.A.4, HCUA $616 | C: CO-1235 |
| 4.407.31.B, BUA two or more non-heating costs, $390 | C: CO-1241, CO-3042, CO-1236, CO-1500 |
| 4.407.31.C, OUA one non-phone cost, $73 | C: CO-1237, CO-1500 |
| 4.407.31.D, telephone only, $100 | C: CO-1238, CO-1500 |
| 4.407.31, shared residence: full allowance per household | FL: the `home_incurs_*` facts are the household's own |
| 4.407.4.A, dependent care for work, job search, training; disqualified person's share | C: CO-032, CO-2301, CO-374 |
| 4.407.4.A.1-3, provider, transportation at the IRS rate, fees | FL: CO-032 |
| 4.407.4.B-D, full amount; money only; no TCC or JOBS-reimbursed care | FL: CO-032 (out-of-pocket) |
| 4.407.5.A, legally obligated support excluded from total gross before the gross test; minor payer | C: CO-033, CO-2003, CO-4333, CO-334 (CF-4) |
| 4.407.5.B-C, third-party payments under the order; arrears; not alimony | FL: CO-033 |
| 4.407.5.D-E, three-month average; estimate if shorter | C: CO-2002, CO-2003, CO-3039 |
| 4.407.5.F, unreported or unverified: not allowed | C: CO-2003 (30-day disallowance, CO-3739) |
| 4.407.6, medical over $35 for elderly or disabled members only | C: CO-376, CO-137, CO-303 |
| 4.407.6.A.1-7, allowable costs | FL: CO-034, CO-835 |
| 4.407.6.A.8, attendant wages; one-person maximum allotment for meals | C: CO-034 (FL), CO-4334, CO-2895 |
| 4.407.6.A, billed expenses pending reimbursement | FL |
| 4.407.6.B.1-6, non-allowable costs; carried-forward bills | FL: CO-034 |
| 4.407.61.A, SMED $165; actual if over the SMED after $35 | C: CO-1514, CO-376; OQ-353 ($165-$200 band; C2-8 fixed: reclassified as blocked on a named document) |
| 4.407.61.A table, verification at application and recertification | C: CO-1380, CO-3740 (verified-part limit recorded, CF-17) |
| 4.407.61.B, weekly and biweekly conversion | FL |
| 4.407.61.C, one-time expenses: lump or averaged; SMED when averaged over $35 | FL: CO-3740 precision |

### 3.9 Resources (4.408-4.410)

| paragraph | disposition |
|---|---|
| 4.408.A, BCE and ECE exempt from the resource test | C: CO-344 |
| 4.408.B, nonexempt resources available in the issuance month | C: CO-343 |
| 4.408.B, sponsor resources less $2,000 | C: CO-3702, CO-3704 ($1,500 per 4.305.2.D.6 and 273.4(c)(2); recorded) |
| 4.408.C, declared liquid resources for expedited service | NA: non-financial (expedited) |
| 4.408.D-E, two limits; State text still $4,500 | C: CO-118, CO-119 ($4,750 from D-83; OQ-251(2) resolved), CO-344 (≤, statute override CF-13) |
| 4.408.1.A, liquid: redemption value less encumbrances | FL: CO-3390 |
| 4.408.1.B, non-liquid fair market value less encumbrances; real property by assessor | FL: CO-3393 |
| 4.408.2, transfers within three months before application; up to one year | C: CO-3834, CO-3835, CO-4155, CO-4158, CO-4159, CO-4160 |
| 4.408.2.A.1-4, transfers that do not count | C: CO-4158 (excess over the limit), CO-4155 (purpose); A.2-A.3 FL (uncompensated value) |
| 4.408.2.B, begins in the month of application; adverse action for participants | C: CO-4160, CO-4156; CO-2308 gate (CF-9) |
| 4.408.2.C, chart 1/3/6/9/12 months | C: CO-4157 |
| 4.409.A, liquid resources | C: CO-3390, CO-4176 |
| 4.409.B, non-liquid resources at equity | C: CO-3393, CO-074 |
| 4.409.C, joint resources available in entirety unless inaccessible | C: CO-4340, CO-4343, CO-4175 (CF-8) |
| 4.409.D, commingled exempt funds for six months | FL: the exclusion facts state what is still excluded (first-pass P3, not taken) |
| 4.410.A, all vehicles exempt | C: CO-074 and CO-4176 read no vehicle |
| 4.410.B, home and surrounding property; temporarily unoccupied; lot for a home | C: CO-3393 (other than home), CO-4336 |
| 4.410.C, prorated income held | C: CO-4319, CO-4176 |
| 4.410.D.1, household goods, burial plots, life insurance cash value, livestock | C: not read by CO-074 or CO-4176 |
| 4.410.D.2, retirement accounts | C: CO-3392 not read |
| 4.410.D.2.i, ABLE (529A) | C: CO-4176 subtracts able_account_value, S3473 (C2-2 fixed) |
| 4.410.D.3, education accounts | C: CO-4174, CO-4176 |
| 4.410.D.4, one funeral agreement ≤$1,500 equity per member | C: CO-3856, CO-4177, CO-074 |
| 4.410.E.1, income-producing property | FL: CO-3393 excludes property "exempt as income producing" (first-pass reading); business cash counted, recorded in CO-4176's precision (C2-7 fixed) |
| 4.410.E.2, installment contracts | C: CO-4337, CO-074 |
| 4.410.E.3, income-producing vehicles | C: vehicles not read |
| 4.410.E.4, former farm property for one year | C: CO-4346 to CO-4348, CO-074 |
| 4.410.F.1, irrevocable trusts, probate, liens, property for sale | C: CO-4175 (liquid), CO-4335 (real property for sale) |
| 4.410.F.2, non-liquid with net return ≤$1,500 | C: CO-4338, CO-4339, CO-074 (parcels tested together, recorded) |
| 4.410.F.3, trusts inaccessible | C: CO-4175 |
| 4.410.G, no significant return (≤$1,500 after sale costs) | C: CO-074 (CO-4338) |
| 4.410.H, battered persons' shared resources | C: CO-4175 |
| 4.410.I, exclusions extend to disqualified members' resources | C: CO-343 sums the same items for every member |
| 4.410.J.1-11, 13-16, government payments held | FL / P3: no SNAP fact for excluded-statute funds still held (first pass's P3, not taken); unchanged |
| 4.410.J.12, federal EITC; state or local EITC 12 months while participating | C: CO-4172, CO-4173, CO-4176 |
| 4.410.J.17, federal tax refunds 12 months | C: CO-4172, CO-4176 |

### 3.10 Disqualified and non-household members (4.411)

| paragraph | disposition |
|---|---|
| 4.411.1.A, reasons for disqualification | C: CO-311 |
| 4.411.1.B.1.a, IPV, work sanction, fleeing felon: income, resources and deductions in full | C: CO-2302, CO-333, CO-371, CO-2300, CO-2301, CO-4333, CO-343 |
| 4.411.1.B.1.b, not in the size for benefit or standards | C: CO-312, CO-313; allotment cap CO-4182 (273.11(c)(1)(ii) override) |
| 4.411.1.B.2.a, non-citizen, SSN, ABAWD: resources in full | C: CO-343 (all non-student members) |
| 4.411.1.B.2.b, pro rata income, (n−1)/n | C: CO-2565, CO-333. **Corrected in coverage pass 6 (C6-1, C6-7):** the (n−1)/n formula is right for one prorated member only; with several, 7 CFR 273.11(c)(2)(ii) counts "All but the ineligible members' share", (n−k)/n (snap_prorated_member_share_counted_rate, CO-7250). The earlier note here, "formula right for several ineligible members", was wrong. |
| 4.411.1.B.2.c, 20% on prorated earnings; shelter and care pro rata; support before proration; full SUA | C: CO-371, CO-372, CO-2300, CO-2301, CO-4333, CO-377 (SUA added whole) |
| 4.411.1.B.2.c, medical expenses of a prorated member | OQ-641 |
| 4.411.1.B.2.d, not in the size | C: CO-313 |
| 4.411.2.A, other non-household members: not counted; cash payments counted; shared expenses | FL: receipt facts; CO-035 and CO-032 are the household's paid share |
| 4.411.2.B, combined wages | FL (first-pass P3, not taken) |
| 4.411.2.C, ineligible students are non-household members | C: CO-3714, CO-343, CO-3723 |

### 3.11 Verification (4.500-4.504.61, 4.506-4.507)

| paragraph | disposition |
|---|---|
| 4.500.A-D, definition, case record, notice, household responsibility | NA: case administration |
| 4.500.E, refusal to cooperate in a review | Non-financial family |
| 4.501, prudent person principle | NA: standard of judgment |
| 4.502.A.1, expedited: identity only; postponed | C: CO-1393, CO-1346 (non-financial family owns expedited) |
| 4.502.A.2.a, c-e, identity, IEVS and SSNs, non-citizen status, residency | Non-financial family (CO-1370, CO-1373 to CO-1375) |
| 4.502.A.2.b, gross nonexempt income before certification | C: CO-1376, CO-1377 (countable income, CF-10) |
| 4.502.A.3.a-d, 30 days for medical, child support, dependent care, questionable shelter | C: CO-1618, CO-3739, CO-3740, CO-2003, CO-2301, CO-2300, CO-1379 |
| 4.502.A.4, BCE and ECE: no verification beyond the PA program unless questionable | C: CO-1376, CO-1377 (BCE exempt; ECE's conferring program verifies nothing, so income is verified), CO-1378 (Standard Eligibility only) |
| 4.502.A.5, declaration of resources over the limit | C: CO-1378 (only questionable resources are verified) |
| 4.502.B.1, recertification: only incomplete, inaccurate, questionable, inconsistent, outdated | C: CO-1376, CO-1377 (outdated fact), CO-1380 to CO-1382 |
| 4.502.B.2, income change of more than $50 | C: CO-1619, CO-1596 (OQ-371 resolved: more than $50). C2-4 fixed (SNAP's wages compared) |
| 4.502.B.3.a-b, dependent care and medical: source changed or more than $25 | C: CO-1380, CO-1381, CO-1597 |
| 4.502.B.3.c, child support | C: CO-1382 (any change; 273.2(f)(8)(i)(A) override, CF-11) |
| 4.502.B.4, new SSNs through IEVS or SOLQ-I | Non-financial family |
| 4.502.B.5, declaration of resources over the limit | C: CO-1378 |
| 4.502.B.6, unverified changed expense not deducted | C: CO-3739 arms in CO-2300, CO-2301, CO-2003, CO-3740 |
| 4.502.C.1-2, periodic report verification | Recorded out of scope in colorado-notes (CF-12, deferred P2) |
| 4.503, case documentation | NA |
| 4.504, 4.504.1-4.504.3, sources: documents, collateral contacts, home visits | NA: means of verification; the volume's document and electronic-source facts are neutral |
| 4.504.2.D, third party's failure to cooperate | FL: `documentation_not_reasonably_available` (CO-1561) |
| 4.504.4, SAVE | Non-financial family |
| 4.504.5.A-H, IEVS; DOLE checks before approval; wage and IRS data not verified | C: CO-1318 (VUR sources), CO-1376 (wage data needs a document) |
| 4.504.6.A-D.1-12, VUR list | C: CO-1318 precision (SSA, SSI, UIB, PA, ACSES; CF-14); D.2, D.7-12 non-financial or case maintenance |
| 4.504.61, not VUR | C: CO-1318 (wage, IRS, VA, RR, NDNH are not electronic verification) |
| 4.506, gross nonexempt income verified before certification; recertification on a change of more than $50 or a new source | C: CO-1376, CO-1377, CO-1619 (C2-4 fixed) |
| 4.506.A.1-4, responsibility; PA record; uncooperative third party | FL: `documentation_not_reasonably_available` (CO-1561) |
| 4.506.B, continuing employment: last month as indication | FL: CO-3922 |
| 4.506.C, self-employment statement accepted unless questionable | C: CO-1376; OQ-760 (blocked on an FNS waiver; accepted) |
| 4.506.D, educational income needs no verification | C: excluded income is not read |
| 4.506.E.1-3, terminated employment | Non-financial family (voluntary quit) |
| 4.506.F, no income: statement accepted unless questionable | C: CO-1565 (first-pass reading) |
| 4.507.A, dependent care verified to grant | C: CO-1381, CO-2301 |
| 4.507.B.1, shelter and utility declaration accepted unless questionable | C: CO-1379 |
| 4.507.B.2, unoccupied home utilities verified | C: CO-1379, CO-1585 |
| 4.507.B.3, questionable shelter disallowed after 30 days | C: CO-2300, CO-3739 |
| 4.507.B.4, restoration of lost benefits | NA: case maintenance |
| 4.507.C.1, medical amount and reimbursement verified before certification; recertification $25 | C: CO-1380 |
| 4.507.C.2-4, anticipated changes; changes during certification; 24-month one-time expenses | FL / out of scope (changes during certification; CF-12 record) |
| 4.507.D.1-4, child support documents: order and actual payments; agency check | FL: verification document facts |
| 4.507.D.5, re-verify at recertification | C: CO-1382 (override; the federal text settles "only if outdated") |

### 3.12 Federal and FNS cross-check

| text | disposition |
|---|---|
| D-83 Table 1 maximum allotments; D-83 standard deductions; cap $769; homeless $205.66; asset limits $3,000 / $4,750; minimum $25 | C: CO-130, CO-131, CO-3726, CO-132, CO-133, CO-134, CO-118, CO-119, CO-135. All match |
| D-84 Tables 1-3 (100%, 130%, 165%) | C: CO-112, CO-113, CO-110, CO-111, CO-114, CO-3043. All match |
| 273.8(b) "shall not exceed" | C: CO-344 (override, CF-13) |
| 273.8(e)(2) and ABLE Act sec. 103 | C: CO-4176 (C2-2 fixed) |
| 273.9(b)(2)(ii) rental net of costs | C: CO-4322 |
| 273.9(c)(1)-(c)(19) exclusions | C: CO-2338, CO-2339 (see 3.6); (c)(7) half-time C2-3 fixed |
| 273.9(d)(1)-(6) deductions | C: as 3.8 |
| 273.10(a)(1)(ii) proration | C: CO-2308 |
| 273.10(c)(2)(i) conversion option | C: CO-4324 (Colorado requires the conversion) |
| 273.10(c)(3)(ii) contract and self-employment averaging | C: CO-4324, CO-1702 |
| 273.10(e)(2)(ii)(A)-(C) benefit formula and minimum | C: CO-384, CO-2307, CO-385 |
| 273.11(a)(2)(ii) farm loss | C: CO-3722 to CO-3725 (override of 4.403.12.E.2.b-c) |
| 273.11(c)(1)-(2) disqualified members | C: CO-2302, CO-2565 (ABAWD prorated, (c)(2)) |
| 273.2(f)(1)(i), (f)(8)(i)(A) income verification | C: CO-1376, CO-1377, CO-1619 (C2-4 fixed); OQ-760 |

## 4. Open-question confirmations (financial scope)

| OQ | class in the volume | confirmation |
|---|---|---|
| OQ-30 (shelter intermediate floor) | state policy choice | Correct. 273.10(e)(1)(i)(H) and 4.407.3 are silent. |
| OQ-251 (H.R.1 sec. 10103 date) | blocked on a named document (part (2) resolved) | Correct. The resolved part, $4,750 over the State's stale $4,500 in 4.408.E, holds against D-83. |
| OQ-353 (SMED $165-$200) | state policy choice | P3 (C2-8): its own body names the deciding text, Colorado's SMED demonstration approval, which no allowed host serves. |
| OQ-356 (ECE "below") | state policy choice | Correct. No federal text sets the BBCE comparison word, and 4.401.A.1 and 4.206 differ. |
| OQ-371 ($50) | resolved | Holds: "more than $50" in CO-1619 matches 273.2(f)(8)(i)(A) and 4.506. CF-20 is addressed. |
| OQ-533 (H.R.1 dates) | blocked on a named document | Correct: the memoranda are on www.usda.gov and the CDHS letter is on cdhs.colorado.gov, neither allowed. |
| OQ-641 (medical expenses of a prorated member) | state policy choice | Correct. 4.411.1.B.2.c and 273.11(c)(2)(iii) are silent. |
| OQ-760 (self-employment statement against 273.2(f)(1)(i)) | blocked on a named document | Correct as classed: the deciding text is an FNS waiver approval that no allowed host publishes as a complete list. |
| OQ-390, OQ-13, OQ-22, OQ-311, OQ-312 | resolved | The resolutions hold against the text. OQ-390's full 4.405 reading misses half-time (C2-3) and diversion payments (C2-5). |

OQ-1, OQ-12, OQ-640 and OQ-730 belong to the non-financial family.

## 5. First-pass P1s (coverage-snap-financial): confirmation

Each first-pass reproduction was re-run on this HEAD.

| id | result | evidence |
|---|---|---|
| CF-1 (exclusions) | fixed | CO-115: $500 crime victim compensation, $500 WIOA, $400 reverse mortgage and $300 AmeriCorps each give 387 (was 237, 237, 267, 297). |
| CF-2 (passive rent) | fixed | $1,000 rent with $600 costs gives 267 (was 87). |
| CF-3 (conversion and averaging) | fixed, with a new defect | $250 weekly gives 1,075 and 369. The averaging months are right (a June 2026 start gives June-October; an old business gives 12 months). New defects in the added code: C2-1, C2-4. |
| CF-4 (child support exclusion) | fixed | CO-83 with either payer of $300 gives gross 1,200 and 808 (base 1,500 and 743). |
| CF-5 (turning 18) | fixed | Born 2009-02-05 with $400: February 387, March 291. Half-time: C2-3. |
| CF-6 (attendant meals) | fixed | Medical expenses 2,400 + 306 = 2,706. |
| CF-7 (real property) | fixed | Standard variant with $1,200 land: `eligible`, 136. |
| CF-8 (joint resources) | fixed | +$3,000 other owners' share: countable 7,000, `over_resource_limit`. |
| CF-9 (ineligible allotment) | fixed | CO-2307 and CO-2308 carry the lottery, transfer and striker gates. |
| CF-10 (excluded wages verification) | fixed | p2's $200 of excluded wages: 2 pending, `expenses_disallowed` (was 3, `past_due`). |
| CF-11 (child support at recertification) | fixed | 300 against 280 at recertification: verification true. |
| CF-12 (periodic report) | recorded out of scope (P2) | colorado-notes; unchanged. |

## Disposition (coverage pass 2)

Fix round on `6067c89`. Commits: `586a1bd` (C2-1 to C2-7), `c97135d` (C2-8: OQ-353, and excerpts S3476 and S3477), `8942769` (households CO-194 and CO-195). Probes on CO-115:
- $250 weekly with a $20 odd job: gross 1,075, allotment 369 (was 1,055 and 373).
- Recertification in a five-payday month: `snap_income_changed_since_last_certification` and `snap_requires_verification_of_earned_income` false (were true).
- Child in GED classes less than half time with $400: earnings counted, gross 1,400, allotment 291 (was excluded, 387).

The ABLE variant is covered by rule test CO-4176-T11 ($6,000 liquid, $2,000 ABLE: 4,000). Household cases CO-01 to CO-191 are unchanged.

| id | disposition |
|---|---|
| C2-1 | Fixed, `586a1bd`. The converted branch of CO-4324 now adds back the month's infrequent or irregular earnings with work-study. These are not regular pay, and CO-2338 subtracts them only when 4.405.A excludes them; before, an excluded odd job was subtracted from a figure that never held it, and a counted one was dropped. The excluded parts of regular pay (WIOA OJT, summer youth, SCSEP, combat pay, military education deductions) are multiplied by `snap_regular_wages_conversion_factor` (CO-4682). That factor reads CO-4324 itself (SNAP wages over the month's receipts, less work-study and irregular earnings), so the exclusion is converted at 4.3 or 2.15 with the pay and the two items cannot disagree about whether a conversion applied. Tests CO-4324-T8, CO-2338-T9, CO-4682-T1 to T3; stored case CO-194. |
| C2-2 | Fixed, `586a1bd`. CO-4176 subtracts `able_account_value` (4.410.D.2.i, new excerpt S3473). Its precision records that SNAP counts the other parts split out for Adult Financial (CO-4413, CO-4414, CO-4417), since 4.409-4.410 name no exclusion for them. Test CO-4176-T11. |
| C2-3 | Fixed, `586a1bd`. CO-2569 requires `education_enrollment_intensity` of full_time or half_time; an elementary or secondary student with no stated intensity is read as at least half time. Tests CO-2569-T8 and T9. |
| C2-4 | Fixed, `586a1bd`. CO-1619 compares SNAP's counted income: `snap_person_wages` plus net self-employment, less `snap_excluded_earned_income`, plus unearned income. CO-1568's meaning says the stored figure is the same SNAP-counted figure. CO-3503 compares the striker's pre-strike income with `snap_person_wages`. Test CO-1619-T4; stored case CO-195. |
| C2-5 | Fixed, `586a1bd`. CO-3367's precision places a diversion payment of 90 days or less, not expected again within 12 months, in `lump_sum_received`, and any other diversion payment in the unearned income facts only (new excerpt S3476). This is a clarification of a shared fact's meaning; other programs' reading of a lump sum is unchanged. |
| C2-6 | Not fixed. To fix it, every Title I payment would be moved into CO-4303, and its share at or above the minimum wage taken out of `wages_gross` in CO-330. That changes where a shared receipt is stated (CO-3366, `wages_gross`) for every program. As the reviewer notes, Title I stipends are below the minimum wage in practice, and those are already excluded correctly. Recorded here as accepted. |
| C2-7 | Fixed (recorded), `586a1bd`. CO-4176's precision records that business cash (CO-4416) is counted: 4.410.E.1 (new excerpt S3477) exempts property, work-related equipment, vehicles and livestock essential to self-employment, not cash. |
| C2-8 | Fixed, `c97135d`. OQ-353 is reclassified as blocked on a named document: Colorado's SMED demonstration approval, which no allowed host serves. |

Earlier deferred P2s (CF-12, CF-17, CF-19) are unchanged; CF-19's note now points to CO-1746 (non-financial N2-P3-2).

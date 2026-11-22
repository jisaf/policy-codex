# Coverage-matrix review, second pass: LEAP and SUN Bucks (family `coverage2-leap-sunbucks`), HEAD 1743a1d

Texts read from `volumes/co/documents/`:

- LEAP: 9 CCR 2503-7 as effective 2025-11-01 (D-86), all of 3.750-3.759, with the amendments effective 2026-11-01 (D-173: 3.752.211.J, 3.752.22.D, 3.755.21.I.1 and J, 3.756.12.B).
- SUN Bucks: 7 CFR 292.1, 292.2, 292.5-292.7, 292.12, 292.13, 292.15, 292.16 (D-88); 292.14 (D-117); 7 CFR 245.6 (D-250); Colorado: C.R.S. 26-2-309 (D-142), C.R.S. 22-33-104(1)(a) (D-141) and the SOS rule lists showing no Colorado Summer EBT rule (D-143).

Method: this matrix was built from the rule text paragraph by paragraph and not copied from the first pass (`docs/reviews/coverage-leap-sunbucks.md`). The ledger was exported from a scratch copy of HEAD (`git archive`, node_modules symlinked; 2,169 items). All 78 LEAP and 36 SUN Bucks items were read with their derivations, along with the shared facts and derived items they read (CO-3911 to CO-3913, CO-1274, CO-1275, CO-3300, CO-2810, CO-1713, CO-029, CO-030 and every "part of the person's gross unearned income" fact). Each first-pass P1 was re-run from its promoted case. Suspected wrong answers were confirmed with scratch households in the copy's `tests/cases.yaml` (`npx vite-node scripts/eval-case.ts co <case> <identifiers> <month>`), listed after the findings. Nothing was written to the repository except this file.

## 1. Verdict

**3 P1 found** (2 LEAP, 1 SUN Bucks). There are also 4 P2 and 3 P3 findings. Every first-pass P1 (C-1 to C-6) stays fixed as dispositioned, except that C-6 is fixed only for SNAP. Colorado Works receipt and the other categorical grounds are still read at one point in time (N-3).

The LEAP P1s belong to the class C-1 fixed. A 3.752.23 exclusion whose receipt has a neutral fact in the volume is not subtracted by LEAP: Colorado Works supportive services (FF, CO-4452, with diversion W having no money fact at all) and PASS income set aside from earnings (DD, CO-4618). CO-4511's precision says that FF and W "are not part of tanf_cash_income". That is true, but they are part of `other_unearned_income_*`, which LEAP counts.

## 2. Findings

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| N-1 | **P1** | 9 CCR 2503-7 3.752.23.FF, W | CO-4511 `leap_excluded_unearned_income`, CO-3926, CO-3913; CO-4452 `tanf_supportive_service_payments_received` | 3.752.23: "the following shall be exempt from consideration as either resources or income ... W. State/county diversion payments; ... FF. Supportive Services income received under the Colorado Works Program." | CO-4452's precision makes supportive-service payments "Part of the person's gross unearned income for the month as the unearned income facts state it (other_unearned_income_taxable or other_unearned_income_nontaxable ...)". CO-3913 sums those facts, and CO-4511 does not subtract CO-4452: its `used_by` is CCCAP only. CO-4511's precision dismisses W and FF because they "are not part of tanf_cash_income (CO-029)", but CO-029 was never the problem. Diversion cash has no money fact at all. CO-029 excludes it and `cw_county_approved_diversion_amount` (CO-2559) is Colorado Works' month-scope agreement figure, so by CO-030's "no other income fact names" definition it falls into `other_unearned_income_nontaxable` and LEAP counts it. **RV2-L2**: one adult, $3,500 wages plus $400 supportive-service payments (stated in `other_unearned_income_nontaxable` and `tanf_supportive_service_payments_received`), application 2026-11-10. The engine gives `leap_excluded_unearned_income` 0, `leap_household_income` 3,900 and `leap_is_eligible` false against $3,774 for 1. The rule counts $3,500, so the household is eligible. | Add CO-4452 to CO-4511. Add a neutral part fact `tanf_diversion_payment_received` (part of the unearned facts, read as 0) and subtract it in CO-4511; the cash Colorado Works pays under 3.606.8 is the receipt W names. Correct CO-4511's precision sentence. Add a CO-4511 test for each. |
| N-2 | **P1** | 3.752.23.DD | CO-3925 `leap_person_wages`; CO-4618 `pass_set_aside_earned_income` | "DD. Income that is deemed necessary for the fulfillment of a Plan for Achieving Self-Support (PASS) under Title XVI of the Social Security Act." | DD covers "income", earned and unearned alike. C-1 added only the unearned part (`pass_set_aside_income`, CO-3825, in CO-4511). The volume already has the earned part, `pass_set_aside_earned_income` (CO-4618, "Part of the person's earned income for the month (wages_gross or the self-employment facts)"), read only by two Medicaid items. CO-3925 does not subtract it. **RV2-L3**: one adult, $4,000 wages of which $500 is set aside under an SSA-approved PASS. The engine gives `leap_person_wages` 4,000 and `leap_is_eligible` false. The rule counts $3,500, so the household is eligible. | Subtract CO-4618 in CO-3925, read as 0 and with the same "not below zero" guard as SCSEP and HH, and cite DD in CO-3925's meaning. A self-employed PASS set-aside should come off CO-1712 in the same way. Add a CO-3925 test. |
| N-3 | **P1** | 7 CFR 292.6 intro ("at any time during the period of eligibility"); 292.2 "Categorically eligible"; 292.12(d)(1) ("during the period of eligibility were"); 292.14(e)(2) | CO-2708 `sebt_household_child_receives_snap_or_tanf`; CO-1296, CO-4527, CO-4528 → CO-1298, CO-1299; facts CO-013 `receives_tanf_cash`, CO-2847 `child_welfare_payment_type`, CO-2810 `nighttime_residence_type` | 292.6: "Children eligible for Summer EBT include those who, at any time during the period of eligibility, are: (a) School-aged and categorically eligible." 292.12(d)(1): "including those who, during the period of eligibility were ... (3) A foster, homeless, migrant, runaway, or Head Start child". | The C-6 fix reads receipt "in some month" of the period, but only SNAP (`receives_snap`, CO-1936, person-month) can vary by month. `receives_tanf_cash` is a person-scope fact about "the person's current Colorado Works case", so CO-2708's `some_month` sees one value. Monthly `tanf_cash_income` is not read. The other grounds are also single values about the determination date: `child_welfare_payment_type` ("receives this month", person scope), the `foster_child` role, and `nighttime_residence_type` ("the primary nighttime residence on the determination date"). CO-1298's precision says so ("the other prongs for the month evaluated"), but no open question records it, and it contradicts 292.6. **RV2-S1**: a 10-year-old in an NSLP school, school-meal income $6,000 (above $3,337 for 2), in Title IV-E foster care September to December 2026 and reunified by the March 1, 2027 determination. The case can state only `child_welfare_payment_type: none`, so the engine gives `sebt_eligibility_status` 2027-03 `ineligible` and `sebt_benefit_amount` 0. Control **RV2-S0** (still in foster care) gives `eligible_categorical`. **RV2-S2**: the same child whose household received Colorado Works ($300 a month in `tanf_cash_income`, September to December 2026). The engine gives `sebt_household_child_receives_snap_or_tanf` false for 2027-03 (and for 2026-10 unless the single `receives_tanf_cash` is true). The rule makes both children eligible for summer 2027. | Read TANF by month in CO-2708 (`tanf_cash_income > 0` in the month, or a person-month receipt fact), as SNAP is read. For the 245.2 grounds, add a SUN Bucks fact stated for the period, such as `sebt_was_foster_homeless_migrant_runaway_or_head_start_in_period_of_eligibility` (the State's direct-certification data, 292.12(d)(1)(i)(B)(3)), read with OR in CO-4527 and CO-1296, or restate CO-2851 and CO-2848 to CO-2850 as "at any time during the period of eligibility". Correct CO-1298's precision. Promote RV2-S1 and RV2-S2 to cases. |
| N-4 | P2 | 3.752.25.B.6 against B.8 | CO-2815, CO-1283, CO-1004; OQ-561 | B.8: "Hotels, unless proof that the household has lived or will live in the hotel continuously for thirty (30) calendar days at the time of application and that heat is included in rent." B.6: "Any applicant ... who is considered homeless". | CO-2815 counts `motel_or_hotel_for_lack_of_alternative` as homeless (OQ-561's Assumption). A hotel household that meets B.8's own exception is therefore still not vulnerable. **RV2-L1**: one adult in a hotel since 2026-09-01, heat in rent, application 2026-11-10. With `nighttime_residence_type` `fixed_regular_adequate` (RV2-L0) the engine gives `leap_living_arrangement` `traditional_dwelling` and eligible. With `motel_or_hotel_for_lack_of_alternative` it gives vulnerable false and `leap_is_eligible` false. B.8 is the text that speaks to hotels, and OQ-561 records the homeless reading without weighing it, so the answer turns on an owner choice the open question does not state. | Record B.8 in OQ-561 and recommend that a hotel household meeting B.8 (CO-1283 `traditional_dwelling` from the hotel branch) is not read as homeless by CO-2815. Add a test either way. |
| N-5 | P2 | 3.752.23.F | CO-3913, CO-4511; CO-4016 `americorps_payments_received`, CO-3366 | "F. Payments to volunteers serving as foster grandparents, senior health aides, or senior companions, and to persons serving in [SCORE], [ACE], AmeriCorps and any other program under Title I (Vista) when the value of all such payments adjusted to reflect the number of hours such volunteers are serving is not equivalent to or greater than the minimum wage" | CO-3366 (federally excluded payments, subtracted by CO-3913) names only Domestic Volunteer Service Act payments, and CO-4016's precision says AmeriCorps State and National and NCCC payments are "not part of federally_excluded_payments_received". LEAP reads neither CO-4016 nor any hourly test, so an AmeriCorps living allowance below the minimum wage per hour served is counted. | Add CO-4016 to CO-4511, conditioned on a supplied `americorps_payments_below_minimum_wage` (or hours served), or record the reading in an open question. |
| N-6 | P2 | 3.752.23.U, AA | CO-4511, CO-4069; CO-4451, CO-4503, CO-4367, CO-4508 | U: "Payment received as foster care/kinship income"; AA: "A one-time resettlement grant received under the refugee admissions program." | Dual entry. A kinship guardianship payment fits both CO-4503 (subtracted by LEAP) and `adoption_or_kinship_subsidy_received` (CO-4451: "kinship care or kinship guardianship assistance payment", not read by LEAP). Stated only in CO-4451, it is counted. Reception and placement money fits both CO-4367 (a month receipt in `other_unearned_income_nontaxable`, not read by LEAP) and the lump-sum CO-4508 (read). Stated in CO-4367, it is counted. | Split CO-4451 so kinship payments are stated only in CO-4503 (adoption assistance stays countable under 3.752.21.M), and have LEAP subtract CO-4367's reception and placement part or point CO-4367 at CO-4508. |
| N-7 | P2 | 7 CFR 292.14(f)(5), (f)(2)(iv); 292.14(f)(9) | CO-1299, CO-1698; OQ-377 | (f)(5): "If a household refuses to cooperate with efforts to verify, eligibility for Summer EBT benefits must be terminated." | Benefits are withheld while verification is pending, except for an application selected for cause, which (f)(9) lets the agency issue. No fact records refusal, and CO-1698 has no past-due or terminated state (OQ-377 covers only the deadline). A for-cause household that refuses is therefore shown the full $120. | Supplied `sebt_household_refused_verification` (false when not stated), read by CO-1299 as 0. Note it in OQ-377. |
| N-8 | P3 | 3.751.2.C ("The maximum number of separate households shall be nine (9)") | CO-1274, CO-1280 | — | The number of households sharing the arrangement has no cap. A case stating more than nine divides EHHC by the stated number. | Validate CO-1274 to 1 through 9, or a precision note. |
| N-9 | P3 | 3.755.21.I.2.d ("Rental property allowable expenses shall be limited to the costs of maintenance of the property") | CO-1711 | — | Interest and vehicle costs are deducted for every self-employment, rental property included. | A rental-property flag on the cost facts, or a precision note. |
| N-10 | P3 | 7 CFR 292.5(b) ("The guidelines in effect on the date of application must be used") | CO-1297 | — | Reads the July 1 guideline before the determination month, not before the application date. A June application determined in July reads the newer guideline. | Read from the application date when stated. |

P1: N-1 to N-3 = **3**. P2: N-4 to N-7 = **4**. P3: N-8 to N-10 = **3**.

## 3. Coverage matrix

Legend: **C** carried by (item, read against the text: conditions, boundaries, periods, rounding; confirmed unless a finding is named); **N/A** not applicable, with the reason; **OQ** open question; **GAP** no item and no recorded reason.

### 3.1 9 CCR 2503-7 (D-86, as amended by D-173)

| # | Paragraph | Status | Carried by / reason |
|---|---|---|---|
| 1 | 3.750.11 Low-Income Home Energy Assistance Act | N/A | Authority. |
| 2 | 3.750.12 HFAP intent | N/A | Intent. |
| 3 | 3.750.13 CIP intent | N/A | CIP is a repair and replacement service; no eligibility or benefit test in this rule beyond 3.752.27. |
| 4 | 3.750.14 (none) | N/A | Reserved. |
| 5 | 3.750.15 funding | N/A / OQ | Funding availability; the program-year figures are OQ-532. |
| 6 | 3.751.1 Adverse Action; Appellant | N/A | Notice and hearing terms. |
| 7 | 3.751.1 Applicant | C | CO-3929 (the applicant's fraud penalty). |
| 8 | 3.751.1 Approved Vendor; Vendor; Bulk Fuel; Non-Bulk Fuel; Propane Bottles | N/A | Vendor and fuel vocabulary for payment and receipts (3.755.44-45, 3.758.46); EHHC is supplied (CO-1271). |
| 9 | 3.751.1 Collateral Contact; Discrepancy; Report of Contact; Prudent Person; Questionable | N/A | Case-record procedure; "questionable" is used through CO-1307 in CO-1457. |
| 10 | 3.751.1 Completed Application A (adequate responses), C (signed) | N/A | Procedural (3.754.1.G, I); county case actions, per CO-1007's precision. |
| 11 | 3.751.1 Completed Application B (SSN or proof of application; member excluded, income counted) | C | CO-1694 (CO-1360), CO-1000, CO-1009, CO-1002. |
| 12 | 3.751.1 Date of Application (legible name and address, received) | C | CO-2122; postmark CO-4512 via CO-4514 (3.752.1). |
| 13 | 3.751.1 Disabled or Handicapped; Elderly | N/A | Used only by outreach (3.759.11). |
| 14 | 3.751.1 Eligibility Period: November 1 to April 30 | C | CO-1806, CO-1807, CO-1006, CO-1008. |
| 15 | 3.751.1 Eligibility Period: April 30 on a weekend or holiday extended to the next business day | C | CO-4513 (table checked: April 30 is a Sunday in 2028 and 2034 and a Saturday in 2033), CO-4515, CO-4516. |
| 16 | 3.751.1 Emergency Applicant; Life Threatening Crisis | N/A | Processing priority (3.756.12.B, 3.756.14) and CIP. Evidence that an eviction notice is not homelessness (CO-2815, C-2 fixed). |
| 17 | 3.751.1 Estimated Home Heating Costs (prior season; no arrearages or fees; approved vendors or flat rates) | C | CO-1271 (meaning carries the exclusions and the flat rate); OQ-532 for the flat-rate table. |
| 18 | 3.751.1 Federal Poverty Level | C / OQ | CO-1278 reads CO-181 (OQ-253: which year's guideline). |
| 19 | 3.751.1 Heat Related Arrearage | N/A | Excluded from EHHC by definition (CO-1271). |
| 20 | 3.751.1 Home Heating Costs (primary heating fuel) | C | CO-3300, CO-876. |
| 21 | 3.751.1 Household (economic unit; fuel bought in common or heat paid in rent) | C | CO-1000, CO-1009 (`shares_heat_with`, OQ-132 resolved). |
| 22 | 3.751.1 Household Income Contribution | C | CO-1279, CO-3000. |
| 23 | 3.751.1 Income Verification Period (application date to the same date of the prior month) | C / OQ | CO-3912, CO-3913, CO-4069, CO-3925, CO-3926 (OQ-681: thirty days). |
| 24 | 3.751.1 Lawful Permanent Residents | C | CO-1010. |
| 25 | 3.751.1 Non-Traditional Dwelling (cars, vans, buses, tents, lean-tos) | C | CO-2815 (`place_not_designed_for_sleeping`). |
| 26 | 3.751.1 Overpayment | N/A | Recovery. |
| 27 | 3.751.1 Point in Time | C | CO-1007 (`at` the application month), CO-1281 (Step D at the application month); OQ-137 resolved. |
| 28 | 3.751.1 Primary Heating Fuel; Supportive Fuel (not eligible) | C | CO-3300 (primary heat), CO-1271 (costs of the primary fuel). |
| 29 | 3.751.1 Primary Heating Source (temporary or portable not a source) | C | CO-877, read by CO-1007, CO-1456, CO-2586. |
| 30 | 3.751.1 Program Year (and its April 30 extension) | C | CO-1006, CO-4517, CO-4515. |
| 31 | 3.751.1 Public Assistance Income A-F (Colorado Works, OAP, AND, AB, NCRA, SSDI for clients on another state program) | C | Counted in CO-3926 (CO-029, CO-1713, CO-025; NCRA and AB through `other_unearned_*`); verified through CO-4526 and CO-1361 (3.755.21.E). |
| 32 | 3.751.1 Reapplication (point in time reset to the new application) | C | CO-2122 is the application decided; CO-1007 reads its month. |
| 33 | 3.751.1 Recipient | N/A | Vocabulary. |
| 34 | 3.751.1 Subsidized Housing (rent based on income) | C | CO-1275. |
| 35 | 3.751.1 Tiny Home; Traditional Dwelling | C | CO-1273 (`apartment` row includes tiny home), CO-2815. |
| 36 | 3.751.2.A member of an approved household not counted again | C | CO-2100 in CO-1000, CO-1009, CO-2593. |
| 37 | 3.751.2.B each person counted in one household | C | CO-1000 (economic unit) and CO-1274 (other households). |
| 38 | 3.751.2.C at most fifteen members | C | CO-875 keyed 1-15; CO-1003 is unknown above fifteen. |
| 39 | 3.751.2.C at most nine separate households | C | CO-1274; **N-8** (P3, no cap). |
| 40 | 3.751.2.D.1 husband and wife | C | CO-1000, CO-1009 (spouse edge). |
| 41 | 3.751.2.D.2 children under 18 with parent or guardian, unless emancipated | C / OQ | CO-1000, CO-1009 (CO-325 `<` 18, CO-843); foster and kinship children left out (OQ-801). |
| 42 | 3.751.2.D.3 civil unions | C | `civil_union_partner` in CO-1000, CO-1009. |
| 43 | 3.751.2.E parent and children separate from an ex-spouse after legal separation or divorce | C | CO-4519, CO-4520 in CO-1000, CO-1009. |
| 44 | 3.751.21 permanent separation (A divorced or legally separated; B ties dissolved) | C | No spouse edge after divorce; legal separation through E. B is a fact of whether a spouse edge is stated. |
| 45 | 3.751.22 presumption of marriage; refutation by third parties | C | The spouse edge stays unless E (CO-1000 precision); the evidence is case procedure. |
| 46 | 3.751.31-3.751.35 non-discrimination, opportunity to apply, interpreters, authorized representative, signature by mark | N/A | Procedural rights. |
| 47 | 3.751.41-3.751.42 notice; denials | N/A | Notice. |
| 48 | 3.751.43-3.751.489 fair hearings, decisions, confidentiality, disclosure, discrimination protection, EBT use and point-of-sale restriction | N/A | Hearing and confidentiality procedure, no eligibility or benefit test. |
| 49 | 3.751.51-3.751.55 recoveries and overpayments | N/A | Recovery procedure. |
| 50 | 3.751.561-3.751.562 fraud defined; DA referral | N/A | Procedure; the penalty is row 51. |
| 51 | 3.751.563 fraud penalty: next year, two years, permanent | C / OQ | CO-3929 in CO-1007 for the applicant (3.754.1.U); another member's penalty OQ-714. |
| 52 | 3.751.61-3.751.64 reporting, monitoring, case file review | N/A | Administration. |
| 53 | 3.751.71-3.751.72 reimbursement and sanctions | N/A | County administration. |
| 54 | 3.752.1 apply during November 1 to April 30 (extension) | C | CO-4516, CO-4515, CO-1008. |
| 55 | 3.752.1 received or postmarked during the period accepted; facsimile accepted | C | CO-4512, CO-4514, CO-4516; a facsimile is a receipt (CO-2122). |
| 56 | 3.752.1 public assistance households' applications before November 1 accepted, effective November 1 | C / OQ | CO-4518, CO-4517, CO-1007 (OQ-800; case CO-176 re-run: eligible 2026-11). |
| 57 | 3.752.1 received or postmarked after the closing date denied | C | CO-4516 in CO-1007 (case CO-177 re-run). |
| 58 | 3.752.1 circumstances on the date received; effective date not before November 1 | C | CO-1007 (`at` month of CO-2122; `>=` filing month; program-year match). |
| 59 | 3.752.2 vulnerable and meet income and other requirements at time of application; factors listed | C | CO-1007 (residency CO-505, citizenship CO-1005, income CO-1003, vulnerability CO-1004, fuel/source CO-877, composition CO-1000, shared arrangements CO-1274, dwelling CO-1283/CO-2815, EHHC CO-1271). |
| 60 | 3.752.21 intro: any other payment that is a gain or benefit | C | CO-3913 (`other_unearned_income_*`). |
| 61 | 3.752.21.A inheritance, gifts, prizes | C | CO-030 in CO-3913; prizes CO-4065 in CO-4069; inheritance as lump sum CO-4066. |
| 62 | 3.752.21.B dividends and interest paid out or withdrawn | C | CO-1714, CO-081 in CO-3913. |
| 63 | 3.752.21.C life insurance proceeds above last-illness and burial costs | C | CO-4066 less CO-4509 in CO-4069. |
| 64 | 3.752.21.D health insurance and personal injury proceeds above medical costs | C | CO-4509 in CO-4069. |
| 65 | 3.752.21.E strike benefits | C | `other_unearned_*` in CO-3913. |
| 66 | 3.752.21.F jointly owned property (at least the ownership share, or actual if more) | C | Receipts in CO-1714. The ownership-share floor has no fact; immaterial for a household sum when all owners are members (not raised). |
| 67 | 3.752.21.G-H lease bonuses, royalties in the month received | C | CO-1714 in CO-3913, CO-4069. |
| 68 | 3.752.21.I SSI in the month received, cents dropped | C | CO-849 in CO-3926 (`ceil` of the negative, so rounded down). |
| 69 | 3.752.21.J Civil Liberties Act income (derived from the monies) | C | Earnings on the monies are in CO-1714; the payment itself is excluded at 3.752.23.H (CO-3366). |
| 70 | 3.752.21.K garnished amounts counted | C | Gross facts (CO-030 "before any deduction withheld"). |
| 71 | 3.752.21.L public assistance income | C | CO-029, CO-1713, CO-025 in CO-3926; NCRA in CO-030. |
| 72 | 3.752.21.M adoption assistance or subsidies | C | CO-4451 in CO-030 (counted); see **N-6** for its kinship part. |
| 73 | 3.752.21.N child support and spousal maintenance | C | CO-028 and CO-030 in CO-3913. |
| 74 | 3.752.211.A-C annuities, pensions, disability or survivor's benefits | C | Pension and other unearned facts in CO-3913. |
| 75 | 3.752.211.D workers' compensation less medical and legal claim costs | C | CO-030 less CO-4502 (CO-4511). |
| 76 | 3.752.211.E veterans' benefits; VA support for a dependent counted to the dependent | C | CO-030. Attribution within the household does not change the household sum. |
| 77 | 3.752.211.F unemployment compensation | C | Unemployment fact in CO-3913. |
| 78 | 3.752.211.G railroad retirement | C | Pension and other unearned facts. |
| 79 | 3.752.211.H Social Security (Prouty, black lung), cents dropped | C | CO-025 in CO-3926, rounded down. |
| 80 | 3.752.211.I SSI | C | Row 68. |
| 81 | 3.752.211.J FAMLI (D-173) | C | CO-3926 meaning; `other_unearned_*`. |
| 82 | 3.752.211.K trust payments in the income verification period | C | CO-3913. |
| 83 | 3.752.212 military allotment in the month received | C | CO-3926 meaning; `other_unearned_*`. |
| 84 | 3.752.22.A unearned income received in the verification period, not over one month's | C / OQ | CO-3913, CO-3926 (OQ-681; cap discussed in CO-3926 precision). |
| 85 | 3.752.22.B earned ongoing income: any four of the eight weeks before the application | C / OQ | CO-3925 (OQ-681: the average of the eight weeks). |
| 86 | 3.752.22.C.1-2 weekly ×4, bi-weekly ×2, semi-monthly ×2 | C | CO-3924, CO-3922, CO-3921 in CO-3925; monthly ×1. |
| 87 | 3.752.22.C.3.a-b terminated or new earned income: actual in the period | C | CO-3923 → CO-3912 in CO-3925. |
| 88 | 3.752.22.C.3.c unearned not yet received not counted; received counted as actual | C | Thirty-day receipts (CO-3913). |
| 89 | 3.752.22.C.4 in-kind earned income at the declared value | C | CO-4506 in CO-3925. |
| 90 | 3.752.22.D income up to and including 60% SMI (FFY 2026 by D-173) | C / OQ | CO-1003 (`<=`), CO-875 (2026-27 table; size 6 = 132% and size 7 = 135% of the 4-person figure, checked); OQ-532 for the source. |
| 91 | 3.752.22.D "countable income for the eligibility period" | C | Monthly figure (CO-1002) against a monthly table. |
| 92 | 3.752.22.E denied households may reapply | C | Row 32. |
| 93 | 3.752.23 intro: exempt as resources or income; no verification needed | C | Exclusions are not verification triggers (CO-4526 reads the countable figure). |
| 94 | 3.752.23.A food assistance, USDA foods | N/A | Not in any income fact read (SNAP benefits are not income facts). |
| 95 | 3.752.23.B Title III nutrition; C school meals and WIC | N/A | In-kind; no income fact. |
| 96 | 3.752.23.D home produce | N/A | In-kind. |
| 97 | 3.752.23.E housing assistance paid on a dwelling unit | N/A | Paid to the landlord; not a member's receipt (T). |
| 98 | 3.752.23.F DVSA, SCORE, ACE, AmeriCorps volunteer payments below minimum wage | C / **GAP** | CO-3366 in CO-3913 for DVSA; **N-5** (AmeriCorps, P2). |
| 99 | 3.752.23.G Colorado Crime Victims Compensation | C | CO-3813 in CO-4511 (case CO-175 re-run: 1,000). |
| 100 | 3.752.23.H-I, K-O Civil Liberties Act, Agent Orange, German and Austrian reparations, Nazi persecution, RECA, spina bifida | C | CO-3366 in CO-3913. |
| 101 | 3.752.23.J gift transportation ticket not converted to cash | N/A | In-kind. |
| 102 | 3.752.23.P financial aid, loans, scholarships, grants, work study | C | CO-3360, CO-3362 in CO-3913; CO-3361 in CO-3912. |
| 103 | 3.752.23.Q earned income of a child under 18 with a parent or guardian | C | CO-1002 case condition; CO-1455 mirrors it (C-5 fixed). |
| 104 | 3.752.23.R-S reimbursements | C | CO-3363 in CO-3913. |
| 105 | 3.752.23.T payments made directly to others | C | Not a member's receipt; energy vendor payments CO-3364. |
| 106 | 3.752.23.U foster care and kinship payments; those individuals not members | C / OQ | CO-3821, CO-4503 in CO-4511; membership CO-1000, CO-1009 (OQ-801); **N-6** (CO-4451 dual entry). |
| 107 | 3.752.23.V home care allowance paid to a non-member | N/A | A non-member's receipt is not in any member's income (CO-4511 precision). |
| 108 | 3.752.23.W state and county diversion payments | **GAP** | **N-1** (P1): no money fact; would sit in CO-030 and be counted. |
| 109 | 3.752.23.X reverse mortgages | C | CO-3820 in CO-4511. |
| 110 | 3.752.23.Y subsidized housing utility allowances | C | CO-4500 in CO-4511. |
| 111 | 3.752.23.Z G.I. Bill educational, housing and food allowances | C | CO-3360 (CO-3913), CO-4501 (CO-4511). |
| 112 | 3.752.23.AA one-time refugee resettlement grant | C | CO-4508 in CO-4069; **N-6** (CO-4367 dual entry). |
| 113 | 3.752.23.BB bona fide loans | C | CO-3362 in CO-3913. |
| 114 | 3.752.23.CC SCSEP funds at 55 or older | C | CO-4504, CO-4510 (`>=` 55) in CO-3925. |
| 115 | 3.752.23.DD PASS income | C / **GAP** | Unearned CO-3825 in CO-4511; earned part **N-2** (P1). |
| 116 | 3.752.23.EE lump-sum tax refunds and credits; retroactive SS, SSI and PA lump sums | C | CO-3365 (CO-3913); CO-4067, CO-4068 in CO-4069. |
| 117 | 3.752.23.FF Colorado Works supportive services | **GAP** | **N-1** (P1): CO-4452 exists, not read. |
| 118 | 3.752.23.GG liquidation of personal resources | C | CO-4507 in CO-4069. |
| 119 | 3.752.23.HH employer health insurance subsidies to the employee | C | CO-4505 in CO-3925. |
| 120 | 3.752.24 no resource test | C | No LEAP item reads a resource value (checked by `uses`; the only resource-named read is CO-4507, the GG exclusion of liquidation proceeds). |
| 121 | 3.752.25.A responsible for heating costs | C | CO-876 in CO-1004. |
| 122 | 3.752.25.A.1 pays a vendor directly | C | CO-3300 `pays_vendor_directly`. |
| 123 | 3.752.25.A.2 non-subsidized, heat in rent or separate charge | C | CO-876 (`included_in_rent` and not subsidized; separate charge). |
| 124 | 3.752.25.A.3 subsidized with an individual meter or a surcharge | C | `billed_by_landlord_on_usage`, `separate_charge_from_landlord`; CO-1283 `subsidized_without_heat_meter` otherwise. |
| 125 | 3.752.25.A.4 shared residence contributing toward expenses | C | CO-876 third arm (CO-1274 > 1 and some payment; CO-3300 precision). |
| 126 | 3.752.25.A.5 must live in a traditional dwelling | C | CO-2815 in CO-1004. |
| 127 | 3.752.25.A.6 shared primary fuel: EHHC divided by the parties | C | CO-1274 (meaning names A.6) in CO-1280. |
| 128 | 3.752.25.B.1 institutional group care | C | CO-1283 `institutional_group_care` (CO-3330). |
| 129 | 3.752.25.B.2 room and board, bed and breakfast | C | CO-1283. |
| 130 | 3.752.25.B.3 correctional facilities | C | CO-1283. |
| 131 | 3.752.25.B.4 dormitory, fraternity, sorority | C | CO-1283 (`educational_or_vocational_institution`). |
| 132 | 3.752.25.B.5 subsidized housing without meter or surcharge evidence | C | CO-1283. |
| 133 | 3.752.25.B.6 homeless or non-traditional dwelling | C / OQ | CO-2815 (OQ-561); C-2 stays fixed (case CO-179 re-run: not homeless); **N-4** (P2). |
| 134 | 3.752.25.B.7 commercial accounts or properties | C | CO-1283. |
| 135 | 3.752.25.B.8 hotels without thirty days' proof and heat in rent | C / OQ | CO-1283 (CO-008, CO-3342 `>=` 30, `included_in_rent`), OQ-610; **N-4**. |
| 136 | 3.752.25.C landlords not vulnerable unless they meet the household definition | C | Read through the household and CO-876 (a landlord pays no heat as a tenant). |
| 137 | 3.752.25.D vulnerability verified | C | CO-1456, CO-1692. |
| 138 | 3.752.26 intro, B.1 refused weatherization: denial hold for the following year | C | CO-3928 in CO-1007. |
| 139 | 3.752.26.A.1-3 exemptions | N/A | The State places the hold; an exempt household has none (CO-3928 is the State's finding). |
| 140 | 3.752.26.B.2-3 moved to a weatherized address; reapply after weatherization | C | CO-3928 precision (no hold at the new address). |
| 141 | 3.752.26.C State weatherization office duties | N/A | Administration. |
| 142 | 3.752.27 CIP inspection refused: denial hold; exemptions; moved; reapply | C | CO-3928. |
| 143 | 3.752.27.C CIP contractor duties | N/A | Administration. |
| 144 | 3.753.1.A-C citizens | C | CO-1010 (`is_us_citizen_or_national`). |
| 145 | 3.753.11 citizenship documents (1 CCR 204-30 App. A) | C | CO-1691. |
| 146 | 3.753.111 questionable citizenship | C | CO-1307 in CO-1457. |
| 147 | 3.753.13-3.753.14 legal immigrant; documents | C | CO-1694, CO-1308 (documents are fact assembly). |
| 148 | 3.753.15 SAVE verification | C | CO-1694 (status arm). |
| 149 | 3.753.16.A-L qualified aliens | C / OQ | CO-1010 (OQ-550 for the SAVE mapping and the parolee reading). |
| 150 | 3.753.17.A-D not eligible | C | CO-1010 (not on the list); A through CO-1694. |
| 151 | 3.753.18 non-qualifying member excluded, income counted; no denial if another member qualifies | C | CO-1000, CO-1009, CO-1002, CO-1005. |
| 152 | 3.753.21 Colorado resident at application; no durational requirement; intent to remain | C | CO-505 in CO-1007 (`at` the application month). |
| 153 | 3.753.22 reside at the address applied for | N/A | Case action (3.754.1.Q), per CO-1007 precision. |
| 154 | 3.754 intro A-E (refusal, collateral consent, failure to cooperate, unknown address, third-party refusal) | N/A | Case actions; verification ones reported by CO-1462. |
| 155 | 3.754.1.A excess income | C | CO-1003. |
| 156 | 3.754.1.B not vulnerable | C | CO-1004. |
| 157 | 3.754.1.C no citizen or qualified alien | C | CO-1005. |
| 158 | 3.754.1.D duplicate household or member of another approved household | C | CO-2100 in CO-1000, CO-1009. |
| 159 | 3.754.1.E withdrawn | N/A | Case action. |
| 160 | 3.754.1.F benefits from another county | C | CO-3930 in CO-1007. |
| 161 | 3.754.1.G, V incomplete application or verification | C | CO-1462 (`past_due`); denial is the county's action. |
| 162 | 3.754.1.H not a Colorado resident | C | CO-505. |
| 163 | 3.754.1.I unsigned | N/A | Case action. |
| 164 | 3.754.1.J outside the application period | C | CO-4516, CO-1007. |
| 165 | 3.754.1.K applicant not located | N/A | Case action (3.756.19). |
| 166 | 3.754.1.L, T refused weatherization or CIP inspection | C | CO-3928. |
| 167 | 3.754.1.M-O identification and affidavit (3.753.12.B.2) | N/A | Cites a section not in the rule; documentary case action. |
| 168 | 3.754.1.P non-traditional dwelling; W homeless | C | CO-2815 via CO-1004. |
| 169 | 3.754.1.Q not at the address applied for | N/A | Row 153. |
| 170 | 3.754.1.R primary heating fuel for the primary source only | C | CO-877 in CO-1007. |
| 171 | 3.754.1.S refused bulk delivery | N/A | Payment-stage action. |
| 172 | 3.754.1.U fraud conviction | C | CO-3929. |
| 173 | 3.754.11-3.754.12 reason and notice of denial | N/A | Notice. |
| 174 | 3.755.11 income, EHHC and vulnerability verified | C | CO-1455, CO-4526 (CO-2591), CO-1456 (CO-1692), CO-1693. |
| 175 | 3.755.11 prior-year vulnerability may be copied | C | CO-1342 is "verified", however obtained. |
| 176 | 3.755.12 conflicting information | N/A | Procedure. |
| 177 | 3.755.13-3.755.17 case record, written policy, storage, removal, archiving | N/A | Administration. |
| 178 | 3.755.21.A unearned income by award letter or system inquiry, not bank deposits | C | CO-1361 in CO-2591. |
| 179 | 3.755.21.B.1-3 child support via ACSES, FSR or copies | C | CO-1361. |
| 180 | 3.755.21.B.4 domestic violence: declaration suffices | C | CO-4525 in CO-4526. |
| 181 | 3.755.21.C Social Security by award letter or inquiry; gross before Medicare | C | CO-1361; gross CO-025. |
| 182 | 3.755.21.D earned income: four of eight weeks of stubs | C | CO-1455 (C-5 fixed; tests T4, T5 present), CO-1689, CO-1316. |
| 183 | 3.755.21.E public assistance by county records | C | CO-1361 (electronic source). |
| 184 | 3.755.21.F other income by county records | C | CO-1361. |
| 185 | 3.755.21.G collateral contact | C | CO-1361, CO-1316 are "verified", however obtained. |
| 186 | 3.755.21.H zero income: DOLE plus explanation, last employer or CBMS, for all adults | C | CO-1693, CO-1565 (each adult, `>=` 18). |
| 187 | 3.755.21.I.1 self-employment declaration: monthly (D-86); full month before the application (D-173) | C / OQ | CO-1712 read at `month_before` in CO-1002 (OQ-681); declaration needs no document (CO-1455 meaning). |
| 188 | 3.755.21.I.2 receipts required for deductions; a-c rent or mortgage, personal utilities, fuel and mileage | C / OQ | CO-1711 (CO-3927 receipts; mileage at the county rate, OQ-614). |
| 189 | 3.755.21.I.2.d rental property: maintenance only | C | CO-1711; **N-9** (P3). |
| 190 | 3.755.21.I.3 card and bank statements not receipts | C | CO-3927 meaning. |
| 191 | 3.755.21.J LLC and S-corporation owners: wages, draws or personal expenses (D-173) | C | CO-1712 precision (stated as wages, CO-3925); first-pass C-16 (P3) stands. |
| 192 | 3.755.21.K gifts by declaration | C | CO-4524 in CO-4526. |
| 193 | 3.755.41 evidence of vulnerability (bill, collateral, rent receipt, prior-year bill) | C | CO-1342 in CO-1692. |
| 194 | 3.755.42 subsidized housing surcharge documentation | C | CO-1342; the surcharge itself CO-3300. |
| 195 | 3.755.43-3.755.45 wood permits; wood, propane and bulk receipts | C | CO-1342 (one document fact; first-pass C-17 P3 stands). |
| 196 | 3.755.51 EHHC verified from the approved vendor | C | CO-1456, CO-1692. |
| 197 | 3.755.6 other factors may be verified | N/A | Discretionary. |
| 198 | 3.756.11 completed application; no office interview | N/A | Procedure. |
| 199 | 3.756.12.A date stamp | N/A | Procedure (the date is CO-2122). |
| 200 | 3.756.12.B emergency screening; pending timelines; June 19 (D-173); after-hours entry | N/A | Processing timelines; "entered for the next business day" is data entry, not the date of application. |
| 201 | 3.756.12.C duplicate review; incomplete application notice | C | CO-2100 (duplicates); CO-1343, CO-2121 (notice date). |
| 202 | 3.756.12.D two calendar weeks from the postmark; one good-cause extension of up to two weeks | C | CO-1461 (CO-1355 14, CO-2124 14, CO-2123). |
| 203 | 3.756.12.D reopen when verification arrives after denial, by June 15 | C | CO-1462 (first-pass C-22 P3 stands). |
| 204 | 3.756.13 lost applications | N/A | Procedure. |
| 205 | 3.756.14 30 days and 18 days to determine | N/A | Processing timelines. |
| 206 | 3.756.15 notification | N/A | Notice. |
| 207 | 3.756.16 county of residence; forwarding | N/A | County administration. |
| 208 | 3.756.17 relocation: the original county keeps the case; a new application is denied | C | CO-3930. |
| 209 | 3.756.18 withdrawn; 3.756.19 unlocated | N/A | Case actions. |
| 210 | 3.756.2.A-C advance payment (shut-off, bulk depletion, eviction) | N/A | Payment timing when no vendor agreement; no eligibility or amount effect. |
| 211 | 3.757.11-3.757.12 correct inaccuracies; data entry | N/A | Administration. |
| 212 | 3.758.31 payee on separation or divorce | N/A | Payee choice. |
| 213 | 3.758.32 death of payee | N/A | Payee. |
| 214 | 3.758.41 vendor or direct payment; never to a landlord | N/A | Payment method. |
| 215 | 3.758.46 vendor payment procedures | N/A | Payment procedure. |
| 216 | 3.758.47 Step A EHHC (prior season actuals or flat rate; standard rates for heat in rent) | C / OQ | CO-1271 (flat-rate table OQ-532). |
| 217 | 3.758.47 Step B statewide adjustment | C / OQ | CO-1272 in CO-1281 (OQ-532; OQ-253 for the order). |
| 218 | 3.758.47 Step C electric heat 62/48/43/50% | C | CO-3001, CO-1273 in CO-1280 (values checked). |
| 219 | 3.758.47 Step D HIC bands 0-75 / 75.01-125 / 125.01-175 / 175.01+ at 0/10/20/30% | C / OQ | CO-3000 (inclusive upper bounds), CO-1279, CO-1278 (OQ-253). |
| 220 | 3.758.47 Step E shared living arrangements, divided whether or not the others are eligible | C | CO-1274 in CO-1280. |
| 221 | 3.758.47 Step F subsidized housing $30 a month, $180 a season | C | CO-1282 (180) in CO-1281. |
| 222 | 3.758.47 Step G subtract B-F; at least the minimum, up to and including the maximum | C / OQ | CO-1281 (CO-1276, CO-1277; OQ-532). |
| 223 | 3.758.48 adjustments not appealable; prior years not indicative | N/A | Administration (CO-1272 meaning). |
| 224 | 3.758.49 forfeiture of unclaimed benefit | N/A | Payment. |
| 225 | 3.759.11-3.759.41 outreach, plan, reporting, weatherization referral | N/A | County administration. |

LEAP rows: **225**.

### 3.2 SUN Bucks: 7 CFR part 292 (D-88, D-117), 7 CFR 245.6 (D-250), Colorado texts

| # | Paragraph | Status | Carried by / reason |
|---|---|---|---|
| 226 | 292.1(a)-(b) purpose and scope | N/A | Authority. |
| 227 | 292.2 administrative definitions (2 CFR 200, Act, acquisition, administrative costs, APD/APDU/IAPD/PAPD, CVB, COTS, Department, disclosure, EBT account/card/contractor/system, enhancement, expungement, FNS, FNSRO, firm, food instrument, IS, ITO, ITO service area, LEA, OIG, program funds, project, RFP, SNAP eligible foods, SNAP retail store, State, Summer EBT agency, supplemental foods, system error, trafficking, vendor, WIC) | N/A | Vocabulary for administration, issuance and integrity; no eligibility or benefit effect. |
| 228 | 292.2 Adult (18 or older) | C | CO-3933 (the child boundary in CO-2708, CO-1699). |
| 229 | 292.2 Categorically eligible: SNAP, TANF, FDPIR or approved program in the household | C | CO-2708 (SNAP and TANF), CO-4528 (FDPIR, approved), CO-1296; **N-3** on timing. |
| 230 | 292.2 Categorically eligible: foster, homeless, migrant, Head Start, runaway (245.2) | C | CO-4527, CO-2813, CO-2850 in CO-1296; **N-3**. |
| 231 | 292.2 Continuous school calendar | N/A | No Colorado continuous-calendar plan in the texts; 292.15(b) is a USDA approval. |
| 232 | 292.2 Current income (month before the application; projected annual where not accurate) | C | CO-1295 (the application's figure, 292.13(n)). |
| 233 | 292.2 Direct verification | C | CO-1591 in CO-1695. |
| 234 | 292.2 Dual participation | C | CO-4521 in CO-1299. |
| 235 | 292.2 Eligible child; eligible household | C | CO-1298. |
| 236 | 292.2 Enrolled students | C | CO-1293. |
| 237 | 292.2 FDPIR | C | CO-2851. |
| 238 | 292.2 Household (economic unit; not institution or boarding house) | C | `lives_as_one_economic_unit_with` in CO-2708, CO-4523, CO-1699 (C-11 fixed). |
| 239 | 292.2 Income eligibility guidelines | C | CO-1297, CO-1291, CO-3015. |
| 240 | 292.2 Instructional year (July 1 of the prior year) | C | CO-3014 in CO-2581, CO-2708. |
| 241 | 292.2 NSLP/SBP; NSLP/SBP application | C | CO-1293, CO-4071. |
| 242 | 292.2 Period of eligibility | C / OQ | CO-2581 (OQ-535), CO-2708. |
| 243 | 292.2 Rolling verification | N/A | Sampling procedure; selection is CO-1590. |
| 244 | 292.2 School aged (compulsory attendance under State law) | C | CO-1292 (C.R.S. 22-33-104(1)(a): 6 by August 1, under 17). |
| 245 | 292.2 Special provision school | C | CO-1298 income branch reads the application, not universal free meals; CO-4071 is individual certification only. |
| 246 | 292.2 Streamlined certification | C | CO-1633 (no enrollment check), CO-1699. |
| 247 | 292.2 Summer EBT application | C | CO-1295, CO-1294. |
| 248 | 292.2 Summer operational period | OQ | OQ-535 (POM). |
| 249 | 292.2 TANF | C | CO-013. |
| 250 | 292.2 Verification (income; SNAP/TANF/FDPIR case number limits it to membership) | C | CO-1699, CO-1695. |
| 251 | 292.2 Verification for cause | C | CO-4073. |
| 252 | 292.5(a) NSLP/SBP standards: reduced-price guideline, household size | C | CO-1297 (185%, annual then monthly rounded up; $3,337 for 2 checked), CO-4523, CO-1298 (`<=`). |
| 253 | 292.5(b) guidelines change July 1; those in effect on the application date | C | CO-1297 (July of the determination); **N-10** (P3). |
| 254 | 292.6 intro "at any time during the period of eligibility" | C | CO-2708 for SNAP (C-6 fixed, case CO-178 re-run: `eligible_categorical`); **N-3** (P1) for TANF and the 245.2 grounds; school age first-pass C-19 (P3) stands. |
| 255 | 292.6(a) school-aged and categorically eligible | C | CO-1298 first branch. |
| 256 | 292.6(b)(1) NSLP school (not special provision) and categorical | C | CO-1298 first branch (CO-1293). |
| 257 | 292.6(b)(2) free or reduced price through an NSLP/SBP application | C | CO-1298 income branch; CO-4071 (individually certified). |
| 258 | 292.6(b)(3) otherwise determined eligible for a free or reduced-price meal | C | CO-4071 in CO-1296. |
| 259 | 292.6(b)(4) Summer EBT application | C | CO-1298 income branch. |
| 260 | 292.6(c)(1)-(3) special provision school: categorical, NSLP application, Summer EBT application | C | CO-1298 (same branches; universal free meals confer nothing). |
| 261 | 292.7(a) period to establish eligibility | C / OQ | CO-2581, CO-2708 (OQ-535). |
| 262 | 292.7(b) no change reporting | C | Eligibility once shown holds for the summer (CO-2708 `some_month`; **N-3** for the other grounds). |
| 263 | 292.7(c) carryover cannot confer eligibility | C | CO-4071 meaning (C-14 fixed). |
| 264 | 292.12(a)-(c) information, enrollment duties, enrollment database | N/A | Administration. |
| 265 | 292.12(d)(1)(i)(A) individually certified during the period | C | CO-4071. |
| 266 | 292.12(d)(1)(i)(B)(1)-(3) school aged and SNAP; FDPIR and TANF; foster, homeless, migrant, runaway, Head Start | C | CO-1298 with CO-1292, CO-2708, CO-1296; **N-3**. |
| 267 | 292.12(d)(1)(ii) otherwise determined eligible, not special provision | C | CO-4071. |
| 268 | 292.12(d)(2) other approved means-tested programs (State option) | C / OQ | CO-2852 (OQ-255). |
| 269 | 292.12(d)(3) no enrollment confirmation for streamlined certification | C | CO-1633. |
| 270 | 292.12(d)(4) ITO waiver | N/A | ITOs only. |
| 271 | 292.12(e) enrollment by Summer EBT application (complete application, income at or below the guideline) | C | CO-1298 income branch, CO-1633. |
| 272 | 292.12(f)(1)-(2), (4) notices of approval; duplicate-issuance notice | N/A | Notice. |
| 273 | 292.12(f)(3) households declining benefits | C | CO-4522 in CO-1299. |
| 274 | 292.12(g)-(h) denials and appeals | N/A | Notice and hearing. |
| 275 | 292.12(i) confidentiality | N/A | Disclosure. |
| 276 | 292.13(a)-(f), (h), (j)-(m), (o)-(p) application availability, design, communications, follow-up, electronic, attestation, race and ethnicity, instructions, statements, disclosure | N/A | Application procedure. |
| 277 | 292.13(g) apply by the last day of the summer operational period; later applications for the next summer | C / OQ | CO-2581 (OQ-535). |
| 278 | 292.13(i) application content (income by member, source; case numbers) | C | CO-1295, CO-1294 are the application's figures. |
| 279 | 292.13(n) calculating current income from the application | C | CO-1295 against CO-1297. |
| 280 | 292.14(a)(1)(i)-(v) verification for cause, at any time, within 30 days | C | CO-1590, CO-4073 in CO-1699, CO-1299. |
| 281 | 292.14(a)(2)-(3), (b)-(d) the 3% sample, alternatives, replacement, rolling, after April 1 | N/A | Selection procedure; the selection is CO-1590. |
| 282 | 292.14(e)(1)-(3) direct verification first; any point in the period | C | CO-1591; CO-2708 (any month, for SNAP); **N-3**. |
| 283 | 292.14(f)(1) exceptions: all children SNAP/FDPIR/TANF/approved, or all foster/homeless/migrant/runaway | C | CO-1699 with CO-2708, CO-4528, CO-4527 (C-21 fixed: separate "all" clauses). |
| 284 | 292.14(f)(2)(i)-(iii) notice; respond by the agency's date; alternative proofs | C / OQ | CO-1592 accepts SNAP/FDPIR/TANF proof; no deadline (OQ-377). |
| 285 | 292.14(f)(2)(iv), (f)(5) failure to cooperate terminates | **GAP** | **N-7** (P2). |
| 286 | 292.14(f)(3) sources of information | N/A | Evidence procedure (CO-1592, CO-1591 are "verified", however obtained). |
| 287 | 292.14(f)(4) documentation may show eligibility at any point in the period | C | CO-1592. |
| 288 | 292.14(f)(6)-(7) telephone; two follow-up attempts | N/A | Procedure (OQ-377 on the deadline). |
| 289 | 292.14(f)(8) eligibility changes after verification | C | CO-1298 re-read on the verified facts; notices N/A. |
| 290 | 292.14(f)(9) no issuance while selected verification is pending, except for cause | C | CO-1299 (F-21 stays fixed). |
| 291 | 292.14(f)(10) continuous calendars | N/A | USDA approval. |
| 292 | 292.14(f)(11) questionable after issuance: no further benefits until for-cause verification | C | CO-1299 precision (first-pass C-18 P3 stands). |
| 293 | 292.14(f)(12) nondiscrimination | N/A | Procedure. |
| 294 | 292.15(a) benefits for use in the summer operational period | N/A / OQ | Timing (OQ-535). |
| 295 | 292.15(b) continuous school calendar | N/A | USDA approval. |
| 296 | 292.15(c)(1)(i)(A)-(B), (ii) issuance timing; corrective action | N/A | Issuance timing. |
| 297 | 292.15(c)(1)(iii) a full three months only | C | CO-3013 (3) in CO-1299. |
| 298 | 292.15(c)(1)(iv) no issuance until verification is complete | C | CO-1299 (with 292.14(f)(9)'s for-cause exception). |
| 299 | 292.15(c)(1)(v) help for households without a fixed address | N/A | Procedure. |
| 300 | 292.15(c)(2) method of issuance | N/A | Issuance. |
| 301 | 292.15(d)(1) no dual participation | C | CO-4521 in CO-1299. |
| 302 | 292.15(d)(2) detection procedures in the POM | N/A | Administration. |
| 303 | 292.15(e)(1), (3) $40 in 2024, TFP-adjusted and rounded down, no decrease | C | CO-1244 (2024-2026 $40; 2027 unknown until published). |
| 304 | 292.15(e)(2) non-contiguous States | N/A | Colorado is in the 48 States. |
| 305 | 292.15(e)(4) no proration; full three months | C | CO-1299, CO-3013. |
| 306 | 292.15(f)(1)-(2) single or multiple issuance; staggering; availability date; full amount whatever the application date; reporting | C | CO-1299 (full amount; the rest N/A issuance mechanics). |
| 307 | 292.15(g) household training, PINs, adjustments, duplicate accounts | N/A | Issuance administration. |
| 308 | 292.15(h)-(i) expungement after 122 days; SNAP-account draw-down | N/A | Post-issuance. |
| 309 | 292.16(a)-(c) issuance and accountability, disclosure, program administration, court suits | N/A | Administration. |
| 310 | 245.6(a)(1)-(9) application content, transfers, statements, attestation | N/A | School-meal application procedure. |
| 311 | 245.6(b)(1)-(6), (9)-(10) direct certification with SNAP, FDPIR, TANF; frequency; documentation; officials; confidentiality; notification | C | Source of CO-4071 and the 292.12(d) streamlined sources; procedure otherwise N/A. |
| 312 | 245.6(b)(7) extension to all children in a household receiving SNAP, FDPIR or TANF | C | CO-2708 (household children; F-13 stays fixed). |
| 313 | 245.6(b)(8) foster, homeless, migrant, runaway, Head Start documentation | C | CO-4527, CO-2850 (positive identification). |
| 314 | 245.6(c)(1)-(2) duration; prior-year carryover | C | CO-4071 meaning (292.7(c); C-14 fixed). |
| 315 | 245.6(c)(3)-(5) year-long duration exceptions; calculating income; categorical on application | C | CO-1295 (application income); CO-1296. |
| 316 | 245.6(c)(6)-(8), (d)-(k) notices, denials, appeals, failure to apply, records, disclosure, Medicaid/SCHIP sharing, consent, agreements, penalties | N/A | Procedure and disclosure. |
| 317 | C.R.S. 26-2-309(1)-(3) declaration, definitions, creation; CDHS lead, CDE partner | N/A | Authority. |
| 318 | C.R.S. 26-2-309(4)(a)(I) eligibility criteria consistent with federal law | C | The 7 CFR 292 items above; no Colorado rule (D-143, OQ-255). |
| 319 | C.R.S. 26-2-309(4)(a)(II)-(VI), (b), (c)(I)-(II) recovery, outreach, technical assistance, rules, data sharing | N/A | Administration. |
| 320 | C.R.S. 26-2-309(4)(c)(III) opt-out process | C | CO-4522. |
| 321 | C.R.S. 26-2-309(5)-(7) school food authority data, retention, repeal | N/A | Administration. |
| 322 | C.R.S. 22-33-104(1)(a) compulsory attendance ages (6 by August 1; under 17) | C | CO-1292, CO-2605. |
| 323 | C.R.S. 22-33-104(2) exemptions from attendance | N/A | Individual excuses; they do not change the ages (CO-1292 precision). |
| 324 | D-143 SOS rule lists: no Colorado Summer EBT rule | C / OQ | OQ-255. |

SUN Bucks and Colorado rows: **99**. Matrix size: **324 rows** (225 LEAP, 99 SUN Bucks and Colorado). Some rows group lettered subparagraphs that have the same disposition. GAP rows: 108 (W) and 117 (FF) (N-1), 115 (DD earned, N-2), 98 (F AmeriCorps, N-5) and 285 ((f)(5), N-7).

## 4. Open-question confirmations

| OQ | Class recorded | Confirmed? | Note |
|---|---|---|---|
| OQ-253 Step B/D/F combination; poverty guideline year | state policy choice | Yes | 3.758.47 Steps B-G do not order the adjustments, and "Federal Poverty Level" names no year. Texts checked (D-86, D-173). |
| OQ-532 LEAP program-year figures (rate, minimum, maximum, flat rates) | blocked on a named document | Yes | D-86 and D-173 state none of them; D-144 (CDHS's LEAP page) gives only the income table and says the benefit "varies". The named notification and training manual are on cdhs.colorado.gov, not an allowed host. A Firecrawl search for another copy could not run (credits exhausted). |
| OQ-561 "considered homeless" | state policy choice | Yes, with N-4 | 3.752.25.B.6 is undefined. The open question should weigh B.8 for hotel households. |
| OQ-610 hotel "has lived or will live" | state policy choice | Yes | The wording admits both readings. |
| OQ-614 county mileage rate | blocked on a named document | Yes | The figures are county policy, not on any allowed host. |
| OQ-681 income verification period, four of eight weeks, self-employment month | state policy choice | Yes | The texts (3.751.1, 3.752.22.B, 3.755.21.I.1 as amended) were read; each is a reading of the State's own words. |
| OQ-714 another member's fraud penalty | state policy choice | Yes | 3.751.563 against 3.754.1.U; the text does not say how the household is affected. |
| OQ-800 public assistance households | state policy choice | Yes | 3.752.1's list against 3.751.1 "Public Assistance Income". |
| OQ-801 foster or kinship child membership | state policy choice | Yes | 3.752.23.U against 3.751.2.D.2. |
| OQ-550 immigration status mapping (shared) | blocked on a named document | Yes | The USCIS SAVE list is not on an allowed host. |
| OQ-255 Colorado's optional Summer EBT categorical sources | blocked on a named document | Yes | No Colorado rule (D-143); the choice is in the POM, which is not on an allowed host. |
| OQ-377 Summer EBT response period | blocked on a named document | Yes, with N-7 | The POM sets the date; refusal (292.14(f)(5)) is separate and not recorded. |
| OQ-535 summer operational period | blocked on a named document | Yes | The POM (292.8). |

No open question in the family is misclassified.

## 5. First-pass P1s (docs/reviews/coverage-leap-sunbucks.md)

| First pass | Still fixed? | Evidence |
|---|---|---|
| C-1 3.752.23 exclusions | Yes, for the receipts it named | CO-4511 and the CO-4069 and CO-3925 subtractions are present; case CO-175 re-run: `leap_household_income` 1,000, eligible. Two more members of the same class (FF and W, earned PASS) are N-1 and N-2. |
| C-2 eviction notice is not homelessness | Yes | CO-2815 has no `imminently_losing_residence`; case CO-179 re-run: not homeless, eligible 2026-12. |
| C-3 public assistance households before November 1 | Yes | CO-4517, CO-4518 in CO-1007; case CO-176 re-run: eligible 2026-11. |
| C-4 postmark and April 30 extension | Yes | CO-4512 to CO-4516; case CO-177 re-run: eligible 2027-04. |
| C-5 earned-income verification trigger | Yes | CO-1455 reads CO-3925 with CO-1002's child condition; tests T4 and T5 present. |
| C-6 categorical receipt at any time in the period | Partly | SNAP: yes (case CO-178 re-run: `eligible_categorical`). TANF and the 245.2 grounds: no, because their facts hold one value (N-3). |

## Probe households (scratch copy only)

- RV2-L0 / RV2-L1: one adult, hotel since 2026-09-01, heat in rent, $1,000 wages, application 2026-11-10; L0 `fixed_regular_adequate` (eligible), L1 `motel_or_hotel_for_lack_of_alternative` (not vulnerable, ineligible).
- RV2-L2: CO-175 with $3,500 wages and $400 supportive-service payments (CO-030 and CO-4452): `leap_household_income` 3,900, ineligible.
- RV2-L3: CO-175 with $4,000 wages, $500 of them a PASS set-aside (CO-4618): `leap_person_wages` 4,000, ineligible.
- RV2-S0 / RV2-S1: guardian and 10-year-old in an NSLP school, school-meal income $6,000, determined 2027-03-01; S0 `child_welfare_payment_type` `title_iv_e_foster_care` (`eligible_categorical`), S1 `none` after care ended in December (`ineligible`, benefit 0).
- RV2-S2: as S1 with `tanf_cash_income` $300 in 2026-09 to 2026-12 and `receives_tanf_cash` false: `sebt_household_child_receives_snap_or_tanf` false in 2026-10 and 2027-03, `ineligible`.

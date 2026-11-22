# Coverage-matrix review, third pass: LEAP and SUN Bucks (family `coverage3-leap-sunbucks`), HEAD 4b8f2e1

Texts read from `volumes/co/documents/`:

- LEAP: 9 CCR 2503-7 as effective 2025-11-01 (D-86), 3.750-3.759 in full, with the amendments effective 2026-11-01 (D-173: 3.752.211.J, 3.752.22.D, 3.755.21.I.1 and J, 3.756.12.B).
- SUN Bucks: 7 CFR 292.1, 292.2, 292.5-292.7, 292.12, 292.13, 292.15, 292.16 (D-88); 292.14 (D-117); 7 CFR 245.6 (D-250); C.R.S. 26-2-309 (D-142); C.R.S. 22-33-104(1)(a) (D-141); the SOS rule lists showing no Colorado Summer EBT rule (D-143).

Method: the matrix below was built from the rule text, paragraph by paragraph, and was not copied from `coverage-leap-sunbucks.md` or `coverage2-leap-sunbucks.md`. The ledger was exported from a scratch copy of HEAD (`git archive`, node_modules symlinked; 2,199 items, 78 LEAP and 38 SUN Bucks). Every item the fix rounds touched was re-read against the text with its derivation and tests: CO-4500 to CO-4528, CO-4850 to CO-4855, and the edits to CO-1002, CO-1007, CO-1297, CO-1298, CO-1299, CO-2708, CO-2815, CO-3925, CO-3926, CO-4069, CO-4511, CO-4527, CO-4528 and the CO-4451 rename. So were the shared facts those items read (CO-3913, CO-3911, CO-3367, CO-4066, CO-3825, CO-4618, CO-029, CO-013, CO-2853, CO-4851, CO-4852). `scripts/check.ts --no-conformance` passes on the copy: every item test and every stored case passes, including the earlier P1 cases CO-175 to CO-179 and CO-209 to CO-211. Suspected wrong answers were confirmed with probe households added to the copy's `tests/cases.yaml` and run with `npx vite-node scripts/eval-case.ts co <case> <identifiers> 2026-11`. They are listed after the findings. Nothing was written to the repository except this file.

## 1. Verdict

**2 P1 found**, both in LEAP and both **rare edge combinations**. Neither is a regression: no fix-round item changed an answer it should not have. Both are residues of the 3.752.23 exclusion class that C-1, N-1, N-2 and N-6 worked through. There are also 4 P3 findings and no P2 findings. Every earlier P1 stays fixed (section 5).

- **F3-1.** CO-4511 is subtracted only from the recurring thirty-day figure (CO-3913) and is clamped at zero there. A PASS set-aside of Social Security (SSDI) income is part of `social_security_income`, which CO-3913 does not hold, so the set-aside is not excluded. That is 3.752.23.DD's unearned half for the most usual PASS income.
- **F3-2.** A 3.752.23 excluded receipt that is a one-time payment can be stated, as the volume's own facts define it, both as its source fact and as a lump sum. Crime victim compensation is the clearest case. CO-3913 then takes the lump sum out of the recurring figure, CO-4511 takes the same money out a second time (from the household's other recurring income), and CO-4069 counts the thirty-day lump sum, which has no part fact for that exclusion. The rule excludes it; the engine counts it.

The SUN Bucks fix rounds (CO-2708 Colorado Works by month, CO-4527 and CO-4528 grounds that ended in the period, CO-4854 refusal, CO-4855 application date) implement 292.6, 292.12(d)(1), 292.14(f)(5) and 292.5(b) as written. No SUN Bucks P1 or P2 was found.

## 2. Findings

| id | sev | label | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|---|
| F3-1 | **P1** | rare edge combination (PASS plans are few, but a PASS of SSDI is their usual form; the earned half was N-2) | 9 CCR 2503-7 3.752.23.DD | CO-4511 `leap_excluded_unearned_income`, CO-3926 `leap_person_unearned_income`; fact CO-3825 `pass_set_aside_income` | "DD. Income that is deemed necessary for the fulfillment of a Plan for Achieving Self-Support (PASS) under Title XVI of the Social Security Act." | CO-3825's precision: the set-aside is "Part of the person's gross unearned income ... (other_unearned_income_taxable or other_unearned_income_nontaxable, **or the fact that names the source**)". For SSDI that fact is `social_security_income` (CO-025). CO-3926 computes `max(0, CO-3913 − CO-4511) + floor(social_security_income) + ...`. CO-3913 holds no Social Security, so an SSDI set-aside is subtracted from nothing and lost to the clamp, and the full SSDI counts. **PR3-L1**: one adult, $2,000 wages, $2,000 SSDI (`title_ii_benefit_type` own_disability), $400 of the SSDI set aside under an approved PASS, application 2026-11-10. The engine gives `leap_excluded_unearned_income` 400 but `leap_person_unearned_income` 2,000, `leap_household_income` 4,000 and `leap_is_eligible` false (limit $3,774 for 1). The rule counts $3,600, so the household is eligible. | Subtract the exclusion from the recurring figure and the month's Social Security together: `max(0, CO-3913 + floor(social_security_income) − CO-4511)`, with SSI, cash assistance and one-time receipts added after. Alternatively, subtract `pass_set_aside_income` beyond what CO-3913 holds from the floored Social Security. Add a CO-3926 test for an SSDI PASS, and promote PR3-L1 to a case. |
| F3-2 | **P1** | rare edge combination (a one-time excluded payment received in the thirty days, stated as the volume's facts define it) | 3.752.23.G (and U, X, Y, Z, AA, FF, W, 211.D whenever paid as a one-time sum); 3.752.21.A, C-D; 3.752.22.A | CO-3913 `unearned_income_prior_thirty_days`, CO-4511, CO-4069 `leap_person_one_time_income`; facts CO-3367 `lump_sum_received`, CO-4066 `lump_sum_received_prior_thirty_days`, CO-3813, CO-4367, CO-4508 | G: "Compensation received by the applicant or recipient pursuant to the Colorado Crime Victims Compensation Act shall not be considered as income". | A one-time compensation payment is "a similar one-time payment" under CO-3367's meaning, and it is the money CO-3813 names; both facts are "part of" the same gross unearned fact. Stated in both (with CO-4066, which CO-4069 needs when a month's lump sum is stated): CO-3913 subtracts the lump sum, CO-4511 subtracts the payment a second time from the remaining recurring income, and CO-4069 counts the thirty-day lump sum, because it has a part fact only for EE, GG, AA and 21.C-D. **PR3-L2**: $3,000 wages and a $3,000 one-time crime victim compensation payment. The engine gives `leap_person_one_time_income` 3,000, `leap_household_income` 6,000 and ineligible; the rule gives 3,000, eligible. **PR3-L3**: the same, with $2,500 wages and $900 child support. The engine gives 5,500: the child support is consumed by the second subtraction, and the compensation is counted. The rule gives 3,400. **PR3-L4**: $3,000 wages and $900 reception-and-placement money stated in CO-4367 and as a lump sum, without CO-4508. The engine gives 3,900 and ineligible; the rule (and OQ-863's Assumption) gives 3,000, eligible. N-6 fixed only the case that states CO-4367 and CO-4508 together. | In CO-4069, subtract the part of the thirty-day lump sum that is a CO-4511 receipt. Either add one neutral part fact, `leap_excluded_receipt_in_lump_sum_prior_thirty_days`, or read CO-4511's month parts that are also within `lump_sum_received` and cap that subtraction at CO-4066. In CO-4511, subtract only the part of each receipt not already taken out by CO-3913 as a lump sum, so other income is not consumed. Add tests for PR3-L2 to PR3-L4. |
| F3-3 | P3 | rare edge combination | 7 CFR 292.14(f)(1), (f)(5) | CO-1298 `sebt_eligibility_status`; CO-4854 | (f)(1): "Verification is not required of households if all children in the household are determined eligible based on documentation ... SNAP, FDPIR, TANF". | CO-1298's first branch makes the child `ineligible` whenever `sebt_household_refused_verification` is true, without testing that the household was required to verify (CO-1699). CO-4854's meaning limits the fact to a household "selected for Summer EBT verification", so a correct case cannot reach this, but a SNAP child stated with it is terminated. | Gate the branch on `sebt_requires_verification_of_income` (or on CO-1590). |
| F3-4 | P3 | rare edge combination (pre-existing, F-21) | 292.12(e)(2); 292.14(f)(9) | CO-1299 | (e)(2): enrollment confirmation "is required for children who apply by Summer EBT application ... prior to benefit issuance." | The for-cause exception in CO-1299 issues the benefit whenever CO-1698 is `pending`, including when the pending element is school-enrollment confirmation (CO-1696), not the income verification (f)(9) excepts. | Apply the for-cause exception only to `sebt_income_verification_is_pending`. |
| F3-5 | P3 | rare edge combination | 292.2 "Period of eligibility"; 292.6 | CO-4527, CO-4528 vs CO-2708 | — | CO-4527 and CO-4528 place the period's first day from `[det_month]`, while CO-2708 and CO-2581 use the month evaluated. A month evaluated in one period with a determination date in the next reads the exit dates against the later period. | Use `[month]` in both, as CO-2708 does (CO-4527 and CO-4528 would become person-month). |
| F3-6 | P3 | rare edge combination | 7 CFR 245.2 "Foster child" (via 292.2) | CO-4527; fact CO-2853 `foster_care_exit_date` | — | CO-2853 is "the date the person's foster care placement under the responsibility of Colorado or a Tribe ended". A child whose foster placement by another State's agency ended in the period has no fact to state it, though 245.2 is not limited to Colorado placements. | Widen CO-2853's meaning to a placement by any State or Tribal agency, or add a note to CO-4527's precision. |

P1: F3-1, F3-2 = **2**. P2: **0**. P3: F3-3 to F3-6 = **4**.

## 3. Coverage matrix

Legend: **C** carried by (item read against the text: conditions, boundaries, periods, rounding; confirmed unless a finding is named); **N/A** not applicable, with the reason; **OQ** open question; **GAP** no item and no recorded reason.

### 3.1 9 CCR 2503-7 (D-86 as amended by D-173)

| # | Paragraph | Status | Carried by / reason |
|---|---|---|---|
| 1 | 3.750.11-3.750.14 authority, HFAP and CIP intent, reserved | N/A | Authority and intent; CIP is a service with no eligibility test here beyond 3.752.27. |
| 2 | 3.750.15 funding contingency | N/A / OQ | Funding; program-year figures OQ-532. |
| 3 | 3.751.1 Adverse Action; Appellant; Recipient; Report of Contact | N/A | Notice, hearing and case-record terms. |
| 4 | 3.751.1 Applicant | C | CO-3929 (the applicant's fraud penalty); OQ-714 for other members. |
| 5 | 3.751.1 Approved Vendor; Vendor; Bulk and Non-Bulk Fuel; Propane Bottles | N/A | Payment and receipt vocabulary; EHHC is supplied (CO-1271). |
| 6 | 3.751.1 Collateral Contact; Discrepancy; Prudent Person; Questionable | N/A / C | Case procedure; "questionable" is carried by CO-1307 in CO-1457. |
| 7 | 3.751.1 Completed Application A (adequate responses), C (signed) | N/A | County case actions (CO-1007 precision, 3.754.1.G, I). |
| 8 | 3.751.1 Completed Application B: SSN or proof of application; member excluded, income counted | C | `ssn_is_verified` in CO-1694 → CO-1000; income kept by CO-1009 → CO-1002. |
| 9 | 3.751.1 Date of Application (legible name and address, received) | C | CO-2122; the postmark of a mailed form is CO-4512 via CO-4514 (3.752.1 only). |
| 10 | 3.751.1 Disabled or Handicapped; Elderly | N/A | Outreach only (3.759.11.A, E). |
| 11 | 3.751.1 Eligibility Period: November 1 to April 30 | C | CO-1806, CO-1807, CO-1006, CO-1008. |
| 12 | 3.751.1 Eligibility Period: April 30 on a weekend or holiday runs to midnight the next business day | C | CO-4513 (2028 +1, 2033 +2, 2034 +1, checked against the calendar), CO-4515, CO-4516 in CO-1007. |
| 13 | 3.751.1 Emergency Applicant; Life Threatening Crisis | N/A | Processing priority (3.756.12.B, 3.756.14) and CIP; read as not homelessness in CO-2815 (C-2). |
| 14 | 3.751.1 Estimated Home Heating Costs: prior season, current address, no arrearages or fees, flat rates for non-approved vendors | C / OQ | CO-1271 meaning; flat-rate table OQ-532. |
| 15 | 3.751.1 Federal Poverty Level | C / OQ | CO-181 in CO-1278 (OQ-253: guideline year). |
| 16 | 3.751.1 Heat Related Arrearage; Supportive Fuel | C | Excluded from EHHC by CO-1271's meaning; supportive fuel is not the primary fuel (CO-3300). |
| 17 | 3.751.1 Home Heating Costs; Primary Heating Fuel | C | CO-3300, CO-876. |
| 18 | 3.751.1 Household (economic unit; fuel bought in common or heat paid in rent) | C | CO-1000, CO-1009 (`shares_heat_with`, OQ-132 resolved). |
| 19 | 3.751.1 Household Income Contribution | C | CO-1279, CO-3000. |
| 20 | 3.751.1 Income Verification Period (application date to the same date of the prior month) | C / OQ | CO-3911-3913, CO-3912, CO-4069 (thirty days, OQ-681). |
| 21 | 3.751.1 Lawful Permanent Residents | C | CO-1010. |
| 22 | 3.751.1 Non-Traditional Dwelling (not affixed to a permanent address; cars, vans, buses, tents, lean-tos) | C | CO-2815 (`place_not_designed_for_sleeping`). |
| 23 | 3.751.1 Overpayment | N/A | Recovery. |
| 24 | 3.751.1 Point in Time | C | CO-1007 reads every factor `at` the month of CO-2122; CO-1281 Step D likewise (OQ-137 resolved). |
| 25 | 3.751.1 Primary Heating Source (temporary or portable not a source) | C | CO-877 in CO-1007, CO-1456, CO-2586. |
| 26 | 3.751.1 Program Year (with the April 30 extension) | C | CO-1006, CO-4517, CO-4515. |
| 27 | 3.751.1 Public Assistance Income A-F | C | Counted: CO-029, CO-1713, CO-025 in CO-3926; NCRA and AB in `other_unearned_*` through CO-3913. Verified: CO-4526, CO-2591. |
| 28 | 3.751.1 Reapplication (point in time reset) | C | The application decided is CO-2122; CO-1007 reads its month. |
| 29 | 3.751.1 Subsidized Housing (rent based on income) | C | CO-1275. |
| 30 | 3.751.1 Tiny Home; Traditional Dwelling | C | CO-1273 (apartment row), CO-1283, CO-2815. |
| 31 | 3.751.2.A member of an approved household not counted again | C | CO-2100 in CO-1000, CO-1009, CO-2593. |
| 32 | 3.751.2.B each person counted in one household | C | CO-1000 and CO-1274 (other households). |
| 33 | 3.751.2.C at most fifteen members | C | CO-875 keyed 1-15; CO-1003 unknown above. |
| 34 | 3.751.2.C at most nine separate households | C | CO-1274 precision (a case states 1-9). |
| 35 | 3.751.2.D.1 husband and wife | C | `spouse` edge in CO-1000, CO-1009. |
| 36 | 3.751.2.D.2 children under 18 with parent or guardian, unless emancipated | C / OQ | CO-325 (`<` 18), `is_emancipated_minor`; foster and kinship children left out (OQ-801). |
| 37 | 3.751.2.D.3 civil unions | C | `civil_union_partner` in CO-1000, CO-1009. |
| 38 | 3.751.2.E parent and children apart from an ex-spouse after separation or divorce | C | CO-4519, CO-4520. |
| 39 | 3.751.21 permanent separation | C | No spouse edge after divorce; legal separation through E (CO-1000 precision). |
| 40 | 3.751.22 presumption of marriage | C / N/A | A stated spouse edge stays joined; the refutation is evidence procedure. |
| 41 | 3.751.31-3.751.35 non-discrimination, opportunity to apply, interpreters, authorized representative, signature by mark | N/A | Procedure. |
| 42 | 3.751.41-3.751.489 notice, hearings, confidentiality, EBT notices | N/A | Notice and hearing procedure. |
| 43 | 3.751.51-3.751.55 recoveries | N/A | Recovery procedure. |
| 44 | 3.751.561-3.751.562 fraud defined; DA referral | N/A | Procedure; the penalty is row 45. |
| 45 | 3.751.563 penalty: 1, 2 program years, permanent | C / OQ | CO-3929 (the case states whether the applicant is serving it); other members OQ-714. |
| 46 | 3.751.61-3.751.64 reporting, monitoring, case file review | N/A | County administration. |
| 47 | 3.751.71-3.751.72 reimbursement, sanctions | N/A | County administration. |
| 48 | 3.752.1 IML-4 application November 1-April 30; April 30 extension | C | CO-4516, CO-1007 (rows 11-12). |
| 49 | 3.752.1 received or postmarked during the period accepted; fax accepted | C | CO-4512, CO-4514. |
| 50 | 3.752.1 public assistance households' applications before November 1 accepted, effective November 1 | C / OQ | CO-4518, CO-4517 in CO-1007 (OQ-800: which households). |
| 51 | 3.752.1 after the closing date denied | C | CO-4516 in CO-1007. |
| 52 | 3.752.1 circumstances on the date received | C | CO-1007 reads the month of CO-2122, not of the postmark (CO-4514 precision). |
| 53 | 3.752.1 effective date not before November 1 | C | CO-1008, CO-1007 (`>=` the filing month and same program year). |
| 54 | 3.752.2 vulnerable and meet income and other requirements at application; factors listed | C | CO-1007 (residency CO-505, citizenship CO-1005, income CO-1003, vulnerability CO-1004, fuel/source CO-877, composition CO-1000, shared CO-1274, dwelling CO-1283/CO-2815, EHHC CO-1271). |
| 55 | 3.752.21 intro: payments from any other source that are a gain or benefit | C | `other_unearned_*` (CO-030, CO-1714) in CO-3913. |
| 56 | 3.752.21.A inheritance, gifts, prizes | C | Gifts CO-4524 in CO-030 (CO-3913); prizes CO-4065 and inheritances CO-4066 in CO-4069. |
| 57 | 3.752.21.B dividends and interest | C | CO-1714, CO-081 in CO-3913. |
| 58 | 3.752.21.C life insurance proceeds beyond last illness and burial | C | CO-4509 in CO-4069 (not below zero). |
| 59 | 3.752.21.D health insurance or injury proceeds beyond medical care | C | CO-4509 in CO-4069. |
| 60 | 3.752.21.E strike benefits | C | `other_unearned_*` in CO-3913. |
| 61 | 3.752.21.F jointly owned property income by ownership share or actual | C | Stated as the person's receipt in `other_unearned_*`. |
| 62 | 3.752.21.G-H lease bonuses and royalties, month received | C / OQ | `other_unearned_*`; read for the thirty days (OQ-681). |
| 63 | 3.752.21.I SSI in the month received, cents dropped | C | CO-849 in CO-3926 (`ceil` of the negative). |
| 64 | 3.752.21.J Civil Liberties Act income | C | Excluded by 3.752.23.H: CO-3366 in CO-3913. |
| 65 | 3.752.21.K garnished amounts countable | C | Gross facts (CO-025, CO-030 "before any deduction withheld"). |
| 66 | 3.752.21.L public assistance income | C | CO-029, CO-1713, CO-025 in CO-3926; NCRA, AB in `other_unearned_*`. |
| 67 | 3.752.21.M adoption assistance | C | CO-4451 (now adoption only) is part of `other_unearned_*`, counted; not in CO-4511. |
| 68 | 3.752.21.N child support and spousal maintenance | C | CO-028 and `other_unearned_*` in CO-3913. |
| 69 | 3.752.211.A-C annuities, pensions, disability and survivor's benefits | C | CO-027 pension, CO-025, `other_unearned_*`. |
| 70 | 3.752.211.D workers' compensation, less claim expense amounts | C | CO-030 (workers' comp) in CO-3913; CO-4502 in CO-4511. |
| 71 | 3.752.211.E veterans' compensation; dependent's portion | C | `other_unearned_*`; the portion's owner does not change the household sum. |
| 72 | 3.752.211.F unemployment compensation | C | CO-026 in CO-3913. |
| 73 | 3.752.211.G railroad retirement | C | `other_unearned_*` / pension. |
| 74 | 3.752.211.H Social Security, Prouty, black lung; cents dropped | C | CO-025 in CO-3926 (floored). |
| 75 | 3.752.211.I SSI | C | Row 63. |
| 76 | 3.752.211.J FAMLI (D-173) | C | `other_unearned_*`; cited in CO-3926's meaning. |
| 77 | 3.752.211.K trusts in the income verification period | C | `other_unearned_*` in CO-3913 (thirty days). |
| 78 | 3.752.212 military allotment, month received | C | `other_unearned_*`; cited in CO-3926. |
| 79 | 3.752.22.A unearned income received in the IVP, not over one month's | C / OQ | CO-3913, CO-4069, CO-3926 precision; OQ-681. |
| 80 | 3.752.22.B earned ongoing income: any four of the eight weeks | C / OQ | CO-3922 (eight-week average), CO-3925; OQ-681. |
| 81 | 3.752.22.C.1-2 weekly ×4, bi-weekly ×2, semi-monthly ×2 | C | CO-3924 in CO-3925. |
| 82 | 3.752.22.C.3.a-b terminated or new earned income: actual in the IVP | C | CO-3923, CO-3912 in CO-3925. |
| 83 | 3.752.22.C.3.c unearned source: none until the first check; actual for the IVP | C / OQ | CO-3911 (thirty-day receipts; a case where a payment started states it), OQ-681. |
| 84 | 3.752.22.C.4 in-kind earned income at the declared value | C | CO-4506 in CO-3925. |
| 85 | 3.752.22.D (D-173) up to and including 60% SMI FFY 2026; annual adjustment | C / OQ | CO-875 (2026-27 table), CO-1003 `<=`; OQ-122 resolved; the program-year figures OQ-532. |
| 86 | 3.752.22.E denied households may reapply | C | Row 28. |
| 87 | 3.752.23 intro: exempt as resources or income; ROC notation | C / N/A | Rows 88-121; the notation is case procedure. |
| 88 | 3.752.23.A food assistance and USDA foods; B Title III nutrition; C school meals and WIC; D home produce | N/A | In-kind; no cash income fact holds them. |
| 89 | 3.752.23.E housing assistance paid with respect to a dwelling | N/A | Paid to the landlord or housing authority; not a member's receipt (the tenant's own utility allowance is Y). |
| 90 | 3.752.23.F foster grandparents, senior companions and other DVSA volunteers below minimum wage | C | CO-3366 meaning ("volunteer payments under Titles I to III of the Domestic Volunteer Service Act below the minimum wage") in CO-3913. |
| 91 | 3.752.23.F AmeriCorps below minimum wage for the hours served | C | CO-4016 with CO-4853 and CO-4730 in CO-4511 (`<` minimum wage = "not equivalent to or greater than"); hours unstated: counted. |
| 92 | 3.752.23.G Colorado crime victim compensation | C / **F3-2** | CO-3813 in CO-4511; counted when also stated as a one-time lump sum. |
| 93 | 3.752.23.H Civil Liberties Act; I Agent Orange; K German restitution; L RECA; M Austrian; N Nazi persecution | C | CO-3366 in CO-3913. |
| 94 | 3.752.23.J gift transportation ticket not converted to cash | N/A | In-kind. |
| 95 | 3.752.23.O spina bifida payments to children of Vietnam veterans | C | CO-3366 ("and the like": federal exclusion, 38 U.S.C. 1833) in CO-3913. |
| 96 | 3.752.23.P financial aid, including work study | C | CO-3360 in CO-3913; work study CO-3361 in CO-3912 and out of CO-3922. |
| 97 | 3.752.23.Q earned income of a child under 18 residing with a parent or guardian | C | CO-1002 child branch (wages and self-employment); CO-1455 mirrors it. |
| 98 | 3.752.23.R employer reimbursements; S reimbursements not exceeding expenses | C | CO-3363 in CO-3913. |
| 99 | 3.752.23.T payments made on the household's behalf to others | C / N/A | Vendor-paid energy assistance CO-3364 in CO-3913; other third-party payments are not a member's receipt. |
| 100 | 3.752.23.U foster care and kinship income; those individuals not members | C / OQ | CO-3821, CO-4503 in CO-4511; members CO-1000, CO-1009 (OQ-801). |
| 101 | 3.752.23.V home care allowance paid to a non-member | N/A | A non-member's receipt. |
| 102 | 3.752.23.W State/county diversion payments | C | CO-4850 in CO-4511 (a cash receipt; a vendor-paid diversion is not a receipt). |
| 103 | 3.752.23.X reverse mortgages | C | CO-3820 in CO-4511. |
| 104 | 3.752.23.Y subsidized housing utility allowances | C | CO-4500 in CO-4511. |
| 105 | 3.752.23.Z G.I. Bill allowances including housing and food | C | Tuition part CO-3360 in CO-3913; housing and food CO-4501 in CO-4511. |
| 106 | 3.752.23.AA one-time refugee resettlement grant | C / OQ / **F3-2** | CO-4508 in CO-4069; CO-4367 less CO-4508 in CO-4511 (OQ-863); counted when stated in CO-4367 and as a lump sum without CO-4508. |
| 107 | 3.752.23.BB bona fide loans | C | CO-3362 in CO-3913. |
| 108 | 3.752.23.CC SCSEP funds at 55 or older | C | CO-4504, CO-4510 (`>=` 55) in CO-3925. |
| 109 | 3.752.23.DD PASS income, earned | C | CO-4618 in CO-1002, once over wages and self-employment, not below zero. |
| 110 | 3.752.23.DD PASS income, unearned | C / **F3-1** | CO-3825 in CO-4511; lost when the set-aside is Social Security income. |
| 111 | 3.752.23.EE lump-sum tax refunds, rebates, credits | C | CO-3365 in CO-3913. |
| 112 | 3.752.23.EE retroactive lump-sum SS, SSI, PA | C | CO-4067, CO-4068 in CO-4069. |
| 113 | 3.752.23.FF Colorado Works supportive services | C | CO-4452 in CO-4511. |
| 114 | 3.752.23.GG liquidation of personal resources | C | CO-4507 in CO-4069. |
| 115 | 3.752.23.HH employer health insurance subsidies to the employee | C | CO-4505 in CO-3925. |
| 116 | 3.752.24 no resource test | C | No LEAP item reads a resource. |
| 117 | 3.752.25.A intro: vulnerable = responsible for heating costs | C | CO-876 in CO-1004. |
| 118 | 3.752.25.A.1 pays a vendor directly | C | CO-876 (`pays_vendor_directly`). |
| 119 | 3.752.25.A.2 non-subsidized, heat in rent or separate charge | C | CO-876 (`included_in_rent` and not subsidized; `separate_charge_from_landlord`). |
| 120 | 3.752.25.A.3 subsidized with an individual meter or a heating surcharge | C | CO-876 (`billed_by_landlord_on_usage`, `separate_charge_from_landlord`). |
| 121 | 3.752.25.A.4 more than one household, contributing toward expenses | C | CO-876 third arm (CO-1274 > 1). |
| 122 | 3.752.25.A.5 traditional dwelling | C | CO-2815 in CO-1004. |
| 123 | 3.752.25.A.6 shared primary fuel: EHHC divided by the parties | C | CO-1274 in CO-1280. |
| 124 | 3.752.25.B.1 institutional group care | C | CO-1283 `institutional_group_care`. |
| 125 | 3.752.25.B.2 room and board, bed and breakfast | C | CO-1283. |
| 126 | 3.752.25.B.3 correctional facilities | C | CO-1283. |
| 127 | 3.752.25.B.4 dormitory, fraternity, sorority | C | CO-1283 (`educational_or_vocational_institution`). |
| 128 | 3.752.25.B.5 subsidized without a heat meter or surcharge evidence | C | CO-1283, CO-876. |
| 129 | 3.752.25.B.6 considered homeless or non-traditional dwelling | C / OQ | CO-2815 (OQ-561; the N-4 hotel branch is checked: `otherwise false` guards, no cycle). |
| 130 | 3.752.25.B.7 commercial accounts or properties | C | CO-1283. |
| 131 | 3.752.25.B.8 hotels without thirty days and heat in rent | C / OQ | CO-1283 (`>=` 30 days, CO-3342), OQ-610. |
| 132 | 3.752.25.C landlords not vulnerable unless a household | C | Only the applicant household's own facts are read. |
| 133 | 3.752.25.D vulnerability verified | C | CO-1456, CO-1692. |
| 134 | 3.752.26 mandatory weatherization; refusal denies next year | C | CO-3928 in CO-1007. |
| 135 | 3.752.26.A exemptions (health; landlord refuses) | C | No hold is stated for an exempt household (CO-3928 precision). |
| 136 | 3.752.26.B.1-3 hold; moved to a weatherized address; reapply | C | CO-3928 (one value for the address's hold). |
| 137 | 3.752.26.C state weatherization office duties | N/A | Administration. |
| 138 | 3.752.27 CIP inspection; A exemptions; B refusal and hold | C | CO-3928. |
| 139 | 3.752.27.C contractor duties | N/A | Administration. |
| 140 | 3.753.1 citizens A-C | C | `is_us_citizen_or_national` in CO-1010. |
| 141 | 3.753.11 citizenship verification documents | C | CO-1691 (Appendix A document or electronic match). |
| 142 | 3.753.111 questionable citizenship | C | CO-1457 (`citizenship_attestation_is_questionable`). |
| 143 | 3.753.13 legal immigrant | C | CO-002 categories in CO-1010. |
| 144 | 3.753.14 immigrant documents A-G | C | Verification through SAVE (row 145). |
| 145 | 3.753.15 SAVE verification | C / OQ | CO-1694 (`immigration_status_verified_by_electronic_data_source`); OQ-550. |
| 146 | 3.753.16.A-L qualified aliens | C / OQ | CO-1010 (OQ-550 for parolees). |
| 147 | 3.753.17.A-D not eligible (no status, voluntary departure, applying, temporary visas) | C | CO-1010 (not on its list); A through CO-1694. |
| 148 | 3.753.18 non-qualifying member excluded, income counted; no denial if another member qualifies | C | CO-1000 vs CO-1009; CO-1005. |
| 149 | 3.753.21 Colorado resident at application; intent to remain | C | CO-505 in CO-1007 (at the application month). |
| 150 | 3.753.22 resides at the address applied for | N/A | County case action (CO-1007 precision, 3.754.1.Q). |
| 151 | 3.754 intro: refusal to furnish information, collateral, cooperation, moved, third-party refusal | N/A | County case actions; verification status CO-1462. |
| 152 | 3.754.1.A excess income | C | CO-1003. |
| 153 | 3.754.1.B not vulnerable | C | CO-1004. |
| 154 | 3.754.1.C not a citizen or qualified alien | C | CO-1005. |
| 155 | 3.754.1.D duplicate household | C | CO-2100. |
| 156 | 3.754.1.E withdrawn | N/A | Case action. |
| 157 | 3.754.1.F benefits from another county | C | CO-3930. |
| 158 | 3.754.1.G, V incomplete application or verification | C / N/A | CO-1462 `past_due`; the denial is the county's action. |
| 159 | 3.754.1.H not a Colorado resident | C | CO-505. |
| 160 | 3.754.1.I unsigned | N/A | Case action. |
| 161 | 3.754.1.J outside the application period | C | CO-4516, CO-1007. |
| 162 | 3.754.1.K unable to locate | N/A | Case action. |
| 163 | 3.754.1.L, T refused weatherization or CIP inspection | C | CO-3928. |
| 164 | 3.754.1.M-O identification, affidavit (3.753.12.B.2, not in this rule) | N/A | Documentation procedure; the cited section is not in 9 CCR 2503-7. |
| 165 | 3.754.1.P non-traditional dwelling | C | CO-2815. |
| 166 | 3.754.1.Q not at the address applied for | N/A | Case action. |
| 167 | 3.754.1.R primary heating fuel for the primary heating source | C | CO-877 in CO-1007. |
| 168 | 3.754.1.S refused a bulk delivery | N/A | Payment-stage forfeiture. |
| 169 | 3.754.1.U fraud conviction | C | CO-3929. |
| 170 | 3.754.1.W homeless | C | CO-2815 (OQ-561). |
| 171 | 3.754.11-3.754.12 reason and notice of denial | N/A | Notice. |
| 172 | 3.755.11 income, EHHC and vulnerability verified; prior-year copy | C / N/A | CO-1455, CO-4526, CO-1456; the copy is case procedure. |
| 173 | 3.755.12 conflicting information | N/A | Procedure; the facts as corrected are what a case states. |
| 174 | 3.755.13-3.755.17 case record, written policy, storage, removal, archiving | N/A | Administration. |
| 175 | 3.755.21.A unearned income in writing; not bank deposits | C | CO-4526, CO-2591 (`unearned_income_is_verified`). |
| 176 | 3.755.21.B.1-3 child support via ACSES, FSR, copies or affidavits | C | CO-2591. |
| 177 | 3.755.21.B.4 domestic violence: declaration suffices | C | CO-4525 in CO-4526. |
| 178 | 3.755.21.C Social Security award letter or CBMS | C | CO-2591. |
| 179 | 3.755.21.D earned income: four of eight weeks of stubs | C | CO-1455, CO-1689. |
| 180 | 3.755.21.E public assistance via county records | C | CO-2591. |
| 181 | 3.755.21.F other income via county records | C | CO-2591. |
| 182 | 3.755.21.G collateral contact | C | The verified facts are "verified", however obtained. |
| 183 | 3.755.21.H zero income: DOLE plus one method | C | CO-1693 (CO-1565 `zero_income_verified`), adult members only. |
| 184 | 3.755.21.I.1 (D-173) declaration of gross income in the full month prior | C / OQ | CO-1002 reads CO-1712 at `month_before`; no document required (CO-1455 meaning); OQ-681. |
| 185 | 3.755.21.I.2 receipts required for deductions; a rent or mortgage, b personal utilities; c fuel and mileage at the county rate; D rental property maintenance only | C / OQ | CO-1711 (CO-3927 gate; precision on rental property); mileage OQ-614. |
| 186 | 3.755.21.I.3 credit card and bank statements not receipts | C | CO-1711 precision. |
| 187 | 3.755.21.J (D-173) LLC and S-corporation owners: wages; personal expenses and draws are gross earned income | C / OQ | CO-1712 precision (state them as wages); the full prior month is noted in OQ-681 (first-pass C-16). |
| 188 | 3.755.21.K gift income verified by declaration | C | CO-4524 in CO-4526. |
| 189 | 3.755.41 evidence of vulnerability (bill, collateral, rent receipt, prior year) | C | CO-1692 (`heating_costs_verification_document_received`). |
| 190 | 3.755.42 subsidized housing surcharge documentation | C | CO-1692; the surcharge itself CO-876. |
| 191 | 3.755.43-3.755.45 wood permits, wood and bulk fuel receipts, propane receipts | C / N/A | One document-received fact (CO-1342); content checks are evidence procedure (colorado-notes, first-pass C-17). |
| 192 | 3.755.51 EHHC verified from the approved vendor | C | CO-1692. |
| 193 | 3.755.6 other factors may be verified | N/A | Discretionary. |
| 194 | 3.756.11 completed application; no interview | N/A | Procedure. |
| 195 | 3.756.12.A date stamp | N/A | Procedure; the stamped date is CO-2122. |
| 196 | 3.756.12.B (D-173) emergency screening; pending timelines; June 19 | N/A | Processing timelines. |
| 197 | 3.756.12.C duplicate review; incomplete notice | C / N/A | Duplicate: CO-2100; the notice date is CO-2121. |
| 198 | 3.756.12.D two calendar weeks from the notice; good-cause extension of up to two weeks | C | CO-1461 (CO-1355 14, CO-2123, CO-2124 14). |
| 199 | 3.756.12.D reopen when verification arrives after denial, by June 15 | C | CO-1462 precision (status read from the facts as they stand). |
| 200 | 3.756.13 lost applications | N/A | Procedure. |
| 201 | 3.756.14 thirty days to determine; emergency eighteen days; no denial before day fifteen | N/A | Processing timelines. |
| 202 | 3.756.15 notification | N/A | Notice. |
| 203 | 3.756.16 county of residence; forwarding | N/A | County administration. |
| 204 | 3.756.17 relocation: the original county pays; a new application denied | C | CO-3930. |
| 205 | 3.756.18 withdrawn; 3.756.19 unlocated | N/A | Case actions. |
| 206 | 3.756.2 A-C advance payment conditions | N/A | Payment timing; not eligibility or amount. |
| 207 | 3.757.11-3.757.12 reporting and correction | N/A | Administration. |
| 208 | 3.758.31 payee on separation or divorce | N/A | Payee choice. |
| 209 | 3.758.32 death of payee | N/A | Payment. |
| 210 | 3.758.41 vendor or direct payment; never to a landlord | N/A | Payment routing. |
| 211 | 3.758.46 vendor payment procedures | N/A | Payment procedure. |
| 212 | 3.758.47 Step A.1 EHHC: prior season November-April actual costs of the primary fuel | C | CO-1271. |
| 213 | 3.758.47 Step A.2-3 flat rates; standard rates for heat in rent | C / OQ | CO-1271 meaning; tables OQ-532. |
| 214 | 3.758.47 Step B statewide adjustment | C / OQ | CO-1272 in CO-1281 (OQ-532, OQ-253). |
| 215 | 3.758.47 Step C electric heat portion 62/48/43/50% | C | CO-3001, CO-1273 in CO-1280. |
| 216 | 3.758.47 Step D 0-75% 0; 75.01-125% 10; 125.01-175% 20; 175.01+% 30 | C / OQ | CO-3000 (inclusive upper bounds 0.75, 1.25, 1.75), CO-1278, CO-1279 at the application month (OQ-253). |
| 217 | 3.758.47 Step E divided by the number of separate households, eligible or not | C | CO-1274 in CO-1280. |
| 218 | 3.758.47 Step F $30 a month or $180 a season for subsidized housing | C / OQ | CO-1282 (180) in CO-1281 (order OQ-253). |
| 219 | 3.758.47 Step G subtract B-F; at least the minimum, up to and including the maximum | C / OQ | CO-1281 (`max` min, `min` max; CO-1276, CO-1277 OQ-532). |
| 220 | 3.758.48 advance notice; no appeal; year-to-year variation | N/A | Administration. |
| 221 | 3.758.49 forfeiture of unclaimed benefit | N/A | Payment. |
| 222 | 3.759.11-3.759.41 outreach, plans, reporting, weatherization referral | N/A | County outreach. |

LEAP rows: **222**. F3-1 affects row 110; F3-2 affects rows 92 and 106.

### 3.2 SUN Bucks: 7 CFR part 292 (D-88, D-117), 7 CFR 245.6 (D-250), Colorado texts (D-141, D-142, D-143)

| # | Paragraph | Status | Carried by / reason |
|---|---|---|---|
| 1 | 292.1 purpose and scope | N/A | Scope. |
| 2 | 292.2 Adult (18 or older) | C | CO-3933 (18) in CO-2708, CO-1699. |
| 3 | 292.2 Categorically eligible: a child in the household receiving SNAP, TANF | C | CO-2708 (every month of the period up to the month evaluated; TANF from CO-013 and the month's CO-029). |
| 4 | 292.2 Categorically eligible: FDPIR or another approved program | C / OQ | CO-4528 (CO-2851, CO-4852, CO-2852) in CO-1296; OQ-255. |
| 5 | 292.2 Categorically eligible: foster, homeless, migrant, Head Start, runaway (245.2) | C | CO-4527 (CO-2813, CO-4851, foster role, CO-2847, CO-2853, CO-2848, CO-2849), CO-2850 in CO-1296; **F3-6** (P3). |
| 6 | 292.2 Current income (the month before application; projected annual) | C | CO-1295 (the application's reported figure). |
| 7 | 292.2 Direct verification | C | CO-1591 in CO-1695. |
| 8 | 292.2 Eligible child; Eligible household | C | CO-1298. |
| 9 | 292.2 Enrolled students | C | CO-1293. |
| 10 | 292.2 Household: related or unrelated, one economic unit, not in an institution or boarding house | C | `lives_as_one_economic_unit_with` in CO-4523, CO-2708 (OQ-552 resolved); a case states no unit for institution residents. |
| 11 | 292.2 Income eligibility guidelines | C | CO-1297, CO-1291. |
| 12 | 292.2 Instructional year (July 1 of the prior year to the day before the operational period) | C / OQ | CO-3014; the period's end OQ-535. |
| 13 | 292.2 Period of eligibility | C / OQ | CO-2581, CO-2708, CO-4527, CO-4528; **F3-5** (P3); OQ-535. |
| 14 | 292.2 School aged (compulsory education age) | C | CO-1292 (C.R.S. 22-33-104(1)(a)). |
| 15 | 292.2 Streamlined certification | C | CO-1633 (no enrollment confirmation). |
| 16 | 292.2 Summer operational period | OQ | OQ-535 (POM). |
| 17 | 292.2 other definitions (APD, EBT, expungement, ITO, SFA and the like) | N/A | Administration vocabulary. |
| 18 | 292.5(a) NSLP/SBP standards: income eligible or categorically eligible | C | CO-1298 (two eligible branches). |
| 19 | 292.5(b) guidelines change July 1; those in effect on the application date | C | CO-1297 (CO-4855 when stated, else the determination date; `latest_month_of_year` July). |
| 20 | 292.6 intro: at any time during the period of eligibility | C | CO-2708 (`some_month`), CO-4527, CO-4528, CO-2848-CO-2852 meanings. |
| 21 | 292.6(a) school aged and categorically eligible | C | CO-1298 (`any` school aged, enrolled). |
| 22 | 292.6(b)(1) enrolled (non-special-provision) and categorically eligible | C | CO-1298. |
| 23 | 292.6(b)(2) enrolled and income eligible through an NSLP/SBP application | C | CO-1298 (`<=` CO-1297). |
| 24 | 292.6(b)(3) otherwise determined eligible for a free or reduced price meal | C | CO-4071 in CO-1296 (carryover excluded). |
| 25 | 292.6(b)(4) eligible through a Summer EBT application | C | CO-1298 income branch with CO-1633. |
| 26 | 292.6(c)(1)-(3) special provision school: categorical, NSLP application, Summer EBT application | C | CO-1298 (same branches; OQ-255 settled that special provision schools need no separate item). |
| 27 | 292.7(a) eligibility may be established from the instructional year through the operational period | C / OQ | CO-2581, CO-2708 (OQ-535). |
| 28 | 292.7(b) no change reporting | C | Receipt earlier in the period is kept (CO-2708, CO-4527, CO-4528). |
| 29 | 292.7(c) school-meal carryover cannot confer eligibility | C | CO-4071 meaning. |
| 30 | 292.12(a) informational requirements | N/A | Notice. |
| 31 | 292.12(b)(1), (2), (4) procedures, contact updates, assistance | N/A | Administration. |
| 32 | 292.12(b)(3) opt out | C | CO-4522 in CO-1299. |
| 33 | 292.12(c) enrollment database | N/A | Administration; the enrollment it confirms is CO-1593. |
| 34 | 292.12(d)(1)(i)(A) individually certified for free or reduced price meals | C | CO-4071 in CO-1296. |
| 35 | 292.12(d)(1)(i)(B)(1) school aged and SNAP household | C | CO-2708, CO-1292 in CO-1298. |
| 36 | 292.12(d)(1)(i)(B)(2) school aged and FDPIR or TANF household | C | CO-4528, CO-2708. |
| 37 | 292.12(d)(1)(i)(B)(3) school aged and foster, homeless, migrant, runaway, Head Start | C | CO-4527, CO-2850. |
| 38 | 292.12(d)(1)(ii) otherwise determined eligible through NSLP/SBP | C | CO-4071, CO-1298 income branch. |
| 39 | 292.12(d)(2) other means-tested programs (optional) | OQ | CO-2852; OQ-255. |
| 40 | 292.12(d)(3) no enrollment confirmation for streamlined certification | C | CO-1633 (only when no categorical ground). |
| 41 | 292.12(d)(4) ITO waivers | N/A | ITOs only. |
| 42 | 292.12(e)(1) complete application: names, income, adult signature | C / N/A | Income branch of CO-1298; completeness is application procedure. |
| 43 | 292.12(e)(2) confirm enrollment in the preceding instructional year before issuance | C | CO-1633, CO-1696 (CO-1593) → CO-1698 → CO-1299; **F3-4** (P3). |
| 44 | 292.12(e)(3) not in an NSLP/SBP school: cannot be certified by application | C | CO-1298 income branch requires CO-1293. |
| 45 | 292.12(e)(4) no income documentation at application | N/A | Procedure. |
| 46 | 292.12(f)(1)-(2) notices of approval | N/A | Notice. |
| 47 | 292.12(f)(3) households declining: not issued | C | CO-4522 in CO-1299. |
| 48 | 292.12(f)(4) duplicate issuance notice | C | CO-4521 in CO-1299. |
| 49 | 292.12(g)-(i) denial notice, appeals, confidentiality | N/A | Notice and hearing. |
| 50 | 292.13(a)-(f) statewide application, contracting, content, communications, availability, follow-up | N/A | Application administration. |
| 51 | 292.13(g) apply by the last day of the operational period; later applications for the next summer | C / OQ | CO-2581 (OQ-535). |
| 52 | 292.13(h)-(m) electronic applications, content, attestation, race, instructions, statements | N/A | Application content. |
| 53 | 292.13(n) total current income at or below the guidelines: approve | C | CO-1298 (`<=`). |
| 54 | 292.13(o)-(p) access to and disclosure of eligibility information | N/A | Confidentiality. |
| 55 | 292.14(a)(1)(i)-(v) verification for cause | C | CO-4073, CO-1590 in CO-1699, CO-1299. |
| 56 | 292.14(a)(2) three percent sample | C | CO-1590 (selection is the agency's). |
| 57 | 292.14(a)(3), (b), (c) alternatives, replacement, rolling samples | N/A | Agency sampling procedure. |
| 58 | 292.14(d) after April 1, for cause only | C / N/A | CO-4073; sampling dates are agency procedure. |
| 59 | 292.14(e)(1)-(3) direct verification first; any point in the period; POM sources | C / OQ | CO-1591 in CO-1695; period reading as row 20; sources OQ-255. |
| 60 | 292.14(f)(1) exceptions: all children SNAP/FDPIR/TANF/approved program, or all foster/homeless/migrant/runaway | C | CO-1699 (two "all" clauses, CO-4528, CO-4527; SNAP/TANF through CO-2708). |
| 61 | 292.14(f)(2)(i)-(iii) notification; deadline; alternatives | N/A / OQ | Notice; the deadline OQ-377. |
| 62 | 292.14(f)(2)(iv) failure to cooperate terminates benefits | C | CO-4854 in CO-1298, CO-1299; **F3-3** (P3). |
| 63 | 292.14(f)(3)(i)-(iv) sources of information | C | CO-1592, CO-1591 (verified, however obtained). |
| 64 | 292.14(f)(3)(ii) refusal to choose a collateral option: terminated | C | CO-4854. |
| 65 | 292.14(f)(4) documentation of income; any point in the period | C | CO-1592 in CO-1695. |
| 66 | 292.14(f)(5) refusal to cooperate: eligibility terminated | C | CO-4854 → CO-1298 `ineligible`, CO-1299 0 (for cause included); **F3-3**. |
| 67 | 292.14(f)(6)-(7) telephone assistance; two follow-up attempts | N/A / OQ | Procedure; no past-due state (OQ-377). |
| 68 | 292.14(f)(8) eligibility changes after verification | C | The verified facts restate income; CO-1298 recomputes. |
| 69 | 292.14(f)(9) no issuance while selected and pending, except for cause | C | CO-1299; **F3-4**. |
| 70 | 292.14(f)(10) continuous school calendars | N/A | USDA-approved plan (POM). |
| 71 | 292.14(f)(11) questionable after issuance: no further issuance until verified | C | CO-1299 precision (issuance action). |
| 72 | 292.14(f)(12) nondiscrimination | N/A | Procedure. |
| 73 | 292.15(a) benefits for use in the operational period | N/A / OQ | Timing (OQ-535). |
| 74 | 292.15(b) continuous calendars | N/A | POM. |
| 75 | 292.15(c)(1)(i)(A)-(B), (ii) issuance timing; corrective action | N/A | Issuance administration. |
| 76 | 292.15(c)(1)(iii) only a full three months | C | CO-3013 (3) in CO-1299. |
| 77 | 292.15(c)(1)(iv) selected applications not issued until verified | C | CO-1299. |
| 78 | 292.15(c)(1)(v), (c)(2) households without a fixed address; method of issuance | N/A | Issuance administration. |
| 79 | 292.15(d)(1) no dual participation | C | CO-4521 in CO-1299. |
| 80 | 292.15(d)(2) detection procedures | N/A | Administration. |
| 81 | 292.15(e)(1), (3) $40 in 2024, TFP adjusted, rounded down, calendar-year rates | C | CO-1244 (2024-2026 $40; 2027 unpublished, unknown). |
| 82 | 292.15(e)(2) Alaska, Hawaii and territories | N/A | Not Colorado. |
| 83 | 292.15(e)(4) no proration; full three months | C | CO-1299 (monthly level × CO-3013). |
| 84 | 292.15(f)(1)-(2) allotments; full amount whatever the application date | C | CO-1299 precision. |
| 85 | 292.15(g)-(i) training, cards, adjustments, replacements, expungement | N/A | Issuance administration. |
| 86 | 292.16(a)-(d) issuance systems, disclosure, administration, Alaska | N/A | Administration. |
| 87 | 292.16(e) IPV disqualification of individuals 18 or over | N/A | Adults are not participants; a child's eligibility is not affected by an adult's disqualification. |
| 88 | 292.16(f) restoration of lost benefits | N/A | Issuance remedy. |
| 89 | 245.6(a)(1)-(9) application content and statements | N/A | Application content. |
| 90 | 245.6(b)(1)-(6) direct certification with SNAP, FDPIR, TANF; frequency; documentation; officials | C / N/A | The certification's result is CO-4071; the receipt itself CO-2708, CO-4528; the matching procedure is administration. |
| 91 | 245.6(b)(7) one SNAP/FDPIR/TANF child extends eligibility to all children in the family | C | CO-2708 (any child of the unit); FDPIR through CO-2851's household meaning. |
| 92 | 245.6(b)(8) foster, homeless, migrant, runaway, Head Start: individual eligibility | C | CO-4527, CO-2850 (per child). |
| 93 | 245.6(b)(9)-(10) confidentiality; no notice required | N/A | Procedure. |
| 94 | 245.6(c)(1) duration of eligibility | C | CO-4071 (certified during the period). |
| 95 | 245.6(c)(2) prior year's status (carryover) | C | CO-4071 excludes it (292.7(c)). |
| 96 | 245.6(c)(3) voluntary reporting; changes from verification | C | Row 28; row 68. |
| 97 | 245.6(c)(4) calculating income | C | CO-1295 in CO-1298 (292.13(n)). |
| 98 | 245.6(c)(5) categorical eligibility on documentation | C | CO-2708, CO-1296. |
| 99 | 245.6(c)(6)-(8), (d)-(k) notices, denials, appeals, failure to apply, records, disclosure, penalties | N/A | Procedure and confidentiality. |
| 100 | C.R.S. 26-2-309(1)-(3) declaration, definitions, program creation | N/A | Authority. |
| 101 | 26-2-309(4)(a)(I) eligibility criteria consistent with federal law | C | The 292 items above; no Colorado rule (D-143, OQ-255). |
| 102 | 26-2-309(4)(a)(II)-(VI), (b) recovery, outreach, rules | N/A | Administration. |
| 103 | 26-2-309(4)(c)(I)-(II) data sharing | N/A | Administration. |
| 104 | 26-2-309(4)(c)(III) opt-out process | C | CO-4522. |
| 105 | 26-2-309(5)-(8) data, compliance, procurement, appropriations | N/A | Administration. |
| 106 | C.R.S. 22-33-104(1)(a) six on or before August 1, under seventeen | C | CO-1292 (CO-2605 August, `>=` 6, `<` 17). |
| 107 | D-143 no Colorado Summer EBT rule | OQ | OQ-255 (the POM). |

SUN Bucks rows: **107**. Total rows: **329**. GAP rows: none outright; F3-1 and F3-2 are partial-carry mismatches on rows 92, 106 and 110.

## 4. Open-question confirmations

| OQ | Class recorded | Confirmed? | Note |
|---|---|---|---|
| OQ-253 Step B/D/F order; poverty guideline year | state policy choice | Yes | 3.758.47 Steps B-G give no order; "Federal Poverty Level" names no year (D-86, D-173 read). |
| OQ-532 program-year rate, minimum, maximum, flat rates | blocked on a named document | Yes | D-86 and D-173 state none; the named notification and training manual are on cdhs.colorado.gov, not an allowed host. A fresh Firecrawl search could not run (credits exhausted); fns.usda.gov's Summer EBT page, fetched directly, carries no Colorado plan text. |
| OQ-561 "considered homeless" | state policy choice | Yes | 3.752.25.B.6 is undefined; the Assumption now weighs B.8, and CO-2815 follows it. |
| OQ-610 "has lived or will live" | state policy choice | Yes | The wording admits both readings. |
| OQ-614 county mileage rate | blocked on a named document | Yes | County policy, on no allowed host. |
| OQ-681 IVP, four of eight weeks, self-employment month | state policy choice | Yes | 3.751.1, 3.752.22, 3.755.21.I.1 as amended read; each Assumption is a reading of the State's own words. |
| OQ-714 another member's fraud penalty | state policy choice | Yes | 3.751.563 against 3.754.1.U. |
| OQ-800 public assistance households | state policy choice | Yes | 3.752.1's list against 3.751.1 "Public Assistance Income". |
| OQ-801 foster or kinship child membership | state policy choice | Yes | 3.752.23.U against 3.751.2.D.2. |
| OQ-863 resettlement grant and the Interim Cash Payment | state policy choice | Yes | AA names one grant "under the refugee admissions program"; neither the LEAP rule nor D-173 mentions the State program. Its Assumption ("a grant ... stated both as the month's receipt and as a lump sum ... is excluded once") holds only when CO-4508 is stated (F3-2). |
| OQ-122 income table | resolved | Yes | CO-875's 2026-27 table; D-173 moves D to FFY 2026. |
| OQ-550 immigration status mapping | blocked on a named document | Yes | The SAVE list is not on an allowed host. |
| OQ-255 optional categorical sources | blocked on a named document | Yes | No Colorado rule (D-143); C.R.S. 26-2-309(4)(a)(I) defers to federal law; the POM is not on an allowed host. |
| OQ-377 verification response period | blocked on a named document | Yes | 292.14(f)(2)(i) leaves the date to the agency (POM); refusal is now CO-4854. |
| OQ-535 summer operational period | blocked on a named document | Yes | 292.2 leaves it to the agency's POM. |

No open question in the family is misclassified.

## 5. Earlier P1s

| Earlier P1 | Still fixed? | Evidence |
|---|---|---|
| C-1 3.752.23 exclusions (coverage pass 1) | Yes, with F3-1 and F3-2 as residues of the class | CO-4511, CO-4069 and CO-3925 subtractions present; case CO-175 passes (`leap_household_income` 1,000, eligible). |
| C-2 eviction notice not homelessness | Yes | CO-2815 has no `imminently_losing_residence`; case CO-179 passes. |
| C-3 public assistance households before November 1 | Yes | CO-4517, CO-4518 in CO-1007; case CO-176 passes. |
| C-4 postmark and April 30 extension | Yes | CO-4512 to CO-4516; case CO-177 passes; CO-4513 rows checked against the calendar. |
| C-5 earned-income verification trigger | Yes | CO-1455 reads CO-3925 with CO-1002's child condition; tests T4, T5 pass. |
| C-6 categorical receipt at any time in the period | Yes | CO-2708 `some_month`; case CO-178 passes. |
| N-1 FF and W (coverage pass 2) | Yes | CO-4452, CO-4850 in CO-4511; case CO-209 passes (3,500, eligible). |
| N-2 earned PASS | Yes | CO-4618 in CO-1002, once, not below zero; case CO-210 passes (3,500, eligible). No regression: CO-1712 is never negative, so the new `max(0, …)` cannot hide a loss that was offset before. |
| N-3 TANF by month and the 245.2 grounds at any time in the period | Yes | CO-2708-T10, CO-4527-T3 to T5, CO-4528-T3 pass; case CO-211 passes. CO-029's meaning ("a child's share on the child") supports reading the child's own monthly amount. |

## Probe households (scratch copy only)

Each probe has one adult (born 1980) in Colorado who pays a vendor for heat, applies on 2026-11-10 and has no pay schedule stated. Evaluated for 2026-11; the limit for 1 is $3,774.

- PR3-L1: wages 2,000; `social_security_income` 2,000 (own disability); `pass_set_aside_income` 400. Engine: CO-4511 400, CO-3926 2,000, CO-1002 4,000, ineligible. Rule: 3,600, eligible.
- PR3-L2: wages 3,000; `other_unearned_income_nontaxable` 3,000 = `crime_victim_compensation_received` 3,000 = `lump_sum_received` 3,000; `lump_sum_received_prior_thirty_days` 3,000. Engine: CO-3913 0, CO-4511 3,000, CO-4069 3,000, CO-1002 6,000, ineligible. Rule: 3,000, eligible.
- PR3-L3: as PR3-L2 with wages 2,500 and child support 900. Engine: CO-3913 900, CO-3926 3,000 (child support consumed, compensation counted), CO-1002 5,500. Rule: 3,400.
- PR3-L4: wages 3,000; `other_unearned_income_nontaxable` 900 = `refugee_resettlement_payments_received` 900 = `lump_sum_received` 900; `lump_sum_received_prior_thirty_days` 900; no CO-4508. Engine: CO-1002 3,900, ineligible. Rule (OQ-863 Assumption): 3,000, eligible.

# Coverage-matrix review: LEAP and SUN Bucks (family `coverage-leap-sunbucks`), HEAD 5fc915b

Texts read in full from `volumes/co/documents/`:

- LEAP: 9 CCR 2503-7, version effective 2025-11-01 (D-86), with the amendments effective 2026-11-01 (D-173: 3.752.211.J, 3.752.22.D, 3.755.21.I.1 and J, 3.756.12.B).
- SUN Bucks: 7 CFR 292.1, 292.2, 292.5-292.7, 292.12, 292.13, 292.15, 292.16 (D-88); 292.14 (D-117); 7 CFR 245.6 (D-250); the Colorado text in the volume: C.R.S. 26-2-309 (D-142), C.R.S. 22-33-104(1)(a) (D-141, S1403) and the SOS rule lists showing no Summer EBT rule (D-143).

Method: ledger exported from a scratch copy of HEAD (`git archive`, 1,887 items; `conformance/co/ledger.json`). Every LEAP item (66) and SUN Bucks item (31) was read with its derivation, and so were the shared facts and derived items they read (CO-3910 to CO-3913, CO-3366, CO-3367, CO-3813, CO-3820, CO-3825, CO-2810, CO-1361 and others). Suspected wrong answers were confirmed with scratch households in the copy's `tests/cases.yaml`, using `npx vite-node scripts/eval-case.ts co <case> <identifiers> <month>`. The probe households are listed after the findings. Nothing was written to the repository except this file.

## 1. Verdict

**6 P1 found** (5 LEAP, 1 SUN Bucks). There are also 8 P2 and 8 P3 findings.

The largest is C-1. When `leap_excluded_income` (CO-2345) was retired in the final-pass fix round, LEAP lost every 3.752.23 exclusion that the shared thirty-day figure does not subtract. Colorado crime-victim compensation, reverse-mortgage payments and PASS income now count, even though the volume has a neutral fact for each. OQ-390's resolution still names CO-2345.

## 2. Findings

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| C-1 | **P1** | 9 CCR 2503-7 3.752.23 (G, U, V, X, Y, Z, AA, CC, DD, GG, HH); 3.752.211.D; 3.752.21.C-D | CO-3926 `leap_person_unearned_income`, CO-3913 `unearned_income_prior_thirty_days`, CO-1002; retired CO-2345; OQ-390 | 3.752.23: "the following shall be exempt from consideration as either resources or income ... G. Compensation received ... pursuant to the Colorado Crime Victims Compensation Act shall not be considered as income ... X. Reverse mortgages; ... DD. Income that is deemed necessary for the fulfillment of a Plan for Achieving Self-Support (PASS)". 3.752.211.D: workers' compensation "amounts included in such awards for medical, legal, or related expenses ... are deducted". | CO-3913 subtracts only seven receipt types: educational assistance, loans, reimbursements, energy assistance, tax refunds, federally excluded payments and lump sums. When a case states the thirty-day fact CO-3911, nothing is subtracted beyond what that fact already leaves out. LEAP has no input of its own since CO-2345 was retired ("whose receipts the thirty-day figure now leaves out", colorado-notes, final-pass fix track), which holds only for those seven. The neutral facts `crime_victim_compensation_received` (CO-3813), `reverse_mortgage_payments_received` (CO-3820) and `pass_set_aside_income` (CO-3825) are part of `other_unearned_income_*` and are read only by Adult Financial and Colorado Works. There is no fact, and so no exclusion, for U (foster care or kinship payments), Y (subsidized-housing utility allowances), AA (the refugee resettlement grant), CC (SCSEP funds), GG (liquidated resources), HH (employer health-insurance subsidies), Z's housing and food allowances, or the 211.D and 21.C-D netting. **RV-L1**: one adult, $1,000 wages plus $3,000 crime-victim compensation, application 2026-11-10. The engine gives `leap_household_income` 4000 and `leap_income_within_limit` false against $3,774 for 1, so `leap_is_eligible` is false. The rule gives $1,000 and an eligible household (control RV-L0: true). OQ-390's resolution paragraph still says LEAP's list is carried by CO-2345 "in leap_household_income CO-1002". | Give LEAP its own excluded-unearned input again (`leap_excluded_unearned_income`, read as 0), or have CO-3926 subtract CO-3813, CO-3820 and CO-3825 (with thirty-day versions, or a stated rule that they are part of CO-3911). Add neutral facts, or the LEAP input, for U, Y, AA, CC, GG, HH and the 211.D/21.C-D netting. Correct OQ-390's LEAP sentence. Add a CO-1002 test with crime-victim compensation. |
| C-2 | **P1** | 3.752.25.B.6; 3.751.1 "Emergency Applicant"; 3.756.2.C | CO-2815 `leap_is_homeless_or_in_non_traditional_dwelling` → CO-1004 → CO-1007; OQ-561 | 3.751.1: "'Emergency Applicant': ... the client is responsible for heating costs that are included in rent and has received an eviction notice to vacate the premises within thirty (30) calendar days." 3.756.2.C: advance payment "for households where heat is included in rent, an eviction notice ..." | CO-2815's derivation includes `imminently_losing_residence` ("such a home the person will imminently lose", CO-2810). That contradicts CO-2815's own meaning ("no fixed and regular nighttime residence of the household's own, ..."), OQ-561's stated Assumption (which does not list it), and the rule, which serves a household facing eviction as an emergency applicant. **RV-L2**: heat included in rent (non-subsidized), `nighttime_residence_type: imminently_losing_residence`. The engine gives `leap_is_homeless_or_in_non_traditional_dwelling` true, `leap_is_vulnerable_to_heating_cost` false and `leap_is_eligible` false. The same household in `fixed_regular_adequate` (RV-L0) is eligible. | Drop `imminently_losing_residence` from CO-2815. If the owner wants it, record it in OQ-561 as the choice and align the meaning. Add test CO-2815-T4. |
| C-3 | **P1** | 3.752.1 | CO-1007 `leap_is_eligible`, CO-1006, CO-1008 | "Preference shall be given to application forms received from public assistance households (such as Colorado Works, Old Age Pension (OAP), Aid to the Needy Disabled (AND), Aid to the Blind (AB), and Supplemental Social Security Disability Benefits.) Such applications received prior to November 1st shall be accepted and may be processed; however, eligibility shall not be effective until November 1st." | CO-1007 requires the month's program year to equal the program year of the application month. For an October application, `leap_program_year_start_month` is the previous November (2025-11 for 2026-10), so the household is never eligible in the season the rule makes it effective for. **RV-L3**: Colorado Works recipient (`receives_tanf_cash` true, $500), application 2026-10-20, otherwise as RV-L0. The engine gives `leap_is_eligible` false for 2026-11 and 2026-12. The rule makes the household eligible from November 1. No open question records this. | For a public-assistance household (CO-013, CO-1713 receipt, SSI/SSDI per the parenthetical), read the program year of an application received before November 1 as the season that starts that November. Keep the point-in-time facts at the receipt date, and keep J denying everyone else. Record in an open question whether "Supplemental Social Security Disability Benefits" means SSI, SSDI or both. |
| C-4 | **P1** (narrow) | 3.752.1; 3.751.1 "Eligibility Period" | CO-1008, CO-1007; CO-2122 | 3.752.1: "The county department shall accept all application forms that are received or postmarked during the application period." 3.751.1: "If April 30th ... falls on a holiday or weekend, then the eligibility period shall be extended until midnight the next business day." | `leap_application_date` is the date received (3.751.1 "Date of Application"). A form postmarked by April 30 and received in May, or received on the next business day after a weekend April 30, is in the month of May, so CO-1008 and CO-1007 deny it. CO-1008's precision notes only the weekend extension, as an engine limit, with no open question. The date is a day-level fact the engine can test. **RV-L4**: application received 2027-05-03. The engine gives `leap_is_eligible` false for 2027-04 and 2027-05. Whether the rule accepts it turns on the postmark, which the volume has no fact for. | Add a supplied `leap_application_postmark_date`, read as the receipt date when not stated. Have CO-1007 take the program year from a timely postmark or receipt, with April 30 extended to the next business day (a holiday table or a supplied `leap_application_is_timely`). |
| C-5 | **P1** | 3.755.11; 3.755.21.D; 3.752.23.Q | CO-1455 `leap_requires_verification_of_earned_income` → CO-1689, CO-1458, CO-1459, CO-1462 | 3.755.11: "Income, estimated home heating costs, and vulnerability shall be verified in determining initial eligibility"; 3.752.23.Q excludes "Earned income of children under the age of eighteen (18) who are residing with a parent or guardian". | CO-1455 requires wage verification only when `wages_gross > 0` (the calendar month) and age >= 18. A 15-17-year-old who does not live with a parent or guardian has the wages counted (CO-1002-T6: $500 counted), but no verification is required. A member with wages in the thirty days (job ended: CO-3925 reads `wages_gross_prior_thirty_days`) and none in the month evaluated is not asked either. So `leap_verification_status` can read `complete` or `not_required` while counted income is unverified. | Derive the trigger from what CO-1002 counts: `leap_person_wages > 0`, excluding only a child under 18 with a parent or guardian in the unit (the CO-1002 case condition). Add a test mirroring CO-1002-T6. |
| C-6 | **P1** | 7 CFR 292.6 ("at any time during the period of eligibility"); 292.7(a); 292.14(e)(2), (f)(4) | CO-2708 `sebt_household_child_receives_snap_or_tanf` → CO-1298, CO-1299 | 292.6: "Children eligible for Summer EBT include those who, at any time during the period of eligibility, are: (a) School-aged and categorically eligible." 292.14(e)(2): "The information provided only needs to indicate eligibility at a single point in time during the period of eligibility". | CO-1298's precision says it "tests the facts of the month evaluated". `receives_snap` and `receives_tanf_cash` are month facts, so a child whose household left SNAP during the instructional year is `ineligible` in later months of the same period of eligibility, and the summer benefit is 0. **RV-S1**: mother and 10-year-old (NSLP school, household of 2, $6,000 income, above the $3,337 limit), SNAP through December 2026 and none from January 2027. The engine gives `sebt_eligibility_status` `eligible_categorical` for 2026-09 but `ineligible` with `sebt_benefit_amount` 0 for 2027-03, although both months belong to summer 2027 (`sebt_summer_year` 2027 in each). | Have CO-2708 test whether receipt occurred in any month from the first month of the instructional year (`latest_month_of_year sebt_instructional_year_start_month`) through the month evaluated. Add a CO-1298 test in which receipt has ended. |
| C-7 | P2 | 3.752.23.U; 3.751.2.D.2 | CO-1000, CO-1009 | U: "Payment received as foster care/kinship income; foster care/kinship individuals are not considered LEAP Household members"; D.2: children under 18 living with "the parent or guardian" cannot be a separate household. | CO-1000 crosses `legal_guardian`/`ward` for a child under 18 (SW-4), so a child in kinship guardianship (`child_welfare_payment_type` `*_kinship_guardianship`) joins the household and raises its size, its income limit and its Step D band. U says the child is not a member. The text conflicts with D.2, and no open question records the choice. | Open an open question (state policy choice) for the owner. Pending the answer, consider leaving out a ward whose `child_welfare_payment_type` is kinship or foster. |
| C-8 | P2 | 3.751.2.D.3, E; 3.751.21; 3.751.22 | CO-1000, CO-1009 | "Individuals that enter into civil unions" cannot be separate; a parent "may be listed as a separate household when residing in the same dwelling with his or her ex-spouse in cases of legal separation or divorce." | Final-pass F-18 is still deferred: there is no civil-union role and no legal-separation exception. CO-1000's precision names E as not modeled. There is no open question. | As F-18: add the role and exception, or record an open question. |
| C-9 | P2 | 3.755.21.K; 3.755.21.B.4 | CO-2591, CO-1361 | "K Gift income shall be considered verified with applicant declaration." B.4: in domestic-violence cases "Client declaration shall be sufficient". | CO-2591 requires `unearned_income_is_verified` (electronic source "or by documents") for all countable unearned income, so declared gifts and DV-protected child support stay pending. | A neutral `gift_income_received` part fact, or a LEAP declaration-suffices flag, that CO-2591 honours. |
| C-10 | P2 | 7 CFR 292.15(d)(1); 292.13(j) | CO-1299, CO-1298 | "Dual participation in Summer EBT in the same summer operational period is not allowed." | No fact or item: a child already issued Summer EBT for the summer by another State or ITO is shown the full benefit. | Supplied `sebt_received_benefits_from_another_agency_this_summer` (false when not stated), read by CO-1299. |
| C-11 | P2 | 7 CFR 292.2 "Household"; 292.5(a) | CO-1294, CO-1295 vs `lives_as_one_economic_unit_with` | (F-20) | Final-pass F-20 is still deferred: the household is stated twice, once as a group and once as a count and income. | As F-20. |
| C-12 | P2 | 3.752.22.C.4; 3.752.212 | CO-3925; CO-023 | "In-kind income is income received in exchange for employment and shall be considered as earned income ... the declared value"; military allotments "income in the month received". | `wages_gross` names cash wages only, and CO-1915 holds in-kind hours, not their value. No LEAP item counts in-kind pay. Military allotments are only implicitly in `other_unearned_*`, and no item cites 3.752.212. | Add a neutral `in_kind_compensation_value` fact read by CO-3925. Cite 3.752.212 in CO-3926's meaning. |
| C-14 | P2 | 7 CFR 292.7(c) | CO-4071 | "The carryover period in the school meal programs, as required at § 245.6(c)(1) ... may not be used to confer eligibility for Summer EBT benefits" | The meaning of `is_individually_certified_for_free_or_reduced_price_meals` ("during the Summer EBT period of eligibility ... as the school food authority's record shows") does not leave out 245.6(c)(2) carryover status, which CO-1296 then reads as a categorical ground. | Add to CO-4071's meaning: "not eligibility carried over from the prior school year under 245.6(c)(2)". |
| C-23 | P2 | 3.752.23.F, P, CC (federal-law exclusions paid as wages) | CO-3912, CO-3925 | CC: "Funds received by persons fifty five (55) years of age and older under the Senior Community Service Employment Program (SCSEP)" | SCSEP and other federally excluded work payments are wages (CO-3910, CO-023). CO-3912 subtracts only work-study, so the funds are counted. This is the earned-income side of C-1 and has its own fix. | Add a neutral `scsep_wages` part fact subtracted in CO-3925. |
| C-15 | P3 | 3.752.211.J (D-173) | CO-3926 | "J. Family and medical leave insurance (FAMLI) ..." | Counted implicitly through `other_unearned_income_*`. No item or excerpt cites the 2026 amendment. | Excerpt J and cite it in CO-3926's meaning. |
| C-16 | P3 | 3.755.21.J as amended (D-173) | CO-1712 | owners' "draw from the business account ... in the full month prior to the application date" | CO-1712's precision sends LLC and S-corporation owners to wages, which LEAP reads by pay schedule or thirty days, not the full prior month the amendment names. | Note in OQ-681 or read the draws for the prior month. |
| C-17 | P3 | 3.755.41-3.755.45 | CO-1692, CO-1342 | wood permits, vendor receipts with the listed fields | One document-received fact; the type and content checks are not modeled. | None needed beyond a precision note. |
| C-18 | P3 | 292.14(f)(11); 292.15(c)(1)(iv) | CO-1299 | "no further benefits should be issued until verification for cause ... is complete" | CO-1299 issues the full amount whenever the selection is for cause, including after initial issuance. | Precision note, or withhold when for-cause selection follows issuance. |
| C-19 | P3 | 292.6 ("at any time"); C.R.S. 22-33-104(1)(a) | CO-1292 | — | School age is tested on one August 1. A child who is 6 by August 1 of the summer's own year can be school-aged inside the period of eligibility but is read as not school-aged. Its precision says so. | Test both August 1 dates inside the period. |
| C-20 | P3 | 292.12(f)(3); C.R.S. 26-2-309(4)(c)(III) | CO-1299 | households declining benefits "must not be issued benefits" | Opt-out is not modeled. | Supplied `sebt_household_opted_out`. |
| C-21 | P3 | 292.14(f)(1) | CO-1699 | "if all children ... are determined eligible based on documentation ... SNAP, FDPIR, TANF ... or if all children ... are determined to be foster, homeless, migrant, or runaway" | CO-1699 treats a household with one FDPIR child and one foster child as excepted, but the two "all" clauses are separate. | Test the two clauses separately. |
| C-22 | P3 | 3.756.12.D (reopening) | CO-1462 | "If the requested verification is provided after the application is denied, the county ... shall reopen ... within fifteen (15) calendar days of receipt ... by June 15th" | `past_due` has no path back to `complete` that is dated after the denial. Status only. | Precision note. |

P1: C-1 to C-6 = **6**. P2: C-7 to C-12, C-14, C-23 = **8** (C-13 is not used). P3: C-15 to C-22 = **8**.

## 3. Coverage matrix

Legend: **C** carried by (item, confirmed against the text unless a finding is named); **N/A** not applicable, with the reason; **OQ** open question; **GAP** no item and no recorded reason.

### 3.1 9 CCR 2503-7 (D-86 as amended by D-173)

| # | Paragraph | Status | Carried by / reason |
|---|---|---|---|
| 1 | 3.750.11 programs authorized | N/A | Authority statement. |
| 2 | 3.750.12 Heating Fuel Assistance intent | N/A | Statement of intent. |
| 3 | 3.750.13 Crisis Intervention Program | N/A | CIP is repair or replacement of the heating system for approved HFAP households. It is a service, not an eligibility or benefit test in this rule (F-25 agreed). |
| 4 | 3.750.15 funding | N/A | Funding availability; program-year figures are OQ-532. |
| 5 | 3.751.1 Adverse Action, Appellant | N/A | Notice and hearing definitions. |
| 6 | 3.751.1 Applicant | C | CO-3929 (applicant's fraud penalty), CO-2122. |
| 7 | 3.751.1 Approved Vendor, Vendor, Bulk Fuel, Non-Bulk Fuel, Propane Bottles | N/A | Vendor and fuel definitions used by payment and verification procedures (3.755.44-45, 3.758.46). |
| 8 | 3.751.1 Collateral Contact, Discrepancy, Report of Contact, Prudent Person | N/A | Case-record procedure. |
| 9 | 3.751.1 Completed Application A, C | N/A | Procedural (denial factors G and I; CO-1007 precision); reported through CO-1462. |
| 10 | 3.751.1 Completed Application B (SSN; member excluded, income counted) | C | CO-1694, CO-1000, CO-1009, CO-1360. Confirmed. |
| 11 | 3.751.1 Date of Application | C | CO-2122 (date received). See C-4 for postmarked forms. |
| 12 | 3.751.1 Disabled or Handicapped; Elderly | N/A | Used only by outreach (3.759.11.A, E). |
| 13 | 3.751.1 Eligibility Period (Nov 1-Apr 30) | C | CO-1006, CO-1008, CO-1806, CO-1807. |
| 14 | 3.751.1 Eligibility Period: April 30 weekend or holiday extension | C | Fixed (C-4): CO-4513 (extension days by year), CO-4515 (closing date), CO-4516, read by CO-1007. |
| 15 | 3.751.1 Emergency Applicant; Life Threatening Crisis | N/A | Processing timelines (3.756.12.B, 3.756.14) and CIP; used as evidence in C-2. |
| 16 | 3.751.1 Estimated Home Heating Costs | C | CO-1271. |
| 17 | 3.751.1 Federal Poverty Level | C / OQ | CO-1278 (OQ-253: which table). |
| 18 | 3.751.1 Heat Related Arrearage | N/A | Excluded from EHHC by its own definition; CO-1271 meaning. |
| 19 | 3.751.1 Home Heating Costs | C | CO-876, CO-3300. |
| 20 | 3.751.1 Household | C | CO-1000, CO-1009 (shares_heat_with: OQ-132 resolved). |
| 21 | 3.751.1 Household Income Contribution | C | CO-1279, CO-3000. |
| 22 | 3.751.1 Income Verification Period | C / OQ | CO-3910-3913, CO-3925, CO-3926, CO-4069; OQ-681 (thirty days). |
| 23 | 3.751.1 Lawful Permanent Residents | C | CO-1010. |
| 24 | 3.751.1 Non-Traditional Dwelling | C | CO-2815 (place_not_designed_for_sleeping). |
| 25 | 3.751.1 Overpayment | N/A | Recovery (3.751.5). |
| 26 | 3.751.1 Point in Time | C | CO-1007 (`at` the application month), CO-1281. |
| 27 | 3.751.1 Primary Heating Fuel; Supportive Fuel | C | CO-876 and CO-3300 (costs of the primary fuel); CO-1271. |
| 28 | 3.751.1 Primary Heating Source | C | CO-877, read by CO-1007 and CO-2586. |
| 29 | 3.751.1 Program Year | C | CO-1006. |
| 30 | 3.751.1 Public Assistance Income A-F | C | CO-3926 (`tanf_cash_income`, `adult_financial_cash_income`; SSDI in `social_security_income`; NCRA in other unearned). |
| 31 | 3.751.1 Questionable | C | CO-1307 via CO-1457. |
| 32 | 3.751.1 Reapplication | C | CO-2122 (the latest application; point in time reset). |
| 33 | 3.751.1 Recipient | N/A | Hearing and recovery term. |
| 34 | 3.751.1 Subsidized Housing | C | CO-1275. |
| 35 | 3.751.1 Tiny Home | C | CO-3001 (apartment row), CO-1273. |
| 36 | 3.751.1 Traditional Dwelling | C | CO-1004, CO-2815. |
| 37 | 3.751.2.A member of an approved household | C | CO-2100, CO-1000, CO-1009. |
| 38 | 3.751.2.B every person in one household or another | C | CO-1000 closure plus CO-1274 (count of separate households). |
| 39 | 3.751.2.C fifteen members, nine households | C | CO-875 keyed 1-15; CO-1003 precision (size above 15 unknown). The nine-household cap is administrative. |
| 40 | 3.751.2.D.1 spouses | C | CO-1000. |
| 41 | 3.751.2.D.2 children under 18 with parent or guardian | C | CO-1000, CO-325. See C-7 (kinship). |
| 42 | 3.751.2.D.3 civil unions | C | Fixed (C-8): role `civil_union_partner`, crossed as spouse in CO-1000 and CO-1009. |
| 43 | 3.751.2.E separate household after separation or divorce | C | Fixed (C-8): CO-4519 (the election), CO-4520, in CO-1000 and CO-1009. |
| 44 | 3.751.21 permanent separation | C | Fixed (C-8): a divorced couple has no spouse edge; a legally separated parent separates through E (CO-4519). |
| 45 | 3.751.22 presumption of marriage | C | Fixed (C-8): the spouse edge stays unless E is elected, as the presumption reads (CO-1000 precision). |
| 46 | 3.751.31-3.751.35 non-discrimination, opportunity to apply, interpreters, authorized representative, signature by mark | N/A | Application procedure. |
| 47 | 3.751.41-3.751.489 notice, hearings, confidentiality, EBT use | N/A | Notice and hearing procedure. |
| 48 | 3.751.51-3.751.55 recovery of overpayments | N/A | Post-payment recovery. |
| 49 | 3.751.561-562 fraud definition, DA referral | N/A | Procedure. |
| 50 | 3.751.563 fraud penalty | C / OQ | CO-3929 (applicant); OQ-714 (another member). |
| 51 | 3.751.61-3.751.64 reporting, monitoring, case review | N/A | County administration. |
| 52 | 3.751.71-72 reimbursements, sanctions | N/A | County administration. |
| 53 | 3.752.1 application period, Nov 1-Apr 30 | C | CO-1008, CO-1007 (denial J). |
| 54 | 3.752.1 received or postmarked in the period | C | Fixed (C-4): CO-4512 (postmark), CO-4514 (filing date), CO-4516. |
| 55 | 3.752.1 PA households' applications before Nov 1 accepted, effective Nov 1 | C / OQ | Fixed (C-3): CO-4517, CO-4518, CO-1007; OQ-800 (which households; SSI or SSDI). |
| 56 | 3.752.1 eligibility on circumstances on the date received | C | CO-1007. |
| 57 | 3.752.2 eligibility requirements; factors as of the date of application | C | CO-1007 (residency CO-505, status CO-1005, income CO-1003, vulnerability CO-1004, fuel CO-877, household CO-1000, shared living CO-1274, dwelling CO-1283/CO-2815, EHHC CO-1271). |
| 58 | 3.752.21 intro, other gain or benefit | C | CO-3926 via `other_unearned_income_*`. |
| 59 | 3.752.21.A inheritance, gifts, prizes | C | CO-4069 (prizes, lump sums in the period), CO-3913 (gifts). |
| 60 | 3.752.21.B dividends and interest | C | CO-3913 (`other_unearned_income_taxable`, `tax_exempt_interest`). |
| 61 | 3.752.21.C life insurance proceeds above last-illness and burial costs | C | Fixed (C-1): CO-4509 subtracted in CO-4069. |
| 62 | 3.752.21.D health insurance and injury proceeds above medical costs | C | Fixed (C-1): CO-4509 subtracted in CO-4069. |
| 63 | 3.752.21.E strike benefits | C | `other_unearned_*` via CO-3913. |
| 64 | 3.752.21.F jointly owned property | C (P3) | The person's received amount as stated; no ownership-share floor. |
| 65 | 3.752.21.G, H lease bonuses and royalties, month received | C | `other_unearned_income_taxable`. |
| 66 | 3.752.21.I SSI in the month received, no cents | C | CO-3926 (floor). Confirmed F-10 and F-19. |
| 67 | 3.752.21.J Civil Liberties Act property income | C | Counted as other unearned (the payments themselves are excluded under 3.752.23.H by CO-3366). |
| 68 | 3.752.21.K garnishment counted | C | Gross facts. |
| 69 | 3.752.21.L public assistance income | C | CO-3926. |
| 70 | 3.752.21.M adoption assistance | C | `other_unearned_income_nontaxable`. |
| 71 | 3.752.21.N child support, spousal maintenance | C | CO-3913 (`child_support_received`, alimony in other unearned). |
| 72 | 3.752.211.A-C, E-G annuities, pensions, disability, VA, UI, RRB | C | CO-3913 (`pension_income`, `unemployment_income`, other unearned). The VA dependent share (E) is a within-household attribution with no effect on the total. |
| 73 | 3.752.211.D workers' compensation less medical and legal costs | C | Fixed (C-1): CO-4502 in CO-4511. |
| 74 | 3.752.211.H Social Security, no cents | C | CO-3926. |
| 75 | 3.752.211.I SSI | C | CO-3926. |
| 76 | 3.752.211.J FAMLI (D-173) | C | Fixed (C-15): CO-3926 meaning, S3307. |
| 77 | 3.752.211.K trusts in the period | C | `other_unearned_income_taxable` in CO-3913. |
| 78 | 3.752.212 military allotment | C | Fixed (C-12): CO-3926 meaning, S3306. |
| 79 | 3.752.22.A unearned income of the period, at most one month | C / OQ | CO-3913, CO-3926 precision; OQ-681. |
| 80 | 3.752.22.B earned ongoing income, four of eight weeks | C / OQ | CO-3925, CO-3922; OQ-681 (average pay). |
| 81 | 3.752.22.C.1.a weekly x4 | C | CO-3924 (4). Confirmed CO-3925-T1. |
| 82 | 3.752.22.C.1.b bi-weekly x2 | C | CO-3924 (2). |
| 83 | 3.752.22.C.2 semi-monthly x2 | C | CO-3924 (2). |
| 84 | 3.752.22.C.3.a terminated income | C | CO-3925 (CO-3923 → thirty-day wages). |
| 85 | 3.752.22.C.3.b new earned income | C | CO-3925. |
| 86 | 3.752.22.C.3.c UI and other unearned not yet received | C | Thirty-day receipts (CO-3911/CO-3913). |
| 87 | 3.752.22.C.4 in-kind earned income | C | Fixed (C-12): CO-4506 added in CO-3925. |
| 88 | 3.752.22.D 60% SMI, up to and including (FFY 2026 SMI, D-173) | C | CO-1003 (`<=`), CO-875 (sizes 1-15 match D-144). Confirmed. |
| 89 | 3.752.22.E reapplication after a change | C | CO-2122. |
| 90 | 3.752.23 intro (exempt as income and resources; ROC notation) | C (partial) | See C-1. |
| 91 | 3.752.23.A-D food assistance, OAA Title III, school meals/WIC, home produce | N/A | In-kind: not part of any income fact. |
| 92 | 3.752.23.E housing assistance | N/A | Paid for the dwelling, not received as income. |
| 93 | 3.752.23.F volunteer payments below minimum wage | C | CO-3366 (DVSA Titles I-III), subtracted in CO-3913. |
| 94 | 3.752.23.G Colorado Crime Victims Compensation | C | Fixed (C-1): CO-3813 in CO-4511, subtracted in CO-3926. |
| 95 | 3.752.23.H, I, K-O federal-law payments | C | CO-3366 in CO-3913. |
| 96 | 3.752.23.J gifted transportation ticket | N/A | In-kind. |
| 97 | 3.752.23.P financial aid, loans, work study | C | CO-3913 (educational assistance, loans), CO-3912 (work study). |
| 98 | 3.752.23.Q children's earned income | C | CO-1002 (case condition; CO-1002-T3, T6). |
| 99 | 3.752.23.R, S reimbursements | C | CO-3363 in CO-3913. |
| 100 | 3.752.23.T vendor payments to others | C | Not received; CO-3364 covers energy assistance paid on the household's behalf. |
| 101 | 3.752.23.U foster care and kinship payments; those individuals not members | C / OQ | Fixed (C-1, C-7): payments CO-3821, CO-4503 in CO-4511; membership CO-1000, CO-1009 (OQ-801). |
| 102 | 3.752.23.V home care or attendant allowance paid to a non-member | N/A | An allowance paid to a non-member is not a member's receipt (CO-4511 precision). |
| 103 | 3.752.23.W state or county diversion payments | C | Not part of `tanf_cash_income` (basic cash only). |
| 104 | 3.752.23.X reverse mortgages | C | Fixed (C-1): CO-3820 in CO-4511. |
| 105 | 3.752.23.Y subsidized-housing utility allowances | C | Fixed (C-1): CO-4500 in CO-4511. |
| 106 | 3.752.23.Z GI Bill incl. housing and food allowances | C | Fixed (C-1): CO-3360 (tuition, in CO-3913) and CO-4501 (housing and food) in CO-4511. |
| 107 | 3.752.23.AA refugee resettlement grant | C | Fixed (C-1): CO-4508 in CO-4069. |
| 108 | 3.752.23.BB bona fide loans | C | CO-3362. |
| 109 | 3.752.23.CC SCSEP | C | Fixed (C-23): CO-4504, CO-4510 in CO-3925. |
| 110 | 3.752.23.DD PASS | C | Fixed (C-1): CO-3825 in CO-4511. |
| 111 | 3.752.23.EE tax refunds; retroactive SS/SSI/PA lump sums | C | CO-3913 (CO-3365), CO-4069 (CO-4067, CO-4068). |
| 112 | 3.752.23.FF Colorado Works supportive services | C | Not part of `tanf_cash_income`. |
| 113 | 3.752.23.GG liquidation of personal resources | C | Fixed (C-1): CO-4507 in CO-4069. |
| 114 | 3.752.23.HH employer health-insurance subsidies | C | Fixed (C-1): CO-4505 in CO-3925. |
| 115 | 3.752.24 no resource test | C | No LEAP item reads resources. |
| 116 | 3.752.25.A.1 pays a vendor | C | CO-876. |
| 117 | 3.752.25.A.2 non-subsidized, heat in or beside rent | C | CO-876. |
| 118 | 3.752.25.A.3 subsidized with individual meter or surcharge | C | CO-876, CO-1283. |
| 119 | 3.752.25.A.4 multi-household residence contributing | C | CO-876 (CO-1274 > 1). |
| 120 | 3.752.25.A.5 traditional dwelling | C | CO-1004 via CO-2815. |
| 121 | 3.752.25.A.6 shared primary fuel divides EHHC | C | CO-1274, CO-1280. |
| 122 | 3.752.25.B.1 institutional group care | C | CO-1283, CO-1004; CO-1000 (not a member). |
| 123 | 3.752.25.B.2 room and board | C | CO-1283. |
| 124 | 3.752.25.B.3 correctional | C | CO-1283. |
| 125 | 3.752.25.B.4 dormitory | C | CO-1283 (educational_or_vocational_institution). |
| 126 | 3.752.25.B.5 subsidized without meter or surcharge | C | CO-1283. |
| 127 | 3.752.25.B.6 homeless or non-traditional dwelling | C / OQ | CO-2815 (OQ-561); C-2 fixed: an eviction notice is not homelessness (CO-2815-T4). |
| 128 | 3.752.25.B.7 commercial property | C | CO-1283. |
| 129 | 3.752.25.B.8 hotel, 30 days, heat in rent | C / OQ | CO-1283, CO-3342 (OQ-610). |
| 130 | 3.752.25.C landlords | N/A | A landlord is tested like any household. |
| 131 | 3.752.25.D vulnerability verified | C | CO-1456, CO-1692. |
| 132 | 3.752.26 intro, B.1 weatherization refusal hold | C | CO-3928. |
| 133 | 3.752.26.A exemptions; B.2-B.3 moved or completed; C state office | N/A | Applied by the weatherization agency and State LEAP office before or when the hold is placed or removed (CO-3928 precision). Weatherization administration. |
| 134 | 3.752.27 intro, B.1 CIP inspection refusal hold | C | CO-3928. |
| 135 | 3.752.27.A, B.2-B.3, C | N/A | CIP contractor administration; hold removal as above. |
| 136 | 3.753.1 citizens A-C | C | CO-1358, CO-1010. |
| 137 | 3.753.11 citizenship documents (1 CCR 204-30 App. A) | C | CO-1691. |
| 138 | 3.753.111 questionable citizenship only | C | CO-1457, CO-1307. |
| 139 | 3.753.13 legal immigrant definition | N/A | Definition, used through CO-1010's list. |
| 140 | 3.753.14 immigration documents A-G | N/A | Fact assembly for `immigration_status` (OQ-550: SAVE mapping). |
| 141 | 3.753.15 SAVE | C | CO-1694, CO-1308. |
| 142 | 3.753.16.A-L qualified alien | C / OQ | CO-1010 (all twelve, OQ-550). Confirmed. |
| 143 | 3.753.17.A-D not eligible | C | CO-1010 (not on the list), CO-1694 (A: no status verification). |
| 144 | 3.753.18 excluded member, income counted, no denial if another member qualifies | C | CO-1000, CO-1009, CO-1005. |
| 145 | 3.753.21 Colorado residency | C | CO-505. |
| 146 | 3.753.22 residency; reside at the address applied for | C / N/A | Residency CO-505. The address match (denial Q) is procedural, per CO-1007's precision. |
| 147 | 3.754 A-E general denial grounds | N/A | Procedural non-cooperation, reported by CO-1462. |
| 148 | 3.754.1.A excess income | C | CO-1003. |
| 149 | 3.754.1.B not vulnerable | C | CO-1004. |
| 150 | 3.754.1.C no citizen or qualified alien | C | CO-1005. |
| 151 | 3.754.1.D duplicate household | C | CO-2100, CO-1000. |
| 152 | 3.754.1.E withdrawn | N/A | Procedural. |
| 153 | 3.754.1.F benefits from another county | C | CO-3930. |
| 154 | 3.754.1.G incomplete or unverified | N/A | Procedural (CO-1462 past_due). |
| 155 | 3.754.1.H not a resident | C | CO-505. |
| 156 | 3.754.1.I unsigned | N/A | Procedural. |
| 157 | 3.754.1.J outside the application period | C | CO-1008, CO-1007 with CO-4516 and CO-4517 (C-3, C-4 fixed). |
| 158 | 3.754.1.K applicant not located | N/A | Procedural (3.756.19). |
| 159 | 3.754.1.L refused weatherization | C | CO-3928. |
| 160 | 3.754.1.M-O identification, affidavit (3.753.12, repealed) | N/A | They cite a section absent from the current text; 3.753.111 imposes no identification requirement. |
| 161 | 3.754.1.P non-traditional dwelling | C | CO-2815. |
| 162 | 3.754.1.Q not at the address applied for | N/A | Procedural (CO-1007 precision). |
| 163 | 3.754.1.R primary fuel for the primary source only | C | CO-877, CO-876. |
| 164 | 3.754.1.S refused bulk delivery | N/A | Post-approval forfeiture. |
| 165 | 3.754.1.T refused CIP inspection | C | CO-3928. |
| 166 | 3.754.1.U fraud | C / OQ | CO-3929, OQ-714. |
| 167 | 3.754.1.V failed to verify income | N/A | Procedural (CO-1462). |
| 168 | 3.754.1.W homeless | C | CO-2815 (C-2). |
| 169 | 3.754.11-12 reason and notice of denial | N/A | Notice. |
| 170 | 3.755.11 income, EHHC, vulnerability verified; prior-year vulnerability | C | CO-1455 (C-5 fixed: the wages CO-1002 counts), CO-4526, CO-2591, CO-1456, CO-1692, CO-1693. |
| 171 | 3.755.12 conflicting information | N/A | The case states the correct information; fraud proceedings are procedure. |
| 172 | 3.755.13-3.755.17 case record, storage, archiving | N/A | County administration. |
| 173 | 3.755.21.A unearned income in writing | C | CO-2591, CO-1361. |
| 174 | 3.755.21.B.1-3 child support | C | CO-2591. |
| 175 | 3.755.21.B.4 DV: declaration suffices | C | Fixed (C-9): CO-4525 in CO-4526. |
| 176 | 3.755.21.C Social Security award letter | C | CO-2591. |
| 177 | 3.755.21.D earned income, four of eight weeks of stubs | C | CO-1455 (C-5 fixed), CO-1689, CO-1316. |
| 178 | 3.755.21.E, F county records | C | CO-1361 (electronic source). |
| 179 | 3.755.21.G collateral contact | C | Document-received facts (any source). |
| 180 | 3.755.21.H zero income, adults, DOLE | C | CO-1693, CO-1565. |
| 181 | 3.755.21.I.1 self-employment declaration, full month prior (D-173) | C / OQ | CO-1712, CO-1002 (`month_before`); OQ-681 (3). |
| 182 | 3.755.21.I.2 receipts required for deductions; a-d | C / OQ | CO-1711 (CO-3927 gate; rent, utilities, mileage), OQ-614. Rental maintenance (d) is not a separate fact (P3). |
| 183 | 3.755.21.I.3 card or bank statements not receipts | C | CO-3927 meaning. |
| 184 | 3.755.21.J LLC and S-corp owners as employees (D-173) | C / OQ | CO-1712 precision; OQ-681 note (C-16). |
| 185 | 3.755.21.K gifts verified by declaration | C | Fixed (C-9): CO-4524 in CO-4526. |
| 186 | 3.755.41 evidence of vulnerability 1-4 | C | CO-1342 via CO-1692. |
| 187 | 3.755.42 subsidized-housing documentation | C | CO-1692 (one element); CO-876 for the test. |
| 188 | 3.755.43-45 wood permits, bulk-fuel receipts | N/A | Evidence procedure, carried by one document-received fact (CO-1342); docs/colorado-notes.md (C-17). |
| 189 | 3.755.51 EHHC verified from the vendor | C | CO-1692. |
| 190 | 3.755.6 other factors at discretion | N/A | Discretionary. |
| 191 | 3.756.11 completed application, no interview | N/A | Procedure. |
| 192 | 3.756.12.A-C date stamp, screening, entry (B as amended by D-173), duplicates, notice | N/A | Processing administration. Duplicates → CO-2100. |
| 193 | 3.756.12.D two weeks, good-cause extension up to two weeks | C | CO-1461, CO-1355, CO-2124, CO-2123, CO-2121. |
| 194 | 3.756.12.D reopening after denial | C | Case processing; CO-1462 precision (C-22). |
| 195 | 3.756.13 lost applications | N/A | Procedure. |
| 196 | 3.756.14 thirty-day and eighteen-day determinations; no denial before day 15 | N/A | Timeliness; consistent with CO-1461 (14 days). |
| 197 | 3.756.15 notification | N/A | Notice. |
| 198 | 3.756.16 county of residence | N/A | County administration. |
| 199 | 3.756.17 relocation | C | CO-3930. |
| 200 | 3.756.18 withdrawn; 3.756.19 unlocated | N/A | Procedural. |
| 201 | 3.756.2 advance payment A-C | N/A | Payment timing. Relevant to C-2's reading. |
| 202 | 3.757.11-12 reporting and correcting information | N/A | County administration. |
| 203 | 3.758.31 payee after separation | N/A | Payee, not amount. |
| 204 | 3.758.32 death of payee | N/A | Payee. |
| 205 | 3.758.41 vendor or direct payment; never to a landlord | N/A | Payment method. |
| 206 | 3.758.46 vendor payment procedures | N/A | Vendor administration. |
| 207 | 3.758.47 Step A EHHC, prior season or flat rate | C / OQ | CO-1271 (flat rates: OQ-532). |
| 208 | 3.758.47 Step B statewide adjustment | C / OQ | CO-1272 (no version: OQ-532), CO-1281 (OQ-253). |
| 209 | 3.758.47 Step C electric heat portion 62/48/43/50% | C | CO-3001, CO-1273, CO-1280. Confirmed. |
| 210 | 3.758.47 Step D HIC bands 0/10/20/30% | C / OQ | CO-3000, CO-1279, CO-1278 (OQ-253). Band edges confirmed. |
| 211 | 3.758.47 Step E shared living arrangements | C | CO-1280, CO-1274. |
| 212 | 3.758.47 Step F $180 subsidized allowance | C | CO-1282, CO-1281. |
| 213 | 3.758.47 Step G minimum and maximum | C / OQ | CO-1276, CO-1277 (OQ-532), CO-1281. |
| 214 | 3.758.48 statewide adjustments not appealable | C | CO-1272 meaning. |
| 215 | 3.758.49 forfeiture | N/A | Post-issuance claim. |
| 216 | 3.759.11-3.759.41 outreach, weatherization referral | N/A | County outreach and weatherization administration. |
| 217 | 3.770 allocation | N/A | County budgeting. |

### 3.2 7 CFR part 292 (D-88, D-117), 7 CFR 245.6 (D-250), Colorado text

| # | Paragraph | Status | Carried by / reason |
|---|---|---|---|
| 218 | 292.1(a)-(b) purpose | N/A | Scope. |
| 219 | 292.2 Adult | C | CO-3933 (18), read by CO-2708, CO-1699. |
| 220 | 292.2 Categorically eligible: a child of a household in which one or more children receive SNAP, TANF or FDPIR | C | CO-2708 (receipt by a child under 18: F-13 confirmed fixed), CO-4072 (FDPIR). **C-6** on timing. |
| 221 | 292.2 Categorically eligible: another approved means-tested program | C / OQ | CO-2852 (OQ-255). |
| 222 | 292.2 Categorically eligible: foster, homeless, migrant, Head Start, runaway | C | CO-4072, CO-2813, CO-2848, CO-2849, CO-2850, CO-1296. |
| 223 | 292.2 Continuous school calendar | N/A | Timing alternatives approved in the POM. |
| 224 | 292.2 Current income | C | CO-1295 ("current monthly gross income ... reported on the application"). |
| 225 | 292.2 Direct verification | C | CO-1591. |
| 226 | 292.2 Dual participation | C | Fixed (C-10): CO-4521 in CO-1299. |
| 227 | 292.2 Eligible child; Eligible household | C | CO-1298. |
| 228 | 292.2 Enrolled students | C | CO-1293. |
| 229 | 292.2 Household (economic unit; not institution or boarding house) | C | Fixed (C-11): `lives_as_one_economic_unit_with`; CO-4523 derives the size (read by CO-1297). |
| 230 | 292.2 Income eligibility guidelines | C | CO-1297, CO-1291. |
| 231 | 292.2 Instructional year; Period of eligibility | C / OQ | CO-3014, CO-2581 (OQ-535). |
| 232 | 292.2 NSLP/SBP application; Summer EBT application | C | CO-1298 (income route), CO-1633. |
| 233 | 292.2 Rolling verification; Verification; Verification for cause | C | CO-1590, CO-4073, CO-1699. Rolling sampling is agency administration. |
| 234 | 292.2 School aged | C | CO-1292 (C.R.S. 22-33-104(1)(a), S1403). |
| 235 | 292.2 Special provision school | C / OQ | CO-1293 includes them; distinctions not modeled (OQ-255 (5)). |
| 236 | 292.2 Streamlined certification | C | CO-1633 (no enrollment check for streamlined children). |
| 237 | 292.2 Summer operational period | OQ | OQ-535 (in the POM). |
| 238 | 292.2 SNAP, TANF, FDPIR | C | CO-1936, CO-013, CO-2851. |
| 239 | 292.2 remaining definitions (APD, COTS, EBT, firm, ITO, LEA, RFP, trafficking, vendor, etc.) | N/A | Administration and integrity definitions. |
| 240 | 292.5(a) NSLP/SBP standards: income or categorical | C | CO-1298. |
| 241 | 292.5(b) guidelines change July 1; those in effect on the application date | C | CO-1297, CO-3015 (FPG as of the latest July 1). Confirmed: $3,337 for 2, $5,088 for 4. |
| 242 | 292.6 intro "at any time during the period of eligibility" | C | CO-2708 (C-6 fixed: receipt in any month of the period); C-19 (P3) accepted, see disposition. |
| 243 | 292.6(a) school-aged and categorical | C | CO-1298 row 1. |
| 244 | 292.6(b)(1) enrolled (not special provision) and categorical | C | CO-1298 row 1. |
| 245 | 292.6(b)(2) income-eligible through an NSLP/SBP application | C | CO-1298 row 2 (`<=`). |
| 246 | 292.6(b)(3) otherwise eligible for free or reduced price | C | CO-4071 → CO-1296 (C-14). |
| 247 | 292.6(b)(4) Summer EBT application | C | CO-1298 row 2. |
| 248 | 292.6(c)(1)-(3) special provision schools | C | CO-1298 (same rows). |
| 249 | 292.7(a) period to establish eligibility | C / OQ | CO-2581 (OQ-535); CO-2708 (C-6 fixed). |
| 250 | 292.7(b) no change reporting | C | Consistent with C-6's fix: eligibility once established holds. |
| 251 | 292.7(c) carryover cannot confer eligibility | C | Fixed (C-14): CO-4071 meaning, S3316. |
| 252 | 292.12(a) informational activities | N/A | Notice. |
| 253 | 292.12(b) general enrolling procedures | N/A | Administration. |
| 254 | 292.12(c) enrollment database | N/A | Administration. CO-1593 carries the match. |
| 255 | 292.12(d)(1)(i)(A) individually certified | C | CO-4071, CO-1296. |
| 256 | 292.12(d)(1)(i)(B)(1)-(3) school-aged SNAP, FDPIR/TANF, foster/homeless/migrant/runaway/Head Start | C | CO-1298 row 1, CO-2708, CO-4072, CO-1296. |
| 257 | 292.12(d)(1)(ii) non-special-provision FRP-eligible | C | CO-1298 row 2, CO-4071. |
| 258 | 292.12(d)(2) other approved programs | C / OQ | CO-2852 (OQ-255). |
| 259 | 292.12(d)(3) no enrollment confirmation for streamlined children | C | CO-1633. |
| 260 | 292.12(d)(4) ITO waivers | N/A | ITOs only. |
| 261 | 292.12(e)(1) enrollment by complete application | C | CO-1298 row 2. Completeness is procedural. |
| 262 | 292.12(e)(2) enrollment confirmation in the preceding year | C | CO-1633, CO-1696, CO-1593. |
| 263 | 292.12(e)(3) not in an NSLP/SBP school: no application route | C | CO-1298 row 2 requires CO-1293. |
| 264 | 292.12(e)(4) no income documentation at application | C | CO-1699 asks only when selected. |
| 265 | 292.12(f)(1)-(2), (4) notices | N/A | Notice. |
| 266 | 292.12(f)(3) households declining | C | Fixed (C-20): CO-4522 in CO-1299. |
| 267 | 292.12(g)-(h) denial notice, appeals | N/A | Notice and hearing. |
| 268 | 292.12(i) confidentiality | N/A | Administration. |
| 269 | 292.13(a)-(f), (h)-(m), (o)-(p) application form, content, statements, disclosure | N/A | Application administration. |
| 270 | 292.13(g) deadline: last day of the summer operational period; later applications for the next summer | C / OQ | CO-2581 (OQ-535). |
| 271 | 292.13(n) income at or below the guidelines → approve | C | CO-1298 (`<=`). |
| 272 | 292.14(a)(1)(i)-(v) verification for cause | C | CO-4073, CO-1590, CO-1699. |
| 273 | 292.14(a)(2) 3% sample | C | CO-1590 (selection is the agency's record). |
| 274 | 292.14(a)(3), (b), (c), (d) alternatives, replacement, rolling sample, after April 1 | N/A | Sampling administration. |
| 275 | 292.14(e)(1)-(3) direct verification first; any point in the period | C | CO-1591, CO-1695 (C-6 on "any point"). |
| 276 | 292.14(f)(1) exceptions from verification | C | CO-1699 with CO-4527 and CO-4528 (C-21 fixed), CO-4072. |
| 277 | 292.14(f)(2)(i) respond by the agency's date | OQ | OQ-377. |
| 278 | 292.14(f)(2)(ii)-(iv) alternatives; failure to cooperate | C | CO-1592 (SNAP/FDPIR/TANF proof), CO-1698. |
| 279 | 292.14(f)(3) sources of information | N/A | Evidence rules (fact assembly). |
| 280 | 292.14(f)(4) documentation: source, amount, frequency; any point | C | CO-1592. |
| 281 | 292.14(f)(5) refusal → termination | C / OQ | CO-1698 has no past-due state (OQ-377); CO-1299 withholds while pending. |
| 282 | 292.14(f)(6)-(8), (10), (12) phone, follow-ups, notices, continuous calendars, nondiscrimination | N/A | Administration and notice. |
| 283 | 292.14(f)(9) no issuance until verification completes, except for cause | C | CO-1299 (F-21 confirmed fixed). |
| 284 | 292.14(f)(11) after issuance, no further benefits until for-cause verification | C | Issuance action; CO-1299 precision (C-18). |
| 285 | 292.15(a)-(b) timing; continuous calendars | N/A | Issuance timing. |
| 286 | 292.15(c)(1)(i)-(ii), (v) timely issuance; homeless households helped | N/A | Administration. |
| 287 | 292.15(c)(1)(iii) a full three months | C | CO-3013. |
| 288 | 292.15(c)(1)(iv) selected applications not issued until verified | C | CO-1299. |
| 289 | 292.15(c)(2) method of issuance | N/A | Administration. |
| 290 | 292.15(d)(1) no dual participation | C | Fixed (C-10): CO-4521 in CO-1299. |
| 291 | 292.15(d)(2) detection procedures | N/A | Administration. |
| 292 | 292.15(e)(1) $40 in 2024, TFP adjusted, no decrease | C | CO-1244 (2024-2026 $40). |
| 293 | 292.15(e)(2) AK, HI and territories | N/A | Not Colorado. |
| 294 | 292.15(e)(3) unrounded prior amount, TFP change, rounded down, calendar-year rates | C | CO-1244 rows from the FNS notices (D-89); `review_by` for 2027 (F-23 confirmed). |
| 295 | 292.15(e)(4) no proration, full three months | C | CO-1299, CO-3013. |
| 296 | 292.15(f)(1)-(2)(ii), (iv) allotment schedule | N/A | Issuance administration. |
| 297 | 292.15(f)(2)(iii) full benefit whatever the application date | C | CO-1299 precision. |
| 298 | 292.15(g)-(i) training, cards, adjustments, expungement | N/A | Administration. |
| 299 | 292.16(a)-(d) issuance systems, disclosure, administration, Alaska | N/A | Administration (not Colorado for (d)). |
| 300 | 292.16(e) IPV disqualification for individuals 18+ | N/A | Disqualifies adults, who are not the eligible persons. The children's benefit is not addressed. P3 note only. |
| 301 | 245.6(a)(1)-(9) school meal application content | N/A | School meal administration. |
| 302 | 245.6(b)(1)-(6), (9)-(10) direct certification procedures | N/A | LEA administration; the results feed CO-4071. |
| 303 | 245.6(b)(7) all children in the family when any child is in a SNAP, FDPIR or TANF household | C | CO-2708 (S2720). |
| 304 | 245.6(b)(8) foster, homeless, migrant, runaway, Head Start individually; not extended | C | CO-1296, CO-4072 (per child). |
| 305 | 245.6(c)(1)-(2) duration; carryover | C | Via 292.7(c): CO-4071 meaning (C-14 fixed). |
| 306 | 245.6(c)(3) changes during the year | N/A | School meals; 292.7(b) governs Summer EBT. |
| 307 | 245.6(c)(4) calculating income, at or below | C | CO-1298. |
| 308 | 245.6(c)(5) categorical via documentation | C | CO-2708, CO-1296. |
| 309 | 245.6(c)(6)-(8), (d)-(k) notices, appeals, recordkeeping, disclosure | N/A | Administration. |
| 310 | C.R.S. 26-2-309(1)-(3) declaration, definitions, program created | N/A | No eligibility test beyond federal law. |
| 311 | C.R.S. 26-2-309(4)(a)(I) eligibility "consistent with federal law" | C | The SUN Bucks chapter follows part 292 (OQ-255, OQ-551). |
| 312 | C.R.S. 26-2-309(4)(a)(II)-(VI), (b), (c)(I)-(II), (5)-(8) | N/A | Administration, outreach, data, funding. |
| 313 | C.R.S. 26-2-309(4)(c)(III) opt-out process | C | Fixed (C-20): CO-4522 in CO-1299. |
| 314 | C.R.S. 22-33-104(1)(a) compulsory attendance ages | C | CO-1292, CO-2101, CO-2102, CO-2605. |
| 315 | D-143: no Colorado Summer EBT rule | C | OQ-255 (1) confirmed. |

Matrix size: **315 rows** (217 LEAP, 98 SUN Bucks and Colorado). Some rows group lettered sub-paragraphs that have the same disposition.

## 4. Open-question confirmations

| OQ | Class | Confirmation |
|---|---|---|
| OQ-253 (Steps B, D, F; Step D's poverty table) | state policy choice | Right. 3.758.47 Step G orders no subtraction and names no table; D-173 does not touch 3.758.47. |
| OQ-255 (Colorado's optional categorical sources; POM) | blocked on a named document | Right as recorded. The POM is Colorado's, and the only Colorado texts (C.R.S. 26-2-309, D-143) state no sources. Could not re-search fns.usda.gov this session (search tool out of credits); the classification stands on the record. |
| OQ-377 (SUN Bucks response period) | blocked on a named document | Right. 292.14(f)(2)(i) "by the date determined by the Summer EBT agency". |
| OQ-390 (exclusion lists) | marked resolved | **Wrong for LEAP.** The resolution names `leap_excluded_income` (CO-2345), which was retired. See C-1. |
| OQ-532 (LEAP program-year figures, flat rates) | blocked on a named document | Right. 3.758.48 leaves them to State notice; cdhs.colorado.gov is not an allowed host. |
| OQ-535 (which summer a July or August determination is for) | blocked on a named document | Right. The summer operational period is set in the POM. |
| OQ-550 (SAVE list; LEAP part) | blocked on a named document | Right. LEAP's 3.753.16 list is fully matched by CO-1010; the open part is SAVE codes (uscis.gov is not an allowed host). |
| OQ-551 (no SUN Bucks status test) | state policy choice | Right. 8 U.S.C. 1615(b); part 292 and C.R.S. 26-2-309 are silent. |
| OQ-561 ("considered homeless") | state policy choice | Right as a question. **The item does not follow the OQ's Assumption**: it includes imminent loss of housing (C-2). |
| OQ-610 (hotel "will live") | state policy choice | Right. |
| OQ-612 (temporary absence) | state policy choice | Right for LEAP: 3.751.1 and 3.751.2 state no limit. |
| OQ-614 (county mileage rate) | blocked on a named document | Right. The rate is county policy, not published on an allowed host. |
| OQ-681 (income verification period, four of eight weeks, self-employment month) | state policy choice | Right. 3.751.1 says "approximately thirty (30) calendar days"; D-173 adds "full month prior" without defining it. |
| OQ-714 (another member's fraud penalty) | state policy choice | Right. 3.751.563 and 3.754.1.U are silent on the household effect. |
| (none) | — | **Missing:** the kinship/guardian conflict (C-7), the PA-household early applications and the meaning of "Supplemental Social Security Disability Benefits" (C-3), and the postmark and April 30 extension (C-4) have no open question. C-3 and C-4 are not choices (the text is explicit); C-7 is one. |

Resolved open questions in the family (OQ-122, 123, 132, 137, 158, 318, 319, 358, 370, 381, 552) were spot-checked against their items, and their resolutions hold, except OQ-390.

## 5. Earlier P1s (docs/reviews/final-cccap-leap-sebt.md, final2-cccap-leap-sebt.md)

| Earlier | Still fixed? | Evidence |
|---|---|---|
| F-09 (LEAP income period, pay conversion) | Yes | CO-3925 (CO-3924 4/2/2/1), CO-3926, CO-1002 `month_before` for self-employment. |
| F-10 (SSI counted) | Yes | CO-3926 includes `ssi_income`, floor. |
| F-11 / N-8 (prizes and lump sums in the period) | Yes | CO-4069; CO-135 gives `leap_household_income` 8967 in the scratch copy. |
| F-12 (denial factors F, L, T, U) | Yes | CO-1007 reads CO-3928, CO-3929, CO-3930 (tests T9-T11). |
| F-13 (receipt by children only) | Yes | CO-2708 under `sebt_adult_min_age`. |
| N-9 (Head Start and individual certification not excepted) | Yes | CO-1699 reads CO-4072. |
| V-1 (LEAP cost receipts) | Yes | CO-1711 gated on CO-3927. |
| F-21 (no issuance while pending) | Yes | CO-1299. |
| Second-pass P2, 3.752.23.Q | Yes | CO-1002-T6. |
| Deferred F-18, F-20 | Still open | C-8, C-11. |

## Probe households (scratch copy only)

Each probe household was appended to the scratch copy's `volumes/co/tests/cases.yaml` and evaluated with `eval-case.ts`. A one-person household needs one stated relationship: `reachable` is unknown when a person's relationships are unstated, so the probes add `other_relative` to a non-member.

- **RV-L0** (control): one adult, U.S. citizen, Colorado, pays a vendor, primary heating source, wages $1,000, application 2026-11-10. `leap_is_eligible` 2026-11 = true.
- **RV-L1**: RV-L0 plus `other_unearned_income_nontaxable` 3000 = `crime_victim_compensation_received` 3000. `leap_household_income` 4000, `leap_income_within_limit` false, `leap_is_eligible` false (C-1).
- **RV-L2**: RV-L0 with heat included in rent and `nighttime_residence_type: imminently_losing_residence`. CO-2815 true, CO-1004 false, `leap_is_eligible` false (C-2).
- **RV-L3**: RV-L0 with `receives_tanf_cash` true ($500) and application 2026-10-20. `leap_is_eligible` 2026-11 and 2026-12 false; `leap_program_year_start_month` at 2026-10 = 2025-11 (C-3).
- **RV-L4**: RV-L0 with application received 2027-05-03. `leap_is_eligible` 2027-04 and 2027-05 false (C-4: the outcome depends on a postmark the volume cannot state).
- **RV-S1**: mother and child born 2016-05-01, NSLP school, household of 2, income $6,000. `receives_snap` true, and false for 2027-01 to 2027-03. `sebt_eligibility_status` is `eligible_categorical` for 2026-09 and `ineligible` for 2027-03, where `sebt_benefit_amount` is 0 and `sebt_summer_year` is 2027 in both months (C-6).

## Disposition (coverage round)

Fix track for LEAP and SUN Bucks, 2026-11-22, on the base a2ed7f0. Texts re-read: 9 CCR 2503-7 re-fetched from the Secretary of State (still rule version 12221, D-86; D-173 re-fetched for 3.752.211.J); 7 CFR part 292 re-fetched from eCFR (as of 2026-11-19), the same as D-88 and D-117; C.R.S. 24-11-101 fetched (D-310). Excerpts S3300 to S3318. Commits a5b50bc (excerpts), eb03578 (LEAP income and verification), b1e4c41 (LEAP timing, household, homelessness), f8b3e6a (SUN Bucks), ef0f317 (cases CO-175 to CO-179, notes). The matrix rows above are updated; no row is GAP.

| Finding | Sev | Disposition |
|---|---|---|
| C-1 | P1 | Fixed (eb03578). `leap_excluded_unearned_income` (CO-4511) sums G (CO-3813), U (CO-3821, new CO-4503), X (CO-3820), Y (new CO-4500), Z (new CO-4501), DD (CO-3825) and the 211.D claim expenses (new CO-4502); CO-3926 subtracts it from CO-3913, not below zero. CO-4069 subtracts GG (CO-4507), AA (CO-4508) and 21.C-D (CO-4509); CO-3925 subtracts HH (CO-4505). OQ-390 note appended. V is N/A (an allowance paid to a non-member is not a member's receipt). Probe RV-L1 promoted to case CO-175: `leap_household_income` 4,000 → 1,000, `leap_is_eligible` false → true. Tests CO-3926-T6, T7; CO-4069-T4, T5; CO-4511-T1 to T4. |
| C-2 | P1 | Fixed (b1e4c41). CO-2815 drops `imminently_losing_residence`, following OQ-561's Assumption (3.751.1 "Emergency Applicant", S3311); test CO-2815-T4; OQ-561 note. Case CO-179 (with C-8): eligible. |
| C-3 | P1 | Fixed (b1e4c41). `leap_application_program_year_start_month` (CO-4517) and `leap_is_public_assistance_household` (CO-4518); CO-1007 accepts a public assistance household's application filed before November 1 for the season starting that November. OQ-800 (state policy choice: which households; "Supplemental Social Security Disability Benefits" read as SSI and SSDI). Probe RV-L3 promoted to case CO-176: `leap_is_eligible` 2026-11 and 2026-12 false → true. Tests CO-1007-T12, T13. |
| C-4 | P1 | Fixed (b1e4c41). `leap_application_postmark_date` (CO-4512), `leap_application_filing_date` (CO-4514), the extension table (CO-4513, weekends from the calendar; no C.R.S. 24-11-101 holiday falls on April 30 to May 2), `leap_application_period_closing_date` (CO-4515), `leap_application_is_within_application_period` (CO-4516). CO-875's 2026-27 version now runs to 2027-11-01 so a May determination of a season application reads the season's table. Probe RV-L4 promoted to case CO-177 (postmarked April 29, received May 3): `leap_is_eligible` 2027-04 false → true. Tests CO-1007-T14, T15; CO-4515-T1 to T4. |
| C-5 | P1 | Fixed (eb03578). CO-1455 reads `leap_person_wages` > 0 and excludes only CO-1002's child under eighteen with a parent or guardian among the members; CO-1458 counts the same. Tests CO-1455-T4 (16-year-old with a grandmother), T5 (job ended); T2 restated with the parent. |
| C-6 | P1 | Fixed (f8b3e6a). CO-2708 reads receipt in any month from the instructional year's first month through the month evaluated (292.6, 292.14(e)(2), S3317). Probe RV-S1 promoted to case CO-178: `sebt_eligibility_status` 2027-03 ineligible → eligible_categorical. Tests CO-2708-T8, T9; CO-1298-T5. |
| C-7 | P2 | Fixed with an open question (b1e4c41). CO-1000 and CO-1009 leave out a foster or kinship individual (child_welfare_payment_type); OQ-801 (state policy choice: U against D.2). Test CO-1000-T18. |
| C-8 | P2 | Fixed (b1e4c41; final pass F-18). New role `civil_union_partner` (volume.yaml, appended), crossed as spouse; 3.751.2.E by `leap_is_listed_separately_from_ex_spouse` (CO-4519) and CO-4520. 3.751.21-22 need nothing further (precision). Tests CO-1000-T15 to T17, CO-1009-T7, CO-4520-T1 to T3; case CO-179. |
| C-9 | P2 | Fixed (eb03578). `gifts_received` (CO-4524), `has_domestic_violence_court_evidence_or_acp_participation` (CO-4525), `leap_requires_verification_of_unearned_income` (CO-4526) read by CO-2591 and CO-1458. Tests CO-4526-T1 to T4, CO-2591-T3. |
| C-10 | P2 | Fixed (f8b3e6a). `sebt_received_benefits_from_another_agency_this_summer` (CO-4521) in CO-1299; test CO-1299-T5. |
| C-11 | P2 | Fixed (f8b3e6a; final pass F-20). `sebt_household_size` (CO-4523) counts the economic unit when the case states one and falls back to the application's size only when it does not; CO-1297 reads it. Income stays the application's reported figure (292.2 "Current income"). No existing case states the unit, so no expectation changed; case CO-178 states no size and derives 2. |
| C-12 | P2 | Fixed (eb03578). `in_kind_compensation_value` (CO-4506) added in CO-3925 (test CO-3925-T7); 3.752.212 cited in CO-3926's meaning (S3306). |
| C-14 | P2 | Fixed (f8b3e6a). CO-4071's meaning excludes 245.6(c)(2) carryover (S3316). |
| C-23 | P2 | Fixed (eb03578). `scsep_wages` (CO-4504) subtracted in CO-3925 at `leap_scsep_exclusion_min_age` (CO-4510, 55); test CO-3925-T6. |
| C-15 | P3 | Fixed (eb03578). FAMLI (3.752.211.J, S3307) cited in CO-3926's meaning. |
| C-16 | P3 | Open question note: OQ-681 records that 3.755.21.J ties "full month prior" to the verification statement; the Assumption is unchanged. |
| C-17 | P3 | Accepted, recorded out of scope in docs/colorado-notes.md (document content checks are county evidence procedure; one document-received fact, CO-1342). |
| C-18 | P3 | Precision note on CO-1299 (an issuance action, not a change in the summer's amount). |
| C-19 | P3 | Accepted. Whether August 1 of the summer's own year lies inside the period of eligibility depends on Colorado's summer operational period, which is in the POM (OQ-535); CO-1292's precision already states the single date read. |
| C-20 | P3 | Fixed (f8b3e6a). `sebt_household_declined_benefits` (CO-4522) in CO-1299; test CO-1299-T6. |
| C-21 | P3 | Fixed (f8b3e6a). The two 292.14(f)(1) groups are separate items (CO-4527, CO-4528; CO-4072 is their union) and CO-1699 tests each "all" clause; test CO-1699-T7. |
| C-22 | P3 | Precision note on CO-1462; recorded in docs/colorado-notes.md. |
| OQ-390 | — | LEAP sentence corrected by an appended coverage-round paragraph (CO-4511, CO-4069, CO-3925). |
| OQ-561 | — | Item aligned with the Assumption (C-2); note appended. |

Changed household expectations: none of the existing cases changed (every expectation passes unchanged). New cases CO-175 to CO-179 carry hand derivations in their comments; the "before" values are the review's probe results (RV-L1, RV-L3, RV-L4, RV-S1) and, for CO-179, the pre-fix reading of CO-2815 with no civil union role.

Shared files touched: volume.yaml (one role appended), open-questions.md (OQ-390, OQ-561, OQ-681 notes; OQ-800, OQ-801 added), sources.md (S3300-S3318 appended), documents.yaml (D-310 appended), cases.yaml (CO-175 to CO-179 appended), CO-1294 and CO-4071 (precision and meaning wording). The shared thirty-day income items CO-3910 to CO-3913 are not changed; no shared supplied fact changed meaning.

# Final verification pass: cash family (Colorado Works, Adult Financial)

Reviewer: independent final pass under the product owner's stopping rule (docs/plan-colorado.md, "Stopping rule").
Commit reviewed: `80f2e9e` (branch ccr-9d19bf4c-wmnwcl). Date: 2026-11-22.
Governing text read: 9 CCR 2503-6 (D-81, rule version 12030, effective 07/01/2025) and 9 CCR 2503-5 (D-80, rule version 12428, effective 03/02/2026). On 2026-11-22 the Secretary of State rule pages (ruleId 3145 and 3144) still list these as the current versions. Also read: SB 26-181 (D-171), the SOS eDocket record (D-172), C.R.S. 26-2-111 (D-59), and the verification extracts D-104 and D-105.
Tools run: `npm run check` (OK; conformance self-check 5436/5436), `npm run export -- --volume co`, `scripts/eval-case.ts`, and a scratch probe script that evaluates two constructed households with the same engine (kept outside the repository).

## Summary verdict

**12 P1 found.** The volume is not complete under the stopping rule for the cash family.

The 2026 figures are all correct, and so is every computation the volume does model (the standards, floors, ISM, PNA, tiers, burial and death-reimbursement limits, child support, sanctions, proration and the time limit). Four stored households recompute exactly by hand. The P1s are elements that the current rule states and the volume does not model:

- Colorado Works eligibility bars (strike, inmate or IMD patient, institution resident, child-support assignment and cooperation).
- Exempt income in both programs.
- The married $20 split, and an AND-SO $20 rollover the rule does not give. Both were confirmed with the engine.
- The Adult Financial transfer penalty, the AND-SO substance-abuse limits, the OAP life-insurance exemption and the other-state assistance bar.
- The duty to apply for other benefits, and its proof.
- The disaster assistance payment.
- Two verification gaps: marital status, and the income of persons whose income is deemed.

One open question in scope, OQ-550, is partly answerable from allowed hosts, so its class is not fully right (criterion 2). Twelve P2s are listed with dispositions.

Elements: every identifier reached from the 49 cash outcomes resolves. The closure holds 437 identifiers: 187 derived, 166 supplied and 83 parameters. The only unresolved name is the engine built-in `relationships`.

## Findings

Excerpts quote D-81 (9 CCR 2503-6) and D-80 (9 CCR 2503-5), with their line numbers in volumes/co/documents/.

| id | sev | item(s) | governing excerpt | what is wrong | proposed fix |
|---|---|---|---|---|---|
| FC-1 | P1 | cw_eligibility_status CO-921, cw_is_disqualified_member CO-928, cw_is_considered_living_in_home CO-3354 | 3.604.2.L.2 (D-81:1443): "The following individuals shall not be eligible under Colorado Works: ... 2. Assistance units with an adult participating in a strike". 3.604.1.D-E (D-81:1194, 1202): a client must "Not be admitted to an institution as a patient for tuberculosis or mental disease ..." and must "Not be in the custody of or confined in a county, state, or federal correction facility". 3.604.2.O.1-2 (D-81:1562-1571): out of state no more than 90 consecutive days; "A client who is a resident of an institution is not considered to be in the home ... at least thirty (30) consecutive days". 3.604.4.A (D-81:2052-2060): "A client's failure to sign and date the application form to avoid assignment of support rights precludes eligibility ... Failure to cooperate with Child Support Services ... without good cause, will result in the termination". | None of these conditions has an item, a fact or an open question. A unit with a striking adult, an incarcerated parent, a parent who has been in a nursing home for 60 days (the `medical_treatment` absence keeps the parent in the home indefinitely, CO-3354), or a parent refusing child-support cooperation is found eligible. The phase-8 review said the strikers "stay unmodeled with their existing questions" (docs/reviews/cash-snap-other-phase-8.md:681), but no such question exists. | Add `cw_unit_has_striking_adult` (it can read snap_is_striker CO-3500, whose definition follows 7 CFR 273.1(e), or a Colorado Works fact), and read `is_inmate_of_public_institution` (CO-1105) and `is_patient_in_institution_for_mental_diseases` (CO-1104) as disqualifications. Add the institution test of O.2 (with the dependent-child carve-out), O.1's 90 days, and a `cw_child_support_cooperation_met` fact (assignment signed, and cooperation or good cause), each with a new `cw_eligibility_status` option. |
| FC-2 | P1 | cw_excluded_earned_income CO-2340, cw_excluded_unearned_income CO-2341, cw_gross_earned_income CO-1716, cw_counted_child_support CO-2553 | 3.605.2.C (D-81:2456): "Income received from short-term employment such as temporary employment (ninety days or less) and subsidized employment shall not be considered to determine eligibility". 3.605.4.B.35 (D-81:2918): "Wages earned through subsidized employment programs" are exempt. 3.605.4.A.7 (D-81:2775): "General Assistance granted to a client by the county department". A.8: Crime Victims Compensation. B.13 and B.16: WIOA training allowances and income. B.20-22: IDAs and distributions from retirement and health savings accounts. 3.605.5.D (D-81:2943): "Child support arrears are exempt income". | CO-2341 is a fixed sum of six neutral receipt facts (education, loans, reimbursements, energy, tax refunds, federally excluded payments). CO-2340 holds student and work-study earnings only. Nothing else on the 3.605.4 list can be excluded. The neutral fact `other_unearned_income_nontaxable` (CO-030) names general assistance in its own meaning, so a unit on general assistance has that income counted against the need standard. Temporary-job and subsidized wages are counted. OQ-390 is marked Resolved on the basis that each program "now has an excluded-income input stating the part of the gross amounts its list excludes", but CO-2341 is now a closed derived sum, not such an input. | Add a residual input `cw_other_excluded_unearned_income` and `cw_other_excluded_earned_income`, citing 3.605.2.C, 3.605.4 and 3.605.5.D, to CO-2341 and CO-2340, or add one neutral fact per listed category. Split arrears out of `child_support_received`, or add an arrears fact. Reopen OQ-390's residual or point it at the new inputs. |
| FC-3 | P1 | af_excluded_unearned_income CO-2343, af_excluded_earned_income CO-2342, af_countable_income CO-946 | 3.520.786 (D-80:3754-3826): "Such exempt income is limited to the following: ... D. Emergency or general assistance ... received on a one time basis ... F. VA Aid and Attendance ... J. Compensation received by the client pursuant to the Colorado Crime Victim Compensation Act ... L. Reverse mortgage loan payments. M. Payments received for providing foster care ... O. Infrequent or irregular income of less than $60 in a calendar quarter. P. Child support arrears payments received for the client." | CO-2343 subtracts only tax refunds, energy assistance, educational assistance and federally excluded payments. D, F, I, J, L, M, O and P cannot be excluded, so an OAP or AND client with any of them has countable income overstated, which can deny the client or cut the grant. | Add a residual `af_other_excluded_unearned_income` input citing 3.520.786.D-P (and K's SSI list), read as 0 when not stated, or add neutral facts per category. |
| FC-4 | P1 | af_countable_income CO-946 | 3.533.A.2.c.1 (D-80:4069): "If the client is married, the $20.00 disregard shall be split equally between the client and the client's spouse so that no more than a $20.00 disregard is applied for the married couple." 3.544.B.2 (D-80:4623) and 3.549.A.2.c.1 (D-80:4974) say the same for AND-SO and AND-CS. | CO-946 gives every married client the full $20. A probe household (two OAP spouses, $500 Social Security each, both stated as Medicaid recipients so 3.534.C deems nothing) computes countable income 480 and a $552 grant each. The rule gives 490 and a $542 grant each. CO-946's precision admits it ("does not split ... (A.2.c.1)"), and the only open question that carried it, OQ-114, is marked Resolved. | When `is_married`, use half of `af_general_income_disregard`, or carry the spouse's unused half if the rule's "split" is read as a pool. Add a test from the probe. |
| FC-5 | P1 | af_countable_income CO-946 | 3.544.A (D-80:4610-4617), AND-SO: "If the client has earned income ... 1. Deduct $65 from the gross earned income; and, 2. Divide the remainder by two (2)." 3.544.B: "Deduct $20.00 ... The result is countable unearned income." Unlike 3.533.A.2.f and 3.549.A.2.f, 3.544 has no paragraph that rolls the unused $20 onto earned income. | CO-946 applies the A.2.f rollover to every program. A probe AND-SO client with $465 of wages and no unearned income computes countable 190 and a $58 grant. 3.544 gives (465 - 65) / 2 = 200 and a $48 grant. The meaning of CO-946 cites 3.544 but applies the OAP and AND-CS rule. | Apply the rollover only when `af_is_oap_age` or `af_and_cs_eligible` (the branch CO-946 already uses for ISM). Add an AND-SO test. |
| FC-6 | P1 | af_category CO-953, af_and_so_eligible CO-1203 | 3.520.76 (D-80:2918-3046): a transfer without fair consideration within 36 months is presumed made to qualify. "D. ... Divide the uncompensated value by the TWFC monthly penalty value [the current grant standard] and round down ... This equals the number of months of ineligibility" (1 to 36 months). C.R.S. 26-2-111(1)(c) (D-59). | The transfer penalty has no item, fact or open question. A client in a penalty period is found eligible. | Add `af_twfc_uncompensated_value` (with its rebuttal and involuntary-transfer exceptions), `af_twfc_transfer_month` and `af_twfc_penalty_months` (floor of value ÷ grant standard, capped at 36), plus `af_is_in_twfc_penalty_period`, which every branch of CO-953 and CO-1203 reads. |
| FC-7 | P1 | af_and_so_eligible CO-1203 | 3.541.3 (D-80:4505-4548): "when the client's primary diagnosis is alcoholism or controlled substance addiction ... A. The client shall only be eligible for twelve (12) cumulative months in a lifetime ... B. The client shall agree to treatment ... D. If the client fails to comply with treatment ... discontinue". C.R.S. 26-2-111(4)(e). | Not modeled and not in any open question. An AND-SO client in month 13 of a substance-abuse disability, or one refusing treatment, is found eligible. | Add facts for the primary diagnosis, the cumulative months and treatment compliance, and a conjunct in CO-1203. |
| FC-8 | P1 | af_person_countable_resources CO-3400 | 3.520.75.E-F (D-80:2845-2880): "For OAP only, if the total face value ... is equal to more than $1,500 and the CSV ... is $250,000 or less ... If all policies were purchased more than forty-eight (48) months prior ... all CSV is exempt". 3.520.72.B.8 (D-80:2414): "Prepaid revocable funeral or burial expense contracts" are countable. | CO-3400 counts the whole cash surrender value whenever the face value is over $1,500. Its precision says E is "not modeled", but no open question carries it. An OAP client with an old $10,000 policy worth $5,000 is denied on resources, though the rule exempts the policy. Countable revocable burial contracts (B.8) and excess burial space (B.9) are never counted. | Add facts for the policies' purchase dates, the contributions within 48 months and the CSV, and apply E-F for an OAP client. Add a revocable burial-contract value to CO-3400. |
| FC-9 | P1 | af_meets_residency CO-942, af_category CO-953, af_and_so_eligible CO-1203, Adult Financial verification (CO-1436) | 3.520.64.B.2 (D-80:1844): "A person receiving financial assistance from another state shall not be eligible for Adult Financial programs in Colorado during any month in which a payment is made by the other state." 3.520.61.G (D-80:1765): "Apply for and accept all retirement and public assistance benefits for which they may be eligible, unless good cause". 3.520.71.B (OAP) and D (D-80:2273): the OAP client shall apply for SSI or Social Security when eligible. 3.520.71.C (D-80:2258): "clients referred to the SSA ... shall be required to provide verification of application for such benefits within eleven (11) calendar days" (60 days for AND-SO). 3.520.71.G: "Grant payments shall not be approved prior to receipt of proof of application or pursuit of other income". | The other-state bar is not modeled for Adult Financial (Colorado Works has `received_tanf_from_another_state_this_month`). Only AND-SO's duty to apply for SSI and SSDI is modeled (CO-2004). The OAP and AND-CS duties to apply for other benefits, and the document-collection rule of C and G (proof of application within 11 or 60 days), have no item. The phase-8 review left the OAP SSI duty "with [its] existing questions", but none exists. CO-13 p1 is an OAP client in exactly this position. | Add `received_af_type_assistance_from_another_state_this_month` to CO-942. Add `af_has_met_other_benefit_application_duty` (3.520.61.G, 3.520.71.B, D, G) as a conjunct for every program. Add `af_benefit_application_verification_is_pending`, with a due date of 11 days (60 from the interview for AND-SO), to CO-1436 and the outcome list. |
| FC-10 | P1 | missing: Adult Financial disaster assistance payment | 3.570.51.A (D-80:6937-6942): "The purpose of the disaster assistance payment is to provide disaster assistance to eligible clients ... The payment shall not exceed two thousand dollars ($2,000) per client, per disaster." 3.570.52: the client must be "approved for or receiving a grant payment during the time of the county, Governor, or federally declared disaster", have an emergent need related to it, and request it. | A payment the current rule provides has no item, outcome or open question. The phase-8 review noted it as unmodeled. | Model it as Colorado Works diversion is modeled: `af_disaster_assistance_eligible` (receiving or approved for an Adult Financial grant, a declared-disaster period, an emergent need, a request) and `af_disaster_assistance_payment` (the county-approved amount, capped by a dated `af_disaster_assistance_max` of $2,000). |
| FC-11 | P1 | af_requires_verification_of_marital_status CO-1670 | 3.520.63.A (D-80:1804): "The county department shall determine and verify if questionable the client's marital status as one of the following: 1. Single, never married; 2. Married; 3. Widowed; or, 4. Divorced or legally separated." C (D-80:1823): "If the client is divorced, legally separated or widowed, and this status is questionable, the client shall provide verification ... Death certificate or obituary of the client's spouse." | CO-1670 requires verification only when `marital_status` is `other`. The vocabulary fix round added `widowed` as its own option, and divorced is now carried as `single` (CO-844 meaning), so a questionable widowed or divorced status is never verified. The precision ("carries divorced, legally separated and widowed as 'other'") is stale. | Require verification when the status is questionable and is `widowed` or `other`, and add a `divorced` option (or a fact) so a questionable divorce can be asked for. Also read A's "verify if questionable" for married and single. |
| FC-12 | P1 | cw_pending_verification_count CO-1425, cw_person_pending_verification_count CO-1424, af_pending_verification_count CO-1436 | 3.604.3.B.2.e (D-81:1661): all participating clients shall provide "Verification of income of any member of the assistance unit or other household member whose income is used to determine eligibility and payment." 3.520.5.A.3 (D-80:1651): "Prior to approval of grant payments, the county department shall, at a minimum, verify potential income or unemployment benefits for the client, client's spouse, and sponsor(s)." | The Colorado Works count sums over `cw_assistance_unit_members` only, so the income of a minor parent's non-participating parent, a stepparent or another budgetary member is never pending. In CO-01, p3's $2,380 of wages is deemed to p4's unit (cw_countable_income 2037) with `earned_income_verification_document_received` false, and p4's count is 2, neither of which is p3's income. For Adult Financial, a deemed spouse's income is pending only if the spouse is himself OAP age or disabled. | Sum the income-verification items over `cw_budgetary_unit_members` plus the minor parent's parents and the sponsors. For Adult Financial, add the spouse's (and a deeming parent's) income pending items to the client's count. |
| FC-13 | P2 | OQ-550 (immigration_status CO-002, is_qualified_non_citizen CO-506) | OQ-550 says the Iraqi and Afghan special-immigrant statutes (Pub. L. 110-181 sec. 1244, Pub. L. 111-8 sec. 602) "were not fetched", so "Colorado Works and Adult Financial do not accept them". | govinfo.gov serves both laws (fetched 2026-11-22: PLAW-111publ8, PLAW-110publ181, HTTP 200), and law.cornell.edu serves the amended note under 8 U.S.C. 1101. That part is therefore not "blocked on a named document no allowed source serves" (criterion 2). Sec. 602(b)(8) as enacted gives Afghan special immigrants refugee benefits "for a period not to exceed 8 months". Later amendments, not read here, change this. Whether a special immigrant is exempt from the five-year bar for Colorado Works is answerable from the amended text. | Fetch the current text (the 8 U.S.C. 1101 note), decide the Colorado Works and Adult Financial treatment, and narrow OQ-550 to the SAVE list. |
| FC-14 | P2 | af_category CO-953, af_meets_resource_limit CO-948 | 3.520.71.A.1 (D-80:2210): "Have countable resources below the resource limit". 3.520.72.A states the limit, and C.R.S. 26-2-111(2)(a)(I) applies SSI resource eligibility, which is "not more than". | CO-948 uses ≤, which follows the statute and SSI. The boundary choice against the rule's "below" is not recorded in any open question. | Record it as a state policy choice in a new open question, or add it to OQ-153's pattern. |
| FC-15 | P2 | cw_budgetary_member_deemed_income CO-2353 | 3.605.1.A.4.a: "The needs of the stepparent ... shall be deducted". | It deducts a need-standard figure for a stepparent, the same choice OQ-102 records for a minor parent's parent, but carries no open question. | Add OQ-102 to CO-2353's `open`. |
| FC-16 | P2 | af_meets_residency CO-942 | — | The precision says incarceration "is read from is_inmate_of_public_institution (CO-1105)", but the derivation reads `af_is_inmate_of_correctional_institution` (CO-3343). | Correct the precision. |
| FC-17 | P2 | adult_financial_cash_income CO-1713, af_died_while_receiving_af_or_medicaid CO-1220 | 3.570.43.A.1: burial is available when the client "was receiving Old Age Pension (OAP), Aid to the Needy Disabled (AND-SO OR AND-CS), Home Care Allowance, and/or Colorado Medicaid". | The fact still names "Aid to the Blind", which is no longer a program (OQ-112), and does not include HCA, so an HCA-only decedent is not read as an Adult Financial recipient. This rarely matters, because HCA clients are on SSI and Medicaid or on OAP or AND-SO. | Reword the meaning, and read HCA receipt in CO-1220. |
| FC-18 | P2 | cw_diversion_eligible CO-1270 | 3.606.8.A.7: "A client shall not receive a diversion grant for any month in which he/she receives basic cash assistance." | Not a conjunct. It is reached only through `needs_long_term_cash_assistance`. | Add `[not, receives_tanf_cash]` for the month, or document the reliance. |
| FC-19 | P2 | cw_is_deceased_client CO-1504 | 3.606.7.B.1: "a deceased client who received Colorado Works while alive". | It requires `tanf_cash_income` in the month of death, which is narrower than the rule. | Read Colorado Works receipt at or before death, or record the reading. |
| FC-20 | P2 | Colorado Works supportive payments (3.606.8.B) | 3.606.8.B: "To receive supportive payments ... clients must have an assessed need". | County-assessed supportive payments are not modeled. They are non-entitlement and need-based. | Record as out of scope in the cash chapter notes, or model them as diversion is modeled. |
| FC-21 | P2 | af_burial_cost_limit CO-1227 | 3.570.43.A.4 states the $2,500 limit without a start date. The rule version is dated 2026-03-02. | The only version runs from 2026-03-02, so a death before that date has no limit in force. | Add an earlier version from the burial program's own source date. |
| FC-22 | P2 | OQ-114, OQ-390 (Resolved) | — | Both are marked Resolved, but their residual parts (the married $20 split, FC-4; the exclusion inputs, FC-2 and FC-3) are unmodeled. | Reopen the residual parts, or close them with FC-2 to FC-4. |
| FC-23 | P2 | docs/reviews/cash-snap-other-phase-8.md:681 | — | It says Colorado Works strikers, the OAP SSI duty, the AND SSN requirement and the AF disaster payments "stay unmodeled with their existing questions", but only the AND SSN requirement is covered (by the verification items). | Fixed by FC-1, FC-9 and FC-10. |
| FC-24 | P2 | af_hca_financially_eligible CO-1215 | 3.570.13.B.3: "and remain continuously eligible for both benefits". | The grandfathered route checks receipt on 2013-12-31 and age, not continuing OAP eligibility. The volume relies on the case stating `received_oap_and_hca_grandfathered` only while it remains true. | Document that in the fact's meaning, or add `af_category = oap` as a conjunct of the grandfathered branch. |

P3 notes (no action needed for the stopping rule): OQ-138's body still cites `snap_receives_disability_or_blindness_payment` in its dated paragraph. CO-946's rationale says deeming is "not modeled per OQ-114", which has since been superseded.

## Coverage map

Every pathway, category, program and computation the current text provides in scope is listed below with the items that carry it. "Gap" marks a provision with no item (P1 above).

### Colorado Works (9 CCR 2503-6)

| Provision | Items |
|---|---|
| Dependent child (3.601) | cw_is_dependent_child CO-901, CO-270, CO-271 |
| Assistance unit: required, optional and excluded members (3.604.2.C) | CO-900, CO-2349, CO-2350, CO-2558, CO-2608, CO-841, CO-2842, CO-2383 |
| Budgetary unit (3.604.2.D) | CO-2352, CO-2353 |
| Living in the home and temporary absence (3.604.2.E, G, I) | CO-3354, CO-3355-3357; OQ-611 |
| Institution resident and out of state (3.604.2.O) | **gap (FC-1)** |
| Caretaker and standards row (3.606.1.F) | CO-926, CO-927, CO-2351, CO-911, CO-912, CO-274-277, CO-351-354; OQ-101 |
| Residency, TANF from another state (3.604.1.A) | CO-904 |
| Lawful presence, citizenship, five-year bar (3.604.1.B, L.3) | CO-905 (shared), CO-928, CO-2557 |
| Institution patient and inmate (3.604.1.D-E) | **gap (FC-1)** |
| Strikers (3.604.2.L.2) | **gap (FC-1)** |
| Disqualified members: IPV, fleeing felon, SSN, status (3.604.2.M) | CO-928, CO-2557, CO-2561 |
| Minor parent living arrangement (3.604.2.N) | CO-906 |
| Child support assignment and cooperation (3.604.4.A) | **gap (FC-1)** |
| Earned income, self-employment, the $55 and $22 child-care allowances (3.605.2) | CO-1716, CO-1705, CO-1706, CO-3376, CO-3377 |
| Short-term and subsidized employment (3.605.2.C, 3.605.4.B.35) | **gap (FC-2)** |
| Unearned income and exemptions (3.605.3-4) | CO-908, CO-2341, CO-2340, CO-3385, CO-2871; partial, **FC-2** |
| Child support at application and redetermination (3.605.5) | CO-2550-2554, CO-2555, CO-2556, CO-2843 |
| Minor-parent and stepparent deeming (3.605.1.A.4) | CO-909, CO-2000, CO-2353; OQ-102 |
| Sponsor deeming (3.605.1.A.5) | CO-2360, CO-2364, CO-2365, CO-2366-2368 |
| Disqualified members' income (3.605.1.A.6, 3.604.2.M) | CO-910, CO-923 |
| Eligibility income test (3.606.1.H, J; 3.606.2.A.1) | CO-907, CO-910, CO-913, CO-273; OQ-153 |
| Payment disregards of 100% and 67% (3.606.2) | CO-922, CO-923, CO-350, CO-1503 |
| Grant, drop cents, pregnancy allowance (3.606.1.G, I, K) | CO-1260, CO-914, CO-355 |
| SB 26-181: no COLA for SFY 2026-27 and 2027-28 | versions on CO-274-277 and CO-351-354 to 2028-07-01; OQ-530 |
| Time limit, extensions, Indian Country (3.606.6) | CO-915, CO-918, CO-924, CO-925, CO-278 |
| Sanctions (3.608.4) | CO-1264, CO-1265, CO-1262, CO-1263; OQ-252 |
| Work-eligible and participation (3.607.1; 45 CFR 261) | CO-919, CO-920, CO-2885, CO-280-282, CO-3044; OQ-104 |
| Diversion (3.606.8.A) | CO-1270, CO-2560; OQ-252, OQ-531 |
| Supportive payments (3.606.8.B) | not modeled (FC-20, P2) |
| Death reimbursement (3.606.7) | CO-1504, CO-1507, CO-1508, CO-1505, CO-1506; OQ-354 |
| Verification (3.604.3; 3.602.1) | CO-1420-1427, CO-1644-1656, CO-2583, CO-2588, CO-1351, CO-1352, CO-1598, CO-2371; non-unit income **gap (FC-12)** |

### Adult Financial (9 CCR 2503-5)

| Provision | Items |
|---|---|
| Ages (3.520.61.A) | CO-940, CO-285, CO-287, CO-288 |
| Residency, inmate, fleeing felon (3.520.61.B, 3.520.64) | CO-942, CO-3343; other-state assistance **gap (FC-9)** |
| Citizenship and five-year bar, AND (3.520.61.C, 3.520.67-68); OAP statute override | CO-905, CO-929; OQ-591 |
| SSN, AND (3.520.61.D, 3.520.65) | through verification, CO-1430, CO-1661 |
| CW bar (3.520.61.F, 3.520.71.F) | CO-1511 |
| Duty to apply for other benefits (3.520.61.G, 3.520.71.B-D, G) | AND-SO only (CO-2004 in CO-1203); OAP and AND-CS **gap (FC-9)** |
| Resources and limits; sponsor resources (3.520.72-77) | CO-947, CO-948, CO-2389, CO-2390, CO-3400, CO-3045, CO-3046, CO-3399; OAP life-insurance and burial-contract **gap (FC-8)** |
| Transfers without fair consideration (3.520.76) | **gap (FC-6)** |
| Income, disregards, SSI step, rollover (3.533, 3.544, 3.549) | CO-946, CO-3047-3049, CO-1707, CO-1708; married split **FC-4**; AND-SO rollover **FC-5** |
| Exempt income (3.520.786) | CO-2342, CO-2343; partial, **FC-3** |
| Deeming: spouse, parents, sponsor (3.534, 3.544.D-G, 3.549.C-G) | CO-2384, CO-2386, CO-2392, CO-3050, CO-3051, CO-3053, CO-3054; OQ-553 |
| ISM (3.520.79) | CO-1512, CO-1513 |
| OAP category and grant, floor, proration, cents (3.530-3.533, 3.581.D-E) | CO-953, CO-949, CO-951, CO-289, CO-1200, CO-2603, CO-2602, CO-2604 |
| AND-SO category and grant (3.540-3.544) | CO-1203, CO-944, CO-952, CO-290; OQ-138 |
| AND-SO substance-abuse limits (3.541.3) | **gap (FC-7)** |
| AND-CS category, grant and floor (3.546-3.549) | CO-950, CO-952, CO-291, CO-1201 |
| PNA, psychiatric facility, unlicensed facility (3.532.D-F, 3.543.D-F, 3.548.D-F) | CO-1510, CO-2006, CO-2007, CO-1509, CO-3052, CO-3338; OQ-352 |
| Home Care Allowance (3.570.1) | CO-1206, CO-1215, CO-1216, CO-1217, CO-1219, CO-2010, CO-1202, CO-1209-1214, CO-2600; OQ-250 |
| Burial assistance (3.570.4) | CO-1220, CO-1225, CO-1226, CO-1229-1232, CO-3312, CO-1227, CO-1228, CO-3313; OQ-355 |
| Disaster assistance payment (3.570.5) | **gap (FC-10)** |
| Verification (3.520.4-3.520.69, 3.520.72.D-F, 3.520.783.E, 3.541.1) | CO-1430-1438, CO-1658-1674, CO-2584, CO-2589, CO-2592, CO-1353, CO-1599; marital status **FC-11**; spouse income and benefit application **FC-12** and **FC-9** |

## Correctness checks (56 rules against the current text)

Each check states the result and the governing text.

- Colorado Works chart (D-81:2997-3012), all three rows and each-additional amounts: correct.
  - No caretaker, need 0/117/245/368/490/587/678/755/830/904/977 (+67) (CO-351); grant 0/173/362/543/724/869/1003/1117/1226/1337/1460 (+90) (CO-352).
  - One caretaker, need 253…1065 (CO-274); grant 374…1574 (CO-276).
  - Two caretakers, need 357…1155 (CO-353); grant 527…1707 (CO-354).
  - Each additional child: 67 (CO-275) and 90 (CO-277).
- SB 26-181 sec. 2 (D-171) adds C.R.S. 26-2-709(1)(b)(I.5): no COLA for SFY 2026-27 or 2027-28, repealed 2028-07-31, with the COLA resuming "JULY 1, 2028". The table versions to 2028-07-01 are right, and OQ-530 is right.
- Pregnancy allowance $10 through the month the pregnancy ends (3.606.1.G): correct (CO-355, CO-1260).
- $90 disregard at application (3.606.2.A.1): correct (CO-273, CO-907).
- 100% for the first certification period and for a new source, 67% otherwise (3.606.2.A): correct (CO-1503, CO-350, CO-922).
- Equals or exceeds the need standard means ineligible (3.606.1.J.4): correct (CO-913; OQ-153).
- Grant is the standard less net countable income, cents dropped (3.606.1.I, K): correct (CO-1260, CO-914).
- Child support counted for eligibility at application and excluded from the grant (3.605.5.A-B): correct (CO-2553, CO-2554).
- At redetermination, six of six months and an average over $500 (3.605.5.C): correct (CO-2550-2553, CO-2555, CO-2556).
- Stepparent and minor parent's parent: gross less $90, less support paid out, plus unearned, less needs (3.605.1.A.4): correct (CO-909, CO-2000, CO-2353).
- Sponsor: lesser of 20% or $175, the 125% FPG exemption, and the c.1-6 exemptions (3.605.1.A.5): correct (CO-2364-2368). c.3 (pre-12/19/1997 affidavit) and c.7 are fact-dependent.
- Disqualified members' income: status and SSN members net of the $90, IPV and fleeing-felon members gross (3.604.2.M, 3.605.1.A.6): correct (CO-910, CO-923).
- SSI and Title IV-E recipients excluded from the unit and their income exempt (3.604.2.C.3, 3.605.4.B.11, 27, 32): correct (CO-2350, CO-841).
- Required and optional members (3.604.2.C.1-2): correct (CO-900, CO-2349, CO-2558, CO-2842).
- Dependent child under 18, or 18 and finishing secondary school before 19 (3.601): correct (CO-901).
- Absences: 45 days, six-month parenting plan, three-month voluntary foster care (3.604.2.G, I): correct (CO-3355-3357, CO-3354).
- TANF from another state bars the month (3.604.1.A.3): correct (CO-904).
- Minor parent living arrangement (3.604.2.N.1-2): correct (CO-906).
- Sanctions: $1, then 25%, 25%, 100% closure; the highest level when several members are sanctioned (3.608.4.C, F): correct (CO-1262-1265).
- Time limit: 60 months for adult members, Indian Country months excluded, no extension when a member is disqualified (3.606.6.A, C, F): correct (CO-278, CO-915, CO-925).
- Death reimbursement: $1,500 maximum, $2,500 combined charges, prepaid plot under $2,000 exempt (3.606.7.A.2, F.2.d): correct (CO-1505, CO-1506, CO-1508).
- Self-employment child-care allowances of $55 and $22 (3.605.2.E.1.b): correct (CO-3376, CO-3377).
- Verification due in 11 days (3.604.3.A.2): correct (CO-1351).
- Lawful presence verification at 18 and over (3.604.3.G): correct (CO-1352).
- Pregnancy verified only when there are no children (3.604.3.C.7): correct (CO-1423).
- Caretaker responsibility verified unless the caretaker is a parent (3.604.3.B.2.d): correct (CO-1421).
- OAP grant standard $1,032 from 2026-01-01 (3.530.A): correct (CO-289).
- ISM maximum $351 (3.530.B, 3.546.D), and the formula 994 × 33.33% + 20 = 351.3, rounded (3.520.79.E): correct (CO-1513).
- OAP floor $189 (3.530.C): correct (CO-1200).
- AND-SO standard $248 from 2022-04-01 (3.540.A): correct (CO-290).
- AND-CS standard $994 and floor $13 (3.546.A, E): correct (CO-291, CO-1201).
- HCA floor $977 for all tiers from 2026-01-01 (3.570.11.B): correct (CO-1202).
- HCA tiers: capacity 21 or more; need 1-23, 24-37, 38-51; minimum age 5 (3.570.13.C.3, 3.570.11.A): correct (CO-1209-1214, CO-1216).
- HCA financial routes: SSI, AND-SO, or OAP and HCA as of 2013-12-31 (3.570.13.B): correct (CO-1215), with the P2 note FC-24.
- HCA denied when functionally eligible for HCBS, with the three-month transition (3.570.11.A.2): correct (CO-1217).
- HCA home excludes a shelter or other temporary setting (3.570.12): correct (CO-2010).
- PNA of $79 after 30 consecutive days; psychiatric facility at 65 for OAP; no PNA or grant in an unlicensed facility (3.532.D-F, 3.543, 3.548): correct (CO-1509, CO-3338, CO-3052, CO-2006, CO-2007).
- Partial-month table and cents dropped except when SSI reduces the grant (3.581.D-E): correct (CO-2602, CO-2603, CO-2604, CO-951, CO-952).
- Ages: OAP 60; AND-SO 18-59 (blind 0-59); AND-CS 0-59 (3.520.61.A): correct (CO-285, CO-287, CO-288).
- Resource limits $2,000 and $3,000, sponsor $2,000, $3,000 or $4,000 (3.520.72.A): correct (CO-3045, CO-3046, CO-947). See FC-14.
- Life insurance face value of $1,500 or less: CSV exempt (3.520.75.D): correct (CO-3399). E-F is FC-8.
- $65 and one-half (3.533.A.1, 3.544.A, 3.549.A.1): correct (CO-3047, CO-3048).
- $20 general disregard (3.533.A.2.c): correct (CO-3049). The married split is FC-4.
- SSI subtracted and added back (3.533.A.2.b-d, 3.549.A.2.b-d): correct (CO-946; OQ-351).
- Rollover in OAP and AND-CS (A.2.f): correct. Applying it to AND-SO is wrong (FC-5).
- AND-CS: on SSI below the SSI benefit standard ($994) (3.546; 3.510): correct (CO-950).
- AND-CS gross SSI when SSA recovers an overpayment (3.548.G): correct (ssi_income is gross).
- Spouse deeming for OAP: unearned less the OAP standard, children's needs at half the SSI standard, medical payments and support (3.534.B): correct (CO-2384, CO-2392, CO-3050).
- Spouse deeming for AND-SO: $20 unless the client has unearned income (3.544.E.2); for AND-CS, the client's unused remainder of the $20 (3.549.D.2): correct (CO-2384).
- No deeming from a relative on AF, SSI or Medicaid with income within the standard (3.534.C, 3.544.F, 3.549.F): correct (CO-2384).
- Sponsor deeming deductions: SSI standard, the spouse's half or full, half per dependent, undivided among several clients (3.534.D, 3.544.G, 3.549.G): correct (CO-2386, CO-3051; OQ-553).
- ISM exclusions: owner, subsidized housing, homeless, paying a fair share at market value, paying the maximum or more; the SSA ISM matched (3.520.79.B-C): correct (CO-1512).
- ISM applies to OAP and AND-CS only (3.520.79 heading): correct (CO-946).
- CW bar on AF, including closures for sanction, demonstrable evidence and withdrawal (3.520.61.F, 3.520.71.F.2): correct (CO-1511).
- Burial: $1,500 maximum from 2020-03-01; total cost of $2,500 or less, plot excluded; order of offsets is insurance, estate, then the responsible person's excess over $2,000 or $3,000, with a widow taking the individual limit (3.570.43.A-D): correct (CO-1228, CO-1227, CO-1230-1232, CO-1225, CO-1226, CO-3312, CO-3313). See FC-21 and OQ-355.
- AF verification due in 11 days (3.520.4.D.1.b): correct (CO-1353).
- AND-SO medical certification due 30 days after the interview (3.541.1.A.1.b): correct (CO-1599, CO-2592).
- SSN verification, with no duty to apply for an OAP non-citizen (3.520.65.A.2): correct (CO-1430).
- Citizenship verified for AND when questionable (3.520.67.B): correct (CO-1431).
- Resources verified, with no re-verification for SSI recipients unless questionable, and again at the 24-month redetermination (3.520.72.D.4, F): correct (CO-1433).
- Marital status verification: wrong (FC-11).

## Cases recomputed by hand

Each case was compared with `npx vite-node scripts/eval-case.ts co <CASE> ...`. Every hand figure matched the engine and the stored expectation.

### CO-07 (2026-10)

**p1, p2, p4: Colorado Works unit.** The unit is two caretakers and one child (p3 is on SSI and excluded under 3.604.2.C.3).
- Need standard $439, grant standard $649.
- p1 has $400 of wages, receives TANF and is past the first certification, with no new source, so the 67% disregard applies: 400 − 268 = 132. 132 < 439, so the unit is eligible.
- Grant before sanction: 649 − 132 = 517.
- Second-level sanction: 25% = 129.25, so 517 − 129.25 = 387.75, cents dropped: $387.
- Time limit: p2 has 61 months, but p1's domestic violence extension is approved and no member is disqualified, so the limit is not reached.
- Engine: 439 / 649 / 132 / 517 / 129.25 / 387 / false.

**p3: AND-CS.** p3 is 9 and on SSI of $700 < $994.
- Countable income: 700 − 700 + 0 + 700 = 700 (SSI only, no $20).
- The parents are on Medicaid with income within $994 (p1 400 + 129, p2 129), so nothing is deemed.
- Grant: 994 − 700 = $294, above the $13 floor. Engine: 700 / and_cs / 294.

**p5: OAP.** p5 is 62 with $900 of Social Security.
- Countable income: 900 − 20 = 880.
- Grant: 1,032 − 880 = 152, below the floor, so $189. Engine: 880 / oap / 189.

### CO-13 (2026-11)

**p1: OAP and HCA.** p1 is 76 with $700 of Social Security and no ISM.
- Countable income: 680. Grant: 1,032 − 680 = $352.
- HCA tier: capacity 24 and need 30, so tier 2.
- HCA financial test: the grandfathered route applies (63 on 2013-12-31).
- HCA grant: max(977, 900) = $977. Engine: 680 / 352 / oap / tier_2 / 977.

**p2: burial.** p2 died 2026-11-05 on Medicaid.
- Cost test: 2,800 − 600 plot = 2,200 ≤ 2,500 (OQ-355 reading).
- Widow p1 has $1,000 against the $2,000 individual limit, so her excess is 0.
- Unmet cost: 2,800 − 300 − 200 − 0 = 2,300. Benefit: min(2,300, 1,500) = $1,500.
- Engine: 2300 / 1500. Death reimbursement: 0 (p2 was not a Colorado Works client).

**p3 and p4: Colorado Works unit.** One caretaker and one child, no income.
- Need standard $331, grant standard $488.
- Second-level sanction: 488 × 25% = 122, so $366. Engine: 331 / 488 / 366.

### CO-85 (2026-11, redetermination)

| Unit | Child support history | Rule (3.605.5.C) | Hand result | Engine |
|---|---|---|---|---|
| p3 and p4 | $550 in all six months | average 550 > 500, counted | 550 ≥ 331, ineligible_income, grant 0 | 550 / ineligible_income / 0 |
| p5 and p6 | five of six months | inconsistent, not counted | 0, eligible, grant $488 | 0 / eligible / 488 |
| p7 and p8 | consistent, average $450 | ≤ 500, disregarded | eligible, grant $488 | 0 / eligible / 488 (unit average 450) |

### CO-86 (2026-10)

**p1** is pregnant, alone, with no income. Her unit is priced at one caretaker and no children: need $253, grant $374, plus the $10 pregnancy allowance, so $384, eligible. **p2** is ineligible_no_dependent_child. The engine matches.

### CO-01 (2026-10), p4's unit

- p4 is 17, a minor parent living with her mother p3, so she is a dependent child. Her unit (p4 and her baby p5) has no caretaker and two children: need $245.
- p3's wages of $2,380 are deemed: 2,380 − 90 − 253 = 2,037 ≥ 245, so the unit is ineligible_income. The engine gives cw_countable_income 2037 and ineligible_income.
- This case also shows FC-12: p3's income is unverified, but it is not counted as pending.

### Probes (constructed with the engine; not stored cases)

- **AND-SO, $465 of wages:** the engine gives 190 and a $58 grant. The rule (3.544) gives 200 and $48 (FC-5).
- **Two married OAP clients, $500 of Social Security each:** the engine gives 480 and $552 each. The rule (3.533.A.2.c.1) gives 490 and $542 each (FC-4).

## Verification (document collection) confirmation

**Colorado Works (3.604.3; D-104) is modeled for:**
- lawful presence: CO-1420, CO-1644, CO-1367 (Rule 5 edition; OQ-376's CW part resolved);
- citizenship: CO-1645;
- immigration status through SAVE: CO-1646;
- SSN: CO-1647;
- caretaker responsibility and household composition: CO-1421, CO-1648;
- earned and unearned income of unit members: CO-1649, CO-2588;
- residency: CO-1651;
- school enrollment for 18-year-olds: CO-1422, CO-1652;
- pregnancy without children: CO-1423, CO-1653;
- sponsor: CO-1654;
- due dates of 11 days, 30 days for status, and the good-cause extension: CO-1426, CO-1656;
- counts and status: CO-1424, CO-1425, CO-1427, CO-1655.

**Colorado Works gap:** the income of non-unit household members whose income is used (FC-12).

**Adult Financial (3.520.4-3.520.69, 3.520.72.D-F, 3.520.783.E, 3.541.1; D-105) is modeled for:** age, residency, identity, SSN, citizenship, immigration status, resources, earned and unearned income, SSI disability, AND-SO medical certification, marital status and sponsor information (CO-1658-1674), the 11-day due date and the AND-SO 30-day certification (CO-1437, CO-1438, CO-2592).

**Adult Financial gaps:**
- marital status for a widowed or divorced client (FC-11);
- proof of application for SSA and other benefits within 11 or 60 days (FC-9);
- the spouse's income (FC-12).

## Open-question confirmations (cash scope)

Each open or partly resolved question in scope was read against the current text.

| OQ | Class line | Confirmed? | Text checked by this pass |
|---|---|---|---|
| OQ-101 | state policy choice | Yes | 3.606.1.F chart (D-81:2997-3012) has no caretaker, one caretaker and two caretakers rows only. |
| OQ-102 | state policy choice | Yes | 3.605.1.A.4.a (D-81) names no figure for "needs". CO-2353 makes the same choice for a stepparent and should cite this question (FC-15). |
| OQ-104 | state policy choice | Yes | 45 CFR 261.31 and 261.35 state weekly averages, and D-81 states no monthly figure. Participation is not an eligibility conjunct. |
| OQ-138 | needs Legal (counts as a policy choice) | Yes | 3.540 (D-80:4194-4199), "have not been approved for ... SSI ... or SSDI", against C.R.S. 26-2-111(4)(a) (D-59). |
| OQ-153 | state policy choice | Yes | 3.606.1.H "shall not exceed" against J.4 "equals or exceeds ... not eligible" (D-81:3027-3056). |
| OQ-250 | blocked on a named document | Yes | 3.570.11.B, D and 3.570.13.C-D (D-80:5680-5890) state no tier maximum; D says "The HCA grant standards shall be adjusted to stay within available appropriations". The schedule is administrative, and cdhs.colorado.gov is refused. |
| OQ-252 | state policy choice | Yes | 3.606.8.A.6 (D-81) leaves the higher limit to county policy and the State plan. |
| OQ-352 | state policy choice | Yes | 3.532.C-F, 3.543.D-F and 3.548.D-F (D-80) are silent on income against the $79. |
| OQ-354 | state policy choice | Yes | 3.606.7.B.2, F.2.b, c, f (D-81) give no order. F.2.c's voluntary contributions remain noted. |
| OQ-355 | state policy choice | Yes | 3.570.43.A.4 against F.1 (D-80:6735-6905). |
| OQ-530 | blocked on a named document | Yes | SB 26-181 (D-171) resumes the COLA from July 1, 2028 using SSA COLAs that are not yet set; no rule version after 07/01/2025 (SOS ruleId 3145, checked 2026-11-22). |
| OQ-531 | blocked on a named document | Yes | 3.606.8.A (D-81) has no cap and points to the TANF State Plan, which is not on an allowed host. |
| OQ-553 | state policy choice | Yes | 3.520.68 in D-80 has paragraph A only (D-80:2094-2099), so the cross-reference "3.520.68.B.2.b.1" defines nothing. |
| OQ-591 | needs Legal | Yes | C.R.S. 26-2-111(2)(c) (D-59) against 3.520.5.D "For AND only" and 3.520.67.E (D-80:1717, 2069). |
| OQ-611 | state policy choice | Yes | 3.604.2.E, G, I (D-81:1330-1370). |
| OQ-613 | state policy choice | Yes | 3.605.4.B.24.b (D-81) and 3.601 have no definition of a full-time employee. |
| OQ-550 (shared; CW and AF read is_qualified_non_citizen) | blocked on a named document | **Partly** | The SAVE list half is blocked (uscis.gov is refused). The special-immigrant statutes are on govinfo.gov and law.cornell.edu, which are allowed, so that half is answerable (FC-13). |
| OQ-376 | state policy choice (LEAP part only) | — | The CW part is resolved and confirmed: 3.604.3.I.1 incorporates Rule 5 (Mar. 2, 2021). The remainder is out of cash scope. |

**Resolved questions found to have unmodeled remainders:**
- OQ-114 (married $20 split, FC-4).
- OQ-390 (the CW and AF exclusion inputs are closed lists, FC-2 and FC-3).

**Rules the phase-8 review left "with existing questions" that have no question:**
- Colorado Works strikers (FC-1).
- The OAP SSI application duty (FC-9).
- The AF disaster payment (FC-10).

## P2 dispositions

| P2 | Proposed disposition |
|---|---|
| FC-13 | Fix before certification: fetch and record, then narrow OQ-550. Without it, criterion 2 fails for that part. |
| FC-14 | Record as a state policy choice. |
| FC-15 | Cite OQ-102 on CO-2353. |
| FC-16 | Correct the precision text. |
| FC-17 | Correct the precision text. |
| FC-18, FC-19, FC-24 | Small derivation or meaning fixes. Can follow the P1 round. |
| FC-20 | Out of scope (non-entitlement, county-assessed): record it in the chapter notes. |
| FC-21 | Add an earlier parameter version. |
| FC-22, FC-23 | Governance hygiene, closed by the P1 fixes. |

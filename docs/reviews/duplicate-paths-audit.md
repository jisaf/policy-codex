# Duplicate paths within a program (step 5 audit)

Date: 2026-11-23. Ledger: `volumes/co` at 26242bc. Report only: no item is changed by this audit.

Step 5 of the plan (docs/plan-colorado.md, "plan for a trustworthy, approvable codex"): no duplicate paths within a program, verification items included. A duplicate path is two items, or two chains, that compute the same rule outcome or the same quantity from the same rule text, so that an edit to one leaves the other stale, or the two can give different answers for one household.

## Method

1. **Candidates, by script.** `npx vite-node scripts/audit/duplicate-paths.ts` groups every item by program and reports six signals:
   - *exact*: identical derivations (none found);
   - *inline*: an item contains, as a proper subtree, the whole derivation of another item of its program that it does not read (it recomputes that item);
   - *subtree*: two items of a program that do not read each other share a subtree of at least 12 nodes (the same computation written twice);
   - *similar*: same type and scope, a cited excerpt in common and meaning terms overlapping at least 0.45;
   - *figure*: two parameters with the same value on the same dates;
   - *verify*: a verification item and a non-verification item reading at least two of the same supplied facts directly, the verification item not reading the other.
   It raised 222 candidates (Medicaid 83, SNAP 39, CCCAP 37, Adult Financial 30, Colorado Works 22, LEAP 3, CHP+ 2, SUN Bucks 1, shared items 5).
2. **Reading by hand.** Each candidate was read against the two items' meanings, excerpts and derivations (`scripts/audit/show.ts`). A candidate was kept when the two compute the same quantity or test from the same rule paragraph; it was dropped when the overlap is a common idiom (the spouse filter `filter(persons, rel(spouse))`, the blind-or-disabled test, the age-under-N test), parallel items for different elements (one verification flag per element), or two figures that merely share a value (0.5, 1.33, $1,500, 12 months). Beyond the script, the verification items of every program were read against the eligibility items that establish the same fact (each `*_requires_verification_of_*` against the item whose rule it serves).
3. **Can they diverge today?** Where two paths are not written identically, a hand household was built to show a difference. `scripts/audit/duplicate-paths-households.yaml` holds them; `npx vite-node scripts/audit/probe.ts -- scripts/audit/duplicate-paths-households.yaml` evaluates both sides of each pair. A household that gives two answers today is a **P1**. Two paths that agree today but would drift apart on the next edit are P2.

Dispositions: **merge** (one item, the other removed and its readers repointed); **read** (one item reads the other, or both read a new shared item); **keep + siblings** (the rule text states it twice, so both stay, registered as `siblings` so a change to one flags the other).

## Summary

| Program | Duplicate pairs | Can diverge today (P1) |
|---|---|---|
| Medicaid | 15 | 4: Pickle countable income (D-M1), DAC countable income (D-M2), Pickle parental deeming fill-up (D-M3), ineligible child allocation for a child living away (D-M4) |
| CHP+ | 1 | 0 |
| SNAP | 6 | 2: prorated initial-month allotment ignores the disqualified-member cap (D-S3); ABAWD work hours met by unpaid work are not verified (D-S6, verification) |
| Colorado Works | 5 | 1: non-parent caretaker tested from raw edges in the optional-member and verification items (D-W1, verification) |
| Adult Financial | 4 | 0 |
| CCCAP | 5 | 0 |
| LEAP | 2 | 0 |
| SUN Bucks | 0 | 0 |
| **Total** | **38** | **7** |

Already registered as siblings (kept, no action): CO-605/CO-5901, CO-4634/CO-5221, CO-4626/CO-5222. CO-4626/CO-5222 is listed below because the two give different answers today (the known fill-up gap recorded in the 2026-11-23 handoff).

## P1: answers that differ today

| # | Pair | Household (in duplicate-paths-households.yaml) | The two answers |
|---|---|---|---|
| D-M1 | CO-1158 `ma_pickle_countable_income` vs CO-607 `ma_ssi_countable_income` (through CO-605, CO-606, CO-2279, CO-5900) | MA-pickle-eligibility: aged Pickle applicant (71) whose OASDI is unchanged since the loss, living with an ineligible spouse earning $3,300 a month and their ineligible child (10). | The SSI method gives countable income $1,359 (3,300 − the $497 ineligible child allocation − 20 − 65, halved); the Pickle copy gives $1,607.50 (no child allocation). Against the couple FBR of $1,491 the SSI-method figure passes and `ma_pickle_eligible` (CO-1159) is false. With no OASDI increase to disregard, § 8.100.6.E's countable income should equal the SSI method's. CO-1158 also omits H.4.c's one-third child support reduction for an unemancipated child (CO-5900). |
| D-M2 | CO-1160 `ma_dac_countable_income` vs CO-607 | The same household (p1's `ma_dac_countable_income`). | $1,607.50 against the SSI method's $1,359, for the same reason; CO-1162 (disabled widow(er)s) reads CO-1160 and inherits it. |
| D-M3 | CO-5222 `ma_pickle_parental_income_deemed` vs CO-4626 `ma_ssi_parental_income_deemed` (registered siblings) | MA-pickle-fill-up: two disabled children share $2,000 of deemed parental income; one child's benefit reaches zero at $300. | The SSI path deems $300 and $1,014 (20 CFR 416.1165(e)(3) fill-up); the Pickle copy deems $1,000 to each. Known, recorded in CO-5222's precision; listed because the sibling registration does not stop the answers differing. |
| D-M4 | CO-2277 `ma_ssi_ineligible_child_allocation` vs CO-4633 `ma_ssi_deeming_ineligible_child_allocation` | MA-child-allocation-institution: aged applicant and ineligible spouse; their child (10) lives in another dwelling, in a medical institution; their disabled child (8) applies. | CO-2277 gives the applicant a $497 allocation for the institutionalized child; CO-4633 gives the disabled child's parental deeming none for the same child. Both cite § 8.100.5.H.3.a.i ("an unemancipated child in the home"); CO-2277's meaning says "in the home" but its derivation tests neither `lives_with` nor `resides_in_medical_institution`. |
| D-S3 | CO-2308 `snap_prorated_initial_month_allotment` vs CO-2307 `snap_full_month_allotment` (and CO-4182) | SNAP-prorated-cap: an initial month prorated from the 1st, household with a member disqualified under 273.11(c)(1) whose cap binds (the household's own allotment $546, the cap $400). | Full month $400; the prorated initial month $546, because CO-2308 recomputes the allotment from `snap_maximum_allotment − snap_benefit_reduction` and never applies `snap_allotment_cap_for_disqualified_members`. For an application on the 16th of a 31-day month the prorated figure is $281 where the capped figure gives $206. |
| D-S6 | CO-1386 `snap_requires_verification_of_work_hours` vs CO-415 `snap_meets_abawd_work_requirement` (verification vs eligibility) | SNAP-unpaid-work: an ABAWD who meets the requirement with 85 hours of unpaid or in-kind work and no paid hours. | CO-415 true (4.311.B.1.a counts work "without pay"); CO-1386 false: it reads only `hours_worked` and `work_program_hours`, so the hours that satisfy the requirement are never verified (7 CFR 273.2(f)(1)(xiv)). Community service hours are missed the same way. |
| D-W1 | CO-2349 `cw_is_optional_assistance_unit_member` and CO-1421 `cw_requires_verification_of_household_composition` vs CO-2608 `cw_caretaker_of` (verification vs eligibility) | CW-caretaker-parent-home: a child lives with a parent; an unrelated adult in the home has primary responsibility for the child. | `cw_caretaker_of` is empty and `cw_has_dependent_child` false for the adult (3.601: a non-parent caretaker only where no parent is in the home, or a relative or guardian); CO-2349 makes the adult an optional unit member and CO-1421 requires the adult to verify caretaker responsibility, both testing the raw `legal_guardian`/`has_primary_responsibility_for` edges. They also skip `lives_with`, so a guardian whose ward lives elsewhere is the same. |

## Medicaid

| # | Pair | Why it is a duplicate | Diverges today? | Disposition |
|---|---|---|---|---|
| D-M1 | CO-1158 `ma_pickle_countable_income` / CO-605, CO-606, CO-607 | CO-1158 writes out the SSI countable income formula (§ 8.100.5.H.4, 20 CFR 416.1112, 416.1124) inline, with the Pickle disregard; the SSI items have since gained the ineligible child allocation and the child support reduction | **Yes (P1)**, above | Read: Pickle countable income = the SSI-method countable income with the Pickle disregard applied to the OASDI inside it (one formula; the disregard as an input) |
| D-M2 | CO-1160 `ma_dac_countable_income` / CO-605 to CO-607 | The same formula copied a second time, with the DAC disregard | **Yes (P1)**, above | Read, as D-M1 |
| D-M3 | CO-5222 / CO-4626 (siblings) | The parental deeming division of 416.1165(e), copied for Pickle | **Yes (P1)**, above | Read: one division (CO-4626's fill-up) over a parameterised deemed amount, so Pickle reads it with CO-5221's figure |
| D-M4 | CO-2277 / CO-4633 | One allocation (§ 8.100.5.H.3.a.i, 416.1163(b) by 416.1165(b)) written twice, with different tests of who is "in the home" | **Yes (P1)**, above | Read: one per-child item "the allocation this child generates" (in the home, unemancipated, not applying) read by both sums |
| D-M5 | CO-4634 / CO-5221 (siblings) | Parental countable income; the Pickle copy holds OASDI at the loss | No | Keep + siblings (registered) |
| D-M6 | CO-605 / CO-5901 (siblings) | Earned income exclusions with and without the $20 carried over | No | Keep + siblings (registered) |
| D-M7 | CO-613 `ma_qmb_eligible`, CO-614 `ma_slmb_eligible`, CO-615 `ma_qi_eligible` | The MSP resource test (countable resources against the couple or individual MSP limit) written three times | No | Merge into one `ma_meets_msp_resource_standard` read by the three |
| D-M8 | CO-4200 `ma_cbwd_household_earned_income` / CO-4201 `ma_cbwd_household_unearned_income` | "A blind or disabled child of the Buy-In's age" written inline in both | No | Read: one per-person item |
| D-M9 | CO-548 `ma_is_adult_category` / CO-552 `ma_meets_some_category_demographics` | CO-552's adult arm copies CO-548's non-income conditions (age band, not pregnant, no Medicare, children's coverage) | No | Read: split `ma_meets_adult_category_demographics`, read by both |
| D-M10 | CO-2467 `ma_community_spouse_income` / CO-657 `ma_family_allowance` | The spousal-impoverishment "own income" (wages, self-employment, `ma_spousal_unearned_receipts`, winnings) summed in both | No; would split when OQ-974 is answered for one reader only | Read: one per-person income item; CO-2467 subtracts payroll taxes on top |
| D-M11 | CO-619 `ma_wawd_premium` / CO-621 `ma_cbwd_premium` | The postpartum premium exemption written in both | No | Read: one `ma_is_exempt_from_buy_in_premium_for_pregnancy` |
| D-M12 | CO-1344 / CO-4977 (electronic data source income as % FPL) | The same household numerator summed twice; CO-4977's meaning says it is CO-1344's sum | No | Read: one `ma_electronic_data_source_household_income` item |
| D-M13 | CO-1986 `ma_qualifies_for_veterans_personal_needs_allowance` / CO-4103 `ma_va_aid_and_attendance_is_patient_payment` | "Has no dependent child" written inline in both (V.3.d.ii, K.2) | No | Read: one `ma_has_dependent_child` |
| D-M14 | CO-5514 `ma_ssi_gross_unearned_receipts` / CO-5531 `ma_spousal_unearned_receipts` | Two sums over the SSI counting table with row lists that differ by child support and public assistance; the retroactive-SSI arm copied | No | Keep + siblings (the spousal rules name "own income" apart from the SSI method); state the row difference once. CO-5531 is being reworked by the receipts-reader fix; carry this there |
| D-M15 | CO-2439 `ma_hospital_presumptive_eligibility_category` / CO-3155 `ma_is_presumptively_eligible_limited_family_planning` | CO-3155 copies the hospital site's child and adult standard tests | No | Keep + siblings (§ 8.100.3.R and § 8.100.4.F are two paragraphs) |

## CHP+

| # | Pair | Why | Diverges today? | Disposition |
|---|---|---|---|---|
| D-C1 | CO-705 `chp_child_is_eligible` / CO-706 `chp_prenatal_is_eligible` | Eight common requirements (residency, status, income, no Medicaid category, no other coverage, inmate, IMD, public agency employee) listed in both | No | Read: one `chp_meets_common_requirements` |

## SNAP

| # | Pair | Why | Diverges today? | Disposition |
|---|---|---|---|---|
| D-S1 | CO-334 `snap_household_gross_income` / CO-312 `snap_eligible_household_members` | CO-334 recomputes the eligible-member filter inline | No | Read CO-312 |
| D-S2 | CO-333 `snap_counted_income_of_ineligible_member` / CO-371 `snap_counted_earned_income_of_ineligible_member` | The 273.11(c) pro rata share written twice | No | Read: one `snap_ineligible_member_counted_share` rate |
| D-S3 | CO-2308 / CO-2307 / CO-4182 | The allotment formula (maximum less 30% of net income, rounded) written three times; the prorated month omits the cap | **Yes (P1)**, above | Read: the prorated month prorates the full-month figure before the minimum allotment (a full-month figure without the minimum, capped), and CO-4182 reads a shared allotment-for-size item |
| D-S4 | CO-2338 `snap_excluded_earned_income` / CO-5014 `snap_excluded_irregular_receipts` | The 273.9(c)(2) quarterly irregular income test written twice | No | Read: one `snap_irregular_income_is_within_quarterly_limit` |
| D-S5 | CO-5021 `snap_calendar_quarter_months` / CO-5022 `snap_calendar_quarter_months_before` | The quarter's first month computed twice | No | Read: one `snap_calendar_quarter_first_month` |
| D-S6 | CO-1386 / CO-415 (verification) | The work hours that meet the ABAWD requirement, read twice from different facts | **Yes (P1)**, above | Read: CO-1386 reads the same hours CO-415 counts (or a shared `snap_abawd_qualifying_work_hours`) |

## Colorado Works

| # | Pair | Why | Diverges today? | Disposition |
|---|---|---|---|---|
| D-W1 | CO-2349, CO-1421 / CO-2608 `cw_caretaker_of`, CO-2383 `cw_is_parent_of_dependent_child` | "Non-parent caretaker" tested from raw edges in two items instead of reading the program's caretaker definition; both also recompute CO-2383 | **Yes (P1)**, above | Read: both read `cw_caretaker_of` and `cw_is_parent_of_dependent_child` |
| D-W2 | CO-900 `cw_assistance_unit_members` / CO-2608 `cw_caretaker_of` | The caretaker condition (parent, guardian, related person with primary responsibility, no parent in the home) inlined, in both directions, in the unit's edge condition | No | Read: the edge condition reads `cw_caretaker_of` |
| D-W3 | CO-910 `cw_countable_income` / CO-923 `cw_payment_countable_income` | The unit's income assembly (disqualified members, deemed parent income, sponsor, budgetary members) written twice; only the earned disregard and child support differ | No | Keep + siblings for the two totals (3.606.1.H and 3.606.2.A state two disregards); read a shared item for the common part |
| D-W4 | CO-908 `cw_countable_unearned_income` / CO-2554 `cw_payment_countable_unearned_income` | Same receipts, refused income and deductions; only child support differs | No | Read: one pre-floor unearned figure, each adding or leaving child support |
| D-W5 | CO-916 `cw_child_only_unit`, CO-926 `cw_unit_caretaker_count`, CO-3808 `cw_unit_has_striking_adult` | "An adult in the unit" (not a dependent child, or a minor parent assisted as an adult) written three times | No | Read: one per-person `cw_is_assisted_as_adult` |

## Adult Financial

| # | Pair | Why | Diverges today? | Disposition |
|---|---|---|---|---|
| D-A1 | CO-4001 / CO-4002 (life insurance countable value, OAP and not) | The 3.520.75.D face-value test written twice | No | Read: one `af_life_insurance_face_value_exceeds_exemption` |
| D-A2 | CO-1510 / CO-2006 (thirty consecutive days in a facility) | The stay-covers-the-month test written twice, differing only in the setting list | No | Read: one stay test, each with its setting list |
| D-A3 | CO-3827 `af_excluded_infrequent_income` / CO-4012 `af_excluded_infrequent_earned_income` | The 3.520.786.O quarterly test written twice (both over CO-4011) | No | Read: one `af_infrequent_income_is_within_quarterly_limit` |
| D-A4 | CO-2384 `af_deemed_relative_income` / CO-2386 `af_deemed_sponsor_income` | The deemable income of a person (gross earned plus deemable unearned) summed in both | No | Read: one per-person deemable income; check with the owner that the sponsor's deemable unearned income is the relative's (3.520.73 vs the sponsor rules) |

## CCCAP

| # | Pair | Why | Diverges today? | Disposition |
|---|---|---|---|---|
| D-K1 | CO-2585 `cccap_verification_is_applicable` / CO-987, CO-989 | "The household has an eligible child" written three times | No | Read: one household item |
| D-K2 | CO-1447 / CO-1448 (required and pending counts) | The activity-schedule condition (non-traditional hours or self-employed caretaker) written in both | No | Read: one `cccap_requires_verification_of_activity_schedule` with its pending flag, like the other elements |
| D-K3 | CO-1440, CO-1441, CO-1445, CO-2873 | The exemptions from verification (Colorado Works referral, protective services, Child Welfare, homelessness stabilization) restated in each element with different subsets | Not shown; not probed further | Read: one per-case-type exemption item per rule paragraph; record against the text why each element's subset differs |
| D-K4 | CO-5721 / CO-5722 / CO-5723 (receipt sums) | The list of counted treatments of `cccap_receipt_treatment_table` repeated in each | No | Read: one "is counted" test of a receipt's treatment |
| D-K5 | CO-4463 / CO-5725 | The lump-sum averaging (3.111.H.4.i) written twice | No | Read: one averaged-amount expression or item |

## LEAP

| # | Pair | Why | Diverges today? | Disposition |
|---|---|---|---|---|
| D-L1 | CO-1000 `leap_household_members` / CO-1009 `leap_household_members_for_income` | The 171-node economic-unit definition written twice; CO-1000 adds only the citizenship and verification exclusions | No | Read: CO-1000 filters CO-1009 |
| D-L2 | CO-1455 `leap_requires_verification_of_earned_income` / CO-1002 `leap_household_income` | The 3.752.23.Q child exclusion written twice (its precision says it must match CO-1002) | No | Read: one per-person `leap_earnings_are_excluded_as_child` |

## Verification items and their eligibility items

Every `*_requires_verification_of_*` item was read against the item that establishes the fact it verifies. Two disagree with it today (D-S6 and D-W1, above). Medicaid's required and pending counts (CO-1412, CO-1411) read the same per-element flags in the same order and agree. The rest either read the eligibility item (most Medicaid, CHP+, SNAP and SUN Bucks elements) or restate a rule's own verification trigger that is not an eligibility test (questionable attestations, recertification changes, documentation not reasonably available). D-K3 is the one place where several verification items restate case-type exemptions the eligibility status also tests; this audit did not probe it further, and the subsets are kept apart by hand only.

## Dismissed script candidates (classes)

- Common idioms: the spouse filter, blind-or-disabled, age-under-N on the first of the month, `lives_with` defaults.
- Parallel elements: one verification flag or pending flag per element, MAGI category items, guideline lookups.
- Coincident figures: 0.5, 1.33, 1.5, 0.3, 0.05, 0.075, $1,500, $2,000, 12, 18, 60 days, 2027-01-01: different rules that happen to set the same number.
- Chains that already read each other (marked `reads` in the script's output).

# Audit: hard-coded numbers and policy constants (the OQ-82 class)

Read-only audit of the `co` volume at commit 57663b1 (branch ccr-9d19bf4c-wmnwcl), 2026-11-21. Binding context: the product-owner decisions in docs/plan-colorado.md ("Hard-coded figures in derivations become parameters or tables (OQ-82)"; "Nothing is deferred until a case needs it"), docs/conventions.md (parameter types, naming rules 7 to 9, "Date logic belongs in these ranges, not inside a derivation") and docs/operators.md (`lookup`, `band`). Findings already fixed by docs/reviews/vocabulary-reuse.md are not repeated; two of its declined items (U-9 literal thresholds, C-5 state figures held as supplied facts) are re-raised here because the product-owner decision overrules the reason they were declined.

## Method

1. `npm run export -- --volume co` (1,396 items), copied to a private working directory. Every `derived` tree was walked; every number, `YYYY-MM-DD` or `YYYY-MM` string, and every literal option list of `in` was recorded with its operator and argument position (scripts in /tmp/claude-0/audits/hardcoded/).
2. 219 derived items carry at least one numeric or date literal: 106 carry only `0`; 113 carry something else. Each of the 113 was read with its meaning, precision and governing excerpts and classified as a constant of arithmetic, a structural constant tied to a table's shape, or a policy figure. The 58 literal option lists (in 44 items) were classified the same way.
3. Parameter values were compared with each other (current version and every version) and with the meaning and precision text of each parameter and of each derived item that reads it directly (dollar amounts, percentages and bare numbers).
4. Every rule test (`tests:` in the items) and every case in `tests/cases.yaml` was scanned for parameters stated as facts, `parameters:` overrides, and derived standards stated at a parameter's value. `npm run check -- --volume co` was run (OK; 37 "is a parameter, so a value stated for a person is ignored" warnings, 6 no-version warnings).

### What was treated as a constant, not a policy figure

These literals stay in the derivations (Appendix A lists every item):

- `0` everywhere (no amount, none, not below zero): 106 items carry nothing else.
- `1` and `0` as the tally arms of the verification counts (`case [pending, 1], [else, 0]`), and `= 0` / `> 0` tests on those counts.
- `12` as months per year (annual guideline to monthly, years to months in an anchor computation, a month's income annualised for the CHP+ 5% cap).
- `-1` in `-ceil(-x)` (the catalog's only way to round down) and in `days_after -1` (the day before a date).
- `n - 1` arithmetic: the (n-1)/n share of an ineligible SNAP member's income or expense; "n months starting with this month" written as `months_after (n - 1)`; `+ 1` for an inclusive count.
- `>= 1` / `< 1` (a household has a member), `> 1` (more than one caretaker), `1 + threshold`, a multiplier of `1` meaning "no change" (full share, no proration).
- `2` where it means a couple (`ma_ssi_household_size = 2` selects the SSI couple figure), two parents (CO-1976) or two sponsors each with the $2,000 limit (CO-947, 3.520.72.A.1.c "Each sponsor shall receive the $2,000 resource limit for a combined resource limit of $4,000").
- Ordinals: the first and second work-requirement violation (CO-2318); the person counted once plus the expected children (CO-501, 42 CFR 435.603(b)); the one month in which small lottery winnings are counted (CO-1185, "the month received").
- Option lists that state a rule's categories rather than a figure: immigration-status sets, acceptable-document lists, eligibility-status sets, HCBS waiver groups, LEAP living arrangements, student-loan discharge reasons. They change only when the rule text changes and are versioned by the item's own effective range.

Everything else in a derivation that the governing text states as a number, date, month or keyed schedule is a policy figure and is a finding below.

### Priorities

- **P1**: the literal is a policy figure in a derivation on an eligibility, benefit, verification or penalty path. Under the product-owner decision each one blocks certification until it is a parameter or table. Within P1 the order of work puts first the figures their rule re-bases on a schedule, and the ones that give a wrong or unknown answer today.
- **P2**: maintainability or approval risk: two parameters holding one figure, a date parameter used as an effectivity switch, a meaning that is wrong now or will be at the next version, a test that states a figure the engine ignores or a superseded figure, a literal on a path no outcome reads.
- **P3**: style: structural table-size literals, restatements of figures that have no versions, redundant test overrides.

## Findings

### 1. Policy figures written into derivations

| ID | Items | Problem | Governing excerpt | Proposed change, readers, case and test impact | Pri |
|---|---|---|---|---|---|
| H-1 | CO-1289 `cccap_parent_fee_formula_amount` (and CO-1284, CO-1285, CO-1286, CO-2115 to CO-2119) | The derivation switches formula on a literal month: `["<", [month], "2028-08"]`. Two problems. (a) Conventions: "a rule that changes on a date is two versions, not a comparison with a literal date." (b) It compares the evaluated month while parameters are chosen by the determination date, so a determination before 2028-08-01 that evaluates a month from August 2028 reads the 2028 rates, which have no version then: unknown (`npm run check` reports "no version in force on default_as_of 2026-10-01" for all five). The pre-2028 figures (1%, 14%, $15) are unversioned although the rule dates them. The monthly 100% FPG expression is also repeated eight times (S-1). | S785, 8 CCR 1403-1 3.124.P: "Beginning July 1, 2021, through July 31, 2028 ... one percent (1%) ... fourteen percent (14%) ... An additional fifteen-dollar ($15) fee". S786, 3.124.Q: "Beginning August 1, 2028 ... 101%-130 FPL 3% / 131%-160% FPL 5% / 161% and above 7%". | One formula, versioned figures. The P formula equals Q's shape with flat marginal rates: 1% x income + 14% x (income - FPG) = 1% x min(income, FPG) + 15% x (income - FPG). Give `cccap_parent_fee_second_band_rate`, `_third_band_rate`, `_top_band_rate` a version 2021-07-01 to 2028-08-01 of 0.15 each (then 0.03, 0.05, 0.07); give `_second_band_limit_pct_fpl` and `_third_band_limit_pct_fpl` a 2021-07-01 version (any value; the rates are equal); version `cccap_parent_fee_additional_child_amount` $15 to 2028-08-01, then 0; retire `cccap_parent_fee_marginal_rate` (CO-1285). CO-1289 becomes the banded expression plus `case [income > FPG] amount x (children - 1)`, with no date literal. Add a derived `cccap_household_poverty_guideline_monthly` for the repeated lookup (S-1). Tests CO-1289-T1, T2, T5, T6, T7 keep their expectations (T2: 27.50 + 150 + 15 = 192.50); add one test with a determination date before 2028-08-01 evaluating 2028-09, which today is unknown. No case expectation changes (cases expect `cccap_parent_fee` only for 2026-10 and 2026-11; CO-89, dated 2028-08-15, expects no CCCAP fee). Rewrite the meaning and precision to name the parameters, not 1%, 14%, $15, 3%, 5%, 7% (R-2). | P1 |
| H-2 | CO-1279 `leap_income_contribution_rate` | A `case` ladder of four bands and four rates by percent of FPL, written as literals (0.75, 1.25, 1.75; 0, 0.1, 0.2, 0.3). The rationale says the edges "are written into the case as the chart states them". | S771, 9 CCR 2503-7 3.758.47 Step D: "0 - 75% FPL 0% / 75.01 - 125% FPL 10% / 125.01- 175% FPL 20% / 175.01+% + 30%". | New parameter `leap_income_contribution_rate_table`, type `table keyed by income band`, version from 2025-11-01 (D-86): {"0.75": 0, "1.25": 0.1, "1.75": 0.2, top: 0.3}. CO-1279 reads `band(leap_income_contribution_rate_table, leap_household_income_pct_fpl)`. Engine prerequisite: P48 has no open top band (a number above the last bound is unknown), and the chart's last band is open; add an open last band to P48 (a key such as `"above"`, or a companion `_above_last` parameter like `_each_additional`) rather than an invented bound. Tests CO-1279-T1 to T4 and CO-1281 unchanged. Meaning: name the table instead of restating the chart. | P1 |
| H-3 | CO-1280 `leap_adjusted_heating_costs` | Heat portion by dwelling type as a `case` of literals (0.62, 0.48, 0.43, 0.5). The State adjusts LEAP figures each year. | S771, Step C: "House/mobile home 62% for heat / Townhouse / duplex / triplex / fourplex 48% / Apartment, condominium, hotel, Cabin, Tiny Home 43% / RV, 5th wheel, camper 50%". | New parameter `leap_electric_heat_portion_table` keyed by `leap_electric_heat_dwelling_type` (house 0.62, attached 0.48, apartment 0.43, rv 0.5, not_electric 1), dated from 2025-11-01. Needs a new parameter type, "table keyed by option" (volume.yaml `types`, src/engine/types.ts `BASE`, conventions Types): `lookup` already reads string keys. CO-1280 reads `lookup(table, leap_electric_heat_dwelling_type)`. Tests and cases unchanged (cases state `not_electric`). Meaning: drop the percentages. | P1 |
| H-4 | CO-1290 `cccap_parent_fee` | `0.8` for a top-three quality-rated provider and `0.55` for all-part-time care are literals. | S783, 3.124.H: "reduced by twenty percent (20%) of the regularly calculated parent fee". S787, 3.124.U: "assessed at fifty-five percent (55%) of the above-calculated fee". | New parameters `cccap_quality_rating_fee_reduction_rate` 0.2 (read as `1 - rate`, as the rule states it) and `cccap_part_time_care_fee_rate` 0.55, both dated from the 8 CCR 1403-1 version of D-87. Readers: CO-1290 only. Tests CO-1290-T1 to T7 and the CCCAP household cases keep their values. Meaning: name the parameters instead of "20%" and "55%". | P1 |
| H-5 | CO-2230 `chp_scheduled_copayment` | The whole CHP+ copayment schedule (four bands, 13 service types, amounts $1 to $50) is a nested `case` of literals. The band boundaries are parameters (CO-2225 to CO-2227) but the amounts are not, and the rule dates the amounts ("Effective July 1, 2012"). | S1504, 10 CCR 2505-3 § 320.1.A-D: "A. ... less than 101% ... emergency ... $3.00 per use and urgent/after hours care ... $1.00 per use. B. ... between 101% and 150% ... 1. Effective July 1, 2012: a. $2.00 per office visit; ... C. ... between 151% and 200% ... g. $30.00 per use of emergency care ...". | Four parameters `chp_copayment_band_a_table` to `chp_copayment_band_d_table`, each a "table keyed by option" over `chp_service_type`, version from 2012-07-01, every service type listed (0 where the band lists no copayment, so no lookup misses). CO-2230 keeps the § 330.3 exemptions (preventive, COVID-19 testing, emergency care with admission: rule, not figures) and otherwise reads `lookup(table for chp_copayment_income_band, chp_service_type)`. Same engine prerequisite as H-3. Rule tests unchanged; no household case states `chp_service_type`. | P1 |
| H-6 | CO-1299 `sebt_benefit_amount` | `x 3` summer months is a literal. | S795, 7 CFR 292.15(d)(iii): "may only issue a full three months of benefits for the summer operational period". S796: "The total summer benefit level is the rounded down monthly level multiplied by three." | New parameter `sebt_summer_benefit_months` 3. CO-1299 multiplies by it. Tests and the SUN Bucks cases unchanged. Meaning: drop "$40 a month, $120 a summer ... 2024 through 2026" (R-2). | P1 |
| H-7 | CO-1980 `ma_ltc_private_pay_region`; CO-1985 `ma_income_trust_gross_income_limit`; CO-1981 to CO-1984 | (a) The county-to-region assignment is three literal county lists inside a `case`. (b) The four regional limits are four parameters selected by a `case` on the region: a figure that varies by key held as four items. | S1229, § 8.100.7.G.6.a.i.a): "The geographic regions ... shall be based on the Bureau of Economic Analysis Regions and consist of the following counties". S1230 (OM 25-073, unverified): Region I $11,522.44 ... for 2026. "HCPF shall calculate the average rates for such regions on an annual, calendar-year basis." | (a) `ma_ltc_private_pay_region_by_county_table`, a "table keyed by option" from `county_of_residence` to the region option (64 rows), unversioned with the rule's effective date; CO-1980 becomes a lookup. (b) `ma_income_trust_limit_table` keyed by region, versions 2025-01-01 and 2026-01-01 with `review_by` 2027-01-01, replacing CO-1981 to CO-1984; CO-1985 becomes a lookup. Needs the H-3 table type (with option values for (a)). Rule tests on CO-1980 and CO-1985 unchanged; the LTC cases unchanged. See D-2 for the divisor. | P1 |
| H-8 | CO-1393 `snap_expedited_postponement_end_date` (outcome) | Three literals: `14` (the fifteenth of the month, as `days_after 14` from the first), and `3` / `2` months of participation for a migrant household. | S1310, 7 CFR 273.2(i)(4)(iii)(A)-(B): "For households applying on or before the 15th of the month ... may be postponed until the second month of participation ... For households applying after the 15th ... until the third month of participation". S835, 4.205.11.B.2: "for those households applying after the fifteenth (15th) of the month". | New parameters `snap_expedited_late_application_day` 15 (compare with `days_after (day - 1)` from the first of the month), `snap_expedited_postponement_months_early` 2 and `snap_expedited_postponement_months_late` 3. Readers: CO-1393. Tests and cases unchanged. | P1 |
| H-9 | CO-2003 `snap_child_support_exclusion` | `3` appears twice: the history length that triggers averaging and the months averaged. | S1314, 10 CCR 2506-1 4.407.5.D-E: "Households with a history of three (3) or more months of paying child support shall have the support payments averaged ... less than a three (3) month record". | New parameter `snap_child_support_averaging_months` 3, read in both places. Tests and cases unchanged. | P1 |
| H-10 | CO-405 `snap_is_exempt_from_work_registration` | `["<=", age, 17]` for the 16-and-17 exemption. The precision defends the literal ("the two-year window it names is fixed by the same subparagraph"); the product-owner decision overrules that. | S123, 7 CFR 273.7(b)(1)(i) and S126, 4.310.3.A.1: "A person age 16 or 17 who is not the head of a household, or who is attending school ... is also exempt." | New parameter `snap_work_registration_youth_max_age` 17 (convention 8: `_max_age` is inclusive). Rewrite the precision. Tests and cases unchanged. | P1 |
| H-11 | CO-402 `snap_weekly_hours_worked`, CO-403 `snap_weekly_earnings_worked` | Monthly hours and earnings are converted to weekly by `x 12 / 52`. The rule states only weekly figures (30 hours; minimum wage x 30); the conversion factor is a policy choice, not arithmetic. The volume's Medicaid chapter carries its own factor as a parameter (`ma_community_engagement_weeks_per_month` 4.33, 42 CFR 435.552(d)(1)(ii)), and 7 CFR 273.10(c)(2) converts weekly income to monthly at 4.3 for SNAP (not excerpted in sources.md). The three readings (52/12 = 4.333, 4.33, 4.3) can decide a borderline exemption. | S121, 7 U.S.C. 2015(d)(2)(E): "employed a minimum of thirty hours per week or receiving weekly earnings which equal the minimum hourly rate ... multiplied by thirty hours". | Ask the SNAP owner which factor applies; fetch 7 CFR 273.10(c)(2) into sources.md. Add `snap_weeks_per_month` (4.3 if 273.10(c)(2) governs; 4.333 if the volume keeps 52/12, with that stated) and divide by it in CO-402 and CO-403. Expected values of CO-402-T1/T2 and CO-403-T1 to T3 change if the factor changes; no household case sits within a few hours of 30 a week (check when fixing). | P1 |
| H-12 | CO-659 `ma_transfer_penalty_days` | `30` days per partial month is a literal. | § 8.100.7.F.2.d (sources.md line 2682): "partial months, which shall be calculated by multiplying 30 days by the decimal fractional share of the partial month". | New parameter `ma_transfer_penalty_days_per_month` 30. Reader CO-659 (no reader of its own; it is the penalty answer). Tests CO-659-T1 to T4 unchanged. | P1 |
| H-13 | CO-616 `ma_qdwi_eligible` | `["*", 2, ...]` for "twice the SSI resource limit". | S622, § 8.100.6.O.2.c: "has resources at or below twice the SSI resource limit as described in section 8.100.5." | New parameter `ma_qdwi_resource_limit_rate` 2 (convention 7: `_rate` for a multiplier). Reader CO-616. Tests unchanged. | P1 |
| H-14 | CO-549 (18, twice), CO-620 (18), CO-1969 (19), CO-2419 (18), CO-951 (65), CO-2384 (18), CO-2392 (18) | Ages written as literals beside the age parameters each chapter already uses. U-9 of the vocabulary review listed CO-549 and CO-620 and was declined; the product-owner decision overrules it. CO-2392's 18 is an interpretation ("dependent child" read as under 18), not a figure the rule states. | CO-549: S1718, § 8.100.4.H.2.a "on their 18th, 19th, 20th or up to their 21st birthday"; H.2.a.iii "in foster care at the age 18 on or after January 1, 2023". CO-620: S318, Q.1.a "Applicants must be age 18 or younger". CO-1969: S1206, 42 CFR 435.553(a)(1) "Under the age of 19 years". CO-2419: S1717, H.1.g "on their 18th birthday ... immediately prior to the date the individual attained 18 years of age". CO-951: S1008/S1318, 3.532.D.3 "In a psychiatric facility when sixty-five (65) years of age or older". CO-2384: S1634, 3.549.E "an unemancipated child under eighteen (18) years of age". CO-2392: S1632, 3.534.B.3 "each dependent child living in the household". | New parameters (convention 8 names): `ma_former_foster_care_exit_min_age` 18 (both uses in CO-549); `ma_cbwd_max_age` 18 (CO-620); `ma_community_engagement_child_age_limit` 19 (CO-1969); `ma_foster_care_age_at_responsibility` 18 (CO-2419, arm g); `af_oap_psychiatric_facility_min_age` 65 (CO-951); `af_and_cs_unemancipated_child_age_limit` 18 (CO-2384); `af_dependent_child_age_limit` 18 with an `assumption` naming the reading (CO-2392). Do not reuse `ma_aged_age`, `ma_dependent_child_age_limit` or `cw_dependent_child_age_limit`: each cites different text (vocabulary review section 6). Tests and cases unchanged. Meanings that say "18", "19", "65" name the parameter instead. | P1 |
| H-15 | CO-306 (`"1931-08-22"`, `"1996-08-22"`), CO-1672 (`"1996-08-22"`), CO-1215 (`"2013-12-31"`) | Date cutoffs about the person written as literals. `qualified_non_citizen_entry_cutoff_date` (CO-279) already holds 1996-08-22 for the cash programs; CO-306 and CO-1672 restate it. | CO-306: S15, 4.305.B.3.e "Born on or before August 22, 1931 who lawfully resided in the U.S. on August 22, 1996"; S24, 8 U.S.C. 1612(a)(2)(I). CO-1672: S1063, 3.520.69 "qualified non-citizens who entered the country on or after August 22, 1996". CO-1215: S714, 3.570.13.B.3 "receiving both Old Age Pension (OAP) grant payments and HCA as of December 31, 2013". | Repoint CO-306 and CO-1672 to CO-279 (program All, so no cross-program read). New `snap_elderly_exception_birth_date_cutoff` "1931-08-22" (Colorado's own wording, S15) for CO-306, and `af_hca_grandfather_date` "2013-12-31" for CO-1215. Tests and cases unchanged. CO-1215's precision restates "60, af_oap_age" (R-3). | P1 |
| H-16 | CO-1006 `leap_program_year_start_month` (`"2000-11-01"`, `"2000-11"`), CO-1292 `is_school_aged` (`"2000-08-01"`, `"2000-08"`, twice), CO-2581 `sebt_summer_year` (`"2000-07-01"`, `2001`); related CO-1008 | The start of a program year is hard-coded as a fixed anchor month advanced by whole years, because the catalog cannot read a month-of-year. In CO-1006 the anchor restates `leap_eligibility_period_start_month` (CO-1806, 11): changing the parameter would move the period length in CO-1008 but not the start in CO-1006, so the two would disagree. CO-1008's `+ 12 + 1` assumes the period wraps the year end. | S510, 3.751.1: "'Program Year': means from November 1st through April 30th". S1403, C.R.S. 22-33-104(1)(a): "attained the age of six years on or before August 1 of each year". S1820, 7 CFR 292.2: "Instructional year means the period from July 1 of the prior year". | Catalog and engine change: an operator for "the most recent first day of month-of-year M on or before [date or month]" (proposed P49), reading a whole-number month-of-year parameter. Then CO-1006 reads CO-1806; new `compulsory_school_attendance_cutoff_month` 8 for CO-1292; new `sebt_instructional_year_start_month` 7 for CO-2581 (the summer year is that year plus one). CO-1008 can then be `month` within `months_from_to(start, the month with CO-1807)`. Tests and cases unchanged. Until P49 exists, a `month`-typed anchor parameter per program removes the literal but not the duplication with CO-1806. | P1 |
| H-17 | CO-2386 `af_deemed_sponsor_income` (`/ 2` twice), CO-2392 `af_spouse_dependent_children_needs` (`/ 2`) | "Half the SSI benefit standard" written as division by a literal 2. | S1632, 3.534.B.3: "an amount to meet the needs of each dependent child ... equal to half the maximum SSI grant benefit standard". 3.534.D, 3.544.G, 3.549.G (S1632 to S1634): the sponsor's spouse in the household and each dependent "half" the standard. | New parameters `af_dependent_child_needs_rate` 0.5 (CO-2392) and `af_sponsor_dependent_allowance_rate` 0.5 (CO-2386, both uses). Not `ma_ssi_ineligible_child_allocation_rate` (Medicaid's 8.100.5.H text). Tests unchanged. | P1 |
| H-18 | Supplied facts holding state figures: CO-1272 `leap_statewide_adjustment_rate`, CO-1276 `leap_benefit_minimum`, CO-1277 `leap_benefit_maximum`, CO-870 `cccap_entry_income_limit_pct_fpl`; related CO-1271 | Vocabulary review C-5, declined for lack of a source. One figure for everyone (or per county) is entered on each person, so two persons can carry different values. `tests/cases.yaml` states `cccap_entry_income_limit_pct_fpl: 1.85` on 15 persons: a policy figure written into case files. CO-1271's meaning includes "the State's flat-rate amount by dwelling type", a State table held inside a supplied fact. | S770, Step B: "The State LEAP office will adjust benefit levels at the beginning of each LEAP program year". S772, Step G: "the minimum, up to and including, the maximum benefit amount established by the Department for the LEAP program year". S485, 3.111.H.1.a: "Entry eligibility shall be set by the Department ... not to be set below one hundred eighty-five percent (185%)". | Parameters: `leap_statewide_adjustment_rate`, `leap_benefit_minimum`, `leap_benefit_maximum` with a version per program year (2026-11-01 to 2027-05-01, as CO-875 does) and `review_by`; `cccap_entry_income_limit_pct_fpl_table` keyed by county (H-3 type), with the 185% floor as `cccap_entry_income_limit_min_pct_fpl` 1.85 and a governance check that no row is below it. Readers: CO-1281 (LEAP), CO-986 and CO-995 (CCCAP) read the parameters; CO-995 and CO-986 key the table by the county fact (`cccap_application_county`, which the cases already state). Case impact: remove the 15 `cccap_entry_income_limit_pct_fpl` statements; expectations hold if every county row is 1.85 until the county figures are fetched (state the figures as unverified, as S1230 does). Separately, a parameter table of the flat rates by dwelling type, with CO-1271 narrowed to actual vendor costs. The figures need a source (CDHS and CDEC refuse automated fetches): record them as product-owner-supplied and unverified, as was done for OQ-212. | P1 |
| H-19 | CO-920 `cw_meets_work_participation` | `x 4` weeks per month approximates a monthly hours requirement (OQ-104). No item reads CO-920, so no outcome changes today. | S419, 45 CFR 261.31(a): "a minimum average of 30 hours per week". | New parameter `cw_weeks_per_month` 4 carrying OQ-104 (or 4.33 if the owner aligns it with H-11). Tests unchanged at 4. | P2 |
| H-20 | CO-1500 `snap_utility_allowance_amount` | The Basic Utility Allowance threshold `>= 2` utility costs and the One Utility Allowance's `= 1` are literals. The tiers are named by their counts, so this is the weakest policy figure in the list. | S744, 4.407.31.B.1: "incur at least two (2) non-heating or non-cooling utility costs". S745, C.1: "responsible for only one (1) non-heating or one (1) non-cooling utility expense". | New parameter `snap_bua_min_utility_cost_count` 2; the OUA arm reads `< snap_bua_min_utility_cost_count` with at least one cost. Tests unchanged. | P2 |
| H-21 | CO-1153 (`+ 1`), CO-618 and CO-619 (`lookup ..., 1`), CO-995 (`lookup ..., 1`, twice) | Household sizes the rule names are written as literals. CO-1153's `+ 1` is an interpretation open as OQ-204 ("a household of two in addition to any other household members"). | S614, § 8.100.4.E.3: "the individual is counted as a household of two in addition to any other household members". S488, 3.119.A: "Protective services households are considered a household of one". S317/S1727 (WAwD: the individual's income against the guideline for one). | `ma_family_planning_applicant_household_count` 2 (CO-1153: household size - 1 + count, with OQ-204 on the parameter); `cccap_protective_services_household_size` 1 (CO-995); `ma_wawd_household_size` 1 (CO-618, CO-619). Tests unchanged. | P2 |

### 2. Structural literals tied to a table's shape

| ID | Items | Problem | Governing excerpt | Proposed change | Pri |
|---|---|---|---|---|---|
| S-1 | 68 occurrences in 17 items: `8` (last FPL/SNAP/SMI row) in CO-339, CO-345, CO-346, CO-383, CO-504, CO-986 (x2 lookups), CO-993, CO-1153, CO-1278, CO-1289 (x8 lookups), CO-1297, CO-2364; `6` in CO-370; `10` in CO-911, CO-912, CO-2000 (three tables each); `2` (chart rows) in CO-926 | Each lookup restates the number of rows of the table it reads, as `min(size, 8)` plus `each_additional x max(0, size - 8)`, or as a `case` on `<= 8`. A new table version with more or fewer rows silently changes the answer or produces lookup misses, and the same expression is copied (CO-1289 holds it eight times). Footnote: CO-419 reads `snap_elderly_disabled_separate_household_income_limit_table` with no clamp and no `_each_additional`, so a size above 8 is a lookup miss. | conventions P42 and Tables: "The step beyond the last row is a separate `_each_additional` parameter that the rule applies itself." | Catalog change (proposed P50): `[table keyed by household size], for [n], beyond the last row adding [each_additional]`, which reads the table's last key itself; `snap_standard_deduction` uses a clamp form ("6 or more"). Then the 67 literals go. Until then, a derived per-program item for each repeated lookup (`cccap_household_poverty_guideline_monthly`, `cccap_household_smi_income_limit`) cuts CO-986, CO-993 and CO-1289 to one copy each. No test or case changes. | P3 |

### 3. Parameters that duplicate each other's value

| ID | Items | Problem | Governing excerpt | Proposed change | Pri |
|---|---|---|---|---|---|
| D-1 | `sebt_poverty_guideline_table` / `_each_additional` (CO-1519, CO-1520); `cccap_poverty_guideline_monthly_table` / `_each_additional` (CO-323, CO-324); `ma_mmmna_poverty_guideline_family_of_two_annual` (CO-1954); all against `federal_poverty_guideline_annual_table` / `_each_additional` (CO-181, CO-182) | The HHS poverty guideline is stated four times. CO-1519/1520 hold exactly CO-181/182's 2026 values with a July 1 date; CO-323/324 hold CO-181 / 12 rounded to the cent with an October 1 date; CO-1954 holds CO-181's size-2 row with a July 1 date. They exist because each program applies the guideline from a later date and the engine has no "parameter as of a date" (P25 is "Not implemented"). Vocabulary review D-1 kept CO-323 for this reason; the SUN Bucks and MMMNA copies were added later. A correction to the HHS figures must be made four times. | S55 (HHS 2026 guidelines); S798 (school meal guidelines from "the year 2026 Federal income poverty guidelines"); S781 (CCCAP 100% FPG effective October 1, 2026); MMMNA: 150% of the poverty guideline for a family of two, re-based each July 1. | Implement P25 for a lagged read ("[parameter] in force on [date]", for example the January 1 on or before July 1), then derive the three copies and retire CO-1519, CO-1520, CO-1954 and, with the cents rounding stated, CO-323/324. Until then: a governance check that each copy equals CO-181/182 (or CO-181 / 12 to the cent) for the matching guideline year, so the copies cannot drift. No test or case changes. | P2 |
| D-2 | `transfer_penalty_divisor` (CO-832); `ma_income_trust_limit_region_i` to `_iv` (CO-1981 to CO-1984) | The divisor is the mean of the four regional private-pay rates, and both come from the same memo (S1228, S1230, OM 25-073). 2026: (11,522.44 + 10,633.36 + 9,780.17 + 11,322.60) / 4 = 10,814.64, the divisor. 2025: the mean is 10,475.115 and the divisor 10,475.11 (HCPF dropped the half cent; P41 would round it to .12). Two entries of one figure that can disagree next January. | S648, § 8.100.7.F.2.c.i: "divided by the average of the regions, defined at 8.100.7.E, monthly private pay cost". S1229: the income-trust limit is "the average cost of private Long Term Care institution care in the geographic region". | After H-7(b), derive `ma_transfer_penalty_divisor` as the mean of `ma_income_trust_limit_table`, rounded down to the cent (`-ceil(-x x 100) / 100`, if HCPF's 2025 figure shows the rule), and retire CO-832. Readers CO-649, CO-659 (their tests override the divisor with 9,000 and are unaffected). Ask the Medicaid owner to confirm the rounding. | P2 |
| D-3 | `snap_qualifying_quarters_threshold` (CO-103), `ma_five_year_bar_exempt_work_quarters` (CO-1171), `cw_sponsor_deeming_exempt_quarters` (CO-2369), all 40 | One federal figure (40 qualifying quarters under Title II, PRWORA) held three times. The vocabulary review merged the parallel five-year figure into `qualified_non_citizen_waiting_period_years` (U-2) but not this one. | S13 (SNAP 40 quarters), S656 (Medicaid), S1627 (Colorado Works sponsor deeming exemption): each restates the 8 U.S.C. 1612/1631 figure. | One `federal_qualifying_quarters_threshold` (program All, convention 2: `federal_` marks a federal figure); repoint its four readers CO-307, CO-2337, CO-1172 and CO-2364; retire the three. If an owner holds that a state rule adopts the figure on its own terms, keep that program's copy and say so in its meaning. No test or case changes. | P2 |
| D-4 | `ssi_resource_limit_individual` / `_couple` (CO-233, CO-234), `ssi_general_income_exclusion` (CO-230), `ssi_earned_income_exclusion` (CO-231), `ssi_earned_income_disregard_rate` (CO-232), read by Adult Financial items CO-946, CO-947, CO-948, CO-1229, CO-2384; also `af_and_cs_grant_standard` (CO-291) equal to `ssi_federal_benefit_rate_individual` (CO-235) | Adult Financial's own rule states its own $2,000 / $3,000 limits, $20 and $65 disregards and "divide by two", and the items read the SSI-method parameters for them. CO-948's precision says a duplicate parameter "is not created" on purpose. If SSA changes an SSI figure, Colorado's rule does not follow without an amendment, and the shared parameter would change both. The AND-CS standard equal to the SSI rate is OQ-391 (open). | S454, 3.520.72.A: "The resource limit is: 1. $2,000 for ... 2. $3,000 for". S457 and S1632, 3.534.A: "Deduct $65 ... Divide the remainder by two (2)". S1633, 3.544.E.2: "Deduct $20.00". | Decision for the cash-programs owner. Either (a) `af_resource_limit_individual` / `_couple`, `af_general_income_disregard`, `af_earned_income_disregard`, `af_earned_income_disregard_rate`, cited to 9 CCR 2503-5, read by the five AF items; or (b) a statement on each AF item (and on CO-233 to CO-235) that C.R.S. 26-2-111 ties Adult Financial to the SSI figures, so one parameter is correct. Resolve OQ-391 the same way. No test or case changes under (a) or (b). | P2 |
| D-5 | Equal values checked and found not to be duplicates | 46 value groups share a current value (for example fifteen age parameters at 18, eight at 12 months, seven at 30 days). Each pair cites different text and is a separate figure; vocabulary review section 6 reached the same view for the ages. Borderline, kept separate: `ma_wawd_premium_cap_pct` and `ma_cbwd_premium_cap_pct_upper` (7.5%, § 8.100.6.P.1.f.i and Q.1.g.i); `ma_family_planning_income_upper_pct` and `chp_income_limit_pct_upper` (260%, separate rules); `af_burial_benefit_max` / `af_burial_cost_limit` and `cw_death_reimbursement_max` / `_cost_limit` ($1,500 / $2,500, separate programs). One inconsistency: `af_burial_cost_limit` (CO-1227) has no version while the Colorado Works pair is dated. | S721, S1505 and the cited excerpts of each. | Give CO-1227 a dated version from the 9 CCR 2503-5 version of D-80. Nothing else. | P3 |

### 4. Date parameters used as effectivity switches

| ID | Items | Problem | Governing excerpt | Proposed change | Pri |
|---|---|---|---|---|---|
| E-1 | CO-509 `ma_meets_citizenship_requirement` and CO-2439 (`["<", [det_date], ma_alien_payment_restriction_start_date]`); CO-2455 `ma_renewal_interval_months` (`[">=", [det_date], ma_six_month_renewal_start_date]`); CO-1975 (its `det_date` arm against `ma_community_engagement_start_date`); `snap_abawd_hr1_effective_date` (CO-176) has no reader | These are not literals, but they do what conventions forbid inside a derivation: compare the determination date with a date to switch a rule on, which is what parameter versions and item effective ranges are for. Two change dates are then held twice (the date parameter and the values on either side). Comparisons with a date about the person or the application are legitimate and stay: CO-549 (out-of-state youth turning 18 from 2023-01-01), CO-905 (entry before 1996-08-22), CO-1190 (month of discharge), CO-2472 (application date against 2027-01-01, Pub. L. 119-21), CO-417 (the ABAWD clock start), CO-984 (SUD activity start), and CO-1975's month arm (the requirement applies to months from January 2027). | conventions, Effective dating: "Date logic belongs in these ranges, not inside a derivation: a rule that changes on a date is two versions, not a comparison with a literal date." | CO-2455: version `ma_expansion_adult_renewal_interval_months` (12 to 2027-01-01, then 6) and drop CO-2452. CO-509 and CO-2439: a yes/no parameter `ma_alien_payment_restriction_applies` with versions false / true from 2026-10-01, replacing CO-2401's comparison. CO-1975: drop the `det_date` arm if the month arm suffices (confirm with the Medicaid owner). Retire CO-176 or read it. Rule tests that set `as_of` across the change dates keep their expectations. | P2 |

### 5. Parameter values restated in meanings and precisions

| ID | Items | Problem | Governing excerpt | Proposed change | Pri |
|---|---|---|---|---|---|
| R-1 | CO-543 `ma_magi_income_standard_pregnant`; CO-547 `ma_is_parent_caretaker_category` | Wrong today. CO-543's meaning says "Colorado's own percentage stated at 10 CCR 2505-10 8.100.4.G.5 (185% FPL ...)"; its precision and CO-194 say 195%. CO-547's precision speaks of "every parent/caretaker between 60% and 65% of FPL"; CO-192 is 68% since 2022-06-30. An approver signs the meaning. | S640, § 8.100.4.G.5 (195%); CO-192's current version (68%). | Rewrite both to name `ma_income_limit_pregnant_pct` and `ma_income_limit_parent_caretaker_pct` without figures. | P2 |
| R-2 | Restatements of parameters that have dated versions (go stale at the next version): CO-1987 ($110.36, `ma_personal_needs_allowance_institutional`); CO-951, CO-952 ($79, `af_personal_needs_allowance_maximum`); CO-1508 ($2,500, $1,500); CO-376 ($165); CO-922 (67%, 100%); CO-704 (142%, 195%); CO-2439 (68% and the other MAGI and Buy-In limits); CO-1299 and CO-1244 ($40, $120); CO-2457 and CO-2458 (their own band amounts, which § 8.100.6.P.1.f.iv and Q.1.g.v re-base every July 1); CO-290 ($248.00, its own value); CO-875 ($7,258, its own example); CO-1289 (all eight rates, H-1); CO-191, CO-192, CO-194 (their history, acceptable as history) | A meaning or precision that quotes the in-force figure of a versioned parameter is wrong the day the next version starts, and no check catches it. | S1727, S1728 (premiums re-based each State fiscal year); the `versions` of each parameter. | In derived items, name the parameter instead of the figure (the handoff sheet and the app can show the value in force beside the name). In a parameter's own meaning, state what the figure is and leave the amounts to `versions`. Keep history sentences that say "the 2026 figure" with the year. | P2 |
| R-3 | Restatements of figures without versions: 120 parameters, restated in their own meaning or in a direct reader's meaning or precision (Appendix B) | Lower risk (most are statutory and change only with a rule amendment), but each is a second statement an amendment must find. | Each parameter's source. | Same as R-2, done item by item as the H-fixes touch each chapter. The H-fixes also remove the figures from the meanings of CO-405, CO-616, CO-620, CO-659, CO-1279, CO-1280, CO-1290, CO-1299, CO-1393, CO-1969, CO-2003, CO-2230. | P3 |

### 6. Literals in tests and cases that restate a parameter

| ID | Items | Problem | Governing excerpt | Proposed change | Pri |
|---|---|---|---|---|---|
| T-1 | 37 rule tests state a parameter under `given`: CO-642-T1 to T4 (`ssi_federal_benefit_rate_individual`, `ma_special_income_group_pct`), CO-648-T1/T2, CO-655-T1 to T3, CO-662-T1/T2, CO-914-T1 to T5 and CO-1260-T1 to T5 (`cw_pregnancy_allowance`), CO-951-T8/T9 (`af_oap_payment_floor: 0`), CO-984-T13/T14, CO-1640-T3, CO-1641-T1/T2, CO-2384-T1 to T3, CO-2386-T1/T2 | The engine ignores a parameter stated as a person's fact; `npm run check` warns 37 times. 35 restate the value in force on the test's date and do nothing. CO-951-T8 and T9 state a payment floor of 0 where $189 is in force: the tests pass only because the floor does not bind at $852, so they do not test what their givens say. CO-2384-T1's title records the confusion ("No - the OAP standard is read as stated"). | conventions, Tests: "Parameters are never stated as a person's facts (the engine ignores them there, and `npm run check` warns)". | Delete the 35 restatements. In CO-951-T8/T9 delete the floor (the $189 floor does not change the result) or move it under `parameters:` if a zero floor is the intent; fix CO-2384-T1's title. Expectations unchanged. | P2 |
| T-2 | `parameters:` overrides equal to the in-force value: CO-2238-T3, CO-2240-T1/T2, CO-2277-T1 to T3 (994 and 1,491 on 2026-10-01) | Redundant pins; a correction of the 2026 SSI figures would not reach these tests. The other overrides (`transfer_penalty_divisor: 9000` x9, `ma_personal_needs_allowance_institutional: 75` x6 and `100` x3, `ma_elects_short_term_hardship_exception: true` x3) are deliberate hypotheticals and stay. | as T-1 | Remove the six redundant overrides. Expectations unchanged. | P3 |
| T-3 | Rule tests that state a derived standard at a superseded figure: CO-381-T2 (`snap_excess_shelter_deduction` 744, the FY2026 cap, on 2026-10-01 when the cap is 769), CO-382-T1 to T3 (`snap_net_income_limit` 2,221, FY2026 size 3; FY2027 is 2,277), CO-378-T1/T2 (`snap_standard_deduction` 209; FY2027 is 217), CO-385-T3 and CO-2307-T3 (`snap_maximum_allotment` 546; FY2027 size 2 is 562), CO-952-T2 (`af_grant_standard` 967, the 2025 AND-CS standard, on 2026-10-01), CO-547-T5 (`ma_magi_highest_income_standard_pct` 0.6, the 2022 parent limit) | The tests isolate a rule by stating the derived value, which is allowed, but the stated figure is last year's on the test's own date, so a reader checking the test against the rule sees a wrong figure. | as T-1 | Either move `as_of` into the year the figure belongs to (for example 2026-09-30 for the SNAP FY2026 figures), or state the in-force figure and recompute the expectation. | P2 |
| T-4 | Rule tests that state a derived standard at the in-force figure: 65 statements in the tests of CO-545, CO-546, CO-547, CO-548, CO-2419 (`ma_magi_highest_income_standard_pct`), CO-1640 (`ma_ssi_income_standard`), CO-914, CO-1260 (`cw_grant_standard`), CO-913 (`cw_need_standard`), CO-951, CO-952 (`af_grant_standard`), CO-348, CO-377 (`snap_utility_allowance_amount`), CO-385, CO-2307, CO-2308 (`snap_maximum_allotment`), CO-659-T4 (`ma_transfer_penalty_share_rate`) | A second copy of the figure; harmless while the version for that date stands. | as T-1 | Where the test is not isolating the standard on purpose, drop the stated value so the test exercises the parameter. Otherwise leave. | P3 |
| T-5 | `tests/cases.yaml` | No case states a parameter or `parameters:`; the only derived items cases state are `cw_eligibility_status`, `cw_grant_amount` and `meets_public_assistance_citizenship_requirement` (values with no figure). The case literals that restate a policy figure are `cccap_entry_income_limit_pct_fpl: 1.85` (15 persons, H-18) and `estimated_home_heating_costs_for_season: 900` (10 persons, an illustrative per-household figure; see H-18 on the flat rates). | - | Covered by H-18. | - |

## Counts

| Group | Findings | P1 | P2 | P3 |
|---|---|---|---|---|
| Policy figures in derivations (H) | 21 | 18 | 3 | 0 |
| Structural table-shape literals (S) | 1 | 0 | 0 | 1 |
| Duplicated parameter values (D) | 5 | 0 | 4 | 1 |
| Date parameters as effectivity switches (E) | 1 | 0 | 1 | 0 |
| Restatements in meanings (R) | 3 | 0 | 2 | 1 |
| Tests and cases (T) | 4 (+1 covered) | 0 | 2 | 2 |
| **Total** | **35** | **18** | **12** | **5** |

Instances behind them: 34 derived items carry policy-figure literals (about 80 occurrences: 77 numbers and dates, 17 of them in the CHP+ copayment ladder, and 3 county lists); 4 supplied facts hold state figures (H-18), stated 15 times in cases; 68 structural literals in 17 items; 3 groups of true duplicates holding 8 surplus parameters (D-1 to D-3) and one shared-parameter decision (D-4); 272 parameter-to-text restatements across 205 items (22 parameters with versions, 120 without), 2 of them wrong now; 37 parameters stated as facts in rule tests, 6 redundant overrides, 10 superseded and 65 in-force standards stated in tests. Classified as constants and left alone: 106 items with only `0` and 64 items with only arithmetic constants (Appendix A). New parameters proposed: about 44, ten of them tables; retirements: CO-1285, CO-1981 to CO-1984 (into one table), CO-832 (derived), two of the three 40-quarter parameters, and in time the D-1 copies.

## Proposed order of work

1. **Engine and catalog prerequisites, one change set:** the parameter type "table keyed by option" (H-3, H-5, H-7, H-18); an open last band for P48 (H-2); the month-of-year anchor operator P49 (H-16). Optional in the same set: the lookup-with-additional pattern P50 (S-1) and P25 "parameter in force on a date" (D-1).
2. **Schedules the rules re-base, and the answers wrong or unknown today (P1):** H-1 (CCCAP fee; also removes the no-version unknowns), H-18 (LEAP year figures and the CCCAP county limit, with the 15 case edits), H-2, H-3, H-5, H-7, H-4, H-6.
3. **The remaining P1 rule figures, by chapter so each owner signs once:** SNAP H-8, H-9, H-10, H-11 (needs the SNAP owner's decision on the weekly factor); Medicaid H-12, H-13, H-14 (Medicaid ages), H-15 (CO-306's dates go with SNAP); Adult Financial H-14 (AF ages), H-15 (CO-1215), H-17; SUN Bucks and LEAP H-16 once P49 exists. Rewrite each touched meaning without figures as part of the same change (R-3's list).
4. **P2:** R-1 first (wrong now), then D-2 and D-1 (drift between copies), D-4 (owner decision, with OQ-391), D-3, E-1, R-2, T-1, T-3, H-19, H-20, H-21.
5. **P3:** S-1 (after P50), D-5, R-3 remainder, T-2, T-4.

After each step: `npm run governance`, `npm run check` (the 37 parameter-as-fact warnings and the six no-version warnings should fall to the CW table ones), `npm run export` and the conformance self-check.

## Appendix A. Items whose literals were treated as constants (64)

- Verification tallies (`1` per element, `else 0`, `= 0` / `> 0`): CO-1388, CO-1389, CO-1390, CO-1394, CO-1410, CO-1411, CO-1412, CO-1416, CO-1417, CO-1424, CO-1436, CO-1438, CO-1447, CO-1448, CO-1458, CO-1459, CO-1460, CO-1655, CO-1688, CO-1697.
- Couple size 2 selecting the SSI couple figure: CO-608, CO-610, CO-613, CO-614, CO-615, CO-1159, CO-1161, CO-2240.
- Months per year: CO-417 (also `-1`), CO-662, CO-1750, CO-2229.
- Rounding down and the day before (`-1`): CO-416, CO-649, CO-914, CO-940, CO-1260, CO-2214.
- n - 1 arithmetic: CO-333, CO-371, CO-2300, CO-2301 (pro-rata share of an ineligible member); CO-556, CO-1187, CO-2404, CO-2430, CO-2431 (n months starting with a month); CO-419 (the household less the person and spouse).
- A household has a member, more than one caretaker: CO-338, CO-340, CO-386, CO-387, CO-991.
- The person counted once: CO-501.
- Multipliers of 1: CO-952, CO-1281, CO-2235, CO-1402, CO-1640, CO-1641.
- Ordinals and counts the rule's structure names: CO-2318, CO-1976, CO-947.
- The month received: CO-1185.
- Plus 106 items whose only literal is `0`.

## Appendix B. Unversioned parameters restated in text (R-3)

Each line: parameter (figure as written): items whose meaning or precision restates it, the parameter itself included where its own meaning does. Direct readers only; a restatement two items away is not listed.

- `af_and_max_age` (59): CO-1203
- `af_and_so_min_age` (18): CO-1203
- `af_burial_cost_limit` ($2,500): CO-1227, CO-1231
- `af_hca_max_need_score` (51): CO-1214
- `af_hca_min_capacity_score` (21): CO-1210, CO-1216
- `af_hca_tier_three_min_need_score` (38): CO-1213, CO-1216
- `af_hca_tier_two_min_need_score` (24): CO-1212, CO-1216
- `af_oap_age` (60): CO-1215
- `cccap_job_search_weeks` (13): CO-984
- `cccap_parent_fee_additional_child_amount` ($15): CO-1289
- `cccap_parent_fee_base_rate` (1%): CO-1289
- `cccap_parent_fee_marginal_rate` (14%): CO-1289
- `chp_continuous_eligibility_months` (12): CO-2403, CO-2404
- `chp_copayment_band_b_max_pct` (150%): CO-2226, CO-2228
- `chp_copayment_band_c_max_pct` (200%): CO-2227, CO-2228
- `chp_copayment_waiver_limit_pct` (101%): CO-2225, CO-2228
- `chp_cost_sharing_aggregate_cap_pct` (5%): CO-2229
- `chp_income_limit_pct_upper` (260%): CO-704
- `chp_postpartum_coverage_months` (12): CO-2405, CO-2406
- `cw_child_support_redetermination_threshold` ($500): CO-2553, CO-2555
- `cw_dependent_child_age_limit` (18): CO-901, CO-919
- `cw_earned_income_disregard_dollar` ($90): CO-907, CO-909, CO-910, CO-923, CO-2353
- `cw_minor_parent_age_limit` (18): CO-906, CO-919
- `cw_sanction_first_level_reduction` ($1): CO-1265
- `cw_sanction_reduction_rate` (25%): CO-1265
- `cw_sponsor_deeming_fpl_pct` (125%): CO-2364, CO-2366
- `cw_sponsor_earned_income_deduction_cap` ($175): CO-2365, CO-2368
- `cw_sponsor_earned_income_deduction_rate` (20%): CO-2367
- `cw_work_participation_hours_per_week` (30): CO-920
- `cw_work_participation_hours_per_week_young_child` (20): CO-920
- `federal_minimum_wage` ($7.25): CO-160
- `leap_subsidized_housing_heating_allowance` ($180): CO-1281, CO-1282
- `ma_adult_upper_age_limit` (65): CO-199, CO-2439
- `ma_aged_age` (65): CO-237, CO-600, CO-1162, CO-1164, CO-1179
- `ma_bccp_max_age` (65): CO-1130, CO-1152
- `ma_cbwd_income_limit_pct` (300%): CO-243, CO-620
- `ma_cbwd_premium_cap_pct_lower` (5%): CO-621, CO-2459
- `ma_cbwd_premium_cap_pct_upper` (7.5%): CO-621, CO-2460
- `ma_cbwd_premium_cap_threshold_pct` (200%): CO-621, CO-2461
- `ma_community_engagement_dependent_child_max_age` (13): CO-1908, CO-1960
- `ma_community_engagement_inmate_lookback_months` (3): CO-1904, CO-1969
- `ma_community_engagement_required_hours` (80): CO-1968
- `ma_community_engagement_seasonal_average_months` (6): CO-1905, CO-1968
- `ma_continuous_eligibility_months` (12): CO-556
- `ma_dac_min_age` (18): CO-1134, CO-1161
- `ma_dependent_child_age_limit` (18): CO-190, CO-544
- `ma_disabled_widow_min_age` (50): CO-1135, CO-1162
- `ma_expansion_adult_renewal_interval_months` (6): CO-2453, CO-2455
- `ma_express_lane_verification_days` (90): CO-2443, CO-2445
- `ma_family_planning_income_lower_pct` (133%): CO-1131, CO-1155, CO-2439
- `ma_family_planning_income_upper_pct` (260%): CO-1132, CO-1155, CO-2439
- `ma_federal_magi_floor_pct` (133 percent/133%): CO-195, CO-540, CO-542, CO-543
- `ma_five_year_bar_exempt_work_quarters` (40): CO-1171, CO-1172
- `ma_former_foster_care_age_limit` (26): CO-200
- `ma_four_month_extension_months` (4): CO-2431
- `ma_hcbs_adult_min_age` (18): CO-1136, CO-1164
- `ma_hcbs_bi_min_age` (16): CO-1140, CO-1164
- `ma_hcbs_ces_age_limit` (18): CO-1137, CO-1164
- `ma_hcbs_chrp_age_limit` (21): CO-1138, CO-1164
- `ma_hcbs_cwchn_age_limit` (19): CO-1139, CO-1164
- `ma_hospital_pe_employed_disabled_min_age` (16): CO-2438, CO-2439
- `ma_imd_exclusion_min_age` (21): CO-1179, CO-1193
- `ma_income_limit_adult_pct` (1.33/133%): CO-193, CO-542, CO-2439
- `ma_income_reasonable_opportunity_days` (30): CO-1414, CO-2219
- `ma_income_trust_expense_retention_max` ($20/$20.00): CO-2237, CO-2238
- `ma_lottery_winnings_spread_floor` ($79,999): CO-1183, CO-1185
- `ma_lottery_winnings_spread_increment` ($10,000): CO-1184, CO-1185
- `ma_lottery_winnings_spread_max_months` (120): CO-1185, CO-1988
- `ma_magi_child_age_limit` (19): CO-180, CO-509, CO-548, CO-559, CO-564, CO-1154, CO-1399, CO-1976, CO-2439
- `ma_magi_income_disregard_pct` (5%): CO-545, CO-546, CO-547, CO-548, CO-704, CO-1155
- `ma_mmmna_applicable_pct` (150%): CO-662
- `ma_mmmna_shelter_threshold_pct` (30%): CO-655
- `ma_needy_person_age_limit` (21): CO-2417, CO-2419
- `ma_pace_min_age` (55): CO-654, CO-1133
- `ma_postpartum_coverage_months` (12): CO-198, CO-560
- `ma_psych_inpatient_extended_age_limit` (22): CO-2418, CO-2419
- `ma_qdwi_income_limit_pct` (200%): CO-241, CO-616
- `ma_qi_income_limit_pct` (135%): CO-240, CO-615
- `ma_qmb_income_limit_pct` (100%): CO-238, CO-613
- `ma_reasonable_compatibility_threshold_pct` (20%): CO-1402, CO-1640, CO-1641
- `ma_reasonable_opportunity_period_days` (90): CO-1413
- `ma_residency_parental_state_age_limit` (21): CO-2256, CO-2257
- `ma_slmb_income_limit_pct` (120%): CO-239, CO-614, CO-615
- `ma_special_income_group_pct` (300%): CO-250, CO-642, CO-1640, CO-2238
- `ma_ssi_unemancipated_child_age_limit` (18): CO-2273, CO-2275
- `ma_ssi_unemancipated_student_age_limit` (21): CO-2274, CO-2275
- `ma_standard_renewal_interval_months` (12): CO-2454, CO-2455
- `ma_veteran_personal_needs_allowance` ($90): CO-1987
- `ma_wawd_income_limit_pct` (450%): CO-242, CO-618, CO-2439
- `ma_wawd_min_age` (16): CO-244, CO-618
- `ma_wawd_premium_cap_pct` (7.5%): CO-619
- `sebt_monthly_benefit_table` ($40): CO-1244, CO-1299
- `sebt_reduced_price_income_pct` (1.85): CO-1291, CO-1297
- `snap_abawd_countable_month_limit` (3): CO-418
- `snap_abawd_min_age` (18): CO-412
- `snap_abawd_period_months` (36): CO-417
- `snap_benefit_reduction_rate` (30 percent/30%): CO-384
- `snap_earned_income_deduction_rate` (20 percent): CO-373
- `snap_elderly_age` (60): CO-301
- `snap_expedited_income_ceiling` ($150): CO-348
- `snap_expedited_resource_ceiling` ($100): CO-348
- `snap_immigrant_child_exemption_age` (18): CO-306
- `snap_mandatory_child_age` (22): CO-101, CO-305
- `snap_medical_deduction_threshold` ($35): CO-376
- `snap_parental_control_age` (18): CO-2569
- `snap_qualifying_quarters_threshold` (40): CO-307
- `snap_recertification_expense_change_threshold` ($25): CO-1380, CO-1381, CO-1382
- `snap_recertification_income_change_threshold` ($50): CO-1619
- `snap_shelter_share_rate` (50 percent): CO-379
- `snap_student_employment_hours_per_week` (20): CO-407
- `snap_student_max_age` (49): CO-411
- `snap_student_min_age` (18): CO-410, CO-411
- `snap_student_older_child_age` (12): CO-409
- `snap_work_registration_hours_per_week` (30): CO-404
- `snap_work_registration_max_age` (59): CO-406
- `snap_work_registration_min_age` (16): CO-161, CO-405, CO-406
- `ssi_earned_income_exclusion` ($65): CO-231, CO-605, CO-946, CO-1158, CO-1715, CO-2241, CO-2384
- `ssi_general_income_exclusion` ($20/20): CO-230, CO-605, CO-606, CO-946, CO-1158, CO-1160, CO-1715, CO-2241, CO-2384
- `ssi_resource_limit_couple` ($3,000): CO-947, CO-948, CO-1229
- `ssi_resource_limit_individual` ($2,000): CO-648, CO-947, CO-948, CO-1229

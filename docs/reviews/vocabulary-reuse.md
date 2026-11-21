# Vocabulary and reuse review: Colorado volume

Date: 2026-11-21. Reviewer: data steward. Branch `ccr-9d19bf4c-wmnwcl`. No ledger file was changed by this review.

## Scope and method

Every item under `volumes/co/{supplied,parameters,shared,medicaid,chp,snap,cash,childcare,energy,sunbucks}` was read: 780 items (223 supplied facts, 186 parameters, 371 derived items). For each item the review indexed its identifier, meaning, sources, and every item that reads it (by walking the `derived` expressions), then compared the governing excerpts in `sources.md` wherever one item is read by more than one program, or two items look alike.

`npm run governance -- --volume co` reports 670 warnings (486 `dup.similar`, 122 `supplied.single-consumer`, 58 `dup.shape`, 4 `name.prefix`). They were a starting point only. Most `dup.similar` pairs are not duplicates (section 6), and the automated rules cannot see the main problem this review found: a fact written for one program's rule and then read by another program whose rule says something different.

The product owner's framing held up. `age` (CO-300) is shared correctly. "Income" is not: the shared income facts were authored for SNAP in phase 2 and every later program reads them as if they carried its own definition.

Severity:

- **blocking**: a wrong eligibility answer or amount is likely because of the reuse.
- **should-fix**: wrong in edge cases, or a maintenance trap that will produce a wrong answer when one side changes.
- **note**: naming, tidiness, or a decision to record.

Impact figures are given as *readers / rule tests that state the fact / mentions in `tests/cases.yaml`* (11 cases). A fact that is renamed or split touches all three.

Identifier convention used in proposals: `docs/conventions.md` says an identifier is never changed. Where a rename is proposed, the item keeps its `CO-` id and the change goes through a change set, as was done for CO-036.

---

## 1. Should be one item (true duplicates)

### D-1. The federal poverty guideline is stated three times (should-fix)

| Item | Unit | Values | Read by |
|---|---|---|---|
| `ma_poverty_guideline_table` (CO-181), `ma_poverty_guideline_each_additional` (CO-182) | annual | 2026: 15,960 ... 55,720; +5,680 | Medicaid (9 items), LEAP (CO-1278), SunBucks (CO-1297) |
| `snap_poverty_guideline_table` (CO-116), `snap_poverty_guideline_each_additional` (CO-117) | annual | identical to CO-181/182, same source S55 | nothing |
| `cccap_poverty_guideline_table` (CO-323), `cccap_poverty_guideline_each_additional` (CO-324) | monthly | 2026-10-01: 1,330.00 ... = CO-181 divided by 12 | CCCAP (CO-986, CO-995, CO-1289) |

CO-116/117 and CO-181/182 are the same parameter with the same values and source. `docs/design-colorado.md` says "The federal poverty guidelines are one parameter table with yearly versions."

- **Survivor:** CO-181 and CO-182, renamed `federal_poverty_guideline_annual_table` and `federal_poverty_guideline_annual_each_additional`, program `All`. Retire CO-116 and CO-117.
- **Repoint:** the 11 readers of CO-181 and 4 readers of CO-182 (CO-504, CO-1153, CO-613 to CO-616, CO-618, CO-619, CO-662, CO-1278, CO-1297). LEAP and SunBucks already read the Medicaid-prefixed table, which is a prefix violation today.
- **CCCAP:** CO-323/324 is the same guideline divided by twelve, effective each October 1 (8 CCR 1403-1 3.111.H). Either derive it (`federal_poverty_guideline_annual_table` as of the preceding January, divided by 12), which needs the 2024 and 2025 versions added to the shared table, or keep it and rename it `cccap_poverty_guideline_monthly_table` so the unit is in the name. As written, two tables with the same name stem hold annual and monthly dollars.
- **Tests and cases:** no rule test or case states any of these tables. Expected values do not change.

### D-2. SNAP states its percent-of-poverty limits twice (note)

`snap_bbce_gross_income_limit_pct` (CO-115, 2.0) and `snap_elderly_disabled_separate_household_income_limit_pct` (CO-105, 1.65) have no reader. The rules read the dollar tables CO-122 and CO-114, which state the same limits.

- **Survivor:** the tables (they are the FNS-published figures). Retire CO-105 and CO-115, or keep them and derive the tables from the shared guideline so the percentage is the parameter. Do not keep both unconnected.
- **Tests and cases:** none.

### D-3. CHP+ lower bounds restate the Medicaid income limits (should-fix)

| CHP+ | Medicaid | Value |
|---|---|---|
| `chp_income_limit_pct_child_lower` (CO-210) | `ma_income_limit_child_pct` (CO-191) | 1.42 |
| `chp_income_limit_pct_pregnant_lower` (CO-211) | `ma_income_limit_pregnant_pct` (CO-194) | 1.95 |

The CHP+ band begins where the Medicaid category ends; CO-210 and CO-191 cite the same excerpt (S641). Two parameters means one can be updated without the other, leaving a gap or an overlap between the programs.

- **Survivor:** CO-191 and CO-194. `chp_income_within_limit` (CO-704) and `chp_presumptive_eligibility` (CO-708) read them. Retire CO-210 and CO-211.
- **Tests and cases:** none state the parameters.
- Related, lower confidence: `ma_federal_magi_floor_pct` (CO-195), `ma_income_limit_adult_pct` (CO-193) and `ma_family_planning_income_lower_pct` (CO-1131) are all 1.33. The family planning lower bound is by rule the adult limit; CO-1155 should read CO-193. Confirm with the Medicaid owner.

### D-4. Two facts for the same foster care history (should-fix)

`was_foster_youth_at_eighteen` (CO-054, program SNAP, no source) and `age_at_foster_care_exit` (CO-095, Medicaid, S213) state the same real-world fact. SNAP no longer reads CO-054 (the foster-youth ABAWD exception was removed by Pub. L. 119-21); its only reader is `ma_meets_some_category_demographics` (CO-552), while the category rule itself, `ma_is_former_foster_care_category` (CO-549), reads CO-095. The two Medicaid rules therefore test the same condition from different facts and can disagree, for example a youth who left care at 19 with CO-054 unstated.

- **Survivor:** CO-095 (with CO-086). Retire CO-054.
- **Repoint:** CO-552 reads `ma_is_former_foster_care_category` directly (that rule has no income half, so nothing needs restating).
- **Tests and cases:** 2 rule tests on CO-552 and 12 case mentions state CO-054; replace with `age_at_foster_care_exit`.

### D-5. `is_employed` duplicates `has_earned_income` (should-fix)

`is_employed` (CO-805): "currently employed (working for wages or self-employed)". `has_earned_income` (CO-1356): "has wages or net self-employment income in the month". A case can state `is_employed: true` with no earnings and pass the Working Adults with Disabilities employment condition.

- **Survivor:** CO-1356. `ma_wawd_eligible` (CO-618) reads it. Retire CO-805.
- **Tests and cases:** 3 rule tests, 10 case mentions.

### D-6. Receipt flags stated beside the amount or the outcome (should-fix)

| Supplied flag | Same fact also stated as |
|---|---|
| `receives_ssi` (CO-012) | `ssi_income` (CO-849) more than zero; `retains_ssi_status_without_payment` (CO-1112) |
| `receives_tanf_cash` (CO-013) | `cash_assistance_income` (CO-029); the volume's own `cw_grant_amount` (CO-914) |
| `receives_state_cash_assistance` (CO-073) | `cash_assistance_income` (CO-029); `af_category` (CO-953) other than none |
| `receives_unemployment_compensation_or_applied` (CO-046) | `unemployment_income` (CO-027) more than zero, for the first half |
| `participates_in_workfare` (CO-068) | `workfare_hours` (CO-049, no reader) |
| `is_in_snap_employment_and_training` (CO-047, no reader) | `work_program_hours` (CO-048) |

Nothing ties the pairs together, so a case can say a person receives SSI and has zero SSI income. These are not all strict duplicates (receipt last month is a different fact from eligibility determined now), so the proposal is narrower than a merge:

- Make the amount the supplied fact and derive the flag: `receives_ssi` = `ssi_income` more than zero, or `retains_ssi_status_without_payment`; `receives_tanf_cash` and `receives_state_cash_assistance` from the split cash amounts proposed in R-1.
- Retire CO-047 and CO-049, which nothing reads.
- State in each surviving meaning whether it is the amount paid for the month (a fact) or this volume's own determination.
- **Tests and cases:** `receives_ssi` is stated in every case; `receives_tanf_cash` 23 rule tests and 15 case mentions.

### D-7. Smaller duplicates (note)

- `ma_magi_income_standard_parent_caretaker` (CO-541) is `max(x, x)` of `ma_income_limit_parent_caretaker_pct` (CO-192): an alias. Keep CO-192; readers CO-539 and CO-547 repoint.
- `cw_time_limit_exempt` (CO-917) has no reader and was replaced by `cw_unit_time_limit_extended` (CO-925), which adds the disqualified-member bar. Retire CO-917 (its tests go with it).
- `ma_magi_is_eligible` (CO-553) has no reader; `ma_magi_is_fully_eligible` (CO-562) and `ma_magi_eligibility_status` (CO-554) carry the result. Retire CO-553.
- `af_and_cs_grant_standard` (CO-291) equals `ma_ssi_federal_benefit_rate_individual` (CO-235) in both versions (967, 994). If 9 CCR 2503-5 3.546.A defines the AND-CS standard as the SSI federal benefit rate, derive it; ask the cash programs owner.

---

## 2. Inappropriate reuse (one item standing in for different concepts)

### R-1. The shared income facts (blocking)

Items: `earned_income` (CO-023), `self_employment_net_income` (CO-024), `social_security_income` (CO-025), `pension_income` (CO-026), `unemployment_income` (CO-027), `child_support_received` (CO-028), `cash_assistance_income` (CO-029), `other_unearned_income` (CO-030). All are program `All`, have no source, and their rationale says they were "reserved for the SNAP income ... rules". `earned_income` has 20 readers in seven programs.

Four separate problems:

**(a) Gross or post-exclusion.** `docs/colorado-notes.md` records the phase 2 decision: "The supplied income facts are the countable, post-exclusion amounts; the 7 CFR 273.9(c) exclusions are not rules." The meaning of CO-023 says "gross earned income". Each reading program has its own exclusions:

| Program | What the rule counts | Source |
|---|---|---|
| SNAP | wages and self-employment, less 273.9(c) exclusions | S41, S42 |
| MAGI Medicaid | taxable income, with tax deductions | S164 to S167 |
| SSI-related, MSP | gross, then the $20 and $65-plus-half disregards | S308 to S310 |
| Long-term care | "income before application of deductions, exemptions or disregards" | S351 |
| Colorado Works | "gross wages", then $90 or 67% | S412, S416 |
| CCCAP | "counted before deductions are made for taxes, bonds, pensions" | S486 |
| LEAP | countable income for the eligibility period | S491 |

A figure that is already net of SNAP's exclusions is not CCCAP's or long-term care's gross income.

**(b) `earned_income` means wages only, and five programs read it as all earned income.** Its meaning: "wages and salaries ... before self-employment net income". SNAP, MAGI, CCCAP and long-term care add CO-024. These do not:

- Colorado Works: `cw_countable_earned_income` (CO-907), `cw_payment_countable_earned_income` (CO-922), `cw_deemed_parent_income_of_minor_parent` (CO-909)
- Adult Financial: `af_countable_income` (CO-946)
- SSI-related and MSP: `ma_ssi_countable_earned_income` (CO-605)
- Buy-In: `ma_wawd_eligible` (CO-618), `ma_wawd_premium` (CO-619)
- Spousal impoverishment: `ma_family_allowance` (CO-657)

A self-employed applicant's earnings are left out of the Colorado Works need test, the OAP and AND grants, SSI-related eligibility and the Buy-In premium. `leap_household_income` (CO-1002) excludes a child's wages but counts the same child's self-employment income, for the same reason.

**(c) `other_unearned_income` is not the same set for MAGI.** Its meaning gives "interest, dividends, or contributions from someone outside the household". `ma_person_magi_income` (CO-502) adds it to MAGI, which counts only taxable income; gifts and contributions, veterans' benefits and workers' compensation are not MAGI income. `other_taxable_income` (CO-079) also lists dividends, so a dividend can be entered in both and counted twice.

**(d) `cash_assistance_income` and SSI.** CO-029 means cash assistance "counted as unearned income for another program's budget". `cw_countable_unearned_income` (CO-908) and `af_countable_income` (CO-946) read it too, so a program counts its own grant as income against itself. SSI has no home at all: S42 lists SSI as SNAP unearned income, but `snap_person_unearned_income` (CO-331) has no SSI term, and `ssi_income` (CO-849) is read only by `af_and_cs_eligible` (CO-950). If a case puts SSI in `other_unearned_income`, MAGI counts it.

One symptom: `snap_person_unearned_income` (CO-331) and `cw_countable_unearned_income` (CO-908) are the same sum with the terms in a different order. They should not be merged. They are identical only because neither program's exclusions are modeled.

**Proposed split.**

1. Shared supplied facts state the amount received by source, before any program's exclusions, and say so. Rename `earned_income` to `wages_gross`. Add `tanf_cash_income`, `adult_financial_cash_income`, and use the existing `ssi_income` in place of `cash_assistance_income`. Add `veterans_benefit_income` and `nontaxable_other_income` so `other_unearned_income` can be retired or narrowed.
2. Self-employment: supply `self_employment_gross_receipts` (shared) and the allowable costs per method, `snap_self_employment_costs` (273.11 costs of doing business) and `magi_self_employment_deductions` (tax basis), rather than one "net".
3. Each program keeps its own derived income item with its own prefix and adds explicit exclusion inputs where the rule excludes something: `snap_excluded_income`, `cw_excluded_income`, and so on, each citing its exclusion list.
4. Add the missing self-employment term to CO-605, CO-618, CO-619, CO-657, CO-907, CO-909, CO-922, CO-946, or record why the program excludes it.

**Impact:** `earned_income` 20 readers / 172 rule tests / all cases; `other_unearned_income` 13 / 90 / all; `cash_assistance_income` 6 / 63 / all. Expected values change in any case with self-employment income on a cash or SSI-related program; the existing cases mostly state zero.

### R-2. `is_enrolled_in_school` stands for four definitions (blocking)

CO-020: "enrolled at least half time, as defined by the school, in a secondary (elementary through 12th grade or equivalent) school program." Its rationale says "no other item reads is_enrolled_in_school"; five now do.

| Reader | Rule says | Source |
|---|---|---|
| `snap_is_exempt_from_work_registration` (CO-405) | "enrolled at least half-time in any recognized school, training program, or institution of higher education" | S125 |
| `ma_is_dependent_child` (CO-544) | age 18 and "a full-time student in secondary school (or equivalent vocational or technical training)", expected to finish before 19 | S206 |
| `cw_is_dependent_child` (CO-901) | "full-time student at a secondary school or vocational or technical equivalent", expected to finish before 19 | S401, S406 |
| `cccap_is_household_child` (CO-990) | under 19 and "still in high school" | S496 |
| `cccap_caretaker_in_eligible_activity` (CO-984) | "training; basic education; or, post-secondary education" | S482 |

The fact matches none of them exactly. A half-time 18-year-old is treated as a dependent child for Medicaid and Colorado Works. A parent in college is not in a CCCAP eligible activity, so the household fails the activity test (CO-984 records this as OQ-124).

**Split:**

- `is_full_time_secondary_student_expected_to_finish_before_nineteen` (shared; Medicaid and Colorado Works state the same test): CO-544 and CO-901.
- `snap_is_enrolled_at_least_half_time_in_school_or_training`: CO-405.
- `is_attending_high_school` (shared): CO-990.
- `cccap_is_in_education_or_training_activity`: CO-984.
- Retire CO-020.

**Impact:** 5 readers / 54 rule tests / 26 case mentions.

### R-3. `is_indian_or_urban_indian` read as the TANF Indian-country exemption (blocking)

CO-050 (SNAP): "a member of a federally recognized tribe, an Alaska Native, or an urban Indian eligible for the ABAWD exemption". `cw_months_of_assistance_used` (CO-915) returns 0 whenever it is true.

The Colorado Works rule (S525) is about place and employment, not membership: "Any month of receipt of assistance by an adult while living in Indian Country, or a Native Alaskan village where at least fifty percent (50%) of the adults were not employed, shall not be counted". As written, every tribal member anywhere in Colorado has zero countable months and never reaches the sixty-month limit.

**Split:** keep CO-050 for SNAP (rename `snap_is_indian_or_urban_indian`). Add `cw_months_received_in_exempt_indian_country` (whole number, per person), subtracted from `months_of_assistance_received` (CO-840) in CO-915.

**Impact:** 2 readers / 19 rule tests / 22 case mentions; only the CO-915 tests change.

### R-4. SNAP's waiting-period exemption read as 8 U.S.C. 1613(b) (blocking)

`snap_is_exempt_from_immigrant_waiting_period` (CO-306) is true for a person under 18, with a military connection, or born before 1931 and lawfully resident in 1996: SNAP's own exceptions (S14 to S16, S24). `cw_meets_citizenship_requirement` (CO-905) reads it "for the 8 U.S.C. 1613(b) federal exempt categories" (S402). The 1613(b) categories are refugees, asylees, persons whose deportation is withheld, Cuban and Haitian entrants, Amerasians, and veterans or active-duty members and their families. Being under 18 is not one of them.

Result for Colorado Works: a lawful permanent resident child inside five years is found eligible (wrong), and a refugee inside five years is found ineligible (wrong).

The same gap exists where the item is not reused. `ma_meets_citizenship_requirement` (CO-509) exempts only veterans from the bar, and `af_meets_citizenship_requirement_and` (CO-943) exempts no one, so a refugee in the first five years fails both.

**Split and share:**

- New shared derived `is_exempt_from_five_year_bar` (8 U.S.C. 1613(b)), over `citizenship_status` (refugee, asylee, cuban_haitian_entrant, plus options to add for withholding and Amerasian) and `is_veteran_or_active_duty`. Read by CO-509, CO-905, CO-943.
- CO-306 stays SNAP-only.
- Shared derived `has_held_qualified_status_five_years` and a shared parameter (see U-2) replace three restatements.
- `qualified_status_date` (CO-003): Colorado Works also reads it as the date of entry ("entered the United States prior to August 22, 1996", S402). Entry date and the date the current status was obtained differ for anyone who adjusted status. Add `us_entry_date` for the cutoff test in CO-905.

**Impact:** CO-306 has 2 readers and no direct tests; `qualified_status_date` 4 / 17 / 6. Expected values change for refugees, asylees and non-citizen children on Colorado Works, Medicaid and AND.

### R-5. Disability facts (blocking for AND-SO, should-fix elsewhere)

`is_disabled_ssa` (CO-011): "a disability considered permanent under the Social Security Act (title II) disability criteria", wording taken from one prong of 7 CFR 271.2 (S6).

| Reader | Rule says | Source |
|---|---|---|
| `snap_is_disabled_member` (CO-302) | receipt of listed disability benefits; SSA-criteria disability counts only inside specific prongs | S6 |
| `ma_is_aged_blind_or_disabled` (CO-603), CO-612 | SSI (title XVI) disability | S303 to S305 |
| `af_and_so_disability_met` (CO-944) | "total disability ... that has lasted or can be expected to last for a period of six months or more", a state standard "for ... persons not receiving federal financial benefits pursuant to Title XVI" | S442, S445, S459 |
| `ma_qdwi_meets_disability_work_history` (CO-1157), `ma_disabled_widow_eligible` (CO-1162) | continues to be disabled under SSA | S622, S625 |

AND-SO exists for people who do not meet the SSA standard. Reading `is_disabled_ssa` for it denies most of the people the program serves (CO-944 notes the stand-in as OQ-113). In the other direction, `snap_is_disabled_member` treats a bare SSA-criteria disability, with no benefit, as making a SNAP member disabled.

`receives_social_security_disability` (CO-015) is defined with SNAP's words, "disability payments under title I, II, X, XIV, or XVI ... or federally or state-administered supplemental benefits". Adult Financial (CO-1203, CO-944) and Medicaid citizenship verification (CO-1395) read it as "receives SSDI". Under its meaning it is also true for an SSI or state supplement recipient.

**Split:**

- `meets_ssa_disability_criteria` (shared; rename of CO-011, meaning: determined disabled by SSA or the state disability determination under the title II and XVI definition).
- `af_has_total_disability_six_months` (new supplied; the state medical certification): CO-944.
- `receives_ssdi` (shared, title II disability benefits): CO-1203, CO-944, CO-1395.
- `snap_receives_disability_based_payment` (derived or supplied, the 271.2 list): CO-302. Drop the bare `is_disabled_ssa` and `is_blind` terms from CO-302 unless a 271.2 prong supports them.
- `is_disabled_for_buy_in` (CO-806) and `has_additional_care_needs` (CO-872) are already separate, correctly.

**Impact:** `is_disabled_ssa` 7 / 55 / 35; `receives_social_security_disability` 4 / 38 / 24.

### R-6. SNAP disqualifications read by Colorado Works and Adult Financial (blocking)

- `is_disqualified_for_intentional_program_violation` (CO-039): "under 7 CFR 273.16", a SNAP determination. `cw_is_disqualified_member` (CO-928) reads it on the stated ground that the categories are "the same underlying facts". They are not: an intentional program violation is found program by program, and S47 itself says "disqualified for a SNAP IPV". The excerpt cited for the Colorado Works rule (S523) does not list the categories at all. A SNAP IPV removes the person from the Colorado Works unit and blocks the unit's time-limit extension (CO-925).
- `is_disqualified_drug_felony` (CO-041) carries three meanings: SNAP's member disqualification (CO-311), the narrower basic categorical eligibility bar, "a drug-related felony where SNAP benefits were used to purchase drugs" (S47, read by CO-337), and the Colorado Works category (CO-928).
- `is_fleeing_felon_or_probation_violator` (CO-038) joins two conditions because SNAP joins them (S19). `af_meets_residency` (CO-942) reads it, but the Adult Financial rule names only "fleeing felons" (S449). A probation violator is denied OAP or AND.

**Split:** `snap_is_serving_ipv_disqualification` and `cw_is_serving_ipv_disqualification`; `snap_is_disqualified_drug_felony`, `snap_has_drug_felony_involving_snap_benefits`, `cw_is_disqualified_drug_felony`; shared `is_fleeing_felon` and `is_probation_or_parole_violator`, with SNAP and Colorado Works reading both and Adult Financial reading the first. Add the fuller 3.604.2.M excerpt before the Colorado Works items move past Draft.

**Impact:** CO-039 5 / 56 / 22; CO-041 3 / 54 / 22; CO-038 5 / 72 / 27.

### R-7. `is_head_of_household` (blocking)

CO-067 (SNAP): "the head of the SNAP household, as the household selects or the State agency assigns under 7 U.S.C. 2015(d)(1)(v)". Colorado Works reads it in `cw_months_of_assistance_used` (CO-915), `cw_is_work_eligible_individual` (CO-919) and `cw_is_adult_member` (CO-924) for the TANF "head-of-household" of 45 CFR 264.1 and 261.2(n) (S421, S418).

The SNAP household and the Colorado Works assistance unit are different groups in the target household. If the grandmother is the SNAP head, the mother, who heads the Colorado Works unit, has her months read as zero and the unit never reaches the time limit.

Other items lean on a head that is never defined for their program: `shelter_cost_monthly` (CO-035) is "carried on the head of household", and the LEAP supplied facts are "stated on the household head" (CO-1274 to CO-1277).

**Split:** `snap_is_head_of_household` (rename of CO-067) and `cw_is_head_of_assistance_unit`. Household-level facts should use scope `case` or name the program's unit (see C-6).

**Impact:** 6 / 53 / 20.

### R-8. `in_medical_institution` (should-fix)

CO-007 is SNAP's test (S3): an institution that "provides them with the majority of their meals". Readers and their rules:

| Reader | Rule says | Source |
|---|---|---|
| `snap_is_household_member` (CO-304) | majority of meals | S3, S5 |
| `ma_is_institutionalized` (CO-640), CO-643, CO-644, CO-661, CO-605, CO-663 | "a Long-Term Care institution", 30 consecutive days | S351, S354 |
| `af_hca_eligibility_status` (CO-1217) | living in a home rather than a facility | S712 |
| `leap_is_vulnerable_to_heating_cost` (CO-1004) | "Institutional group care facilities ... such as nursing homes, foster care homes, group homes, substance abuse treatment centers" | S774 |

A group home or treatment centre that provides meals is a SNAP institution and a LEAP one, but not a Medicaid long-term care institution. A hospital stay is a medical institution for the 30-day count and usually not a SNAP exclusion. CO-1104's precision describes CO-007 as "entry into a nursing facility or similar long-term care setting", which is not what CO-007 says.

**Split:** `snap_resides_in_institution_providing_meals` (CO-304); `ma_resides_in_medical_institution` with `institution_entry_date` (the Medicaid items, and Home Care Allowance if the cash owner agrees it is the same test); `leap_living_arrangement` (CO-1283) gains the institutional group care option and CO-1004 stops reading CO-007.

**Impact:** 9 / 146 / 24.

### R-9. Residency (should-fix)

- `state_of_residence` (CO-006): "The state in which the person resides for purposes of SNAP administration." No SNAP item reads it. Medicaid, Colorado Works and Adult Financial do.
- `ma_meets_residency` (CO-505), meaning "for Medical Assistance purposes under 42 CFR 435.403" (S171), is read by `cccap_low_income_child_care_eligible` (CO-987) and `leap_is_eligible` (CO-1007). The notes say a CCCAP copy "tripped the duplicate-derivation rule". Medicaid residency has its own rules for institutionalized persons, absent residents and children placed out of state. LEAP asks for residence "at the time application is made" (S495). CCCAP asks for residence in the county: `cccap_requires_verification_of_residency` (CO-1440) says "a verified resident of the county", and no county fact exists.
- `cw_meets_residency` (CO-904) and `af_meets_residency` (CO-942) fold other rules into "residency" (TANF from another state; fleeing felon).

**Proposal:** a shared derived `is_colorado_resident` (no prefix: `state_of_residence` equals `colorado_state_code`). Each program keeps or gets its own item over it: `ma_meets_residency`, `leap_meets_residency`, `cccap_meets_residency` (with a new `county_of_residence`), `cw_meets_residency`, `af_meets_residency`. Move the fleeing-felon bar out of CO-942 into its own item, and add the inmate bar S449 states. Decide whether SNAP needs a residency item (7 CFR 273.3).

**Impact:** CO-505 has 21 readers and 63 rule tests; the change is mechanical and no expected value changes until county residence is added.

### R-10. Citizenship and immigration status (should-fix)

- `citizenship_status` (CO-002): "as those categories are used to determine SNAP eligibility". Twelve items in seven programs read it. The option list is workable as a neutral immigration-category fact, but the meaning must say so (C-1), and it lacks categories other programs need (withholding of removal, Amerasian, parolee, battered non-citizen).
- `cccap_child_meets_citizenship_requirement` (CO-998) tests `citizenship_status` equal to `citizen` (not `us_national`) or `lawful_presence_status` (CO-084) equal to `lawfully_present`. CO-084 is defined by Medicaid's 10 CCR 2505-10 8.100.3.G.1.g.iv and .vi list, "a category broader than the qualified non-citizen statuses". The CCCAP rule says "citizen/legal resident" (S514). A lawful permanent resident child passes only if the case author also sets the Medicaid fact. If it is unstated the result is unknown, and `cccap_is_eligible_child` (CO-980) then defaults to true, so an undocumented child with CO-084 unstated is an eligible child.
- `claims_lawful_immigration_status` (CO-1359) counts `other_non_qualified_non_citizen` as a declared lawful status. The option name does not say lawful.
- `leap_has_lawfully_present_member` (CO-1005) is `leap_household_size` more than zero. It is correct only because `leap_household_members` filters on citizenship; the name describes something the derivation does not test.

**Proposal:** `cccap_child_meets_citizenship_requirement` reads shared `is_us_citizen_or_national` and `is_qualified_non_citizen` (U-3) and has no silent default. Rename the option to `other_lawfully_present_non_citizen`, or split it. Each program's eligible-category rule stays its own item, which is the right design and is already in place for SNAP, Medicaid, Colorado Works, Adult Financial and LEAP.

**Impact:** `lawful_presence_status` 2 / 50 / 26; `citizenship_status` 12 / 177 / all cases (a meaning change only).

### R-11. Resources (blocking for expedited service, should-fix for CCCAP)

- `snap_is_entitled_to_expedited_service` (CO-348) compares `snap_household_countable_resources` (CO-343, liquid plus non-liquid) with the $100 ceiling. The rule says "liquid resources (i.e., cash on hand, checking or savings accounts, savings certificates, and lump sum payments)" (S58). A household with no cash and a countable vehicle is refused expedited service. This is reuse inside one program: add `snap_household_liquid_resources` (the sum of `countable_liquid_resources`) and read it in all three prongs of CO-348.
- `cccap_meets_asset_limit` (CO-996) reads `countable_liquid_resources` (CO-031) and `countable_nonliquid_resources_snap` (CO-074), both "under 7 CFR 273.8", so net of SNAP's exclusions (home, most vehicles, retirement accounts). CCCAP asks caretakers to "self-declare that their liquid and non-liquid assets do not exceed one million dollars" (S515), with no SNAP exclusions, and the sum is per person, not per household. Use a CCCAP fact: `cccap_declares_assets_within_limit` (yes/no), or `cccap_declared_assets` (money).
- `countable_resources_individual` and `countable_resources_couple` (CO-800, CO-801) are SSI-method figures (20 CFR 416.1210) read by Adult Financial (CO-947). Adult Financial's rule counts resources of the "client, spouse, and sponsor(s)" (S454) and uses plain marriage rather than SSI's living-together test (CO-930). The same dollar figure is not guaranteed. Either supply `af_countable_resources` or record the equivalence as an assumption on CO-947.

**Impact:** CO-031 and CO-074 2 / 18 / 19 each.

### R-12. Work hours and activities (should-fix)

- `hours_worked` (CO-022): hours "worked for pay", excluding E&T and workfare. `work_program_hours` (CO-048, SNAP): hours in "a qualifying employment and training activity" under SNAP E&T. `cw_meets_work_participation` (CO-920) adds the two for the TANF participation rate, whose countable activities (45 CFR 261.30: work experience, community service, job search, vocational education and more) are a different list, with core and non-core hours (S419, S420). It also compares a monthly total with weekly hours times four. Colorado Works needs `cw_countable_work_activity_hours`. CO-920 currently has no reader, so no outcome is wrong yet.
- `cccap_caretaker_in_eligible_activity` (CO-984) treats any `hours_worked` above zero as employment. The rule's hourly-wage test is noted as unmodeled.
- `has_medical_statement_of_unfitness` (CO-043, SNAP: certified "unfit for employment") is read by `cccap_household_caretakers_in_eligible_activity` (CO-991) for a caretaker "incapacitated" under 3.111.D.1.c.3. Fitness for employment and capacity to care for a child are different medical findings. Add `cccap_caretaker_is_incapacitated`.

**Impact:** `hours_worked` 5 / 53 / 24; `work_program_hours` 2 / 6 / 17; CO-043 2 / 11 / 13.

### R-13. Dates shared across programs (should-fix)

- `application_date` (CO-088): "the date the person's ... Medical Assistance application was filed". `snap_expedited_postponement_end_date` (CO-1393) reads it for SNAP. A household that applies for SNAP later than Medicaid gets the wrong postponement deadline. Make the fact per program (`ma_application_date`, `snap_application_date`), or redefine it as the filing date of the application under determination and state that one date serves every program on a combined application.
- `verification_request_date` (CO-1343): "One date for the person across programs" (OQ-300). Six programs compute due dates from it. Its meaning also covers two different Medicaid notices, the verification checklist and the reasonable opportunity notice; `ma_reasonable_opportunity_period_end_date` (CO-1413) and `ma_verification_due_date` (CO-1414) both start from the same date. Split into `ma_reasonable_opportunity_notice_date` and a per-program request date.

**Impact:** `application_date` 6 / 14 / 28; `verification_request_date` 7 / 7 / 12.

### R-14. Health coverage and institutions for CHP+, BCCP and OAP health care (should-fix)

- `has_other_creditable_health_coverage` (CO-090) is defined by the CHP+ rule: "a group health plan or other health insurance coverage (other than COBRA)" (S244). `ma_bccp_eligibility_status` (CO-1152) reads it, but BCCP has its own definition, "coverage of any individual as defined at 10-16-102, C.R.S.", with its own exceptions (S610). Split: `chp_has_other_health_coverage` and `ma_bccp_has_creditable_coverage`.
- `is_patient_in_institution_for_mental_diseases` (CO-1104) states two definitions in one meaning: the CHP+ exclusion (S653) "or, for the Old Age Pension Health Care Program, an institution for tuberculosis or behavioral or mental health disorders" (S619). Split into `chp_is_patient_in_institution_for_mental_diseases` and `ma_oap_is_patient_in_tuberculosis_or_mental_health_institution`.
- `is_inmate_of_public_institution` (CO-1105) builds in the CHP+ reentry carve-out. Adult Financial also bars inmates (S449) and does not read it. Make the shared fact plain incarceration and move the carve-out into the CHP+ rule.

### R-15. Relationship edges and marriage (should-fix)

- One `caretaker` relationship edge is read as SNAP parental control (CO-305; S2, S4), the Medicaid caretaker relative, "a relative ... by blood, adoption, or marriage ... who assumes primary responsibility" (CO-547; S205), the Colorado Works "parent or non-parent caretaker" (CO-900; S406), and the CCCAP adult caretaker, "legal guardian, or person who is acting in loco parentis" (CO-992; S481). A non-relative guardian is a CCCAP caretaker and not a Medicaid caretaker relative. Either state per-program edges or add the qualifying facts (relative degree, guardianship) the rules can test.
- Marriage is stated three ways: `marital_status` (CO-844, with CO-1111 for widowhood), the `spouse` edge (`af_is_married`, CO-930), and SNAP's definition, which includes persons "representing themselves as spouses" (S4). A case can state `marital_status: single` with a spouse edge. Derive `marital_status` consistency from the edge, or give the meaning of the `spouse` edge in one place and say which programs widen it.

### R-16. Smaller reuse findings (note)

- `is_emancipated_minor` (CO-843) and `marital_status` (CO-844) have meanings written around the Colorado Works minor-parent rule and are read by LEAP and Medicaid HCBS. Reuse is fine; the meanings need to be neutral (C-1).
- `receives_title_iv_foster_adoption_kinship_payment` (CO-841): meaning is the Colorado Works exclusion; Medicaid reads it for the citizenship-verification exemption. Fine once neutral.
- `is_homeless` (CO-037) is SNAP's definition, read by Medicaid verification and LEAP vulnerability. Check the LEAP and Medicaid definitions before approval.
- `attested_household_income_pct_fpl` (CO-092) has program CHP+ and is read by two Medicaid presumptive eligibility rules. Set program `All`.
- `receives_tanf_cash` is per person; SunBucks (CO-1298; S790) and basic categorical eligibility (S47) are about the household. State on which person it is carried.
- `meets_hcbs_waiver_target_group` (CO-821) and `meets_nursing_facility_level_of_care` (CO-820) read by Home Care Allowance (CO-1206): appropriate, the rule points at the HCBS screen (S712).

---

## 3. Should be reused but isn't

| # | What is restated | Where | Proposal | Rank |
|---|---|---|---|---|
| U-1 | The poverty guideline lookup with the over-eight step | CO-504, CO-1153, CO-1278, CO-1297, CO-986, CO-995, CO-1289; and `lookup(table, size) / 12` five times in CO-613 to CO-616 and CO-662 | After D-1, one derived item per unit: `ma_magi_poverty_guideline_annual`, `ma_ssi_poverty_guideline_monthly`, `leap_poverty_guideline_annual`, `cccap_poverty_guideline_monthly`. | should-fix |
| U-2 | Five years in qualified status | `snap_meets_immigrant_additional_condition` (CO-307), `ma_meets_five_year_bar` (CO-508), `cw_meets_citizenship_requirement` (CO-905) | Shared `has_held_qualified_status_five_years`. Rename `snap_five_year_bar_years` (CO-104), read by three programs, to `qualified_non_citizen_waiting_period_years`, program `All`. | should-fix |
| U-3 | Citizen-or-national test and the qualified non-citizen list | `[in, citizenship_status, [citizen, us_national]]` in CO-309, CO-507, CO-509, CO-905, CO-929, CO-943 although `claims_citizenship` (CO-1358) states it; the six-status list in CO-506, CO-905 (three times), CO-1010, CO-1359 | Rename CO-1358 `is_us_citizen_or_national`; make `ma_is_qualified_non_citizen` (CO-506, already read by Adult Financial) the shared `is_qualified_non_citizen`. CCCAP's hand-rolled test dropped `us_national` (R-10). | should-fix |
| U-4 | Colorado residence | CO-505, CO-904, CO-942 each compare `state_of_residence` with `colorado_state_code` | Shared `is_colorado_resident` (R-9). | should-fix |
| U-5 | Age at a date other than the determination date | `snap_is_in_abawd_age_range` (CO-412) and CO-413 compute years from `date_of_birth` to the first of the month; CO-564 compares birth month | Shared per-month `age_on_first_of_month`. `age` (CO-300) is as of the determination date; say so wherever a per-month rule reads it. | note |
| U-6 | Month of application | `ma_pregnancy_coverage_period_start_month` (CO-565) is `month_of application_date`; CO-556, CO-557, CO-561 restate it | One `application_month` item. | note |
| U-7 | Parameters that exist but are not read | `ma_retroactive_coverage_months` (CO-197) against three nested `month_before` in CO-557; `ma_postpartum_coverage_months` (CO-198) against twelve nested `month_after` in CO-560; `ma_continuous_eligibility_months` (CO-196) against literal 11 in CO-556 | Use pattern P44 with the parameter. Today a change to the parameter changes nothing. | should-fix |
| U-8 | Other unread parameters | `ma_transfer_lookback_months` (CO-252), `ma_sga_non_blind` (CO-332), `ma_sga_blind` (CO-333), `ma_veteran_personal_needs_allowance` (CO-255), `csra_minimum_standard` (CO-827), `snap_abawd_hr1_effective_date` (CO-176), `chp_cost_sharing_aggregate_cap_pct` (CO-213) | Read them or retire them. `ma_csra` (CO-646) never applies the minimum. | note |
| U-9 | Literal thresholds beside existing parameters | 18 in CO-549 and CO-620; premium bands in CO-619 and CO-621; contribution bands and dwelling shares in CO-1279 and CO-1280; 0.8 and 0.55 in CO-1290; 17 in CO-405; 3 in CO-1299 | Parameters, as the rest of the volume does. | note |
| U-10 | Has earned income | `[any, [>, earned_income, 0], [>, self_employment_net_income, 0]]` inline in CO-1376, CO-1403, CO-1434 | Read `has_earned_income` (CO-1356). | note |
| U-11 | SSI-method countable income | Inline twice in CO-618 and CO-619, and again in `af_countable_income` (CO-946) | `ma_wawd_countable_income`; Adult Financial keeps its own item but as a chain. | should-fix |
| U-12 | SSI amount | CO-946 says "no supplied fact states one" (OQ-115) | `ssi_income` (CO-849) exists and is read by CO-950. | should-fix |
| U-13 | LEAP economic unit | `leap_household_members` (CO-1000) repeats the whole of CO-1009 and adds a filter | CO-1000 = members of `leap_household_members_for_income` who meet CO-1010. | note |
| U-14 | Child age test inside Medicaid | CO-545 uses CO-564 (under 19 or turning 19 this month); CO-555, CO-559, CO-561 use `age` less than 19 | One item, so the child category and continuous eligibility agree in the birthday month. | should-fix |
| U-15 | "Is verified" | Identity and citizenship have no shared `_is_verified` item; the test is inline in CO-1387, CO-1410, CO-1424, CO-1436, CO-1389. SSN, unearned income, resources, age and disability have one. | Add `identity_is_verified` and `citizenship_is_verified_by_data_source_or_document`. | note |
| U-16 | Program outcome held as a supplied fact | SunBucks reads the derived `snap_is_eligible` and the supplied `receives_tanf_cash` in the same rule (CO-1298); SNAP reads supplied `is_complying_with_tanf_work_requirements` (CO-066) and `received_energy_assistance_within_twelve_months` (CO-1240) | Decide one policy: a program's receipt of another program's benefit is supplied (a fact about the past) and never the volume's own determination. Record it in `conventions.md`. | note |

---

## 4. Clarity

### C-1. Shared facts whose meaning bakes in one program (should-fix)

| Item | Now | Rewrite |
|---|---|---|
| `citizenship_status` (CO-002) | "...as those categories are used to determine SNAP eligibility." | "The person's citizenship or immigration category as verified or declared. It states the category only. Each program decides which categories it accepts." |
| `state_of_residence` (CO-006) | "...for purposes of SNAP administration." | "The U.S. state in which the person lives and intends to remain, as a two-letter code. Program-specific residency rules are separate items." |
| `in_medical_institution` (CO-007) | SNAP majority-of-meals test | Split per R-8. |
| `is_disabled_ssa` (CO-011) | "permanent under ... (title II)" | "SSA, or the state disability determination service applying SSA's rules, has determined the person disabled. It says nothing about whether a benefit is paid." |
| `receives_general_assistance` (CO-014) | name says general assistance; meaning is the disability-based kind only | Rename `receives_disability_based_general_assistance`. |
| `is_veteran_or_active_duty` (CO-005) | name hides "or is the spouse, surviving spouse, or unmarried dependent child of such a person" | Rename `has_military_connection`. |
| `is_enrolled_in_school` (CO-020) | half-time and secondary together | Split per R-2. |
| `medical_expenses_out_of_pocket` (CO-034) | "...for a person who is elderly or disabled." | "The person's monthly medical expenses not reimbursed by insurance or a third party." The elderly or disabled condition belongs to CO-376, which already applies it. Say whether premiums in `health_insurance_premiums_paid` (CO-835) are included. |
| `shelter_cost_monthly` (CO-035) | "the person's unit", "the head of household" | "Monthly rent or mortgage, property tax and home insurance for the dwelling, entered once per SNAP household on the SNAP head of household." Or change scope to case. |
| `persons_cared_for` (CO-042) | "for purposes of work registration and the ABAWD dependent-child exemption" | "The persons in the case for whose care this person is responsible." |
| `is_emancipated_minor` (CO-843) | Colorado Works consequence in the meaning | "The person is under 18 and legally emancipated under Colorado law." |
| `marital_status` (CO-844) | Colorado Works minor-parent rule | "The person's legal marital status." Add `widowed`, retire CO-1111. |
| `receives_title_iv_foster_adoption_kinship_payment` (CO-841) | Colorado Works consequence | State the payment only. |
| `application_date` (CO-088) | Medical Assistance application | See R-13. |
| `is_inmate_of_public_institution` (CO-1105) | CHP+ carve-out | See R-14. |
| `residency_verification_document_received` (CO-1313) | "Colorado (or county) residence" | Split state and county once `county_of_residence` exists. |

### C-2. "Countable" without saying under which program (should-fix)

| Item | Countable under | Proposed name |
|---|---|---|
| `countable_liquid_resources` (CO-031) | 7 CFR 273.8 (SNAP) | `snap_countable_liquid_resources` |
| `countable_nonliquid_resources_snap` (CO-074) | 7 CFR 273.8 | `snap_countable_nonliquid_resources` |
| `countable_resources_individual` (CO-800), `countable_resources_couple` (CO-801), `countable_resources_couple_at_snapshot` (CO-888) | 20 CFR 416.1210 (SSI method) | `ssi_countable_resources_individual`, `ssi_countable_resources_couple`, `ma_spousal_resources_at_snapshot` |
| `other_taxable_income` (CO-079) | precision says "Countable, already-net-of-exclusions"; MAGI only | `magi_other_taxable_income` |
| `snap_person_earned_income` (CO-330), `snap_person_unearned_income` (CO-331) | meaning says "countable"; the derivation is a plain sum of supplied facts | Either drop "countable" or add the exclusions (R-1). |

### C-3. Units missing from money and rate names (should-fix)

Monthly unless said otherwise is the working rule, but it is written nowhere and these break it or hide it:

- `ma_poverty_guideline_table` (annual) and `cccap_poverty_guideline_table` (monthly): same stem, different unit (D-1).
- `estimated_home_heating_costs` (CO-1271): a heating-season total, November through April. Rename `estimated_home_heating_costs_for_season`.
- `leap_household_income` (CO-1002): monthly, then multiplied by 12 in CO-1278; the rule speaks of "the eligibility period". State the period.
- `home_equity` (CO-826), `burial_services_total_cost` (CO-1221), `decedent_estate_value` (CO-1224): point-in-time amounts; fine, but say "as of".
- `ssi_income` (CO-849), `community_spouse_income` (CO-833), `school_meal_household_income` (CO-1295), `hca_authorized_amount` (CO-1218), `dependent_care_expense` (CO-032), `pretax_deductions` (CO-080): monthly, not in the name.
- Rates: `_pct` items hold decimal fractions (1.33, not 133). Three spellings are in use: `ma_income_limit_child_pct`, `chp_income_limit_pct_child_lower`, `cccap_entry_income_limit_pct_fpl`.
- `snap_household_size` (CO-313) counts eligible members only. Every other `_household_size` or `_unit_size` counts members. Rename `snap_eligible_household_size`.
- `ma_magi_household_size` (CO-501) includes expected children; say "family size" in the name or the first sentence.

### C-4. Yes/no facts where "no" and "not stated" differ (should-fix)

`docs/conventions.md`: "approvers must never see a silent default." These read an unknown as a definite answer without the supplied fact's meaning saying so:

| Reader | Fact | Unknown is read as |
|---|---|---|
| `cccap_is_eligible_child` (CO-980) | `cccap_child_meets_citizenship_requirement` | yes: the child is eligible |
| `cccap_is_adult_caretaker` (CO-992) | `is_financially_contributing_to_child` (CO-897) | yes |
| `cccap_colorado_works_child_care_eligible` (CO-988) | `is_referred_for_colorado_works_child_care` (CO-896) | yes |
| `leap_is_vulnerable_to_heating_cost` (CO-1004) | `in_medical_institution`, `leap_living_arrangement` | not in an institution; an ordinary dwelling |
| `leap_household_members` (CO-1000) | `shares_heating_fuel_with` (CO-895), `is_emancipated_minor` | no |
| `cccap_household_caretakers_in_eligible_activity` (CO-991) | `has_medical_statement_of_unfitness`, `is_absent_from_home` (CO-898) | no |
| `ma_meets_citizenship_requirement` (CO-509) | `pregnancy_end_date` (CO-089) | never pregnant |
| `ma_child_continuous_eligibility_end_month` (CO-556) | `continuous_eligibility_period_start_month` (CO-094) | the application month |
| `snap_weekly_hours_worked` (CO-402) | `hours_worked` | zero |

Rewrite pattern for each supplied fact: add one sentence, "If not stated, <program> reads this as <value>." Defaults that grant eligibility (the first three) should be removed or raised with the child care owner.

Also:

- `lawful_presence_status` (CO-084) has an option named `unknown`, separate from the engine's unknown. Remove the option.
- `expected_number_of_children` (CO-083): "zero for a person who is not pregnant". Say whether a pregnant person with the fact unstated counts as one.
- `ssn_verification_document_received` (CO-1311) is true when the person "has furnished a Social Security number", with no document. Rename `ssn_furnished_or_application_shown`.
- `immigration_status_verification_document_received` (CO-1309) means "submitted", not verified; the derived `immigration_status_is_verified_or_submitted` (CO-1366) is named correctly.
- `identity_document_is_lawful_presence_document` (CO-1367) is used by Adult Financial for identity and by Colorado Works for lawful presence. Rename `identity_document_is_on_cash_program_list`.
- `disability_verified_by_electronic_data_source` (CO-1332) verifies "receipt of disability-based benefits", not disability. Rename `disability_benefit_receipt_verified_by_electronic_data_source`.
- `earned_income_verified_by_electronic_data_source` (CO-1315): precision says only Medicaid treats the match as verification. Rename with `ma_` or say so in the meaning.
- `transfer_was_exempt` (CO-825) is one yes/no for what may be several transfers; `uncompensated_transfer_value_in_lookback` (CO-824) should be defined as already excluding exempt transfers, and CO-825 retired.
- `leap_has_lawfully_present_member` (CO-1005): rename `leap_has_countable_household_member`.

### C-5. Figures set by the state or county held as per-person supplied facts (should-fix)

`transfer_penalty_divisor` (CO-832), `ma_personal_needs_allowance_institutional` (CO-887), `leap_statewide_adjustment_rate` (CO-1272), `leap_benefit_minimum` (CO-1276), `leap_benefit_maximum` (CO-1277), `cccap_entry_income_limit_pct_fpl` (CO-870) are one value for everyone (or for a county), entered on each person. Two people in a case can carry different values, and cases carry "illustrative" figures. Make them parameters with dated versions (a table keyed by county for CO-870), or supplied facts of scope `case` with the meaning "the figure in effect, from <publication>".

### C-6. Household facts carried on a person (note)

Scope `case` exists and is unused for facts that describe the dwelling or the household: `shelter_cost_monthly`, the SNAP utility facts (CO-1239 to CO-1242), the LEAP dwelling facts (CO-876, CO-877, CO-1271, CO-1273 to CO-1275, CO-1283), `uses_top_quality_rated_provider` (CO-1287), `all_children_in_part_time_care` (CO-1288), `is_protective_services_child_care_case` (CO-873), `school_meal_household_size` and `school_meal_household_income` (CO-1294, CO-1295). Either move them to scope `case` or state in each meaning which person carries the value. `snap_shelter_costs` (CO-377) already has to sum "only the members for whom it is known" to work around this.

### C-7. Program field and single consumers (note)

57 items with program `All` are read by exactly one program (for example `qualifying_quarters` CO-004, `is_tax_filer` CO-075, `home_equity` CO-826, `has_additional_care_needs` CO-872, `eligible_activity_verification_document_received` CO-1340, `heating_costs_verification_document_received` CO-1342). Ten supplied facts with a program other than `All` are read by another program. The program field on supplied facts was not maintained after phase 2. Rule proposed in section 5: program `All` means the meaning is neutral and at least two programs can read it as written.

---

## 5. Naming conventions

### Prefix rule

Governance enforces the prefix on derived items (error) and parameters (warn), and exempts supplied facts.

| # | Finding | Rank |
|---|---|---|
| N-1 | Medicaid parameters without `ma_`: `csra_minimum_standard` (CO-827), `csra_maximum_standard` (CO-828), `mmmna_cap` (CO-830), `home_equity_limit` (CO-831) (the four `name.prefix` warnings). `msp_resource_limit_individual` and `msp_resource_limit_couple` (CO-807, CO-808) avoid the warning only because their program is `All`; only Medicaid reads them. Rename `ma_csra_minimum`, `ma_csra_maximum`, `ma_mmmna_cap`, `ma_home_equity_limit`, `ma_msp_resource_limit_individual`, `ma_msp_resource_limit_couple`. | should-fix |
| N-2 | Program-prefixed items read by other programs: `ma_poverty_guideline_table` and `_each_additional` (LEAP, SunBucks); `snap_five_year_bar_years` (Medicaid, Colorado Works); `ma_ssi_general_income_exclusion`, `ma_ssi_earned_income_exclusion`, `ma_ssi_earned_income_disregard_rate`, `ma_ssi_resource_limit_individual`, `ma_ssi_resource_limit_couple`, `ma_ssi_federal_benefit_rate_individual` (Adult Financial, CO-230 to CO-235); `ma_is_qualified_non_citizen`, `ma_meets_five_year_bar`, `ma_meets_residency`. Federal figures shared by programs lose the prefix and become program `All`: `federal_poverty_guideline_*`, `ssi_federal_benefit_rate_*`, `ssi_resource_limit_*`, `ssi_general_income_exclusion`, and so on. | should-fix |
| N-3 | Cross-program reads that are legitimate and should stay prefixed: CHP+ reading the `ma_magi_*` household, income and verification items (CHP+ uses the MAGI method); CCCAP reading `cw_eligibility_status`, `cw_grant_amount`, `cw_is_work_eligible_individual`; Medicaid reading `af_category`; SunBucks reading `snap_is_eligible`. Record these as the allowed kind: a rule that names the other program's result. | note |
| N-4 | Supplied facts carry a prefix inconsistently: nine do (`leap_living_arrangement`, `leap_electric_heat_dwelling_type`, `cccap_entry_income_limit_pct_fpl`, `ma_personal_needs_allowance_institutional`, `sebt_other_categorical_basis`, ...), about ninety program-owned ones do not, one carries a suffix (`countable_nonliquid_resources_snap`), and several carry the program in the middle (`received_full_snap_benefit_month`, `is_in_snap_employment_and_training`). The exemption is what let SNAP-defined facts be read as shared (R-3, R-6, R-7, R-11). | should-fix |

### Suffixes and verbs

N-5 to N-14 are all ranked note.

| # | Finding |
|---|---|
| N-5 | Yes/no outcomes use four shapes: `snap_is_eligible`, `leap_is_eligible`, `chp_child_is_eligible`; `ma_qmb_eligible`, `ma_pace_eligible`, `af_and_so_eligible`, `cw_diversion_eligible` (20 items with no verb); `chp_presumptive_eligibility` (a noun); `cccap_low_income_child_care_eligible`. |
| N-6 | `_is_` against `_meets_`: `meets_` is used for a test against a requirement (`snap_meets_net_income_test`, `af_meets_resource_limit`) and also for a status (`meets_nursing_facility_level_of_care`). `meets_hcbs_waiver_target_group` (CO-821) is a one-of, not a yes/no. The same kind of test is `cccap_income_within_entry_limit`, `leap_income_within_limit`, `chp_income_within_limit`, `ma_family_planning_income_in_band`, `snap_meets_gross_income_test`, `cw_meets_income_test`. Past-participle forms have no verb: `cw_minor_parent_living_arrangement_met`, `af_and_so_disability_met`, `ma_hcbs_waiver_age_criteria_met`, `cw_time_limit_reached`. |
| N-7 | Yes/no supplied facts with no verb: `abawd_waiver_area_month` (CO-052), `abawd_discretionary_exemption_month` (CO-053), `adequate_child_care_available` (CO-071), `agency_finds_obviously_unfit` (CO-044), `county_approved_living_arrangement` (CO-845), `burial_responsible_persons_are_couple` (CO-1226), `sebt_other_categorical_basis` (CO-1296), `ma_ltc_couple` (CO-643), `cw_child_only_unit` (CO-916), `snap_abawd_countable_month` (CO-416). |
| N-8 | `receives_` is used for entitlement as well as payment: `receives_medicare_part_a` (CO-803) means "entitled to"; next to it `is_medicare_entitled_or_enrolled` (CO-017). |
| N-9 | Money: `_amount` appears on 9 items with no rule (`snap_utility_allowance_amount`, `cw_grant_amount`, `leap_benefit_amount`, `sebt_benefit_amount`, `va_aid_and_attendance_amount`) against `snap_allotment`, `af_oap_grant`, `af_and_grant`, `af_hca_grant`, `cccap_parent_fee`, `ma_patient_payment`. `_monthly` appears on two (`shelter_cost_monthly`, `leap_income_limit_monthly`). `cost`/`costs`/`expense`/`expenses` are mixed (`shelter_cost_monthly`, `snap_shelter_costs`, `shelter_costs_community_spouse`, `dependent_care_expense`, `medical_expenses_out_of_pocket`). |
| N-10 | Tables: `_table` on most; `leap_income_limit_monthly` (CO-875) is a table without it. Colorado Works has six tables distinguished by a trailing phrase (`cw_need_standard_table_no_caretaker`). |
| N-11 | Ages: `_age` (`snap_elderly_age`, `af_oap_age`, `ma_aged_age`), `_age_limit` (exclusive upper bound in most, `ma_adult_upper_age_limit`), `_min_age`/`_max_age` (inclusive), and `snap_mandatory_child_age` (exclusive, value 22). Whether a bound is inclusive is not in the name. |
| N-12 | Outcomes: `_status` for most one-of outcomes, `_category` for others (`ma_magi_category`, `af_category`, `snap_eligibility_category`), `af_hca_tier`. Acceptable, if `_status` always means the eligibility result with reason codes and `_category` the group. `ma_emergency_medicaid_status` and `ma_is_emergency_medicaid_only` spell the program out after the prefix. |
| N-13 | Adult Financial has four sub-programs and no sub-prefix rule: `af_meets_citizenship_requirement_oap` and `_and` (suffix) against `af_and_so_eligible`, `af_oap_grant`, `af_hca_tier` (infix). `and` as a token reads as the conjunction. |
| N-14 | Verification: `<element>_verified_by_electronic_data_source`, `<element>_verification_document_received`, `<element>_attestation_is_questionable`, `<element>_is_verified` and `resources_are_verified`. Consistent enough; fix the three misnamed ones in C-4. |

### Proposed convention (short)

1. **Prefix means "defined by this program's rule".** Any item, supplied facts included, whose meaning cites one program's rule carries that program's prefix, and only that program reads it. Remove the supplied-fact exemption from `name.prefix`.
2. **No prefix means neutral.** A shared item's meaning names no program and no program's exclusions, and is true as written for every reader. Its program is `All`. Method prefixes `ssi_` and `magi_` are allowed for items defined by a method several programs adopt by reference; `federal_` for federal figures.
3. **A program may read another program's prefixed item only when its rule names that program's result** (CHP+ reading MAGI, CCCAP reading Colorado Works eligibility). Governance should warn on any other cross-program read; today it only warns for parameters.
4. **Yes/no:** `<prefix>is_<state>`, `<prefix>has_<thing>`, `<prefix>receives_<payment>` (payment actually made), `<prefix>meets_<named test>` (comparison with a limit or requirement), `<prefix>requires_verification_of_<element>`. An eligibility result is `<prefix>is_eligible` or `<prefix><group>_is_eligible`. Never a bare noun or participle.
5. **Money:** the noun alone when it is the thing (`grant`, `allotment`, `deduction`, `premium`); no `_amount`. Period suffix only when not monthly: `_annual`, `_for_season`, `_at_<event>`. Plural `costs` and `expenses`.
6. **Rates:** `_pct_fpl` for an income-to-poverty ratio, `_pct` for a limit stated as a share, `_rate` for a multiplier applied to an amount. All are decimal fractions.
7. **Ages:** `_min_age` and `_max_age` are inclusive; `_age_limit` is exclusive ("under").
8. **Tables** end in `_table`; the step beyond the last row is `<table stem>_each_additional`.
9. **One-of:** `_status` for an outcome with reasons, `_category` for a group, `_type` for a supplied classification. Never `is_` or `meets_`.
10. **Income vocabulary:** `_gross` is the amount received before any exclusion; `_countable` always has a program or method prefix; `_net` is never shared.

---

## 6. Reviewed and found correct

- `age` (CO-300) from `date_of_birth` (CO-001): shared and read by six programs. Correct.
- Assistance units are separate derived items per program (`snap_household_members`, `ma_magi_household_members`, `cw_assistance_unit_members`, `cccap_household_members`, `leap_household_members`). Correct.
- "Child", "elderly" and "aged" bands are separate parameters per program (`snap_elderly_age` 60, `ma_aged_age` 65, `af_oap_age` 60; child limits 13, 14, 18, 19, 21, 22). Correct; they share values by coincidence and cite different text.
- Each program has its own citizenship rule item. Correct in shape (see R-4, R-10 for content).
- `is_disabled_for_buy_in` (CO-806) and `has_additional_care_needs` (CO-872) are separate from the SSA disability fact. Correct.
- `shelter_cost_monthly` (SNAP) and `shelter_costs_community_spouse` (CO-834, Medicaid) are separate. Correct; the lists of what counts differ.
- `dup.similar` pairs that are not duplicates: `is_blind`/`is_disabled_ssa`; `child_support_received`/`child_support_paid_legally_obligated`; `countable_resources_individual`/`_couple`; the two SNAP disqualification facts; `earned_income`/`foreign_earned_income_excluded`; the per-element verification families. `dup.shape` warnings on the due-date and limit lookups are the same shape with different constants by design.

---

## Counts

| Section | blocking | should-fix | note | total |
|---|---|---|---|---|
| 1. True duplicates | 0 | 5 | 2 | 7 |
| 2. Inappropriate reuse | 7 | 8 | 1 | 16 |
| 3. Should be reused | 0 | 8 | 8 | 16 |
| 4. Clarity | 0 | 5 | 2 | 7 |
| 5. Naming | 0 | 3 | 11 | 14 |
| **Total** | **7** | **29** | **24** | **60** |

Blocking: R-1 (income facts), R-2 (school enrollment), R-3 (Indian-country exemption), R-4 (five-year bar exemption), R-5 (disability, for AND-SO), R-6 (SNAP disqualifications in Colorado Works and Adult Financial), R-7 (head of household). R-11 is ranked blocking for its expedited-service part and should-fix for CCCAP; it is counted once, as should-fix, and the expedited-service part is in the top ten.

Items reviewed: 780. Items named in at least one finding: about 210.

## Top ten changes, in priority order

1. **Split the shared income facts (R-1).** Gross-by-source supplied facts with neutral meanings; `earned_income` becomes `wages_gross`; add the self-employment term to the eight Colorado Works, Adult Financial, SSI-related and Buy-In items that omit it; replace `cash_assistance_income` with per-program amounts and use `ssi_income`; keep `other_unearned_income` out of MAGI.
2. **Replace `is_enrolled_in_school` with four facts (R-2).**
3. **Add `is_exempt_from_five_year_bar` (8 U.S.C. 1613(b)) and stop Colorado Works reading SNAP's exemption (R-4);** read it in Medicaid and AND as well.
4. **Give Colorado Works its own time-limit and unit facts:** Indian-country months (R-3), head of the assistance unit (R-7), its own IPV and drug-felony disqualifications (R-6).
5. **Split the disability facts (R-5):** state six-month total disability for AND-SO, `receives_ssdi`, SNAP's benefit-receipt prong.
6. **Read liquid resources in SNAP expedited service (R-11),** and give CCCAP its own asset declaration.
7. **One federal poverty guideline table (D-1),** shared and unprefixed, with CCCAP's monthly table derived or renamed; one lookup item per unit (U-1).
8. **Split `in_medical_institution` (R-8) and make residency a shared base with per-program rules (R-9),** adding county residence for CCCAP.
9. **Remove the duplicates that can disagree:** foster care history (D-4), `is_employed` (D-5), CHP+ lower bounds (D-3), receipt flags beside amounts (D-6); wire the unread duration parameters into the rules that hard-code them (U-7).
10. **Adopt the naming convention in section 5 and extend `name.prefix` to supplied facts,** then rewrite the neutral meanings in C-1, the "countable" names in C-2, and document every unknown-reads-as default in C-4.

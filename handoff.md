# Engineer handoff: Work requirements under H.R.1, Medicaid community engagement and the SNAP ABAWD time limit

Generated from `volumes/mwr/`. One line per item. `@assembly` items are implemented in the fact-assembly layer; `@engine` items in the determination engine. Types and scopes are those of the codex. `unknown` propagates: any derivation whose inputs are unknown is unknown unless an `otherwise` supplies a default, and an unknown outcome is reported as *cannot determine* with the list of unknown supplied facts.

## Supplied facts (the interface the fact-assembly layer must deliver)

| Identifier | Type | Scope | Program | Consumed by |
|---|---|---|---|---|
| `date_of_birth` | calendar date | person | All | age, age_at_month |
| `determination_date` | calendar date | case | All | age, medicaid_application_lookback_months_list, medicaid_ce_status_at_application, medicaid_ce_status_at_renewal, medicaid_in_stable_recovery, medicaid_is_excluded_by_snap_or_tanf, medicaid_is_family_caregiver_of_dependent, medicaid_is_specified_excluded_individual, medicaid_renewal_review_months, medicaid_was_recent_inmate, snap_time_limit_period_months, snap_time_limit_status |
| `is_pregnant` | yes/no | person | All | medicaid_is_applicable_individual, medicaid_is_pregnant_or_postpartum, snap_is_exempt_from_time_limit |
| `is_entitled_to_postpartum_assistance` | yes/no | person | Medicaid | medicaid_is_pregnant_or_postpartum |
| `lives_with` | group of persons | person | All | medicaid_is_family_caregiver_of_dependent |
| `relationships` | relationships | person | All | medicaid_is_family_caregiver_of_dependent, medicaid_is_parent_or_caretaker_of_dependent, snap_has_responsibility_for_child_under_14, snap_has_responsibility_for_child_under_6 |
| `persons_cared_for` | group of persons | person | All | medicaid_is_family_caregiver_of_dependent, snap_has_responsibility_for_child_under_14, snap_has_responsibility_for_child_under_6 |
| `care_hours_by_person` | table keyed by person | person-month | Medicaid | medicaid_is_family_caregiver_of_dependent |
| `relies_on_another_for_care` | yes/no | person | Medicaid | medicaid_is_dependent_child |
| `is_disabled_individual_ada` | yes/no | person | Medicaid | medicaid_is_qualifying_dependent |
| `indian_status` | one of | person | All | medicaid_is_excluded_as_indian, snap_is_exempt_as_indian |
| `is_veteran_total_disability` | yes/no | person | Medicaid | medicaid_is_specified_excluded_individual |
| `is_blind_or_disabled_ssa` | yes/no | person | Medicaid | medicaid_is_medically_frail |
| `has_substance_use_disorder` | yes/no | person | Medicaid | medicaid_is_medically_frail |
| `recovery_start_date` | calendar date | person | Medicaid | medicaid_in_stable_recovery |
| `has_disabling_mental_disorder` | yes/no | person | Medicaid | medicaid_is_medically_frail |
| `has_adl_impairing_disability` | yes/no | person | Medicaid | medicaid_is_medically_frail |
| `has_serious_or_complex_medical_condition` | yes/no | person | Medicaid | medicaid_is_medically_frail |
| `condition_impairs_ce_compliance` | yes/no | person | Medicaid | medicaid_is_medically_frail |
| `receives_disability_benefits` | yes/no | person | SNAP | snap_is_unfit_for_employment |
| `agency_finds_obviously_unfit` | yes/no | person | SNAP | snap_is_unfit_for_employment |
| `has_medical_statement_of_unfitness` | yes/no | person | SNAP | snap_is_unfit_for_employment |
| `was_inmate_in_month` | yes/no | person-month | Medicaid | medicaid_was_recent_inmate |
| `is_complying_with_tanf_work_requirements` | yes/no | person-month | All | medicaid_is_excluded_by_snap_or_tanf, snap_is_exempt_from_work_registration |
| `receives_unemployment_compensation` | yes/no | person-month | SNAP | snap_is_exempt_from_work_registration |
| `is_member_of_snap_household` | yes/no | person-month | Medicaid | medicaid_is_excluded_by_snap_or_tanf |
| `participates_in_sud_treatment_program` | yes/no | person-month | All | medicaid_is_specified_excluded_individual, snap_is_exempt_from_work_registration |
| `is_adult_group_eligible_or_enrolled` | yes/no | person | Medicaid | medicaid_is_applicable_individual |
| `is_equivalent_waiver_eligible_or_enrolled` | yes/no | person | Medicaid | medicaid_is_applicable_individual |
| `is_medicare_entitled_or_enrolled` | yes/no | person | Medicaid | medicaid_is_applicable_individual |
| `is_otherwise_eligible_under_state_plan` | yes/no | person | Medicaid | medicaid_is_applicable_individual |
| `is_former_foster_care_youth_group` | yes/no | person | Medicaid | medicaid_is_specified_excluded_individual |
| `hours_worked` | hours | person-month | All | medicaid_total_qualifying_hours, snap_hours_worked_with_good_cause, snap_weekly_average_hours_worked |
| `community_service_hours` | hours | person-month | Medicaid | medicaid_total_qualifying_hours |
| `work_program_hours` | hours | person-month | All | medicaid_total_qualifying_hours, snap_fulfills_work_requirement |
| `education_hours` | hours | person-month | Medicaid | medicaid_countable_education_hours |
| `is_enrolled_half_time_education` | yes/no | person-month | All | medicaid_countable_education_hours, medicaid_demonstrates_ce, snap_is_exempt_from_work_registration |
| `monthly_income` | money | person-month | All | medicaid_meets_income_condition, medicaid_six_month_average_income, snap_weekly_earnings |
| `is_seasonal_worker` | yes/no | person | Medicaid | medicaid_meets_seasonal_income_condition |
| `hours_missed_for_good_cause` | hours | person-month | SNAP | snap_hours_worked_with_good_cause |
| `participates_in_workfare` | yes/no | person-month | SNAP | snap_fulfills_work_requirement |
| `received_full_month_snap_benefits` | yes/no | person-month | SNAP | snap_is_countable_month |
| `snap_benefits_prorated` | yes/no | person-month | SNAP | snap_is_countable_month |
| `covered_by_abawd_waiver` | yes/no | person-month | SNAP | snap_is_countable_month |
| `has_discretionary_exemption` | yes/no | person-month | SNAP | snap_is_countable_month |
| `snap_household_members` | group of persons | person | SNAP | snap_has_responsibility_for_child_under_14, snap_has_responsibility_for_child_under_6 |
| `has_responsibility_for_incapacitated_person` | yes/no | person | SNAP | snap_is_exempt_from_work_registration |
| `is_head_of_household` | yes/no | person | SNAP | snap_is_exempt_from_work_registration |
| `hours_worked_last_30_days` | hours | person | SNAP | snap_regains_eligibility |
| `work_program_hours_last_30_days` | hours | person | SNAP | snap_regains_eligibility |
| `participated_in_workfare_last_30_days` | yes/no | person | SNAP | snap_regains_eligibility |
| `received_inpatient_or_facility_services` | yes/no | person-month | Medicaid | medicaid_short_term_hardship_in_month |
| `county_has_declared_disaster` | yes/no | person-month | Medicaid | medicaid_short_term_hardship_in_month |
| `county_unemployment_rate` | rate | person-month | Medicaid | medicaid_county_unemployment_meets_hardship_threshold |
| `national_unemployment_rate` | rate | month | Medicaid | medicaid_county_unemployment_meets_hardship_threshold |
| `traveled_for_extended_care` | yes/no | person-month | Medicaid | medicaid_short_term_hardship_in_month |
| `most_recent_determination_date` | calendar date | person | Medicaid | medicaid_renewal_review_months |

## Parameters

| Identifier | Type | Value | Program | Source |
|---|---|---|---|---|
| `medicaid_ce_required_hours` | hours | 80 | Medicaid | S6 |
| `federal_minimum_wage` | money | 7.25 | All | S18 |
| `medicaid_ce_min_age` | whole number | 19 | Medicaid | S1 |
| `medicaid_ce_max_age_exclusive` | whole number | 65 | Medicaid | S1 |
| `medicaid_dependent_child_max_age` | whole number | 13 | Medicaid | S2, S4 |
| `medicaid_application_lookback_months` | whole number | 1 | Medicaid | S8 |
| `medicaid_renewal_required_months` | whole number | 1 | Medicaid | S8 |
| `medicaid_ce_implementation_date` | calendar date | 2027-01-01 | Medicaid | S11 |
| `stable_recovery_years` | whole number | 5 | Medicaid | S3 |
| `inmate_lookback_months` | whole number | 3 | Medicaid | S12 |
| `caregiver_min_hours_nonresident_nonrelative` | hours | 80 | Medicaid | S5 |
| `hardship_unemployment_rate_cap` | rate | 0.08 | Medicaid | S10 |
| `hardship_national_rate_multiplier` | rate | 1.5 | Medicaid | S10 |
| `state_elects_short_term_hardship` | yes/no | yes | Medicaid | S10 |
| `medicaid_seasonal_average_months` | whole number | 6 | Medicaid | S6 |
| `snap_abawd_min_age` | whole number | 18 | SNAP | S20 |
| `snap_abawd_max_age` | whole number | 64 | SNAP | S20, S33 |
| `snap_dependent_child_age_limit` | whole number | 14 | SNAP | S20 |
| `snap_required_hours_per_month` | hours | 80 | SNAP | S21, S24 |
| `snap_countable_month_limit` | whole number | 3 | SNAP | S21 |
| `snap_period_months` | whole number | 36 | SNAP | S21, S27 |
| `snap_regain_hours` | hours | 80 | SNAP | S22 |
| `snap_work_registration_min_age` | whole number | 16 | SNAP | S29, S31 |
| `snap_work_registration_max_age` | whole number | 59 | SNAP | S29, S31 |
| `snap_general_exemption_child_age` | whole number | 6 | SNAP | S30 |
| `snap_employment_exemption_weekly_hours` | hours | 30 | SNAP | S30 |
| `snap_clock_method` | one of | rolling | SNAP | S27 |
| `snap_abawd_changes_effective_date` | calendar date | 2025-07-04 | SNAP | S33 |

## Derived facts

### WR-003 Age `@assembly`

Whole years elapsed from Date of Birth to the Determination Date.

Precision. Day-based. A person turns N on the Nth anniversary of Date of Birth, starting at 12:00am local time. Time of birth is ignored. A February 29 birth turns N on March 1 in a non-leap year.

Type whole number, scope person, program All.
Uses: `date_of_birth`, `determination_date`.

```
the number of whole years between Date of Birth and the Determination Date
```

Examples: 4, all passing.

### WR-004 Age at month `@assembly`

Whole years elapsed from Date of Birth to the first day of the month.

Precision. Same day-based rule as Age. A person who reaches an age during the month is treated as the younger age for that whole month.

Type whole number, scope person-month, program All.
Uses: `date_of_birth`.

```
the number of whole years between Date of Birth and the first day of the month
```

Examples: 2, all passing.

### WR-200 Medicaid: is in the community engagement age range `@engine`

The person has attained age 19 and is under age 65.

Type yes/no, scope person, program Medicaid.
Uses: `age`, `medicaid_ce_max_age_exclusive`, `medicaid_ce_min_age`.

```
all of the following are true:
  - Age is at least Medicaid community engagement minimum age (19)
  - Age is less than Medicaid community engagement age ceiling (65)
```

Examples: 4, all passing.

### WR-201 Medicaid: is a dependent child `@assembly`

The person is 13 years of age or under and relies on another individual for care.

Type yes/no, scope person, program Medicaid.
Uses: `age`, `medicaid_dependent_child_max_age`, `relies_on_another_for_care`.

```
all of the following are true:
  - Age is at most Medicaid dependent child maximum age (13)
  - Relies on another individual for care
```

Examples: 3, all passing.

### WR-202 Medicaid: is a dependent child or disabled individual `@assembly`

The person is a dependent child or a disabled individual, as those terms are defined for the community engagement subpart.

Type yes/no, scope person, program Medicaid.
Uses: `is_disabled_individual_ada`, `medicaid_is_dependent_child`.

```
any of the following is true:
  - Medicaid: is a dependent child
  - Is a disabled individual under the ADA
```

Examples: 3, all passing.

### WR-203 Medicaid: is a parent, guardian, or caretaker relative of a dependent `@assembly`

There is a person of whom this person is a parent, guardian, or caretaker relative, and that person is a dependent child or disabled individual.

Type yes/no, scope person, program Medicaid.
Uses: `medicaid_is_qualifying_dependent`, `relationships`.

```
there is a person of whom this person is a parent, guardian, or caretaker relative such that
  that person's Medicaid: is a dependent child or disabled individual
```

Examples: 3, all passing.

### WR-204 Medicaid: is a family caregiver of a dependent `@assembly`

There is a person this person cares for who is a dependent child or disabled individual, and this person either resides with them, is their relative, or provided at least 80 hours of assistance to them in the month containing the Determination Date.

Precision. Care hours are read from the month containing the Determination Date.

Type yes/no, scope person, program Medicaid.
Uses: `care_hours_by_person`, `caregiver_min_hours_nonresident_nonrelative`, `determination_date`, `lives_with`, `medicaid_is_qualifying_dependent`, `persons_cared_for`, `relationships`.

```
there is a person in Persons cared for such that
  all of the following are true:
    - that person's Medicaid: is a dependent child or disabled individual
    - any of the following is true:
      - that person is in Lives with
      - this person is a parent or guardian or caretaker relative or spouse or relative of that person
      - Care hours by person for the month containing the Determination Date, for that person is at least Caregiver minimum hours, non-resident non-relative (80)
```

Examples: 4, all passing.

### WR-205 Medicaid: is in stable recovery `@assembly`

The person has been in recovery from a substance use disorder for 5 or more years as of the Determination Date. A person with no recovery start date is not in stable recovery.

Type yes/no, scope person, program Medicaid.
Uses: `determination_date`, `recovery_start_date`, `stable_recovery_years`.

```
(the number of whole years between Recovery start date and the Determination Date) is at least Stable recovery years (5), otherwise no
```

Examples: 3, all passing.

### WR-206 Medicaid: is medically frail or has special medical needs `@assembly`

The person's condition significantly impairs their ability to comply, and the person is blind or disabled under SSA rules, has a substance use disorder and is not in stable recovery, has a disabling mental disorder, has a disability that significantly impairs daily activities, or has a serious or complex medical condition.

Type yes/no, scope person, program Medicaid.
Uses: `condition_impairs_ce_compliance`, `has_adl_impairing_disability`, `has_disabling_mental_disorder`, `has_serious_or_complex_medical_condition`, `has_substance_use_disorder`, `is_blind_or_disabled_ssa`, `medicaid_in_stable_recovery`.

```
all of the following are true:
  - Condition significantly impairs ability to comply
  - any of the following is true:
    - Is blind or disabled under SSA section 1614
    - all of the following are true:
      - Has a substance use disorder
      - it is not the case that Medicaid: is in stable recovery
    - Has a disabling mental disorder
    - Has a disability that significantly impairs daily activities
    - Has a serious or complex medical condition
```

Examples: 5, all passing.

### WR-207 Medicaid: was an inmate within the lookback `@engine`

In any of the 3 months before the month containing the Determination Date the person was an inmate of a public institution.

Precision. The regulation's window ends on the first day of the month; an inmate stay that touches only the first day of the current month is not captured here.

Type yes/no, scope person, program Medicaid.
Uses: `determination_date`, `inmate_lookback_months`, `was_inmate_in_month`.

```
in at least one of the Inmate lookback months (3) consecutive months ending with the month before the month containing the Determination Date:
  Was an inmate of a public institution in month for the month
```

Examples: 3, all passing.

### WR-208 Medicaid: is excluded by SNAP or TANF work requirement compliance `@engine`

In the month containing the Determination Date the person is complying with TANF work requirements, or is a member of a household receiving SNAP and is subject to a SNAP work requirement.

Type yes/no, scope person, program Medicaid.
Uses: `determination_date`, `is_complying_with_tanf_work_requirements`, `is_member_of_snap_household`, `snap_is_subject_to_work_requirement`.

```
any of the following is true:
  - Is complying with TANF work requirements for the month containing the Determination Date
  - all of the following are true:
    - Is a member of a household receiving SNAP for the month containing the Determination Date
    - SNAP: is subject to a SNAP work requirement for the month containing the Determination Date
```

Examples: 4, all passing.

### WR-209 Medicaid: is pregnant or postpartum `@engine`

The person is pregnant or is entitled to postpartum medical assistance.

Type yes/no, scope person, program Medicaid.
Uses: `is_entitled_to_postpartum_assistance`, `is_pregnant`.

```
any of the following is true:
  - Is pregnant
  - Is entitled to postpartum medical assistance
```

Examples: 2, all passing.

### WR-210 Medicaid: is excluded as an Indian `@assembly`

The person is an Indian, an Urban Indian, a California Indian, or has otherwise been determined eligible as an Indian for the Indian Health Service.

Type yes/no, scope person, program Medicaid.
Uses: `indian_status`.

```
Indian status is one of: Indian, Urban Indian, California Indian, IHS-eligible only
```

Examples: 2, all passing.

### WR-211 Medicaid: is a specified excluded individual `@engine`

The person is in the former foster care youth group, is excluded as an Indian, is a parent, guardian, or caretaker relative of a dependent, is a family caregiver of a dependent, is a veteran with a total disability rating, is medically frail, is excluded by SNAP or TANF work requirement compliance, participates in a substance use treatment program in the month containing the Determination Date, was an inmate within the lookback, or is pregnant or postpartum.

Type yes/no, scope person, program Medicaid.
Uses: `determination_date`, `is_former_foster_care_youth_group`, `is_veteran_total_disability`, `medicaid_is_excluded_as_indian`, `medicaid_is_excluded_by_snap_or_tanf`, `medicaid_is_family_caregiver_of_dependent`, `medicaid_is_medically_frail`, `medicaid_is_parent_or_caretaker_of_dependent`, `medicaid_is_pregnant_or_postpartum`, `medicaid_was_recent_inmate`, `participates_in_sud_treatment_program`.

```
any of the following is true:
  - Is in the former foster care youth group
  - Medicaid: is excluded as an Indian
  - Medicaid: is a parent, guardian, or caretaker relative of a dependent
  - Medicaid: is a family caregiver of a dependent
  - Is a veteran with a total disability rating
  - Medicaid: is medically frail or has special medical needs
  - Medicaid: is excluded by SNAP or TANF work requirement compliance
  - Participates in a substance use treatment program for the month containing the Determination Date
  - Medicaid: was an inmate within the lookback
  - Medicaid: is pregnant or postpartum
```

Examples: 3, all passing.

### WR-212 Medicaid: is an applicable individual `@engine`

The person is not a specified excluded individual, and either is eligible for or enrolled in the adult group, or is eligible for or enrolled under an equivalent-coverage waiver while in the age range, not pregnant, not entitled to or enrolled in Medicare, and not otherwise eligible under the State plan.

Type yes/no, scope person, program Medicaid.
Uses: `is_adult_group_eligible_or_enrolled`, `is_equivalent_waiver_eligible_or_enrolled`, `is_medicare_entitled_or_enrolled`, `is_otherwise_eligible_under_state_plan`, `is_pregnant`, `medicaid_in_ce_age_range`, `medicaid_is_specified_excluded_individual`.

```
all of the following are true:
  - it is not the case that Medicaid: is a specified excluded individual
  - any of the following is true:
    - Is eligible for or enrolled in the adult group
    - all of the following are true:
      - Is eligible for or enrolled under an equivalent-coverage waiver
      - Medicaid: is in the community engagement age range
      - it is not the case that Is pregnant
      - it is not the case that Is entitled to or enrolled in Medicare
      - it is not the case that Is otherwise eligible under the State plan
```

Examples: 4, all passing.

### WR-213 Medicaid: community engagement income threshold `@engine`

The Federal minimum wage multiplied by the required hours per month.

Type money, scope global, program Medicaid.
Uses: `federal_minimum_wage`, `medicaid_ce_required_hours`.

```
Federal minimum wage (7.25) times Medicaid community engagement required hours per month (80)
```

Examples: 1, all passing.

### WR-214 Medicaid: countable educational program hours `@assembly`

Educational program hours that may be combined with other activities. When the person is enrolled at least half-time, no education hours are combined because half-time enrollment demonstrates community engagement on its own.

Type hours, scope person-month, program Medicaid.
Uses: `education_hours`, `is_enrolled_half_time_education`.

```
if Is enrolled at least half-time in an educational program
  then 0
otherwise Educational program hours, otherwise 0
```

Examples: 2, all passing.

### WR-215 Medicaid: total qualifying hours `@assembly`

Hours worked plus community service hours plus work program hours plus countable educational program hours for the month. An activity with no reported hours counts as 0.

Type hours, scope person-month, program Medicaid.
Uses: `community_service_hours`, `hours_worked`, `medicaid_countable_education_hours`, `work_program_hours`.

```
(Hours worked, otherwise 0) plus (Community service hours, otherwise 0) plus (Work program hours, otherwise 0) plus Medicaid: countable educational program hours
```

Examples: 2, all passing.

### WR-216 Medicaid: meets the hours condition `@engine`

Total qualifying hours for the month are at least the required hours.

Type yes/no, scope person-month, program Medicaid.
Uses: `medicaid_ce_required_hours`, `medicaid_total_qualifying_hours`.

```
Medicaid: total qualifying hours is at least Medicaid community engagement required hours per month (80)
```

Examples: 2, all passing.

### WR-217 Medicaid: meets the income condition `@engine`

Monthly income is at least the community engagement income threshold.

Type yes/no, scope person-month, program Medicaid.
Uses: `medicaid_ce_income_threshold`, `monthly_income`.

```
Monthly income is at least Medicaid: community engagement income threshold
```

Examples: 2, all passing.

### WR-218 Medicaid: six-month average income `@assembly`

Monthly income averaged over the 6 months before the month.

Type money, scope person-month, program Medicaid.
Uses: `medicaid_seasonal_average_months`, `monthly_income`.

```
Monthly income averaged over the Medicaid seasonal income averaging months (6) consecutive months ending with the month before the month
```

Examples: 1, all passing.

### WR-219 Medicaid: meets the seasonal income condition `@engine`

The person is a seasonal worker and their six-month average income is at least the income threshold.

Type yes/no, scope person-month, program Medicaid.
Uses: `is_seasonal_worker`, `medicaid_ce_income_threshold`, `medicaid_six_month_average_income`.

```
all of the following are true:
  - Is a seasonal worker
  - Medicaid: six-month average income is at least Medicaid: community engagement income threshold
```

Examples: 2, all passing.

### WR-220 Medicaid: demonstrates community engagement for month `@engine`

For the month the person meets the hours condition, is enrolled at least half-time in an educational program, meets the income condition, or meets the seasonal income condition.

Type yes/no, scope person-month, program Medicaid.
Uses: `is_enrolled_half_time_education`, `medicaid_meets_hours_condition`, `medicaid_meets_income_condition`, `medicaid_meets_seasonal_income_condition`.

```
any of the following is true:
  - Medicaid: meets the hours condition
  - Is enrolled at least half-time in an educational program
  - Medicaid: meets the income condition
  - Medicaid: meets the seasonal income condition
```

Examples: 3, all passing.

### WR-221 Medicaid: county unemployment meets the hardship threshold `@assembly`

The county unemployment rate is at or above the lesser of the cap and the multiplier times the national unemployment rate.

Type yes/no, scope person-month, program Medicaid.
Uses: `county_unemployment_rate`, `hardship_national_rate_multiplier`, `hardship_unemployment_rate_cap`, `national_unemployment_rate`.

```
County unemployment rate is at least (the lesser of Hardship unemployment rate cap (0.08) and Hardship national rate multiplier (1.5) times National unemployment rate)
```

Examples: 4, all passing.

### WR-222 Medicaid: experiences a short-term hardship in month `@engine`

The State elects the hardship exception, and for part or all of the month the person received inpatient or facility services, resided in a county with a declared emergency or disaster or with unemployment meeting the threshold, or traveled outside the community for extended care.

Type yes/no, scope person-month, program Medicaid.
Uses: `county_has_declared_disaster`, `medicaid_county_unemployment_meets_hardship_threshold`, `received_inpatient_or_facility_services`, `state_elects_short_term_hardship`, `traveled_for_extended_care`.

```
all of the following are true:
  - State elects the short-term hardship exception (yes)
  - any of the following is true:
    - Received inpatient or facility services in month
    - County has a declared emergency or disaster in month
    - Medicaid: county unemployment meets the hardship threshold
    - Traveled outside the community for extended care in month
```

Examples: 3, all passing.

### WR-223 Medicaid: community engagement satisfied for month `@engine`

For the month the person demonstrates community engagement or experiences a short-term hardship.

Type yes/no, scope person-month, program Medicaid.
Uses: `medicaid_demonstrates_ce`, `medicaid_short_term_hardship_in_month`.

```
any of the following is true:
  - Medicaid: demonstrates community engagement for month
  - Medicaid: experiences a short-term hardship in month
```

Examples: 2, all passing.

### WR-224 Medicaid: application lookback months `@engine`

The consecutive months, as many as the State specifies, ending with the month before the month containing the Determination Date.

Type list of months, scope person, program Medicaid.
Uses: `determination_date`, `medicaid_application_lookback_months`.

```
the Medicaid application lookback months (1) consecutive months ending with the month before the month containing the Determination Date
```

Examples: 2, all passing.

### WR-225 Medicaid: satisfies community engagement at application `@engine`

Community engagement is satisfied in each of the application lookback months.

Type yes/no, scope person, program Medicaid.
Uses: `medicaid_application_lookback_months_list`, `medicaid_ce_satisfied_for_month`.

```
in each of Medicaid: application lookback months:
  Medicaid: community engagement satisfied for month for the month
```

Examples: 3, all passing.

### WR-226 Medicaid: community engagement status at application `@engine`

Not yet in effect when the Determination Date is before the implementation date; not subject when the person is not an applicable individual; met when community engagement is satisfied at application; otherwise not met.

Type one of, scope person, program Medicaid.
Uses: `determination_date`, `medicaid_ce_implementation_date`, `medicaid_is_applicable_individual`, `medicaid_satisfies_ce_at_application`.

```
if the Determination Date is less than Medicaid community engagement implementation date (2027-01-01)
  then not yet in effect
else if it is not the case that Medicaid: is an applicable individual
  then not subject
else if Medicaid: satisfies community engagement at application
  then met
otherwise not met
```

Examples: 5, all passing.

### WR-227 Medicaid: renewal review months `@engine`

The months after the month of the most recent determination and before the month containing the Determination Date.

Type list of months, scope person, program Medicaid.
Uses: `determination_date`, `most_recent_determination_date`.

```
the months from the month after the month containing Most recent eligibility determination date through the month before the month containing the Determination Date
```

Examples: 1, all passing.

### WR-228 Medicaid: months demonstrated since last determination `@engine`

The number of renewal review months for which community engagement is satisfied.

Type whole number, scope person, program Medicaid.
Uses: `medicaid_ce_satisfied_for_month`, `medicaid_renewal_review_months`.

```
the number of months in Medicaid: renewal review months for which Medicaid: community engagement satisfied for month for the month
```

Examples: 1, all passing.

### WR-229 Medicaid: satisfies community engagement at renewal `@engine`

Months demonstrated since the last determination are at least the number the State requires.

Type yes/no, scope person, program Medicaid.
Uses: `medicaid_months_demonstrated_since_last_determination`, `medicaid_renewal_required_months`.

```
Medicaid: months demonstrated since last determination is at least Medicaid renewal required months (1)
```

Examples: 2, all passing.

### WR-230 Medicaid: community engagement status at renewal `@engine`

Not yet in effect when the Determination Date is before the implementation date; not subject when the person is not an applicable individual; met when community engagement is satisfied at renewal; otherwise not met.

Type one of, scope person, program Medicaid.
Uses: `determination_date`, `medicaid_ce_implementation_date`, `medicaid_is_applicable_individual`, `medicaid_satisfies_ce_at_renewal`.

```
if the Determination Date is less than Medicaid community engagement implementation date (2027-01-01)
  then not yet in effect
else if it is not the case that Medicaid: is an applicable individual
  then not subject
else if Medicaid: satisfies community engagement at renewal
  then met
otherwise not met
```

Examples: 2, all passing.

### WR-300 SNAP: is in the ABAWD age range `@engine`

Age at the month is at least 18 and at most the ABAWD maximum age.

Type yes/no, scope person-month, program SNAP.
Uses: `age_at_month`, `snap_abawd_max_age`, `snap_abawd_min_age`.

```
all of the following are true:
  - Age at month is at least SNAP ABAWD minimum age (18)
  - Age at month is at most SNAP ABAWD maximum age (64)
```

Examples: 4, all passing.

### WR-301 SNAP: is medically certified unfit for employment `@assembly`

The person receives disability benefits, the agency finds them obviously unfit, or they have a medical statement of unfitness.

Type yes/no, scope person, program SNAP.
Uses: `agency_finds_obviously_unfit`, `has_medical_statement_of_unfitness`, `receives_disability_benefits`.

```
any of the following is true:
  - Receives disability benefits
  - Agency finds the person obviously unfit for employment
  - Has a medical statement of unfitness for employment
```

Examples: 2, all passing.

### WR-302 SNAP: has responsibility for a dependent child under 14 `@assembly`

There is a member of the person's SNAP household who is under 14 at the month and of whom this person is a parent or whom this person cares for.

Type yes/no, scope person-month, program SNAP.
Uses: `age_at_month`, `persons_cared_for`, `relationships`, `snap_dependent_child_age_limit`, `snap_household_members`.

```
there is a person in SNAP household members such that
  all of the following are true:
    - that person's Age at month is less than SNAP dependent child age limit (14)
    - any of the following is true:
      - this person is a parent of that person
      - that person is in Persons cared for
```

Examples: 3, all passing.

### WR-303 SNAP: has responsibility for a dependent child under 6 `@assembly`

There is a member of the person's SNAP household who is under 6 at the month and of whom this person is a parent or whom this person cares for.

Type yes/no, scope person-month, program SNAP.
Uses: `age_at_month`, `persons_cared_for`, `relationships`, `snap_general_exemption_child_age`, `snap_household_members`.

```
there is a person in SNAP household members such that
  all of the following are true:
    - that person's Age at month is less than SNAP general exemption child age (6)
    - any of the following is true:
      - this person is a parent of that person
      - that person is in Persons cared for
```

Examples: 2, all passing.

### WR-304 SNAP: weekly average hours worked `@assembly`

Hours worked in the month converted to a weekly average, using 12 months per 52 weeks. No reported hours counts as 0.

Type hours, scope person-month, program SNAP.
Uses: `hours_worked`.

```
((Hours worked, otherwise 0) times 12) divided by 52
```

Examples: 1, all passing.

### WR-305 SNAP: weekly earnings `@assembly`

Monthly income converted to weekly earnings, using 12 months per 52 weeks.

Type money, scope person-month, program SNAP.
Uses: `monthly_income`.

```
(Monthly income times 12) divided by 52
```

Examples: 1, all passing.

### WR-306 SNAP: meets the employment exemption `@engine`

Weekly average hours worked are at least 30, or weekly earnings are at least the Federal minimum wage times 30.

Type yes/no, scope person-month, program SNAP.
Uses: `federal_minimum_wage`, `snap_employment_exemption_weekly_hours`, `snap_weekly_average_hours_worked`, `snap_weekly_earnings`.

```
any of the following is true:
  - SNAP: weekly average hours worked is at least SNAP employment exemption weekly hours (30)
  - SNAP: weekly earnings is at least (Federal minimum wage (7.25) times SNAP employment exemption weekly hours (30))
```

Examples: 3, all passing.

### WR-307 SNAP: is exempt from general work registration `@engine`

During the month the person is complying with TANF work requirements, receives unemployment compensation, has responsibility for a child under 6 or an incapacitated person, is enrolled at least half-time in an educational program, participates in a substance use treatment program, meets the employment exemption, or is 16 or 17 and either not head of household or enrolled at least half-time.

Type yes/no, scope person-month, program SNAP.
Uses: `age_at_month`, `has_responsibility_for_incapacitated_person`, `is_complying_with_tanf_work_requirements`, `is_enrolled_half_time_education`, `is_head_of_household`, `participates_in_sud_treatment_program`, `receives_unemployment_compensation`, `snap_has_responsibility_for_child_under_6`, `snap_meets_employment_exemption`.

```
any of the following is true:
  - Is complying with TANF work requirements
  - Receives unemployment compensation
  - SNAP: has responsibility for a dependent child under 6
  - Has responsibility for the care of an incapacitated person
  - Is enrolled at least half-time in an educational program
  - Participates in a substance use treatment program
  - SNAP: meets the employment exemption
  - all of the following are true:
    - Age at month is at least 16
    - Age at month is at most 17
    - any of the following is true:
      - it is not the case that Is head of household
      - Is enrolled at least half-time in an educational program
```

Examples: 3, all passing.

### WR-308 SNAP: is subject to general work registration `@engine`

Age at the month is 16 through 59, the person is not unfit for employment, and the person is not exempt from general work registration.

Type yes/no, scope person-month, program SNAP.
Uses: `age_at_month`, `snap_is_exempt_from_work_registration`, `snap_is_unfit_for_employment`, `snap_work_registration_max_age`, `snap_work_registration_min_age`.

```
all of the following are true:
  - Age at month is at least SNAP work registration minimum age (16)
  - Age at month is at most SNAP work registration maximum age (59)
  - it is not the case that SNAP: is medically certified unfit for employment
  - it is not the case that SNAP: is exempt from general work registration
```

Examples: 2, all passing.

### WR-309 SNAP: is exempt as an Indian `@assembly`

The person is an Indian, an Urban Indian, or a California Indian. Eligibility for the Indian Health Service alone does not qualify.

Type yes/no, scope person, program SNAP.
Uses: `indian_status`.

```
Indian status is one of: Indian, Urban Indian, California Indian
```

Examples: 2, all passing.

### WR-310 SNAP: is exempt from the ABAWD time limit `@engine`

For the month the person is outside the ABAWD age range, is unfit for employment, has responsibility for a child under 14, is exempt from general work registration, is pregnant, or is exempt as an Indian.

Type yes/no, scope person-month, program SNAP.
Uses: `is_pregnant`, `snap_has_responsibility_for_child_under_14`, `snap_in_abawd_age_range`, `snap_is_exempt_as_indian`, `snap_is_exempt_from_work_registration`, `snap_is_unfit_for_employment`.

```
any of the following is true:
  - it is not the case that SNAP: is in the ABAWD age range
  - SNAP: is medically certified unfit for employment
  - SNAP: has responsibility for a dependent child under 14
  - SNAP: is exempt from general work registration
  - Is pregnant
  - SNAP: is exempt as an Indian
```

Examples: 2, all passing.

### WR-311 SNAP: hours worked including good cause `@assembly`

Hours worked plus hours missed for good cause in the month. No reported hours counts as 0.

Type hours, scope person-month, program SNAP.
Uses: `hours_missed_for_good_cause`, `hours_worked`.

```
(Hours worked, otherwise 0) plus (Hours missed for good cause, otherwise 0)
```

Examples: 1, all passing.

### WR-312 SNAP: fulfills the work requirement for month `@engine`

For the month hours worked including good cause are at least 80, work program hours are at least 80, or the person participates in workfare.

Type yes/no, scope person-month, program SNAP.
Uses: `participates_in_workfare`, `snap_hours_worked_with_good_cause`, `snap_required_hours_per_month`, `work_program_hours`.

```
any of the following is true:
  - SNAP: hours worked including good cause is at least SNAP required hours per month (80)
  - (Work program hours, otherwise 0) is at least SNAP required hours per month (80)
  - Participates in workfare
```

Examples: 3, all passing.

### WR-313 SNAP: is a countable month `@engine`

The person received SNAP benefits for the full month, the benefits were not prorated, and the person was not exempt from the time limit, not covered by a waiver, not fulfilling the work requirement, and not given a discretionary exemption.

Type yes/no, scope person-month, program SNAP.
Uses: `covered_by_abawd_waiver`, `has_discretionary_exemption`, `received_full_month_snap_benefits`, `snap_benefits_prorated`, `snap_fulfills_work_requirement`, `snap_is_exempt_from_time_limit`.

```
all of the following are true:
  - Received SNAP benefits for the full month
  - it is not the case that SNAP benefits were prorated in month
  - it is not the case that SNAP: is exempt from the ABAWD time limit
  - it is not the case that Covered by an ABAWD waiver in month
  - it is not the case that SNAP: fulfills the work requirement for month
  - it is not the case that Has a discretionary exemption in month
```

Examples: 3, all passing.

### WR-314 SNAP: time limit period months `@engine`

The 36 consecutive months ending with the month before the month containing the Determination Date.

Precision. Rolling clock. A fixed clock would replace this derivation.

Type list of months, scope person, program SNAP.
Uses: `determination_date`, `snap_period_months`.

```
the SNAP time limit period months (36) consecutive months ending with the month before the month containing the Determination Date
```

Examples: 1, all passing.

### WR-315 SNAP: countable months used `@engine`

The number of months in the time limit period that are countable months.

Type whole number, scope person, program SNAP.
Uses: `snap_is_countable_month`, `snap_time_limit_period_months`.

```
the number of months in SNAP: time limit period months for which SNAP: is a countable month for the month
```

Examples: 1, all passing.

### WR-316 SNAP: has exhausted the time limit `@engine`

Countable months used are at least 3.

Type yes/no, scope person, program SNAP.
Uses: `snap_countable_month_limit`, `snap_countable_months_used`.

```
SNAP: countable months used is at least SNAP countable month limit (3)
```

Examples: 2, all passing.

### WR-317 SNAP: regains eligibility `@engine`

In the 30 days ending on the Determination Date the person worked at least 80 hours, participated in a work program for at least 80 hours, or participated in workfare.

Type yes/no, scope person, program SNAP.
Uses: `hours_worked_last_30_days`, `participated_in_workfare_last_30_days`, `snap_regain_hours`, `work_program_hours_last_30_days`.

```
any of the following is true:
  - Hours worked in the last 30 days is at least SNAP hours to regain eligibility (80)
  - Work program hours in the last 30 days is at least SNAP hours to regain eligibility (80)
  - Participated in workfare in the last 30 days
```

Examples: 2, all passing.

### WR-318 SNAP: time limit status `@engine`

Prior law applies when the Determination Date is before the effective date of the changes; not subject when the person is exempt in the month containing the Determination Date; within limit when the time limit is not exhausted; regained when it is exhausted but the person regains eligibility; otherwise limit exhausted.

Type one of, scope person, program SNAP.
Uses: `determination_date`, `snap_abawd_changes_effective_date`, `snap_has_exhausted_time_limit`, `snap_is_exempt_from_time_limit`, `snap_regains_eligibility`.

```
if the Determination Date is less than SNAP ABAWD changes effective date (2025-07-04)
  then prior law applies
else if SNAP: is exempt from the ABAWD time limit for the month containing the Determination Date
  then not subject
else if it is not the case that SNAP: has exhausted the time limit
  then within limit
else if SNAP: regains eligibility
  then regained
otherwise limit exhausted
```

Examples: 4, all passing.

### WR-319 SNAP: is subject to a SNAP work requirement `@engine`

For the month the person is subject to general work registration or is not exempt from the ABAWD time limit.

Type yes/no, scope person-month, program SNAP.
Uses: `snap_is_exempt_from_time_limit`, `snap_is_subject_to_work_registration`.

```
any of the following is true:
  - SNAP: is subject to general work registration
  - it is not the case that SNAP: is exempt from the ABAWD time limit
```

Examples: 2, all passing.

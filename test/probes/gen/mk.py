import yaml, copy, sys, json
BASE_FACTS = dict(
 residence_setting_type='private_dwelling', is_member_of_federally_recognized_tribe=False, is_alaska_native=False,
 is_urban_indian_under_ihcia=False, tribal_descendant_degree='none', education_program_type='none',
 has_qualifying_military_service=False, medicare_part_b_enrolled=False, state_of_residence='CO', is_pregnant=False,
 expected_number_of_children=0, qualifying_quarters=0, medicare_part_a_entitled=False,
 was_enrolled_in_medicaid_at_foster_care_exit=False, mother_coverage_at_birth='none', is_blind=False,
 meets_ssa_disability_criteria=False, receives_ssi=False, chp_has_other_health_coverage=False,
 chp_is_eligible_for_public_agency_state_health_benefits_plan=False, ma_lives_apart_due_to_separation_or_pending_divorce=False,
 ma_eligibility_was_erroneously_granted=False, sex='female', immigration_status='us_citizen', is_tax_filer=False,
 is_required_to_file_tax_return=False, dependent_child_has_minimum_essential_coverage=True,
 ma_application_date='2026-11-02', ma_retroactive_coverage_requested=False, ma_eligibility_start_date='2026-01-01',
 documentation_not_reasonably_available=False, earned_income_attestation_is_questionable=False,
 unearned_income_attestation_is_questionable=False, earned_income_verification_document_received=True,
 earned_income_verified_by_electronic_data_source=True, ma_is_incapable_of_indicating_intent=False, ma_lottery_winnings_hardship_exemption_granted=False, ma_prior_enrollment_category='none')
BASE_MONTH = dict(lottery_gambling_winnings_received=0, wages_gross=0, social_security_income=0, pension_income=0,
 unemployment_income=0, self_employment_net_earnings_for_tax=0, self_employment_gross_receipts=0, magi_other_taxable_income=0,
 discharged_student_loan_debt=0, other_unearned_income_nontaxable=0, other_unearned_income_taxable=0, tax_exempt_interest=0,
 foreign_earned_income_excluded=0, pretax_deductions=0, child_support_received=0, tanf_cash_income=0,
 adult_financial_cash_income=0, ssi_income=0, shelter_costs_paid_by_others=0, has_emergency_medical_condition=False,
 ma_has_left_required_household=False, ma_is_unable_to_be_located=False,
 ma_has_requested_withdrawal_from_continuous_eligibility=False)
def person(dob, facts=None, month=None, months=None):
    f = copy.deepcopy(BASE_FACTS); f['date_of_birth']=dob; f.update(facts or {})
    m = copy.deepcopy(BASE_MONTH); m.update(month or {})
    p = {'facts': f, 'month_defaults': m, 'relationships': []}
    if months: p['months']=months
    return p
def case(cid, title, persons, rels, as_of='2026-11-10'):
    c={'id': cid, 'title': title, 'as_of': as_of, 'persons': persons}
    if rels: c['relationships']=rels
    return c

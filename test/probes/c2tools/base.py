import copy, json, sys
def person_adult(dob='1988-04-02'):
    return {"facts": {"date_of_birth": dob, "sex": "female", "immigration_status": "us_citizen", "ssn_furnished_or_application_shown": True,
        "state_of_residence": "CO", "county_of_residence": "denver", "residence_setting_type": "private_dwelling",
        "nighttime_residence_type": "fixed_regular_adequate", "education_program_type": "none", "receives_tanf_cash": False,
        "is_referred_for_colorado_works_child_care": False, "cccap_is_financially_contributing_to_child": True,
        "cccap_is_in_job_search_activity": False, "cccap_child_has_additional_care_needs": False, "cccap_declares_assets_within_limit": True,
        "is_emancipated_minor": False, "child_support_paid_order_type": "court_order", "self_employment_cost_receipts_received": False,
        "cccap_non_traditional_hours_are_requested": False, "cccap_custody_schedule_is_outstanding": False,
        "age_attestation_is_questionable": False, "identity_attestation_is_questionable": False, "citizenship_attestation_is_questionable": False,
        "cccap_care_is_from_unrelated_exempt_provider_outside_home": False, "cccap_is_serving_ipv_disqualification": False,
        "cccap_activity_schedule_received": True, "cccap_immunization_record_received": True, "dwelling_id": "d1",
        "residency_verification_document_received": True, "cccap_eligible_activity_verification_document_received": True,
        "earned_income_verification_document_received": True, "work_hours_verification_document_received": True,
        "verification_request_date": "2026-10-01"},
      "month_defaults": {"wages_gross": 2000, "hours_worked": 120, "self_employment_gross_receipts": 0, "self_employment_net_earnings_for_tax": 0,
        "social_security_income": 0, "pension_income": 0, "unemployment_income": 0, "child_support_received": 0, "tanf_cash_income": 0,
        "adult_financial_cash_income": 0, "ssi_income": 0, "other_unearned_income_nontaxable": 0, "other_unearned_income_taxable": 0,
        "tax_exempt_interest": 0, "child_support_paid_legally_obligated": 0, "child_support_paid_toward_arrears": 0,
        "is_in_sud_treatment_iop_or_higher": False, "self_employment_operating_costs": 0}}
def person_child(dob='2020-03-10'):
    p=person_adult(dob)
    p["facts"].update({"sex": "male", "education_program_type": "elementary", "cccap_child_needs_care_for_part_of_day": True, "cccap_care_is_part_time": False})
    p["month_defaults"].update({"wages_gross": 0, "hours_worked": 0})
    return p
def base(cid, title):
    return {"id": cid, "title": title, "as_of": "2026-11-15",
        "case_facts": {"is_protective_services_child_care_case": False, "cccap_application_county": "denver", "cccap_determination_type": "application",
            "uses_top_quality_rated_provider": False, "cccap_is_child_welfare_child_care_household": False},
        "parameters": {"cccap_entry_income_limit_pct_fpl_table": {"denver": 1.85}},
        "relationships": [["parent", "p1", "p3"]],
        "persons": {"p1": person_adult(), "p3": person_child()},
        "month_facts": {"2026-11": {"cccap_is_in_homelessness_stabilization_period": False}, "2026-10": {"cccap_is_in_homelessness_stabilization_period": False}},
        "expect": {}}

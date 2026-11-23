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
cases=[]
# A: two caretakers both incapacitated, no activity
c=base("RV-A1","two caretakers, both incapacitated, neither in an activity"); c["persons"]["p2"]=person_adult('1986-01-01')
c["relationships"].append(["parent","p2","p3"]); c["relationships"].append(["spouse","p1","p2"])
for p in ("p1","p2"):
    c["persons"][p]["facts"]["cccap_caretaker_is_incapacitated"]=True; c["persons"][p]["month_defaults"].update({"wages_gross":0,"hours_worked":0})
cases.append(c)
c=copy.deepcopy(c); c["id"]="RV-A2"; c["title"]="one incapacitated, other involuntarily absent"
c["persons"]["p2"]["facts"]["cccap_caretaker_is_incapacitated"]=False; c["persons"]["p2"]["facts"]["cccap_caretaker_is_involuntarily_absent"]=True
cases.append(c)
# B: graduate school
c=base("RV-B","single mother in a master's program, no work"); c["persons"]["p1"]["facts"]["education_program_type"]="higher_education"
c["persons"]["p1"]["facts"]["cccap_education_activity_time_limit_reached"]=False
c["persons"]["p1"]["month_defaults"].update({"wages_gross":0,"hours_worked":0}); cases.append(c)
# C: county move mid-period
c=base("RV-C","mid-period change: moved from Denver to Arapahoe"); c["case_facts"]["cccap_determination_type"]="change_during_eligibility_period"
for p in ("p1","p3"): c["persons"][p]["facts"]["county_of_residence"]="arapahoe"
c["case_facts"]["cccap_parent_fee_at_last_determination"]=60; cases.append(c)
# D: child turns 13 mid-period
c=base("RV-D","mid-period change: only child turned 13 on November 10"); c["case_facts"]["cccap_determination_type"]="change_during_eligibility_period"
c["case_facts"]["cccap_parent_fee_at_last_determination"]=60
c["persons"]["p3"]=person_child('2013-11-10'); c["persons"]["p3"]["facts"]["education_program_type"]="elementary"; cases.append(c)
# E: foster care payments
c=base("RV-E","kin foster parent with her own child; $1,500 foster care payment"); 
c["persons"]["p1"]["month_defaults"].update({"other_unearned_income_nontaxable":1500,"foster_care_provider_payments_received":1500}); cases.append(c)
# F: boarder
c=base("RV-F","mother with a boarder paying $1,500 a month"); c["persons"]["p1"]["month_defaults"].update({"room_and_board_payments_received":1500}); cases.append(c)
# G: GI bill housing allowance
c=base("RV-G","veteran mother in college with a $1,500 GI Bill housing allowance, $2,000 wages"); 
c["persons"]["p1"]["month_defaults"].update({"other_unearned_income_nontaxable":1500,"educational_assistance_received":1500}); cases.append(c)
# H: launch period
c=base("RV-H","self-employment in launch period: $300 net, 120 hours")
c["persons"]["p1"]["month_defaults"].update({"wages_gross":0,"hours_worked":120,"self_employment_gross_receipts":300})
c["persons"]["p1"]["facts"]["cccap_self_employment_in_launch_period"]=True; cases.append(c)
# I: CW unit member not work eligible
c=base("RV-I","mother in the Colorado Works unit, not work eligible, working")
for p in ("p1","p3"): c["persons"][p]["facts"]["receives_tanf_cash"]=True
c["persons"]["p1"]["month_defaults"]["is_work_eligible_individual_in_tanf_case"]=False; cases.append(c)
# J: Child Welfare Child Care, caretaker working, earned income not verified
c=base("RV-J","Child Welfare Child Care household; earned income and activity not documented")
c["case_facts"]["cccap_is_child_welfare_child_care_household"]=True
c["persons"]["p1"]["facts"].update({"earned_income_verification_document_received":False,"cccap_eligible_activity_verification_document_received":False,"work_hours_verification_document_received":False}); cases.append(c)
json.dump(cases, open(sys.argv[1],"w"), indent=1)
cases2=[]
c=base("RV-K1","two working caretakers; the father declares assets over $1 million"); c["persons"]["p2"]=person_adult('1986-01-01')
c["relationships"].append(["parent","p2","p3"]); c["relationships"].append(["spouse","p1","p2"])
c["persons"]["p2"]["facts"]["cccap_declares_assets_within_limit"]=False
c["persons"]["p1"]["month_defaults"]["wages_gross"]=1000; c["persons"]["p2"]["month_defaults"]["wages_gross"]=1000
cases2.append(c)
c=base("RV-K2","mother declares assets over $1 million; child fact stated true"); c["persons"]["p1"]["facts"]["cccap_declares_assets_within_limit"]=False; cases2.append(c)
c=base("RV-K3","child's own asset and residency facts not stated"); 
for k in ("cccap_declares_assets_within_limit","county_of_residence","state_of_residence"): c["persons"]["p3"]["facts"].pop(k)
cases2.append(c)
json.dump(cases2, open(sys.argv[1].replace('.json','2.json'),"w"), indent=1)
cases3=[]
c=base("RV-L","Colorado Works household: mother work eligible and referred, in an unpaid work activity")
for p in ("p1","p3"): c["persons"][p]["facts"]["receives_tanf_cash"]=True
c["persons"]["p1"]["facts"]["is_referred_for_colorado_works_child_care"]=True
c["persons"]["p1"]["month_defaults"].update({"is_work_eligible_individual_in_tanf_case":True,"wages_gross":0,"hours_worked":0})
c["persons"]["p3"]["month_defaults"].update({"is_work_eligible_individual_in_tanf_case":False})
cases3.append(c)
c=base("RV-M","family living in a campground for lack of alternatives, stabilization period, no activity")
for p in ("p1","p3"): c["persons"][p]["facts"]["nighttime_residence_type"]="trailer_park_or_campground_for_lack_of_alternative"
c["month_facts"]["2026-11"]["cccap_is_in_homelessness_stabilization_period"]=True
c["persons"]["p1"]["month_defaults"].update({"wages_gross":0,"hours_worked":0}); cases3.append(c)
json.dump(cases3, open(sys.argv[1].replace('.json','3.json'),"w"), indent=1)

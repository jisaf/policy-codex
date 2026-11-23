import copy, json, sys, yaml
sys.path.insert(0, sys.argv[2]); from base import *
C=[]
def add(c): C.append(c); return c
# --- re-runs of first-pass P1 probes, stated with the new facts ---
c=base("Q-A1","two caretakers, both incapacitated, neither in an activity"); c["persons"]["p2"]=person_adult('1986-01-01')
c["relationships"]+= [["parent","p2","p3"],["spouse","p1","p2"]]
for p in ("p1","p2"):
    c["persons"][p]["facts"].update({"cccap_caretaker_is_incapacitated":True,"incapacity_verification_document_received":True}); c["persons"][p]["month_defaults"].update({"wages_gross":0,"hours_worked":0})
add(c)
c=copy.deepcopy(c); c["id"]="Q-A2"; c["persons"]["p2"]["facts"].update({"cccap_caretaker_is_incapacitated":False,"cccap_caretaker_is_involuntarily_absent":True}); add(c)
c=base("Q-B2","master's program, no work"); c["persons"]["p1"]["facts"].update({"education_program_type":"higher_education","cccap_education_activity_time_limit_reached":False,"post_secondary_program_beyond_first_bachelors_degree":True})
c["persons"]["p1"]["month_defaults"].update({"wages_gross":0,"hours_worked":0}); add(c)
c=base("Q-C","change: moved Denver to Arapahoe"); c["case_facts"].update({"cccap_determination_type":"change_during_eligibility_period","cccap_parent_fee_at_last_determination":60})
for p in ("p1","p3"): c["persons"][p]["facts"]["county_of_residence"]="arapahoe"
add(c)
c=base("Q-D2","change: only child turned 13, authorized at last determination"); c["case_facts"].update({"cccap_determination_type":"change_during_eligibility_period","cccap_parent_fee_at_last_determination":60})
c["persons"]["p3"]=person_child('2013-11-10'); c["persons"]["p3"]["facts"]["cccap_child_was_authorized_at_last_determination"]=True; add(c)
c=base("Q-E","foster care payment $1,500"); c["persons"]["p1"]["month_defaults"].update({"other_unearned_income_nontaxable":1500,"foster_care_provider_payments_received":1500}); add(c)
c=base("Q-F","boarder $1,500"); c["persons"]["p1"]["month_defaults"].update({"room_and_board_payments_received":1500}); add(c)
c=base("Q-G2","GI Bill housing allowance $1,500"); c["persons"]["p1"]["month_defaults"].update({"other_unearned_income_nontaxable":1500,"educational_assistance_received":1500,"gi_bill_subsistence_allowance_received":1500}); add(c)
c=base("Q-H","launch period $300 receipts, 120 hours"); c["persons"]["p1"]["month_defaults"].update({"wages_gross":0,"hours_worked":120,"self_employment_gross_receipts":300}); c["persons"]["p1"]["facts"]["cccap_self_employment_in_launch_period"]=True; add(c)
c=base("Q-I","mother in CW unit, not work eligible, working")
for p in ("p1","p3"): c["persons"][p]["facts"]["receives_tanf_cash"]=True
c["persons"]["p1"]["month_defaults"]["is_work_eligible_individual_in_tanf_case"]=False; add(c)
c=base("Q-J","Child Welfare CC, no documents"); c["case_facts"]["cccap_is_child_welfare_child_care_household"]=True
c["persons"]["p1"]["facts"].update({"earned_income_verification_document_received":False,"cccap_eligible_activity_verification_document_received":False,"work_hours_verification_document_received":False}); add(c)
c=base("Q-K1","father declares assets over $1M"); c["persons"]["p2"]=person_adult('1986-01-01'); c["relationships"]+= [["parent","p2","p3"],["spouse","p1","p2"]]
c["persons"]["p2"]["facts"]["cccap_declares_assets_within_limit"]=False; c["persons"]["p1"]["month_defaults"]["wages_gross"]=1000; c["persons"]["p2"]["month_defaults"]["wages_gross"]=1000; add(c)
c=base("Q-K3","child's own asset and residency facts not stated")
for k in ("cccap_declares_assets_within_limit","county_of_residence","state_of_residence"): c["persons"]["p3"]["facts"].pop(k)
add(c)
c=base("Q-L","CW: mother work eligible, referred, unpaid activity")
for p in ("p1","p3"): c["persons"][p]["facts"]["receives_tanf_cash"]=True
c["persons"]["p1"]["facts"]["is_referred_for_colorado_works_child_care"]=True
c["persons"]["p1"]["month_defaults"].update({"is_work_eligible_individual_in_tanf_case":True,"wages_gross":0,"hours_worked":0}); c["persons"]["p3"]["month_defaults"]["is_work_eligible_individual_in_tanf_case"]=False; add(c)
c=base("Q-M2","campground, stabilization, no activity")
for p in ("p1","p3"): c["persons"][p]["facts"]["nighttime_residence_type"]="campground_for_lack_of_alternative"
c["month_facts"]["2026-11"]["cccap_is_in_homelessness_stabilization_period"]=True; c["persons"]["p1"]["month_defaults"].update({"wages_gross":0,"hours_worked":0}); add(c)
c=base("Q-N1","partner contributes financially, not working"); c["persons"]["p2"]=person_adult('1986-01-01'); c["relationships"].append(["contributes_financially_to","p2","p3"])
c["persons"]["p2"]["month_defaults"].update({"wages_gross":0,"hours_worked":0}); add(c)
# --- new probes ---
c=base("Z-1","17-year-old mother in IOP substance use treatment, no school or work")
c["persons"]["p1"]=person_adult('2009-03-01'); c["persons"]["p1"]["month_defaults"].update({"wages_gross":0,"hours_worked":0,"is_in_sud_treatment_iop_or_higher":True})
c["persons"]["p1"]["facts"].update({"sud_treatment_start_date":"2026-09-01"}); c["persons"]["p3"]=person_child('2025-06-01'); c["persons"]["p3"]["facts"]["education_program_type"]="none"; add(c)
c=copy.deepcopy(c); c["id"]="Z-1b"; c["title"]="same mother aged 19"; c["persons"]["p1"]["facts"]["date_of_birth"]="2007-03-01"; add(c)
c=base("Z-2","change: single mother on medical leave for her own health, able to care for her child")
c["case_facts"].update({"cccap_determination_type":"change_during_eligibility_period","cccap_parent_fee_at_last_determination":60})
c["persons"]["p1"]["month_defaults"].update({"wages_gross":0,"hours_worked":0,"temporary_activity_break_reason":"medical_leave"}); c["persons"]["p1"]["facts"]["cccap_caretaker_is_incapacitated"]=False
c["persons"]["p3"]["facts"]["cccap_child_was_authorized_at_last_determination"]=True; add(c)
c=copy.deepcopy(c); c["id"]="Z-2b"; c["title"]="same, seasonal interruption"; c["persons"]["p1"]["month_defaults"]["temporary_activity_break_reason"]="seasonal_interruption"; add(c)
c=base("Z-3","grandmother, legal guardian, payee of a child-only Colorado Works grant (not in the unit), working")
c["relationships"]=[["legal_guardian","p1","p3"]]; c["persons"]["p1"]["facts"]["date_of_birth"]="1965-01-01"
c["persons"]["p1"]["facts"]["receives_tanf_cash"]=True; c["persons"]["p3"]["facts"]["receives_tanf_cash"]=True
c["persons"]["p1"]["month_defaults"]["is_work_eligible_individual_in_tanf_case"]=False; c["persons"]["p3"]["month_defaults"]["is_work_eligible_individual_in_tanf_case"]=False; add(c)
c=copy.deepcopy(c); c["id"]="Z-3b"; c["title"]="same, grandmother stated not receiving"; c["persons"]["p1"]["facts"]["receives_tanf_cash"]=False; add(c)
c=base("Z-4","shelter family in stabilization; father in jail (involuntarily absent); mother no activity")
c["persons"]["p2"]=person_adult('1986-01-01'); c["relationships"]+= [["parent","p2","p3"],["spouse","p1","p2"]]
for p in ("p1","p3"): c["persons"][p]["facts"]["nighttime_residence_type"]="emergency_or_transitional_shelter"
c["persons"]["p2"]["facts"].update({"nighttime_residence_type":"institution","cccap_caretaker_is_involuntarily_absent":True})
c["month_facts"]["2026-11"]["cccap_is_in_homelessness_stabilization_period"]=True
for p in ("p1","p2"): c["persons"][p]["month_defaults"].update({"wages_gross":0,"hours_worked":0})
add(c)
c=base("Z-5","rents $1,500 stated in other taxable unearned income, $1,000 expenses, rental_income_received not stated")
c["persons"]["p1"]["month_defaults"].update({"other_unearned_income_taxable":1500,"rental_property_expenses_paid":1000}); add(c)
c=copy.deepcopy(c); c["id"]="Z-5b"; c["persons"]["p1"]["month_defaults"]["rental_income_received"]=1500; add(c)
yaml.safe_dump(C, open(sys.argv[1],"w"), sort_keys=False, width=200)
print(len(C))

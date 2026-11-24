import copy, sys, yaml
sys.path.insert(0, sys.argv[2]); from base import *
C=[]
def add(c): C.append(c); return c
def nowork(c,p): c["persons"][p]["month_defaults"].update({"wages_gross":0,"hours_worked":0})
# Y-1: change during the period, a new partner (not working, no activity) joined the household
c=base("Y-1","change: new spouse (stepfather) moved in during the period, no activity; mother working; child authorized")
c["case_facts"].update({"cccap_determination_type":"change_during_eligibility_period","cccap_parent_fee_at_last_determination":60})
c["persons"]["p2"]=person_adult('1986-01-01'); c["persons"]["p2"]["facts"]["sex"]="male"; nowork(c,"p2")
c["relationships"]+= [["stepparent","p2","p3"],["spouse","p1","p2"]]
c["persons"]["p3"]["facts"]["cccap_child_was_authorized_at_last_determination"]=True; add(c)
c=copy.deepcopy(c); c["id"]="Y-1r"; c["title"]="same at a redetermination"; c["case_facts"]["cccap_determination_type"]="redetermination"; add(c)
# Y-2: two-parent Colorado Works household; mother referred; father in the unit, working, not stated referred, no CCCAP documents
c=base("Y-2","CW two parents: mother referred; father in unit, working $1,000, referral stated only for mother, no CCCAP documents")
c["persons"]["p2"]=person_adult('1986-01-01'); c["relationships"]+= [["parent","p2","p3"],["spouse","p1","p2"]]
for p in ("p1","p2","p3"): c["persons"][p]["facts"]["receives_tanf_cash"]=True
c["persons"]["p1"]["facts"]["is_referred_for_colorado_works_child_care"]=True; nowork(c,"p1")
c["persons"]["p1"]["month_defaults"]["is_work_eligible_individual_in_tanf_case"]=True
c["persons"]["p2"]["month_defaults"].update({"is_work_eligible_individual_in_tanf_case":True,"wages_gross":1000,"hours_worked":80})
c["persons"]["p3"]["month_defaults"]["is_work_eligible_individual_in_tanf_case"]=False
c["persons"]["p2"]["facts"].update({"residency_verification_document_received":False,"cccap_eligible_activity_verification_document_received":False,"earned_income_verification_document_received":False,"work_hours_verification_document_received":False})
add(c)
c=copy.deepcopy(c); c["id"]="Y-2b"; c["title"]="same, father also stated referred"; c["persons"]["p2"]["facts"]["is_referred_for_colorado_works_child_care"]=True; add(c)
# Y-3: in-kind compensation stated in the neutral fact another program reads
c=base("Y-3","$2,000 wages plus $1,500 employer housing stated as in_kind_compensation_value (CO-4506)")
c["persons"]["p1"]["month_defaults"]["in_kind_compensation_value"]=1500; add(c)
c=copy.deepcopy(c); c["id"]="Y-3b"; c["title"]="same stated as in_kind_employment_compensation_value (CO-4454)"; del c["persons"]["p1"]["month_defaults"]["in_kind_compensation_value"]; c["persons"]["p1"]["month_defaults"]["in_kind_employment_compensation_value"]=1500; add(c)
# Y-4: GI Bill living allowance stated with both GI Bill facts, in other unearned income
c=base("Y-4","$1,500 GI Bill housing allowance in other unearned income, stated in both CO-4501 and CO-4456")
c["persons"]["p1"]["month_defaults"].update({"other_unearned_income_nontaxable":1500,"gi_bill_housing_and_food_allowances_received":1500,"gi_bill_subsistence_allowance_received":1500}); add(c)
# Y-5: transition from Colorado Works, asset declaration false
c=base("Y-5","transition from CW; caretaker's asset declaration stated false"); c["case_facts"].update({"cccap_determination_type":"transition_from_colorado_works","cccap_parent_fee_at_last_determination":0})
c["persons"]["p1"]["facts"]["cccap_declares_assets_within_limit"]=False; add(c)
# Y-6: 17-year-old in IOP treatment for more than a year (regression check of C2-1)
c=base("Y-6","17-year-old mother in IOP since 2025-09-01, no school or work")
c["persons"]["p1"]=person_adult('2009-03-01'); c["persons"]["p1"]["month_defaults"].update({"wages_gross":0,"hours_worked":0,"is_in_sud_treatment_iop_or_higher":True})
c["persons"]["p1"]["facts"].update({"sud_treatment_start_date":"2026-07-01"}); c["persons"]["p3"]=person_child('2025-06-01'); c["persons"]["p3"]["facts"]["education_program_type"]="none"
c["as_of"]="2027-08-15"; c["month_facts"]={"2027-08":{"cccap_is_in_homelessness_stabilization_period":False}}; add(c)
# Y-7: state diversion payment stated
c=base("Y-7","$2,000 wages plus a $1,500 Colorado Works diversion payment"); c["persons"]["p1"]["month_defaults"].update({"other_unearned_income_nontaxable":1500,"tanf_diversion_payment_received":1500}); add(c)
# Y-8: involuntarily absent father with no residency or asset facts stated
c=base("Y-8","father in jail (involuntarily absent), his residency and asset facts not stated; mother working")
c["persons"]["p2"]=person_adult('1986-01-01'); c["relationships"]+= [["parent","p2","p3"],["spouse","p1","p2"]]; nowork(c,"p2")
c["persons"]["p2"]["facts"]["cccap_caretaker_is_involuntarily_absent"]=True
for k in ("cccap_declares_assets_within_limit","county_of_residence"): c["persons"]["p2"]["facts"].pop(k)
add(c)
# Y-9: C2-2 at a change, family-care medical leave (regression check)
c=base("Y-9","change: mother on leave to care for a family member"); c["case_facts"].update({"cccap_determination_type":"change_during_eligibility_period","cccap_parent_fee_at_last_determination":60})
c["persons"]["p1"]["month_defaults"].update({"wages_gross":0,"hours_worked":0,"temporary_activity_break_reason":"medical_leave"}); c["persons"]["p3"]["facts"]["cccap_child_was_authorized_at_last_determination"]=True; add(c)
c=copy.deepcopy(c); c["id"]="Y-9a"; c["title"]="same at an application"; c["case_facts"]["cccap_determination_type"]="application"; add(c)
yaml.safe_dump(C, open(sys.argv[1],"w"), sort_keys=False, width=200); print(len(C))

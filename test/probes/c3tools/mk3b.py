import copy, sys, yaml
sys.path.insert(0, sys.argv[2]); from base import *
C=[]
def nowork(c,p): c["persons"][p]["month_defaults"].update({"wages_gross":0,"hours_worked":0})
c=base("Y-8b","father in jail (involuntarily absent), his county stated as the jail's county, assets declared within limit; mother working")
c["persons"]["p2"]=person_adult('1986-01-01'); c["relationships"]+= [["parent","p2","p3"],["spouse","p1","p2"]]; nowork(c,"p2")
c["persons"]["p2"]["facts"].update({"cccap_caretaker_is_involuntarily_absent":True,"county_of_residence":"fremont"}); C.append(c)
c=copy.deepcopy(c); c["id"]="Y-8c"; c["title"]="same, father's county Denver, no residency document for him"; c["persons"]["p2"]["facts"].update({"county_of_residence":"denver","residency_verification_document_received":False}); C.append(c)
c=base("Y-1c","change: the working father left the household during the period; the mother, incapacitated (excused at the last determination), stays with the authorized child")
c["case_facts"].update({"cccap_determination_type":"change_during_eligibility_period","cccap_parent_fee_at_last_determination":60})
nowork(c,"p1"); c["persons"]["p1"]["facts"].update({"cccap_caretaker_is_incapacitated":True,"incapacity_verification_document_received":True})
c["persons"]["p3"]["facts"]["cccap_child_was_authorized_at_last_determination"]=True; C.append(c)
yaml.safe_dump(C, open(sys.argv[1],"w"), sort_keys=False, width=200); print(len(C))

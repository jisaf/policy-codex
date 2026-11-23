import yaml, copy, sys
S=sys.argv[1]
A=yaml.safe_load(open(S+"/all.yaml"))
d={c["id"]:c for c in A}
y1=copy.deepcopy(d["Y-1"]); y1["id"]="Y-1j"; y1["title"]+=" (joined stated)"; y1["persons"]["p2"]["facts"]["cccap_caretaker_joined_during_eligibility_period"]=True
y1r=copy.deepcopy(y1); y1r["id"]="Y-1jr"; y1r["title"]="same at a redetermination"; y1r["case_facts"]["cccap_determination_type"]="redetermination"
y7=copy.deepcopy(d["Y-7"]); y7["id"]="Y-7s"; y7["title"]+=" (state diversion over 6 months)"; y7["persons"]["p1"]["month_defaults"]["tanf_state_diversion_payment_months"]=6
y3=copy.deepcopy(d["Y-3b"]); y3["id"]="Y-3c"; y3["title"]="in-kind stated in both CO-4506 and the retired CO-4454 name (only CO-4506 is read)"; y3["persons"]["p1"]["month_defaults"]["in_kind_compensation_value"]=1500
yaml.safe_dump([y1,y1r,y7],open(S+"/extra.yaml","w"),sort_keys=False,width=200)

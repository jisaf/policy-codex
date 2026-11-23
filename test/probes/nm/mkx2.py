import yaml
S = "/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/"
cs = yaml.safe_load(open(S + "x-cases-nonmagi.yaml"))
for c in cs:
    for pid, p in c["persons"].items():
        p["facts"].setdefault("dwelling_id", "h1")
        if c["id"] == "X-WAWDHCBS":
            p["facts"].update({"ma_transfer_penalty_months_assigned_from_spouse": 0, "ma_spouse_outside_case_is_institutionalized_and_otherwise_eligible": False, "retains_ssi_status_without_payment": False})
        if c["id"] == "X-COURT" and pid == "p1":
            p["facts"]["court_ordered_spousal_support"] = 2500
        if c["id"] == "X-LUMP":
            p["month_defaults"]["other_unearned_income_nontaxable"] = 5000
yaml.safe_dump(cs, open(S + "nm/x2.yaml", "w"), sort_keys=False)
print("ok")

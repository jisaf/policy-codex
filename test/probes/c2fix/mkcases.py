import sys, yaml, copy
P = yaml.safe_load(open(sys.argv[1]))
by = {c["id"]: c for c in P}


def exp(c, pids, status, inc, fee):
    c["expect"] = {p: {"cccap_eligibility_status": {"2026-11": status},
                       "cccap_household_income": {"2026-11": inc},
                       "cccap_parent_fee": {"2026-11": fee}} for p in pids}


spec = [
    ("Z-1", "CO-199", "Coverage pass 2 (CCCAP): a 17-year-old mother in intensive outpatient substance use disorder treatment, no school or work", ["p1", "p3"], "eligible_low_income",
     ["Coverage pass 2 C2-1 (probe Z-1). 8 CCR 1403-1 3.103.IIIII, EEEEE, 3.111.G.4.a.3. p1 (17, born 2009-03-01) has custody of her",
      "daughter p3 (born 2025-06-01) and has been in licensed treatment at an intensive outpatient level since 2026-09-01; no school, no work.",
      "Application in Denver, determined November 15, 2026."],
     ["Workforce training includes, from July 1, 2026, substance use disorder treatment at an intensive outpatient level or higher",
      "(3.103.IIIII), and a parent under 21 in workforce training is an adult caretaker (EEEEE). p1 is an adult caretaker whose activity is the",
      "treatment (instance begun 2026-09-01, within its year). Household of 2, income $0, under the entry limit: eligible_low_income; fee $0.",
      "Before the fix p1 was neither an adult caretaker nor a teen parent: ineligible_activity for both."]),
    ("Z-2", "CO-200", "Coverage pass 2 (CCCAP): change during the period; a single mother on medical leave who can still care for her son", ["p1", "p3"], "eligible_low_income",
     ["Coverage pass 2 C2-2 (probe Z-2). 8 CCR 1403-1 3.112.C.2, 3.125.Q.2, 3.103.WWW. p1 (38) is on verified medical leave from her job",
      "(temporary_activity_break_reason medical_leave, no wages or hours this month) and is not incapacitated; her son p3 (6) was authorized",
      "at the last determination (fee then $60). A change reported during the eligibility period, determined November 15, 2026."],
     ["At a change, 3.125.Q.2 discontinues care only for reasons that are not a temporary break, and 3.112.C.2 makes extended verified",
      "medical leave a temporary break; D.9's inability to care for the children is not required (it is kept at a redetermination, OQ-850).",
      "Household of 2, income $0: eligible_low_income; fee $0 (no higher than the $60 last assessed). Before the fix: ineligible_activity, fee 0."]),
    ("Z-4", "CO-201", "Coverage pass 2 (CCCAP): a mother and son in a shelter during stabilization; the father is in jail", ["p1", "p3", "p2"], "eligible_homelessness_stabilization",
     ["Coverage pass 2 C2-5 (probe Z-4). 8 CCR 1403-1 3.103.CCC, 3.121.B, 3.111.D.1.b. p1 (38) and her son p3 (6) live in an emergency",
      "shelter in the county-authorized stabilization period; p2 (40), p3's father and p1's husband, is in jail (institution), involuntarily",
      "absent. Neither parent works. Application in Denver, determined November 15, 2026."],
     ["The family experiencing homelessness is read on the household's eligible child (3.103.CCC: \"Children who are ...\"), so every member",
      "gets the same value: p3 is in a shelter and the period is authorized, so the household is eligible_homelessness_stabilization (3.121.B.3.a",
      "waives the activity). Income $0, fee $0. Before the fix p2, read on his own residence, was ineligible_activity."]),
]
out = []
for pid, cid, title, pids, status, hdr, ex in spec:
    c = copy.deepcopy(by[pid])
    c["id"] = cid
    c["title"] = title
    exp(c, pids, status, 0, 0)
    lines = yaml.safe_dump([c], sort_keys=False, width=200).split("\n")
    i = [k for k, l in enumerate(lines) if l.startswith("  title:")][0]
    lines[i + 1:i + 1] = ["  # " + h for h in hdr]
    j = lines.index("  expect:")
    lines[j + 1:j + 1] = ["    # " + h for h in ex]
    out.append("\n".join(lines).rstrip("\n"))
open(sys.argv[2], "w").write("\n".join(out) + "\n")

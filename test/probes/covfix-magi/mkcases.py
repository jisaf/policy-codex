import re, sys
src = open(sys.argv[1]).read()   # scratch cases.yaml with RV2-* probes
out = sys.argv[2]
def block(pid):
    m = re.search(r'^- id: %s\n(.*?)(?=^- id: |\Z)' % re.escape(pid), src, re.S | re.M)
    return m.group(0)
C = [
 ("RV2-MEC", "CO-202", "Non-filer parent whose child has no minimum essential coverage, at 70% FPL (coverage review 2, N-01)", [
  "Coverage review 2 (2026-11-22), promoted from the reviewer's probe RV2-MEC. Determination 2026-11-10; application 2026-11-02.",
  "Non-filers: each household is p1 and her child p2 (E.1.d), size 2: 1,262 / (21,640 / 12 = 1,803.33) = 69.98%.",
  "p1 (40): over the 68% parent and caretaker relative standard. p2 has no minimum essential coverage, so the Adults group is closed",
  "  to p1 (G.4.a): her highest standard is 68% (CO-539), and 69.98 - 5 = 64.98 <= 68: parent_caretaker, eligible. Was none / ineligible_income.",
  "p2 (10): 69.98% <= 142%: child, eligible."],
  {"p1": {"ma_magi_highest_income_standard_pct": 0.68, "ma_magi_category": "parent_caretaker", "ma_magi_eligibility_status": "eligible"},
   "p2": {"ma_magi_category": "child", "ma_magi_eligibility_status": "eligible"}}),
 ("RV2-NB", "CO-203", "Eligible Needy Newborn in the month of the first birthday (coverage review 2, N-02)", [
  "Coverage review 2 (2026-11-22), promoted from the reviewer's probe RV2-NB. Determination 2026-11-10; application 2026-11-02.",
  "p2 was born 2025-11-05 to p1, who was on Medical Assistance at the birth. On 2026-10-31 p2 was 0, so p2 is a needy newborn",
  "  for all of November (G.1, G.7; CO-4790): needy_newborn, eligible. Was none / ineligible_income (CHP+ eligible_child).",
  "Household p1 and p2, size 2: 3,066 / 1,803.33 = 170.0%. p1 (30): over 68% + 5 and 133% + 5: ineligible_income."],
  {"p1": {"ma_magi_eligibility_status": "ineligible_income"},
   "p2": {"ma_is_needy_newborn": True, "ma_magi_category": "needy_newborn", "ma_magi_eligibility_status": "eligible"}}),
 ("RV2-DSP", "CO-204", "Filer claims her married daughter of 20, whose husband files and lives in the home (coverage review 2, N-03)", [
  "Coverage review 2 (2026-11-22), promoted from the reviewer's probe RV2-DSP. Determination 2026-11-10; application 2026-11-02.",
  "p1 (filer, 1,500) claims p2 (20, no income); p2's husband p3 (21, filer, 2,500) lives in the home and is not claimed.",
  "p1 (E.1.a): herself and p2; p2's husband is not listed: size 2, 1,500 / 1,803.33 = 83.2% <= 133%: adult, eligible.",
  "  Was {p1, p2, p3}, 4,000 / 2,276.67 = 175.7%, ineligible_income.",
  "p2 (E.1.b): herself, the filer p1, and her own spouse p3 living with her (iv): size 3, 4,000 / (27,320 / 12 = 2,276.67) = 175.7%: ineligible_income.",
  "p3 (E.1.a, E.4): himself and his wife p2: size 2, 2,500 / 1,803.33 = 138.6% > 133% + 5: ineligible_income."],
  {"p1": {"ma_magi_household_members": ["p1", "p2"], "ma_magi_category": "adult", "ma_magi_eligibility_status": "eligible"},
   "p2": {"ma_magi_household_members": ["p1", "p2", "p3"], "ma_magi_eligibility_status": "ineligible_income"},
   "p3": {"ma_magi_household_members": ["p2", "p3"], "ma_magi_eligibility_status": "ineligible_income"}}),
 ("RV2-RC", "CO-205", "Attested income in the disregard band, data source at twice that (coverage review 2, N-04)", [
  "Coverage review 2 (2026-11-22), promoted from the reviewer's probe RV2-RC. Determination 2026-11-10; application 2026-11-02.",
  "p1 (filer, attests 2,615) claims p2 (10): household of 2 for both, 2,615 / 1,803.33 = 145.0%; the data source reports 5,410 = 300.0%.",
  "p1: highest standard 133% (Adults); 145.0 > 133 + 5, so the attestation is above the standard and taken as attested",
  "  (C.2.a.iii, the verification plan): compatible, ineligible_income.",
  "p2: highest standard 142%; 145.0 <= 142 + 5 (the attestation is within the standard after the disregard), and 300.0 > 145.0 x 1.2 = 174.0:",
  "  not reasonably compatible (C.2.a.ii; was compatible). p1, the earner, must document her earnings (C.2.b; CO-1403): was false."],
  {"p1": {"ma_income_is_reasonably_compatible": True, "ma_requires_verification_of_earned_income": True, "ma_magi_eligibility_status": "ineligible_income"},
   "p2": {"ma_income_is_reasonably_compatible": False}}),
]
def val(v):
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, list): return "[" + ", ".join(v) + "]"
    return str(v)
PERSON_SCOPE = {"ma_magi_household_members", "ma_is_needy_newborn"}
res = []
for rid, cid, title, comments, exp in C:
    b = block(rid)
    b = b.replace("- id: %s\n  title: %s\n" % (rid, rid), "- id: %s\n  title: %s\n" % (cid, title) + "".join("  # %s\n" % c for c in comments), 1)
    lines = ["  expect:"]
    for pid, kv in exp.items():
        lines.append("    %s:" % pid)
        for k, v in kv.items():
            if k in PERSON_SCOPE: lines.append("      %s: %s" % (k, val(v)))
            else: lines += ["      %s:" % k, "        2026-11: %s" % val(v)]
    b = b.replace("  expect: {}\n", "\n".join(lines) + "\n")
    assert "- id: %s\n" % cid in b and "expect: {}" not in b
    res.append(b)
open(out, "w").write("".join(res))
print("ok", len(res))

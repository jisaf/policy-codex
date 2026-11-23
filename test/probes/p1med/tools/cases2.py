p = "/home/user/policy-codex/.claude/worktrees/agent-a66e9080eed043276/volumes/co/tests/cases.yaml"
t = open(p, encoding="utf-8").read()

old1 = """  # care and is otherwise financially eligible, so ma_pace_eligible (CO-654)
  # is true; CO-652's case order tests PACE before institutional (an
  # authoring choice per OQ-100, not itself a fix-round item), so the status
  # is eligible_pace rather than eligible_institutional even though p1's
  # actual application is for nursing facility care - a consequence of C-1
  # making her resource-eligible that this fix round surfaces but does not
  # correct (OQ-100/C-18 is next round's problem). MMMNA = 2600 + (1100
  # shelter - 30% of 2600) = 2920, the spouse allowance 2920 - 1180 = 1740,
  # and (per C-3, gated on eligibility, which p1 now has) the patient payment
  # 2030 - 110.36 - 1740 = 179.64 (open-question sweep, OQ-212: the 2026 personal needs allowance
  # 110.36 from HCPF OM 25-073, unverified, replaced the illustrative 75). p2 (community spouse, income 1180, individual
"""
new1 = """  # care and is otherwise financially eligible. She requested nursing facility care
  # (ma_ltc_setting_requested institutional, HCBS fix round B-3), so the status is
  # eligible_institutional. Final verification P3-1 (2026-11-22), the current derivation:
  # MMMNA standard 150% x 21,640 / 12 = 2,705; p2's shelter 2,016 less 30% x 2,705 = 811.50
  # gives an excess shelter allowance of 1,204.50; 2,705 + 1,204.50 = 3,909.50, under the
  # 4,066.50 maximum; p2 states no medical expenses or premiums of her own (8.100.7.Q.2, F-4: 0),
  # so ma_mmmna = 3,909.50 and the spouse allowance 3,909.50 - 1,180 = 2,729.50. The patient
  # payment (gated on eligibility per C-3) starts from 2,030 - 110.36 (OQ-212: the 2026 personal
  # needs allowance from HCPF OM 25-073, unverified) = 1,919.64, no earnings; the spouse allowance
  # 2,729.50 is larger, so the payment is 0 (she states no Part B or Part D premium of her own,
  # OQ-520, and no long-term care insurance). p2 (community spouse, income 1180, individual
"""
assert t.count(old1) == 1
t = t.replace(old1, new1)

old2 = """  # ma_pace_eligible is also true (level of care met, financially eligible),
  # and CO-652's PACE-before-institutional case order (OQ-100) reports
  # eligible_pace rather than eligible_institutional. MMMNA and the spouse
  # allowance are unchanged (2920, 1740); the patient payment, now gated on
  # eligibility per C-3, is 2030 - 110.36 - 1740 = 179.64 (OQ-212: 2026 allowance, unverified). p2 (community spouse) has
  # no patient payment.
"""
new2 = """  # She requested nursing facility care, so the status is eligible_institutional.
  # Final verification P3-1 (2026-11-22), the current derivation, as in CO-01: ma_mmmna =
  # 2,705 + (2,016 - 811.50) = 3,909.50 (no Q.2 amount), the spouse allowance 3,909.50 - 1,180
  # = 2,729.50, larger than 2,030 - 110.36 = 1,919.64, so the patient payment is 0. p2
  # (community spouse) has no patient payment.
"""
assert t.count(old2) == 1
t = t.replace(old2, new2)

old3 = "      # Family planning: p1 has full coverage through long-term care (eligible_pace), p4 and p5 through MAGI;"
new3 = "      # Family planning: p1 has full coverage through long-term care (eligible_institutional), p4 and p5 through MAGI;"
assert t.count(old3) == 1
t = t.replace(old3, new3)
open(p, "w", encoding="utf-8").write(t)
print("ok")

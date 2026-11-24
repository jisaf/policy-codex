p = "/home/user/policy-codex/.claude/worktrees/agent-a66e9080eed043276/volumes/co/tests/cases.yaml"
L = open(p, encoding="utf-8").read().split("\n")


def setline(n, old, new):
    i = n - 1
    assert L[i].strip() == old.strip(), (n, L[i])
    L[i] = new


setline(7442, '      chp_pending_verification_count: {"2026-10": 1}',
        '      chp_pending_verification_count: {"2026-10": 0}  # final verification V-14: CHP+ verification is not_applicable for this adult, not pregnant, so nothing is pending (was 1)')
setline(7016, '      chp_pending_verification_count: {"2027-02": 1}',
        '      chp_pending_verification_count: {"2027-02": 0}  # final verification V-14: CHP+ verification is not_applicable for this adult man, so nothing is pending (was 1)')
setline(1616, '      chp_pending_verification_count: {"2026-10": 1}',
        '      chp_pending_verification_count: {"2026-10": 0}  # final verification V-14: CHP+ verification is not_applicable for p3 (an adult, not pregnant), so nothing is pending (was 1)')
old = ['      ma_verification_status: {"2026-10": pending_reasonable_opportunity}',
       '      ma_pending_verification_count: {"2026-10": 2}',
       '      chp_verification_status: {"2026-10": pending_reasonable_opportunity}',
       '      chp_pending_verification_count: {"2026-10": 2}']
assert L[1782:1786] == old, L[1782:1786]
L[1782:1786] = [
    "      # Final verification V-3: p4's MAGI household is p3, p4 and p5 (p3 claims her); p3's pay stubs are",
    "      # outstanding (DOLE wage data is not verified on receipt), and p3's wages count in p4's household",
    "      # income, so they are owed for p4's determination too: p4's own citizenship and identity (2) plus",
    "      # p3's earned income (1) = 3 (was 2). A non-status element is outstanding within the time allowed",
    "      # (due 2026-10-31), so the status is pending (was pending_reasonable_opportunity), for Medicaid and",
    "      # for CHP+ alike.",
    '      ma_verification_status: {"2026-10": pending}',
    '      ma_pending_verification_count: {"2026-10": 3}',
    '      chp_verification_status: {"2026-10": pending}',
    '      chp_pending_verification_count: {"2026-10": 3}',
]
open(p, "w", encoding="utf-8").write("\n".join(L))
print("ok")

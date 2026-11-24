import yaml, sys
S = "/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/"
root = sys.argv[1]
cs = yaml.safe_load(open(S + "nm/stored.yaml"))
EXP = {
 "CO-185": {"p1": {"ma_ssi_countable_resources": 1500, "ma_ssi_related_category": {"2026-10": "aged"}}},
 "CO-186": {"p1": {"ma_ssi_parental_income_deemed": {"2026-10": 2963.5}, "ma_ssi_countable_income": {"2026-10": 2943.5}, "ma_ssi_countable_resources": 0, "ma_ssi_related_category": {"2026-10": "none"}}},
 "CO-187": {"p1": {"ma_wawd_countable_income": {"2026-10": 1957.5}, "ma_buy_in_category": {"2026-10": "working_adults_with_disabilities"}, "ma_ltc_unmet_requirement": {"2026-10": "none"}, "ma_ltc_eligibility_status": {"2026-10": "eligible_hcbs"}, "ma_asset_transfers_verification_is_pending": {"2026-10": False}}},
 "CO-188": {"p1": {"ma_community_spouse_income_allowance": {"2026-11": 2500}, "ma_ltc_eligibility_status": {"2026-11": "eligible_institutional"}, "ma_patient_payment": {"2026-11": 300, "2026-12": 300}}},
 "CO-189": {"p1": {"ma_ssi_countable_resources": 1000, "ma_ssi_related_category": {"2026-10": "aged"}, "ma_qmb_eligible": {"2026-10": True}}},
}
COM = {
 "CO-185": """  # Coverage round (docs/reviews/coverage-medicaid-nonmagi.md NM-1, NM-2; scratch X-BURIAL and X-FORSALE). p1, 76,
  # single, Social Security 800, Medicare Part A, applied 2026-10-05. Savings 1,000; a revocable burial trust of
  # 2,000 (no interest left in it, no irrevocable burial funds, no life insurance); a 50,000 lot listed with a real
  # estate agent at market value, unsold (the efforts to sell verified).
  # Hand derivation, October 2026:
  # - Burial funds (8.100.5.M.2.j): 1,500 excluded, reduced by no irrevocable funds and no excluded life insurance:
  #   2,000 - 1,500 = 500 counts.
  # - The lot (M.2.b): reasonable efforts to sell have been unsuccessful, so it is not included: 0.
  # - Resources 1,000 + 500 = 1,500, at or under 2,000. Income 800 - 20 = 780, under 994: aged.
  # New case. Before the fix the engine counted 1,000 + 50,000 = 51,000 (the burial trust left out whole, the lot
  # counted whole): none.
""",
 "CO-186": """  # Coverage round (NM-10, OQ-83 resolved; scratch X-DEEM). p1, 10, meets the SSA disability criteria, no income,
  # lives with her mother p2 (41), who earns 8,000 a month, has 1,500 in savings and is not applying for SSI.
  # Hand derivation, October 2026 (8.100.5.H.3; 42 U.S.C. 1382c(f)(2)(A); 20 CFR 416.1165, 416.1202(b)):
  # - No ineligible child in the home: no Ineligible Child Allocation. The mother has no unearned income, so the
  #   whole $20 goes to earnings: (8,000 - 20 - 65) / 2 = 3,957.50; less the Ineligible Parent Allocation for one
  #   parent (the individual FBR, 994): 2,963.50 deemed to p1, the only eligible child.
  # - p1's countable income: 2,963.50 unearned less her own $20: 2,943.50, over 994: none (the SSI-related
  #   groups); the Children's Buy-In is the route for such a child.
  # - Resources: the mother's 1,500 is within her own 2,000 limit, so none is deemed: 0.
  # New case. Before the fix no parental income reached the child: countable income 0, disabled.
""",
 "CO-187": """  # Coverage round (NM-12, NM-13; scratch X-WAWDHCBS). p1, 40, meets the SSA disability criteria, single, no
  # Medicare; wages 4,000 a month; savings 1,000; designated for the EBD waiver (physically disabled) with the level
  # of care; requests HCBS; applied 2026-10-05.
  # Hand derivation, October 2026:
  # - Working Adults Buy-In (8.100.6.P.1.b): (4,000 - 20 - 65) / 2 = 1,957.50, under 450% of the poverty level for one:
  #   working_adults_with_disabilities.
  # - HCBS (8.100.7.B.1.c): a Buy-In member designated for EBD reaches HCBS without the 300% special income group,
  #   whose limit (2,982) her gross 4,000 exceeds, and without the long-term care resource test (P.1.c):
  #   ma_ltc_unmet_requirement none, eligible_hcbs.
  # - B.2.c: the transfer, trust and annuity documents of B.2.a do not apply to a Buy-In member: no asset transfer
  #   verification is pending.
  # New case. Before the fix: ineligible_income, and the asset transfer documents pending.
""",
 "CO-188": """  # Coverage round (NM-15; scratch X-COURT). CO-112's couple, with a court order that Robert (p1) pay Linda (p2)
  # 2,500 a month for her support (no court-ordered transfer of resources). Determined 2026-11-01.
  # Hand derivation (CO-112 for the figures):
  # - Monthly income allowance (8.100.7.R.2-3): MMMNA 3,571.40 - her income 1,900 = 1,671.40, but "not less than
  #   the monthly amount ordered by the court": 2,500.
  # - Patient payment, November: 2,489.64 (after the personal needs allowance) - (2,500 + 60 tax + 202.90 Part B
  #   + 40 Part D) is below zero: 0; plus the long-term care insurance 300: 300. December (no Part B deduction):
  #   2,489.64 - 2,600 is below zero: 0 + 300 = 300.
  # - Resources and income as in CO-112: eligible_institutional.
  # New case. Before the fix the allowance was 1,671.40 and the November payment 815.34.
""",
 "CO-189": """  # Coverage round (NM-3; scratch X-IRA). p1, 76, Social Security 800, Medicare Part A, savings 1,000; lives with
  # his wife p2, 60, who has no income, is not applying and holds a 40,000 IRA. Applied 2026-10-05.
  # Hand derivation, October 2026:
  # - Resources (8.100.5.N.3): the IRA in the name of the spouse living with him is exempt for him: 1,000, at or
  #   under the couple's 3,000 (and the MSP couple limit).
  # - Income: the couple's 800 - 20 = 780, under the couple FBR (1,491): aged; and at or under 100% of the poverty
  #   level for two (1,803.33): QMB eligible.
  # New case. Before the fix the couple's resources were 41,000: none, and not QMB.
""",
}
text = ""
for c in cs:
    c["expect"] = EXP[c["id"]]
    t = yaml.safe_dump([c], sort_keys=False, allow_unicode=True, width=200)
    lines = t.split("\n")
    # insert the comment after the title line
    i = [k for k, l in enumerate(lines) if l.startswith("  title:")][0]
    lines.insert(i + 1, COM[c["id"]].rstrip("\n"))
    text += "\n".join(lines)
p = root + "/volumes/co/tests/cases.yaml"
s = open(p, encoding="utf-8").read().rstrip("\n") + "\n"
open(p, "w", encoding="utf-8").write(s + text)
print("ok")

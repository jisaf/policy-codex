import sys
src = open(sys.argv[1]).read()
dst = sys.argv[2]


def block(pid, nxt):
    i = src.index('- id: %s\n' % pid)
    j = src.index('- id: %s\n' % nxt) if nxt else len(src)
    return src[i:j]


hdr1 = """- id: CO-224
  title: 'Coverage pass 3 (LEAP): $2,000 of wages and $2,000 of Social Security disability income, $400 of it set aside under a PASS'
  # Coverage review 3 F3-1 (probe PR3-L1). 9 CCR 2503-7 3.752.23.DD (S3300): "Income that is deemed necessary for the
  # fulfillment of a Plan for Achieving Self-Support (PASS) under Title XVI of the Social Security Act." One adult applies for
  # LEAP on November 10, 2026, paying a vendor for heat, no pay schedule stated. The PASS set-aside is part of the SSDI
  # (pass_set_aside_income, CO-3825: part of "the fact that names the source").
  # Hand derivation (November 2026):
  #   unearned_income_prior_thirty_days (CO-3913, monthly fallback) = 0 (Social Security is not part of it)
  #   leap_excluded_source_receipts (CO-4961) = 0; leap_excluded_receipts_in_lump_sum (CO-4962) = 0
  #   leap_excluded_unearned_income (CO-4511) = 0 - min(0, ...) + 400 (PASS) + 0 (AmeriCorps) = 400
  #   leap_person_unearned_income (CO-3926) = max(0, 0 + floor(2,000) - 400) + 0 + 0 + 0 + 0 (CO-4069) = 1,600
  #   leap_person_wages (CO-3925) = 2,000; leap_household_income (CO-1002) = 3,600
  #   limit for 1 (CO-875) 3,774: leap_is_eligible true.
  # Before the fix: CO-3926 subtracted the 400 from CO-3913 (0) and lost it to the clamp: 2,000 + 2,000 = 4,000, ineligible.
"""
hdr3 = """- id: CO-225
  title: 'Coverage pass 3 (LEAP): $2,500 of wages, $900 of child support and a $3,000 one-time crime victim compensation payment stated also as a lump sum'
  # Coverage review 3 F3-2 (probe PR3-L3). 9 CCR 2503-7 3.752.23.G (S3300): "Compensation received by the applicant or
  # recipient pursuant to the Colorado Crime Victims Compensation Act shall not be considered as income". One adult applies on
  # November 10, 2026, paying a vendor for heat. The $3,000 compensation is one payment, so the case states it as
  # crime_victim_compensation_received (CO-3813), as lump_sum_received (CO-3367, "a similar one-time payment") and as the
  # thirty days' lump sum (CO-4066); all are part of other_unearned_income_nontaxable 3,000.
  # Hand derivation (November 2026):
  #   unearned_income_prior_thirty_days (CO-3913) = 900 + 3,000 - 3,000 (lump sum, its own fact) = 900
  #   leap_excluded_source_receipts (CO-4961) = 3,000
  #   leap_excluded_receipts_in_lump_sum (CO-4962): thirty-day lump sum less its other parts = 3,000; CO-4508 and CO-4960
  #     not stated, so AA part = min(0, 3,000) = 0 and the other part = min(3,000 - 0, 3,000 - 0) = 3,000; min(3,000, 3,000) = 3,000
  #   leap_excluded_unearned_income (CO-4511) = 3,000 - min(3,000, min(3,000, 3,000)) + 0 + 0 = 0
  #   leap_person_one_time_income (CO-4069) = 0 (prizes) + max(0, 3,000 - 3,000) = 0
  #   leap_person_unearned_income (CO-3926) = max(0, 900 + 0 - 0) + 0 + 0 + 0 + 0 = 900
  #   leap_person_wages (CO-3925) = 2,500; leap_household_income (CO-1002) = 3,400 <= 3,774: leap_is_eligible true.
  # Before the fix: CO-4511 subtracted the 3,000 from the 900 of child support (clamped to 0) and CO-4069 counted the 3,000:
  # 2,500 + 0 + 3,000 = 5,500, ineligible.
"""
exp1 = """  expect:
    p1:
      leap_excluded_unearned_income: {"2026-11": 400}
      leap_person_unearned_income: {"2026-11": 1600}
      leap_household_income: {"2026-11": 3600}
      leap_is_eligible: {"2026-11": true}
"""
exp3 = """  expect:
    p1:
      leap_excluded_unearned_income: {"2026-11": 0}
      leap_person_one_time_income: {"2026-11": 0}
      leap_person_unearned_income: {"2026-11": 900}
      leap_household_income: {"2026-11": 3400}
      leap_is_eligible: {"2026-11": true}
"""


def make(b, hdr, exp):
    lines = b.split('\n')
    # drop "- id" and "title" lines
    assert lines[0].startswith('- id:') and lines[1].startswith('  title:')
    body = '\n'.join(lines[2:])
    assert body.rstrip().endswith('expect: {}')
    body = body.rstrip()[:-len('  expect: {}')]
    body = body.replace("    p2:\n      facts:", "    p2:\n      # A relative who lives elsewhere (another dwelling): stated so p1's relationships are known.\n      facts:")
    return hdr + body + exp


out = make(block('PR3-L1', 'PR3-L2'), hdr1, exp1) + make(block('PR3-L3', 'PR3-L4'), hdr3, exp3)
s = open(dst).read()
if not s.endswith('\n'):
    s += '\n'
open(dst, 'w').write(s + out)
print('ok')

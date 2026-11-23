import re
P = '/home/user/policy-codex/.claude/worktrees/agent-af3848ce62c58dc88/volumes/co/tests/cases.yaml'
s = open(P).read()
assert '- id: CO-206\n' not in s
m = re.search(r'^- id: CO-160\n.*?(?=^- id: )', s, flags=re.S | re.M)
base = m.group(0)
# body = from "  as_of" up to "  expect:" (exclusive)
body = base[base.index('  as_of:'):base.index('  expect:')]

def sub(t, old, new, count=1):
    assert t.count(old) >= count, old
    return t.replace(old, new, count)

# ---- CO-206 (ZT-1)
b1 = body
b1 = sub(b1, '        other_unearned_income_taxable: 0\n', '        other_unearned_income_taxable: 400\n        room_only_payments_received: 400\n')
c206 = '''- id: CO-206
  title: "Colorado Works coverage pass 3 CW3-1: a lodger's $400 room-only payment is earned income"
  # Probe ZT-1 of docs/reviews/coverage3-colorado-works.md, built on CO-160: p1, 16, emancipated, lives alone with her
  # baby p2 and lets a room to a lodger for $400 a month, lodging only, with no documented costs of the room. The payment
  # is rent in other_unearned_income_taxable, and room_only_payments_received states it as part of that fact.
  # 9 CCR 2503-6 3.605.2.E.4.d (S3159): a room-only payment is earned income to the extent it exceeds the documented
  # costs of the room, here 0, so earned income is 400 and unearned income 400 - 400 = 0 (CO-4369 takes it out).
  # Eligibility: 400 - 90 (3.606.2.A.1) = 310 < 331, the One Caretaker need standard with one child: eligible.
  # Payment: 100% of earned income is disregarded in the first certification period, so the payment counts 0 and the
  # grant is 488; October 12 application, 20 days, .65754 x 488 = 320.88, cents dropped = 320.
  # Before the fix the payment could only be stated as rent: unearned 400 >= 331, ineligible_income, 0.
'''
c206 += b1 + '''  expect:
    p1:
      cw_gross_earned_income: {2026-10: 400}
      cw_countable_unearned_income: {2026-10: 0}
      cw_countable_income: {2026-10: 310}
      cw_payment_countable_income: {2026-10: 0}
      cw_eligibility_status: {2026-10: eligible}
      cw_grant_amount: {2026-10: 320}
    p2:
      cw_eligibility_status: {2026-10: eligible}
      cw_grant_amount: {2026-10: 320}

'''
# ---- CO-207 (ZT-4)
b2 = body
b2 = sub(b2, '        is_emancipated_minor: true\n', '        is_emancipated_minor: false\n')
b2 = sub(b2, '        cw_is_serving_ipv_disqualification: false\n', '        cw_is_serving_ipv_disqualification: true\n')
b2 = sub(b2, '        date_of_birth: "2010-03-01"\n', '        date_of_birth: "1990-03-01"\n')
b2 = sub(b2, '        wages_gross: 0\n', '        wages_gross: 1500\n')
c207 = '''- id: CO-207
  title: "Colorado Works coverage pass 3 CW3-2: a disqualified mother whose unit is over income anyway is not barred from Adult Financial"
  # Probe ZT-4 of docs/reviews/coverage3-colorado-works.md, built on CO-160: p1, 36, is serving a Colorado Works
  # intentional program violation disqualification (3.604.2.M.2) and earns $1,500 a month; her baby p2 is the rest of
  # the unit. p1 is ineligible_disqualified, removed from the unit's size, and her income is counted without disregards
  # (3.604.2.M): 1,500 against the No Caretaker need standard for one child, so p2 is ineligible_income.
  # 9 CCR 2503-5 3.520.71.F.2.c (S1011) ends the Adult Financial bar once the client "is found otherwise ineligible for
  # TANF/Colorado Works benefits": the unit fails the income test, so cw_unit_otherwise_eligible is false and
  # af_barred_by_colorado_works is false. Before the fix it was true (the status alone barred her).
'''
c207 += b2 + '''  expect:
    p1:
      cw_eligibility_status: {2026-10: ineligible_disqualified}
      cw_countable_income: {2026-10: 1500}
      cw_unit_otherwise_eligible: {2026-10: false}
      af_barred_by_colorado_works: {2026-10: false}
    p2:
      cw_eligibility_status: {2026-10: ineligible_income}
      cw_grant_amount: {2026-10: 0}

'''
# ---- CO-208 (ZT-7)
b3 = body
b3 = sub(b3, '    cw_application_date: "2026-10-12"\n', '    cw_application_date: "2026-09-25"\n    cw_unit_eligible_from_date: "2026-10-03"\n')
c208 = '''- id: CO-208
  title: "Colorado Works coverage pass 3 CW3-3: a unit that became eligible in the month after it applied is paid nothing for the application month"
  # Probe ZT-7 of docs/reviews/coverage3-colorado-works.md, built on CO-160 (One Caretaker, one child, no income, grant
  # standard 488): the application is dated September 25, and the county found the unit ineligible on that date but
  # eligible from October 3, before the determination. 9 CCR 2503-6 3.609.2.A.1 (S3156): "the initial payment shall
  # include assistance beginning with the date on which the assistance unit became eligible". September: nothing
  # (factor 0, grant 0; before the fix the factor was 1 and September paid 488). October: October 3 to 31 is 29 days,
  # .95342 x 488 = 465.27, cents dropped = 465 (unchanged).
'''
c208 += b3 + '''  expect:
    p1:
      cw_partial_month_payment_factor: {2026-09: 0, 2026-10: 0.95342}
      cw_eligibility_status: {2026-09: eligible, 2026-10: eligible}
      cw_grant_amount: {2026-09: 0, 2026-10: 465}
    p2:
      cw_grant_amount: {2026-09: 0, 2026-10: 465}

'''
# append after CO-191's block? append at end of file, keep trailing format
if not s.endswith('\n'):
    s += '\n'
s += '\n' + c206 + c207 + c208.rstrip('\n') + '\n'
open(P, 'w').write(s)
print('ok')

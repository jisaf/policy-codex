import json, yaml
D = '/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cccapfix/'
cases = json.load(open(D + 'cases_new.json'))
com = json.load(open(D + 'cases_comments.json'))
deriv = {
    'CO-170': [
        'Activity (3.111.D.1.c.3): p1 is in the home and works ($2,000 / 120 h = $16.67 an hour, at least $7.25); p2 is not in an activity',
        'but is incapacitated, which excuses him because another caretaker in the home is in an activity (before the fix two incapacitated',
        'caretakers, RV-A1, were also eligible; now ineligible_activity). Household of 3, income $2,000. Entry limit 185% x $27,320 / 12 =',
        '185% x $2,276.67 = $4,211.84: eligible_low_income. Fee (3.124.P): $2,000 is under the guideline, 1% x $2,000 = $20.',
        'Verification (C.2.g, F-21): p2\'s incapacity has no physician\'s statement yet, an element pending until the due date,',
        'November 10 + 15 days = November 25, 2026: pending (before the fix the incapacity fact meant a verified one and no element existed).',
    ],
    'CO-171': [
        'Unearned income: the $1,500 foster care payment is excluded (J.10; cccap_excluded_unearned_receipts); the $300 from the boarder',
        'counts (I.18; cccap_other_countable_receipts). Household income $2,000 + $300 = $2,300 (before the fix: $2,000 + $1,500 = $3,500,',
        'ineligible_income, with the boarder dropped). Household of 2: entry limit 185% x $1,803.33 = $3,336.16; $2,300 is under it.',
        'Fee: 1% x $1,803.33 = $18.03, plus 15% x ($2,300 - $1,803.33) = $74.50; $92.53, cents dropped: $92.',
    ],
    'CO-172': [
        'Residency (3.111.A, 3.125.GG): at a change during the period a move to another Colorado county keeps the household eligible until',
        'its redetermination; cccap_meets_county_residency is true (before the fix: false, status ineligible). Eligible child (3.114.B.1,',
        '3.125.Q): p3 was authorized at the last determination, so the age limit is applied at the redetermination, not now (before the',
        'fix: ineligible_child). Exit limit (H.1.b, a household already receiving care): $2,000 is under 85% of state median income.',
        'Fee: 1% x $1,803.33 = $18.03 + 15% x $196.67 = $29.50; $47.53, cents dropped $47, under the $60 cap (3.124.C): $47.',
    ],
    'CO-173': [
        'Colorado Works Child Care (3.116.A) is tested on the household\'s caretakers: p1 receives basic cash assistance, is work eligible',
        'and is referred, so the household, p3 included, is eligible_colorado_works (before the fix p3 read his own Colorado Works facts and',
        'was ineligible_activity). Fee: none for a Colorado Works household in an unpaid activity (3.124.I.3): $0.',
    ],
    'CO-174': [
        'Household (3.111.D.2): p2 contributes financially to p3\'s welfare, so he is an adult caretaker and a member; household of 3 (before',
        'the fix p2 was not a member: household of 2, income $2,000, fee $47). Both are in an activity (p2: $1,500 / 100 h = $15 an hour).',
        'Income $2,000 + $1,500 = $3,500. Entry limit 185% x $2,276.67 = $4,211.84: eligible_low_income. Fee: 1% x $2,276.67 = $22.77,',
        'plus 15% x ($3,500 - $2,276.67) = $183.50; $206.27, cents dropped: $206. Had p2 not worked (RV-N1), the household would be',
        'ineligible_activity (3.111.D.4: every caretaker in the home must be in an activity).',
    ],
}
out = []
for c in cases:
    y = yaml.safe_dump([c], sort_keys=False, default_flow_style=False, allow_unicode=True, width=1000)
    lines = y.rstrip('\n').split('\n')
    i = next(k for k, l in enumerate(lines) if l.startswith('  title:'))
    lines[i + 1:i + 1] = ['  # ' + t for t in com[c['id']]]
    j = next(k for k, l in enumerate(lines) if l == '  expect:')
    lines[j + 1:j + 1] = ['    # ' + t for t in deriv[c['id']]]
    out.append('\n'.join(lines))
P = '/home/user/policy-codex/.claude/worktrees/agent-a2cadfae7e8577c94/volumes/co/tests/cases.yaml'
s = open(P, encoding='utf-8').read()
assert '- id: CO-170\n' not in s
open(P, 'w', encoding='utf-8').write(s.rstrip('\n') + '\n' + '\n'.join(out) + '\n')
print(out[1][:1500])

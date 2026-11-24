import sys, yaml, copy
sys.path.insert(0, '/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/gen')
from mk import person, case

H = {'dwelling_id': 'h1', 'is_claimed_by_filer_outside_case': False}
def P(dob, f=None, m=None, **kw):
    ff = dict(H); ff.update(f or {}); return person(dob, ff, m, **kw)

out = []

def emit(c, header, expect_text):
    body = yaml.safe_dump([c], sort_keys=False, width=200)
    lines = body.rstrip('\n').split('\n')
    # insert the header comment after the title line
    res = []
    for ln in lines:
        res.append(ln)
        if ln.startswith('  title:'):
            for h in header:
                res.append('  # ' + h)
    out.append('\n'.join(res) + '\n' + expect_text.rstrip('\n') + '\n')

# CO-180: RV-GM
c = case('CO-180', 'Non-filer mother with a 17-year-old daughter and the daughter\'s baby (coverage round F-01)',
 {'p1': P('1980-03-01', {}, {'wages_gross': 2800}),
  'p2': P('2009-05-01'),
  'p3': P('2025-06-01', {'sex': 'male'})},
 [['parent', 'p1', 'p2'], ['parent', 'p2', 'p3']])
emit(c, ['Coverage round (2026-11-22), promoted from the reviewer\'s probe RV-GM. Determination 2026-11-10; application 2026-11-02.',
         'Nobody files or is claimed, so each household is a non-filer household (10 CCR 2505-10 § 8.100.4.E.1.d).',
         'p1: herself and her child under 19 (p2); p2\'s baby p3 is p1\'s grandchild, not listed in E.1.d (was reached through p2 before F-01).',
         '  2,800 / (21,640 / 12 = 1,803.33) = 155.3%; less the 5-point disregard 150.3% > 133% (adult) and > 68% (parent): ineligible_income.',
         'p2 (17): herself, her child p3, her parent p1: size 3; income p1\'s 2,800 (p2 and p3 have none): 2,800 / (27,320 / 12 = 2,276.67) = 123.0% <= 142%: child.',
         'p3: himself and his parent p2 (his grandmother is not his parent): size 2, income 0: child.'],
"""  expect:
    p1:
      ma_magi_household_members: [p1, p2]
      ma_magi_household_size: 2
      ma_magi_household_income: {"2026-11": 2800}
      ma_magi_category: {"2026-11": none}
      ma_magi_eligibility_status: {"2026-11": ineligible_income}
    p2:
      ma_magi_household_members: [p1, p2, p3]
      ma_magi_household_size: 3
      ma_magi_household_income: {"2026-11": 2800}
      ma_magi_category: {"2026-11": child}
      ma_magi_eligibility_status: {"2026-11": eligible}
    p3:
      ma_magi_household_members: [p2, p3]
      ma_magi_household_size: 2
      ma_magi_household_income: {"2026-11": 0}
      ma_magi_category: {"2026-11": child}
      ma_magi_eligibility_status: {"2026-11": eligible}
""")

# CO-181: RV-SPA
c = case('CO-181', 'Tax filer whose husband lives in another home and files separately (coverage round F-02)',
 {'p1': P('1990-02-01', {'is_tax_filer': True, 'is_required_to_file_tax_return': True}, {'wages_gross': 1200}),
  'p2': P('1988-02-01', {'sex': 'male', 'is_tax_filer': True, 'is_required_to_file_tax_return': True, 'dwelling_id': 'h2'}, {'wages_gross': 5000})},
 [['spouse', 'p1', 'p2']])
emit(c, ['Coverage round (2026-11-22), promoted from the reviewer\'s probe RV-SPA. Determination 2026-11-10.',
         'E.1.a.ii takes the filer\'s spouse "if living in the home"; p1 lives in h1 and p2 in h2, so each household is the filer alone.',
         'p1: 1,200 / (15,960 / 12 = 1,330) = 90.2% <= 133%: adult (was {p1, p2}, 6,200 / 1,803.33 = 343.8%, ineligible_income).',
         'p2: 5,000 / 1,330 = 375.9%, less 5 = 370.9% > 133%: ineligible_income.'],
"""  expect:
    p1:
      ma_magi_household_members: [p1]
      ma_magi_household_size: 1
      ma_magi_household_income: {"2026-11": 1200}
      ma_magi_category: {"2026-11": adult}
      ma_magi_eligibility_status: {"2026-11": eligible}
    p2:
      ma_magi_household_members: [p2]
      ma_magi_household_size: 1
      ma_magi_household_income: {"2026-11": 5000}
      ma_magi_category: {"2026-11": none}
      ma_magi_eligibility_status: {"2026-11": ineligible_income}
""")

# CO-182: RV-SE with the annual facts
months = {f'2026-{m:02d}': {'self_employment_net_earnings_for_tax': (3000 if m == 11 else 818)} for m in range(1, 13)}
c = case('CO-182', 'Self-employed adult with a high month: annualized income and the premium tax credit test (coverage round F-04, F-05)',
 {'p1': P('1985-02-01', {'is_tax_filer': True, 'is_required_to_file_tax_return': True,
        'expected_annual_income': 11998, 'has_self_employment_seasonal_or_commission_earnings': True},
        {'self_employment_net_earnings_for_tax': 818}, months=months)}, [])
emit(c, ['Coverage round (2026-11-22), promoted from the reviewer\'s probe RV-SE with the annual facts stated. Determination 2026-11-10.',
         'Net self-employment 3,000 in November and 818 in each other month of 2026; she expects 11,998 for the year (11 x 818 + 3,000).',
         'November on the month: 3,000 / (15,960 / 12 = 1,330) = 225.6%, ineligible. C.4.a: a twelfth of 11,998 = 999.83, rounded 1,000;',
         '  1,000 / 1,330 = 75.2% (ma_budget_period_household_income_pct_fpl). C.5: 11,998 / 15,650 (the 2025 guideline for one, in force',
         '  on November 1, 2025) = 76.7% < 100%; the lower figure, 75.2%, is the household ratio: <= 133%, adult, eligible.',
         'October: 818 on the month (61.5%) is below the annualized 1,000, so the month\'s figure stands: adult.'],
"""  expect:
    p1:
      ma_magi_household_income: {"2026-11": 3000, "2026-10": 818}
      ma_annualized_household_income: {"2026-11": 1000, "2026-10": 1000}
      ma_premium_tax_credit_household_income_pct_fpl: 0.7666453674121406
      ma_meets_premium_tax_credit_income_test: true
      ma_magi_category: {"2026-11": adult, "2026-10": adult}
      ma_magi_eligibility_status: {"2026-11": eligible}
""")

# CO-183: RV-SP
c = case('CO-183', 'Sponsored lawful permanent resident past the five-year bar, sponsor in another home (coverage round F-03)',
 {'p1': P('1980-02-01', {'is_tax_filer': True, 'is_required_to_file_tax_return': True, 'immigration_status': 'lawful_permanent_resident',
        'qualified_status_date': '2019-03-01', 'us_entry_date': '2019-03-01', 'is_sponsored_non_citizen': True, 'qualifying_quarters': 8},
        {'wages_gross': 1000}),
  'p2': P('1975-05-01', {'sex': 'male', 'is_tax_filer': True, 'is_required_to_file_tax_return': True, 'dwelling_id': 'h2'}, {'wages_gross': 4000})},
 [['sponsor', 'p2', 'p1']])
emit(c, ['Coverage round (2026-11-22). Determination 2026-11-10. p1 has been a lawful permanent resident since 2019-03-01 (past the five-year',
         '  bar), has 8 qualifying quarters and is not pregnant; her brother p2 signed her I-864 and lives in another home.',
         '§ 8.100.3.K.1: p2\'s MAGI income, 4,000, counts to p1 (ma_sponsor_deemed_income). p1: 1,000 + 4,000 = 5,000 / 1,330 = 375.9%:',
         '  ineligible_income (without K.1, 1,000 / 1,330 = 75.2% would be adult, eligible). p2 is a citizen with no sponsor: his own 4,000.'],
"""  expect:
    p1:
      ma_sponsor_deemed_income: {"2026-11": 4000}
      ma_magi_household_income: {"2026-11": 5000}
      ma_magi_category: {"2026-11": none}
      ma_magi_eligibility_status: {"2026-11": ineligible_income}
    p2:
      ma_sponsor_deemed_income: {"2026-11": 0}
      ma_magi_household_income: {"2026-11": 4000}
""")

# CO-184: RV-PP mother only expectations
c = case('CO-184', 'CHP+ prenatal enrollee in her postpartum months, with her newborn (coverage round F-08)',
 {'p1': P('1995-02-01', {'is_tax_filer': True, 'is_required_to_file_tax_return': True, 'pregnancy_end_date': '2026-08-10',
        'pregnancy_start_date': '2025-11-10', 'chp_eligibility_period_start_month': '2026-03', 'ma_application_date': '2026-03-05',
        'chp_service_type': 'office_visit', 'ma_prior_enrollment_category': 'none'}, {'wages_gross': 4000}),
  'p2': P('2026-08-10', {'sex': 'male', 'mother_coverage_at_birth': 'chp', 'ma_custodial_parent': 'p1', 'chp_service_type': 'office_visit', 'ma_application_date': '2026-03-05'})},
 [['parent', 'p1', 'p2'], ['tax_filer', 'p1', 'p2'], ['gave_birth_to', 'p1', 'p2']])
c['case_facts'] = {'chp_family_cost_sharing_paid_for_year': 0}
emit(c, ['Coverage round (2026-11-22), promoted from the reviewer\'s probe RV-PP. Determination 2026-11-10.',
         'p1\'s CHP+ prenatal span began 2026-03; she delivered 2026-08-10. Household {p1, p2}: 4,000 / (21,640 / 12 = 1,803.33) = 221.8%,',
         '  over 195% (Medicaid pregnant) and past the pregnancy, so Medicaid: none, ineligible_income. 10 CCR 2505-3 § 430.3 keeps the span',
         '  through the twelfth month after the birth: eligible_prenatal in November. § 330.4 exempts Prenatal Care Program clients from',
         '  cost sharing: exempt, and the November office visit copayment is $0 (was $10 before F-08). Only p1\'s results are expected.'],
"""  expect:
    p1:
      chp_is_in_prenatal_coverage_period: {"2026-11": true}
      chp_eligibility_status: {"2026-11": eligible_prenatal}
      chp_is_exempt_from_cost_sharing: {"2026-11": true}
      chp_copayment: 0
      ma_magi_eligibility_status: {"2026-11": ineligible_income}
""")

open('/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/covfix/cases-new.yaml', 'w').write(''.join(out))
print(len(out))

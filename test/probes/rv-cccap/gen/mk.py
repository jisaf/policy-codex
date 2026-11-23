import yaml, copy, sys
path = sys.argv[1]
cases = yaml.safe_load(open(path))
base = next(c for c in cases if c['id'] == 'CO-125')
def mk(cid, title):
    c = copy.deepcopy(base); c['id'] = cid; c['title'] = title; c['expect'] = {}
    return c
out = []

# S1: protective services, placed child with SS survivor benefit unverified; day 31 after request
c = mk('RV-S1', 'PS household: child income unverified on day 31 (3.119.B: 60 days)')
c['case_facts']['is_protective_services_child_care_case'] = True
c['case_facts']['cccap_determination_type'] = 'application'
c['relationships'] = [['parent', 'p1', 'p3']]
del c['persons']['p2']; del c['persons']['p4']
p1 = c['persons']['p1']['facts']; p3 = c['persons']['p3']['facts']
for f in (p1, p3):
    f['verification_request_date'] = '2026-10-01'
    f['residency_verification_document_received'] = True
    f['cccap_eligible_activity_verification_document_received'] = True
    f['earned_income_verification_document_received'] = True
    f['unearned_income_is_verified'] = True
    f['citizenship_attestation_is_questionable'] = False
    f['child_support_paid_is_verified'] = True
p3['unearned_income_is_verified'] = False
c['persons']['p3']['month_defaults']['social_security_income'] = 300
c['persons']['p1']['month_defaults']['child_support_paid_legally_obligated'] = 0
c['persons']['p1']['month_defaults']['child_support_paid_toward_arrears'] = 0
out.append(c)

# S2: CCCAP self-employed mother, costs claimed without receipts or other verification
c = mk('RV-S2', 'CCCAP self-employment costs not verified (3.111.G.2.a, I.2)')
c['case_facts']['cccap_determination_type'] = 'application'
c['relationships'] = [['parent', 'p1', 'p3']]
del c['persons']['p2']; del c['persons']['p4']
p1 = c['persons']['p1']
del p1['facts']['wages_gross_received_prior_thirty_days']
p1['month_defaults'].update(wages_gross=0, hours_worked=100, self_employment_gross_receipts=5000,
    self_employment_operating_costs=3000, child_support_paid_legally_obligated=0, child_support_paid_toward_arrears=0)
p1['facts']['self_employment_cost_receipts_received'] = False
out.append(c)

# S4: LEAP application 2026-11-05; a $5,000 lottery win on October 20 is in the income verification period
c = mk('RV-S4', 'LEAP: a prize received in the income verification period but in the prior calendar month (3.752.22.A)')
c['case_facts']['leap_application_date'] = '2026-11-05'
c['as_of'] = '2026-11-05'
c['persons']['p4']['months'] = {'2026-10': {'lottery_gambling_winnings_received': 5000}, '2026-11': {'lottery_gambling_winnings_received': 0}}
out.append(c)

# S5: maternity leave at application, single mother
c = mk('RV-S5', 'CCCAP: mother on verified maternity leave at application (3.111.D.8)')
c['case_facts']['cccap_determination_type'] = 'application'
c['relationships'] = [['parent', 'p1', 'p3']]
del c['persons']['p2']; del c['persons']['p4']
p1 = c['persons']['p1']
p1['facts']['wages_gross_received_prior_thirty_days'] = 0
p1['facts']['temporary_activity_break_reason'] = 'maternity_paternity_leave'
p1['month_defaults'].update(wages_gross=0, hours_worked=0, child_support_paid_legally_obligated=0, child_support_paid_toward_arrears=0)
out.append(c)

# S6: transition from Colorado Works with unearned income: fee on full income, no cap (3.117.F, 3.124.C)
c = mk('RV-S6', 'CCCAP transition from Colorado Works; child support received; fee')
c['case_facts']['cccap_determination_type'] = 'transition_from_colorado_works'
c['relationships'] = [['parent', 'p1', 'p3']]
del c['persons']['p2']; del c['persons']['p4']
p1 = c['persons']['p1']
p1['facts']['wages_gross_received_prior_thirty_days'] = 2000
p1['month_defaults'].update(child_support_received=600, child_support_paid_legally_obligated=0, child_support_paid_toward_arrears=0)
out.append(c)

# S7: homeless stabilization, no activity
c = mk('RV-S7', 'CCCAP: homeless mother in stabilization period, no activity, day 31 after request')
c['case_facts']['cccap_determination_type'] = 'application'
c['relationships'] = [['parent', 'p1', 'p3']]
del c['persons']['p2']; del c['persons']['p4']
for pid in ('p1', 'p3'):
    c['persons'][pid]['facts']['nighttime_residence_type'] = 'emergency_or_transitional_shelter'
    c['persons'][pid]['facts']['verification_request_date'] = '2026-10-01'
    c['persons'][pid]['facts']['citizenship_attestation_is_questionable'] = False
    c['persons'][pid]['facts']['unearned_income_is_verified'] = True
    c['persons'][pid]['facts']['earned_income_verification_document_received'] = False
    c['persons'][pid]['facts']['cccap_eligible_activity_verification_document_received'] = False
    c['persons'][pid]['facts']['residency_verification_document_received'] = False
    c['persons'][pid]['month_defaults']['cccap_is_in_homelessness_stabilization_period'] = True
p1 = c['persons']['p1']
p1['facts']['wages_gross_received_prior_thirty_days'] = 0
p1['month_defaults'].update(wages_gross=0, hours_worked=0, child_support_paid_legally_obligated=0, child_support_paid_toward_arrears=0)
out.append(c)

cases.extend(out)
yaml.safe_dump(cases, open(path, 'w'), sort_keys=False, allow_unicode=True, width=1000)
print('added', [c['id'] for c in out])

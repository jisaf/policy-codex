import copy, json, yaml
D = '/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cccapfix/'
P = {c['id']: c for f in ('probes.json', 'probes2.json', 'probes3.json', 'probes4.json') for c in json.load(open(D + f))}
M = '2026-11'


def build(src, cid, title):
    c = copy.deepcopy(P[src])
    c['id'] = cid
    c['title'] = title
    c['expect'] = {}
    return c


def ex(c, pid, **kv):
    e = c['expect'].setdefault(pid, {})
    for k, v in kv.items():
        e[k] = v if k in ('cccap_is_adult_caretaker',) else {M: v}


cases = []
comments = {}

# CO-170: F-03 / F-21
c = build('RV-O', 'CO-170', 'Coverage round (CCCAP): two parents; the mother works, the father is incapacitated and his physician\'s statement has not come in')
for p in ('p1', 'p2', 'p3'):
    c['persons'][p]['facts']['verification_request_date'] = '2026-11-10'
c['persons']['p2']['facts']['sex'] = 'male'
for p in ('p1', 'p2', 'p3'):
    ex(c, p, cccap_household_caretakers_in_eligible_activity=True, cccap_eligibility_status='eligible_low_income', cccap_household_income=2000, cccap_parent_fee=20, cccap_verification_status='pending')
ex(c, 'p2', cccap_incapacity_verification_is_pending=True)
comments['CO-170'] = [
    'Coverage round F-03 and F-21 (probes RV-A1, RV-A2, RV-O). 8 CCR 1403-1 3.111.D.1.c.3, E; C.2.g. p1 (38) works 120 hours for $2,000;',
    'p2 (40), her husband and the father of p3 (6), is incapacitated (stated) and does not work; the county asked for documents on',
    'November 10, 2026 and his physician\'s statement has not come in. Application in Denver, determined November 15, 2026.',
]
cases.append(c)

# CO-171: F-07 / F-08
c = build('RV-E', 'CO-171', 'Coverage round (CCCAP): a kin foster mother with her own son: wages, a foster care payment and a boarder')
c['persons']['p1']['month_defaults'].update({'room_and_board_payments_received': 300})
c['persons']['p1']['facts']['unearned_income_verification_document_received'] = True
for p in ('p1', 'p3'):
    ex(c, p, cccap_household_income=2300, cccap_eligibility_status='eligible_low_income', cccap_parent_fee=92)
ex(c, 'p1', cccap_excluded_unearned_receipts=1500, cccap_other_countable_receipts=300, cccap_person_unearned_income=300)
comments['CO-171'] = [
    'Coverage round F-07 and F-08 (probes RV-E, RV-F). 8 CCR 1403-1 3.111.I.18, J.10. p1 (38) earns $2,000 in 120 hours, receives a',
    '$1,500 county foster care payment for a related child placed with her (stated in her other non-taxable unearned income and in',
    'foster_care_provider_payments_received; the placed child is not a person of this case and no care is asked for him), and $300 a',
    'month from a boarder. She applies for care for her son p3 (6) in Denver; determined November 15, 2026.',
]
cases.append(c)

# CO-172: F-05 / F-06
c = build('RV-D2', 'CO-172', 'Coverage round (CCCAP): a change during the period: the family moved from Denver to Arapahoe and the only child turned thirteen')
for p in ('p1', 'p3'):
    c['persons'][p]['facts']['county_of_residence'] = 'arapahoe'
for p in ('p1', 'p3'):
    ex(c, p, cccap_meets_income_guidelines=True, cccap_eligibility_status='eligible_low_income', cccap_parent_fee=47)
ex(c, 'p1', cccap_meets_county_residency=True)
ex(c, 'p3', cccap_is_eligible_child=True)
comments['CO-172'] = [
    'Coverage round F-05 and F-06 (probes RV-C, RV-D). 8 CCR 1403-1 3.111.A, 3.114.B.1, B.8, 3.125.Q, GG. p1 (38) has Low-Income Child',
    'Care from Denver County for p3, authorized at her last determination. During the twelve-month period she reports that they moved',
    'to Arapahoe County; p3 turned thirteen on November 10, 2026. She still earns $2,000 in 120 hours. The change is determined',
    'November 15, 2026; her fee at the last determination was $60.',
]
cases.append(c)

# CO-173: F-01
c = build('RV-L', 'CO-173', 'Coverage round (CCCAP): a Colorado Works mother, work eligible and referred, in an unpaid work activity; her son reads her case')
for p in ('p1', 'p3'):
    ex(c, p, cccap_colorado_works_child_care_eligible=True, cccap_eligibility_status='eligible_colorado_works', cccap_parent_fee=0)
comments['CO-173'] = [
    'Coverage round F-01 (probe RV-L). 8 CCR 1403-1 3.115.A, 3.116.A, 3.124.I.3. p1 (38) and p3 (6) are a Colorado Works unit',
    'receiving basic cash assistance; p1 is work eligible, in an unpaid work activity (no wages, no hours), and the county Colorado',
    'Works worker has referred her for child care. Application in Denver, determined November 15, 2026.',
]
cases.append(c)

# CO-174: F-15
c = build('RV-N2', 'CO-174', "Coverage round (CCCAP): the mother's partner lives with them and pays toward her son's keep; both work")
ex(c, 'p2', cccap_is_adult_caretaker=True)
for p in ('p1', 'p2', 'p3'):
    ex(c, p, cccap_household_size=3, cccap_household_income=3500, cccap_eligibility_status='eligible_low_income', cccap_parent_fee=206)
comments['CO-174'] = [
    'Coverage round F-15 (probes RV-N1, RV-N2). 8 CCR 1403-1 3.111.D.2, D.4. p1 (38) earns $2,000 in 120 hours; p2 (40), her partner,',
    'is not p3\'s parent and is not married to p1, lives with them and contributes financially to p3\'s welfare (contributes_financially_to);',
    'he earns $1,500 in 100 hours. Care is asked for p3 (6). Application in Denver, determined November 15, 2026.',
]
cases.append(c)

json.dump(cases, open(D + 'cases_new.json', 'w'), indent=1)
json.dump(comments, open(D + 'cases_comments.json', 'w'), indent=1)
print([c['id'] for c in cases])

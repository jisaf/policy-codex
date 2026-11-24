import yaml, sys
path = sys.argv[1]
cases = yaml.safe_load(open(path))
extra_case = dict(cccap_is_child_welfare_child_care_household=False)
extra_person = dict(cccap_non_traditional_hours_are_requested=False, cccap_custody_schedule_is_outstanding=False,
    age_attestation_is_questionable=False, identity_attestation_is_questionable=False,
    cccap_care_is_from_unrelated_exempt_provider_outside_home=False, cccap_is_serving_ipv_disqualification=False,
    cccap_activity_schedule_received=True, cccap_immunization_record_received=True, dwelling_id='d1')
for c in cases:
    if not c['id'].startswith('RV-'): continue
    for k,v in extra_case.items(): c['case_facts'].setdefault(k, v)
    for p in c['persons'].values():
        for k,v in extra_person.items(): p['facts'].setdefault(k, v)
        p['month_defaults'].setdefault('cccap_is_in_homelessness_stabilization_period', False)
yaml.safe_dump(cases, open(path, 'w'), sort_keys=False, allow_unicode=True, width=1000)

import copy, json, sys
D = '/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cccapfix/'
P1 = {c['id']: c for f in ('probes.json', 'probes2.json', 'probes3.json') for c in json.load(open(D + f))}


def variant(src, cid, title):
    c = copy.deepcopy(P1[src]); c['id'] = cid; c['title'] = title; return c


out = []
c = variant('RV-B', 'RV-B2', "master's program, degree fact stated")
c['persons']['p1']['facts']['post_secondary_program_beyond_first_bachelors_degree'] = True; out.append(c)
c = variant('RV-D', 'RV-D2', 'child turned 13 mid-period; authorized at last determination')
c['persons']['p3']['facts']['cccap_child_was_authorized_at_last_determination'] = True; out.append(c)
c = variant('RV-G', 'RV-G2', 'GI Bill housing allowance stated as its own part')
c['persons']['p1']['month_defaults']['gi_bill_subsistence_allowance_received'] = 1500; out.append(c)
c = variant('RV-M', 'RV-M2', 'campground option after the split')
for p in ('p1', 'p3'): c['persons'][p]['facts']['nighttime_residence_type'] = 'campground_for_lack_of_alternative'
out.append(c)
# F-15: partner contributes financially, not working
c = variant('RV-A1', 'RV-N1', "mother works; her partner (not the child's parent) contributes financially and does not work")
c['relationships'] = [['parent', 'p1', 'p3'], ['contributes_financially_to', 'p2', 'p3']]
for p in ('p1', 'p2'): c['persons'][p]['facts']['cccap_caretaker_is_incapacitated'] = False
c['persons']['p1']['month_defaults'].update({'wages_gross': 2000, 'hours_worked': 120})
c['persons']['p2']['facts']['sex'] = 'male'; c['persons']['p2']['facts'].pop('cccap_is_financially_contributing_to_child')
out.append(c)
c = copy.deepcopy(c); c['id'] = 'RV-N2'; c['title'] = 'the partner works too, $1,500'
c['persons']['p2']['month_defaults'].update({'wages_gross': 1500, 'hours_worked': 100}); out.append(c)
# F-21: two parents, father incapacitated, no physician statement yet
c = variant('RV-A1', 'RV-O', 'mother works; father incapacitated, no physician statement yet')
c['persons']['p1']['facts']['cccap_caretaker_is_incapacitated'] = False
c['persons']['p1']['month_defaults'].update({'wages_gross': 2000, 'hours_worked': 120}); out.append(c)
c = copy.deepcopy(c); c['id'] = 'RV-O2'; c['title'] = 'the statement received'
c['persons']['p2']['facts']['incapacity_verification_document_received'] = True; out.append(c)
json.dump(out, open(D + 'probes4.json', 'w'), indent=1)
print(len(out))

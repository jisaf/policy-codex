import yaml, copy
F = '/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cw3fix/probes.yaml'
cs = yaml.safe_load(open(F))
b = {c['id']: c for c in cs}
if 'ZT-1b' not in b:
    c = copy.deepcopy(b['ZT-1']); c['id'] = 'ZT-1b'; c['title'] = 'room-only $400, new fact'
    c['persons']['p1']['month_defaults']['room_only_payments_received'] = 400; cs.append(c)
    c = copy.deepcopy(b['ZT-6']); c['id'] = 'ZT-2b'; c['title'] = 'room-only $600, new fact'
    md = c['persons']['p1']['month_defaults']; md['wages_gross'] = 0
    md['other_unearned_income_taxable'] = 600; md['room_only_payments_received'] = 600; cs.append(c)
    # ZT-8: pregnant single woman, no children, IPV-disqualified, no income (otherwise eligible)
    c = copy.deepcopy(b['ZT-4']); c['id'] = 'ZT-8'; c['title'] = 'IPV-disqualified mother, eligible otherwise'
    c['persons']['p1']['month_defaults']['wages_gross'] = 0; cs.append(c)
yaml.safe_dump(cs, open(F, 'w'), sort_keys=False, allow_unicode=True)
print(len(cs))

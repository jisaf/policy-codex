import yaml, copy, json, re, sys
D = '/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cf3/'
REPO = '/home/user/policy-codex/.claude/worktrees/agent-ae199798264caf09d/volumes/co/tests/cases.yaml'

class L(yaml.SafeLoader): pass
# keep timestamps as strings
L.yaml_implicit_resolvers = {k: [(t, r) for t, r in v if t != 'tag:yaml.org,2002:timestamp'] for k, v in L.yaml_implicit_resolvers.items()}

repo = yaml.load(open(REPO), Loader=L)
byid = {c['id']: c for c in repo}
zz = {c['id']: c for c in yaml.load(open(D + 'zz-c3nf.yaml'), Loader=L)}

def apply(c, ov):
    for k, v in ov.items():
        if k == 'case':
            c.setdefault('case_facts', {}).update(v); continue
        pid, _, m = k.partition('@')
        p = c['persons'].setdefault(pid, {'facts': {}})
        if not m: p.setdefault('facts', {}).update(v)
        elif m == 'default': p.setdefault('month_defaults', {}).update(v)
        else: p.setdefault('months', {}).setdefault(m, {}).update(v)

spec = json.load(open(D + 'cases-spec.json'))
out = []
for s in spec:
    base = zz.get(s['base']) or byid[s['base']]
    c = copy.deepcopy(base)
    c.pop('expect', None)
    c['id'] = s['id']; c['title'] = s['title']
    if 'as_of' in s: c['as_of'] = s['as_of']
    apply(c, s.get('ov', {}))
    if s.get('expect'): c['expect'] = s['expect']
    # order keys: id, title, as_of, rest
    oc = {'id': c.pop('id'), 'title': c.pop('title'), 'as_of': c.pop('as_of')}
    oc.update(c)
    txt = yaml.dump([oc], sort_keys=False, allow_unicode=True, width=1000, default_flow_style=False)
    lines = txt.split('\n')
    # comment after the title line
    com = ['  # ' + l if l else '  #' for l in s['comment']]
    lines = lines[:2] + com + lines[2:]
    out.append('\n'.join(lines).rstrip('\n'))
open(D + 'newcases.yaml', 'w').write('\n'.join(out) + '\n')
print('ok', len(out))

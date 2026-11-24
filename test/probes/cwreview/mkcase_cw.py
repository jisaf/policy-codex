# usage: python3 -I mkcase_cw.py <cases.yaml> <spec.json>  -- appends cases built from CO-86's p1 template
import sys, yaml, json, copy
path, specpath = sys.argv[1], sys.argv[2]
docs = yaml.safe_load(open(path))
base = next(c for c in docs if c['id'] == 'CO-86')
tmpl = base['persons']['p1']
specs = json.load(open(specpath))
out = []
for s in specs:
    c = {'id': s['id'], 'title': s.get('title', s['id']), 'as_of': s.get('as_of', base['as_of']),
         'case_facts': {**copy.deepcopy(base['case_facts']), **s.get('case_facts', {})},
         'relationships': s.get('relationships', []), 'persons': {}, 'expect': {}}
    for pid, pf in s['persons'].items():
        p = copy.deepcopy(tmpl)
        p['facts'].update({'is_pregnant': False})
        p['facts'].update(pf.get('facts', {}))
        p['month_defaults'].update(pf.get('month', {}))
        c['persons'][pid] = p
    out.append(c)
with open(path, 'a') as f:
    f.write('\n' + yaml.safe_dump(out, sort_keys=False, default_flow_style=None, width=1000))
print('appended', [c['id'] for c in out])

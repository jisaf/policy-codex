import sys, yaml
path, ids = sys.argv[1], sys.argv[2].split(",")
docs = yaml.safe_load(open(path))
for cid in ids:
    c = [x for x in docs if x['id'] == cid][0]
    print(cid, c['as_of'], c.get('case_facts'))
    print('rels', c.get('relationships'))
    for pid, e in c['expect'].items():
        print(' ', pid, {k: v for k, v in e.items() if k.startswith('cw_')})
    for pid, p in c['persons'].items():
        f = p['facts']
        print('  ', pid, f.get('date_of_birth'), f.get('immigration_status'), {k: v for k, v in f.items() if 'verif' in k or 'ssn' in k or k.startswith('cw_') or 'death' in k})

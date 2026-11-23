import json,sys
d=json.load(open('w/conformance/co/ledger.json'));m={x['id']:x for x in d['items']}
for i in sys.argv[1:]:
    x=m[i]; print(f"== {i} {x['identifier']} [{x['kind']}/{x['type']}]")
    print("E:",x.get('derived_english') if isinstance(x.get('derived_english'),str) else json.dumps(x.get('derived_english'))[:3000])
    if '-p' in sys.argv[0:1]: pass

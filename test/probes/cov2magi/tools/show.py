import json,sys
R=sys.argv[1]; keys=sys.argv[2:]
full='-f' in keys; keys=[k for k in keys if k!='-f']
items=json.load(open(R+'/conformance/co/ledger.json'))['items']
by={i['id']:i for i in items}; by.update({i['identifier']:i for i in items})
for k in keys:
  i=by.get(k)
  if not i: print('??',k); continue
  print(f"== {i['id']} {i['identifier']} [{i['kind']}/{i.get('type')}] src={','.join(i.get('sources') or [])}")
  print(' M:',i.get('meaning'))
  if full: print(' P:',i.get('precision'))
  for f in ('statute_override','open_questions','options'):
    if i.get(f): print(f' {f}:',json.dumps(i[f])[:1500])
  if i.get('derived') is not None: print(' D:',json.dumps(i['derived'],separators=(',',':'))[:4000])
  if i.get('value') is not None: print(' V:',json.dumps(i.get('value'))[:800])

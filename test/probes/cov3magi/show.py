import json,sys
d=json.load(open('conformance/co/ledger.json'))['items']
m={i['id']:i for i in d}; n={i['identifier']:i for i in d}
for k in sys.argv[1:]:
  i=m.get(k) or n.get(k)
  if not i: print('??',k); continue
  print('=== %s %s [%s %s %s]'%(i['id'],i['identifier'],i['kind'],i['type'],i.get('scope')))
  if 'derived' in i: print('D:',json.dumps(i['derived'],separators=(',',':')))
  if '-p' in sys.argv[0:1]: pass

# Build probe cases from stored CO-180 template; append to scratch cases.yaml
import yaml,copy,sys,json
R=sys.argv[1]; specs=json.load(open(sys.argv[2]))
path=R+'/volumes/co/tests/cases.yaml'
cases=yaml.safe_load(open(path))
tmpl=[c for c in cases if c['id']=='CO-180'][0]
base_person=copy.deepcopy(tmpl['persons']['p1'])
out=[]
for s in specs:
  c={'id':s['id'],'title':s['id'],'as_of':s.get('as_of','2026-11-10'),'persons':{},'relationships':s.get('rels',[])}
  for pid,p in s['persons'].items():
    bp=copy.deepcopy(base_person)
    bp['facts'].update(p.get('facts',{}))
    bp['month_defaults'].update(p.get('md',{}))
    if 'months' in p: bp['months']=p['months']
    c['persons'][pid]=bp
  c['expect']={}
  out.append(c)
cases=[c for c in cases if not c['id'].startswith('RV2-')]+out
yaml.safe_dump(cases,open(path,'w'),sort_keys=False,allow_unicode=True,width=1000)
print('ok',len(out))

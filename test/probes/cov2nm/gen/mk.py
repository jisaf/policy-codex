import yaml,copy,sys,json
base={c['id']:c for c in yaml.safe_load(open('../../x-cases-nonmagi.yaml'))}
spec=json.load(open(sys.argv[1]))
out=[]
for s in spec:
    c=copy.deepcopy(base[s['from']]); c['id']=s['id']; c['title']='scratch - '+s['title']
    for pid,ch in s.get('facts',{}).items(): c['persons'][pid].setdefault('facts',{}).update(ch)
    for pid,ch in s.get('month',{}).items(): c['persons'][pid].setdefault('month_defaults',{}).update(ch)
    for pid,ks in s.get('drop',{}).items():
        for k in ks: c['persons'][pid]['facts'].pop(k,None)
    if 'as_of' in s: c['as_of']=s['as_of']
    for pid in c['persons']:
        c['persons'][pid].setdefault('facts',{}).setdefault('adult_financial_program_received','none')
        md=c['persons'][pid].setdefault('month_defaults',{}); md.setdefault('tanf_cash_income',0); md.setdefault('adult_financial_cash_income',0)
    c['expect']={}
    out.append(c)
print(yaml.safe_dump(out,sort_keys=False))

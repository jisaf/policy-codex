import yaml,copy,os
S='/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/rv3-medicaid'
cs=yaml.safe_load(open(S+'/cases.orig.yaml'))
byid={c['id']:c for c in cs}
out=[]
def clone(src,newid):
    x=copy.deepcopy(byid[src]); x['id']=newid; x['title']='scratch '+newid; x['expect']={}; return x
# X-CBWD: CO-140 with wages 5,600 (310.5% MAGI); 8.100.5.H disregards give (5600-20-65)/2 = 2757.50
x=clone('CO-140','X-CBWD'); x['persons']['p1']['month_defaults']['wages_gross']=5600; out.append(x)
if os.path.exists(S+'/extra.py'): exec(open(S+'/extra.py').read())
t=open(S+'/cases.orig.yaml').read()+'\n'+yaml.safe_dump(out,sort_keys=False,default_flow_style=False)
open(S+'/snap/volumes/co/tests/cases.yaml','w').write(t)
print('ok',[c['id'] for c in out])

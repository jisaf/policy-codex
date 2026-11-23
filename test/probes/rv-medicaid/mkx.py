# builds scratch cases into snapx/volumes/co/tests/cases.yaml from cases.orig.yaml + scratch defs
import yaml,copy,sys
S='/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/rv-medicaid'
cs=yaml.safe_load(open(S+'/cases.orig.yaml'))
byid={c['id']:c for c in cs}
out=[]
# X-RETRO
x=copy.deepcopy(byid['CO-110']); x['id']='X-RETRO'; x['title']='scratch retro'
x['relationships']=[r for r in x['relationships'] if r[0]!='gave_birth_to']; x['persons']['p3']['facts']['date_of_birth']='2020-01-01'
p=x['persons']['p1']; f=p['facts']
f.update(is_pregnant=True, expected_number_of_children=1, pregnancy_start_date='2026-03-01', dwelling_id='d1', expects_to_be_claimed_as_dependent=False, is_claimed_by_filer_outside_case=False, ma_lottery_winnings_hardship_exemption_granted=False)
del f['pregnancy_end_date']
p['months']={m:{'wages_gross':4600} for m in ['2026-09','2026-10','2026-11','2026-12']}
x['expect']={}
out.append(x)
exec(open(S+'/extra.py').read()) if __import__('os').path.exists(S+'/extra.py') else None
t=open(S+'/cases.orig.yaml').read()
t+= '\n' + yaml.safe_dump(out, sort_keys=False, indent=2, default_flow_style=False)
open(S+'/snapx/volumes/co/tests/cases.yaml','w').write(t)
print('ok', [c['id'] for c in out])

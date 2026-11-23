import yaml, copy, sys
f=sys.argv[1]
docs=yaml.safe_load(open(f))
cases=docs if isinstance(docs,list) else docs['cases']
base=[c for c in cases if c['id']=='CO-160'][0]
out=[]
def mk(i,t):
    c=copy.deepcopy(base); c['id']=i; c['title']=t; c.pop('expect',None); c.pop('expected',None); out.append(c); return c
# ZT-1: room-only lodger payment $400 stated as rent (CO-4361 precision)
c=mk('ZT-1','room-only $400 as rent'); c['persons']['p1']['month_defaults']['other_unearned_income_taxable']=400
# ZT-2: room-only $600 stated in the room-and-board fact, one payer
c=mk('ZT-2','room-only $600 in room-and-board fact'); c['persons']['p1']['month_defaults']['room_and_board_payments_received']=600; c['persons']['p1']['month_defaults']['room_and_board_payers_count']=1
# ZT-3: control, $400 wages (earned treatment)
c=mk('ZT-3','control $400 wages'); c['persons']['p1']['month_defaults']['wages_gross']=400
# ZT-6: control, $600 wages
c=mk('ZT-6','control $600 wages'); c['persons']['p1']['month_defaults']['wages_gross']=600
# ZT-4: adult mother serving a CW IPV disqualification, $1,500 wages: unit over income
c=mk('ZT-4','IPV-disqualified mother, over income'); p=c['persons']['p1']; p['facts']['date_of_birth']='1990-03-01'; p['facts']['is_emancipated_minor']=False; p['facts']['cw_is_serving_ipv_disqualification']=True; p['month_defaults']['wages_gross']=1500
# ZT-5: control, same mother not disqualified
c=mk('ZT-5','control, not disqualified'); p=c['persons']['p1']; p['facts']['date_of_birth']='1990-03-01'; p['facts']['is_emancipated_minor']=False; p['month_defaults']['wages_gross']=1500
cases.extend(out)
yaml.safe_dump(docs,open(f,'w'),sort_keys=False,allow_unicode=True)

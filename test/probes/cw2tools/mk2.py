import yaml, copy, sys
f=sys.argv[1]
docs=yaml.safe_load(open(f))
cases=docs if isinstance(docs,list) else docs['cases']
base=[c for c in cases if c['id']=='CO-160'][0]
def mk(i,fn):
  q=copy.deepcopy(base); q['id']=i; q.pop('expect',None); fn(q); cases.append(q)
mk('ZR-1',lambda q:q['persons']['p1']['facts'].__setitem__('in_diversion_period_of_ineligibility',True))
mk('ZR-2',lambda q:q['persons']['p1']['month_defaults'].__setitem__('lottery_gambling_winnings_received',2000))
def b(q):
  md=q['persons']['p1']['month_defaults']; md['room_and_board_payments_received']=1500; md['room_and_board_payers_count']=2; md['room_and_board_provision_costs']=0

mk('ZR-3',b)
yaml.safe_dump(docs,open(f,'w'),sort_keys=False,allow_unicode=True)

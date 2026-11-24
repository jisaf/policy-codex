import yaml, copy, sys
f=sys.argv[1]
docs=yaml.safe_load(open(f))
cases=docs if isinstance(docs,list) else docs['cases']
base=[c for c in cases if c['id']=='CO-164'][0]
out=[]
# Q-1: unrelated non-parent caretaker who does not join, no county approval (N.3.a)
q1=copy.deepcopy(base); q1['id']='ZQ-1'; q1['title']='probe N.3.a'
q1['relationships']=[['parent','p1','p2'],['has_primary_responsibility_for','p3','p1']]
q1.pop('expect',None); out.append(q1)
# Q-2: minor mother lives with her mother (h1, $600 wages); her father in h2 (CO-2000 needs)
q2=copy.deepcopy(base); q2['id']='ZQ-2'; q2['title']='probe CO-2000'
q2['relationships']=[['parent','p1','p2'],['parent','p3','p1'],['parent','p4','p1']]
q2['persons']['p3']['month_defaults']['wages_gross']=600
p4=copy.deepcopy(q2['persons']['p3']); p4['facts']['dwelling_id']='h2'; p4['facts']['sex']='male'; p4['month_defaults']['wages_gross']=0
q2['persons']['p4']=p4; q2.pop('expect',None); out.append(q2)
# Q-3: same household, father absent from the case (control)
q3=copy.deepcopy(q2); q3['id']='ZQ-3'; q3['title']='control'
q3['relationships']=[['parent','p1','p2'],['parent','p3','p1']]; del q3['persons']['p4']; out.append(q3)
cases.extend(out)
yaml.safe_dump(docs,open(f,'w'),sort_keys=False,allow_unicode=True)

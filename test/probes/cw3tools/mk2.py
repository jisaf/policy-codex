import yaml, copy, sys
f=sys.argv[1]
docs=yaml.safe_load(open(f))
cases=docs if isinstance(docs,list) else docs['cases']
base=[c for c in cases if c['id']=='CO-160'][0]
c=copy.deepcopy(base); c['id']='ZT-7'; c['title']='applied Sep 25, eligible from Oct 3'; c['as_of']='2026-10-15'
c['case_facts']['cw_application_date']='2026-09-25'; c['case_facts']['cw_unit_eligible_from_date']='2026-10-03'
cases.append(c)
yaml.safe_dump(docs,open(f,'w'),sort_keys=False,allow_unicode=True)

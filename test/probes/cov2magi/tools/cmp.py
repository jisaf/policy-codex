import yaml,sys,subprocess,json,re
R=sys.argv[1]; ids=sys.argv[2:]
cases={c['id']:c for c in yaml.safe_load(open(R+'/volumes/co/tests/cases.yaml'))}
for cid in ids:
  c=cases[cid]; exp=c.get('expect') or {}
  idents=sorted({k for p in exp.values() for k in p})
  months=sorted({m for p in exp.values() for v in p.values() if isinstance(v,dict) for m in v}) or [c['as_of'][:7]]
  got={}
  for m in months:
    out=subprocess.run(['npx','vite-node','scripts/eval-case.ts','co',cid,','.join(idents),m],cwd=R,capture_output=True,text=True,timeout=500).stdout
    for line in out.splitlines():
      mm=re.match(r'(p\d+) (\S+)(?: (\d{4}-\d{2}))? = (.*?)(   missing.*)?$',line)
      if mm: got[(mm[1],mm[2],mm[3] or m)]=mm[4]
  bad=0
  for pid,p in exp.items():
    for k,v in p.items():
      pairs=v.items() if isinstance(v,dict) else [(None,v)]
      for mo,val in pairs:
        g=None
        for mm in ([mo] if mo else months):
          g=got.get((pid,k,mm),g)
        try: gv=json.loads(g)
        except Exception: gv=g
        ok = (gv==val) or (isinstance(val,(int,float)) and isinstance(gv,(int,float)) and abs(gv-val)<0.006) or (isinstance(val,list) and isinstance(gv,list) and sorted(map(str,gv))==sorted(map(str,val)))
        if not ok: bad+=1; print(cid,pid,k,mo,'expected',val,'got',g)
  print(cid,'mismatches',bad,'of',sum(len(v) if isinstance(v,dict) else 1 for p in exp.values() for v in p.values()))

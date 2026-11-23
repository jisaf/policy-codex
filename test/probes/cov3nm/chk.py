import yaml,subprocess,sys,re
cs=yaml.safe_load(open('volumes/co/tests/cases.yaml'))
by={c['id']:c for c in cs if isinstance(c,dict) and 'id' in c}
for cid in sys.argv[1:]:
    c=by[cid]; ex=c.get('expect',{})
    for p,ids in ex.items():
        for ident,val in ids.items():
            months=list(val.keys()) if isinstance(val,dict) else [None]
            for m in months:
                args=['npx','vite-node','scripts/eval-case.ts','co',cid,ident]+([m] if m else [])
                out=subprocess.run(args,capture_output=True,text=True,timeout=300).stdout
                got=[l for l in out.splitlines() if l.startswith(p+' ')]
                want=val[m] if m else val
                g=got[0].split(' = ')[1].split('   ')[0] if got else '??'
                ok = str(want) == g.strip('"') or (re.match(r'^-?[\d.]+$',g) and abs(float(g)-float(want))<0.01 if isinstance(want,(int,float)) else False)
                print(('OK ' if ok else 'DIFF'),cid,p,ident,m,'want',want,'got',g)

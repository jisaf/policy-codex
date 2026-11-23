import re,sys
def load(f):
    d={};cur=None;n={}
    for l in open(f):
        if l.startswith('## '):
            cid=l.split()[1]; n[cid]=n.get(cid,0)+1; cur=f"{cid}#{n[cid]}"
        elif l.startswith('  p') and cur:
            pid,rest=l.strip().split(': ',1)
            for kv in re.split(r'  (?=\w+=)',re.sub(r' \[missing [^\]]*\]','',rest)):
                k,v=kv.split('=',1); d[(cur,pid,k)]=v
    return d
a,b=load(sys.argv[1]),load(sys.argv[2])
for k in sorted(set(a)|set(b)):
    if a.get(k)!=b.get(k): print(k, a.get(k),'->',b.get(k))

"""Build new household cases by copying a base case block from cases.yaml and applying overrides.
usage: python3 -I mkcases.py <cases.yaml> <spec.json> <out.yaml>"""
import json, sys

src, specf, outf = sys.argv[1:4]
lines = open(src, encoding="utf-8").read().split("\n")

def block(cid):
    s = next(i for i, l in enumerate(lines) if l == f"- id: {cid}")
    e = next((i for i in range(s + 1, len(lines)) if lines[i].startswith("- id: ")), len(lines))
    b = lines[s:e]
    while b and b[-1].strip() == "":
        b.pop()
    return b

out = []
for sp in json.load(open(specf)):
    b = block(sp["base"])
    b[0] = f"- id: {sp['id']}"
    assert b[1].startswith("  title:")
    b[1] = "  title: " + json.dumps(sp["title"], ensure_ascii=False)
    # replace the leading comment block (between title and as_of)
    j = 2
    while j < len(b) and b[j].startswith("  #"):
        j += 1
    b[2:j] = ["  # " + c for c in sp["comment"]]
    if "as_of" in sp:
        k = next(i for i, l in enumerate(b) if l.startswith("  as_of:"))
        b[k] = f"  as_of: \"{sp['as_of']}\""
    for k, v in sp.get("case_facts", {}).items():
        cf = next(i for i, l in enumerate(b) if l.startswith("  case_facts:"))
        ex = next((i for i in range(cf + 1, len(b)) if b[i].startswith(f"    {k}:")), None)
        if ex is not None:
            b[ex] = f"    {k}: {v}"
        else:
            b.insert(cf + 1, f"    {k}: {v}")
    for pid, secs in sp.get("persons", {}).items():
        ps = next(i for i, l in enumerate(b) if l == f"    {pid}:")
        pe = next((i for i in range(ps + 1, len(b)) if (b[i].startswith("    p") and b[i].endswith(":") and len(b[i]) - len(b[i].lstrip()) == 4) or b[i].startswith("  expect:")), len(b))
        for sec in ("facts", "month_defaults"):
            for k, v in secs.get(sec, {}).items():
                hs = next(i for i in range(ps, pe) if b[i] == f"      {sec}:")
                he = next((i for i in range(hs + 1, pe) if not b[i].startswith("        ")), pe)
                ex = next((i for i in range(hs + 1, he) if b[i].startswith(f"        {k}:")), None)
                if ex is not None:
                    b[ex] = f"        {k}: {v}"
                else:
                    b.insert(hs + 1, f"        {k}: {v}")
                    pe += 1
        if "months" in secs:
            assert not any(b[i] == "      months:" for i in range(ps, pe))
            ins = ["      months:"] + [f"        \"{m}\": {v}" for m, v in secs["months"].items()]
            b[pe:pe] = ins
            pe += len(ins)
    k = next(i for i, l in enumerate(b) if l == "  expect:")
    b[k:] = ["  expect:"] + ["    # " + c for c in sp["expect_comment"]] + sp["expect"]
    out += b + [""]
open(outf, "w", encoding="utf-8").write("\n".join(out))
print("ok", len(out))

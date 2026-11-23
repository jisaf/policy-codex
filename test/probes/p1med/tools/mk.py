"""Write ledger items from a Python spec file.
usage: mk.py <spec.py>
The spec defines ITEMS: a list of dicts with keys in output order. String values are
JSON-quoted; keys 'derived', 'sources', 'tags', 'open', 'options', 'accepts_from',
'nearest' are written raw (flow YAML strings given as text); 'tests' is a list of raw
flow-mapping strings; 'versions' is a list of dicts.
"""
import sys, json

V = "/home/user/policy-codex/.claude/worktrees/agent-a66e9080eed043276/volumes/co/"
RAW = {"derived", "sources", "tags", "open", "options", "accepts_from", "nearest", "value", "review_by"}
ORDER = ["id", "name", "identifier", "kind", "type", "options", "scope", "program", "role", "meaning", "assumption",
         "precision", "statute_override", "supplied_by", "derived", "value", "versions", "review_by", "sources",
         "implemented", "tags", "open", "accepts_from", "rationale", "nearest", "tests"]

ns = {}
exec(open(sys.argv[1], encoding="utf-8").read(), ns)
for it in ns["ITEMS"]:
    out = []
    for k in ORDER:
        if k not in it:
            continue
        v = it[k]
        if k == "tests":
            out.append("tests:")
            out.extend("  - " + t for t in v)
        elif k == "versions":
            out.append("versions:")
            for ver in v:
                out.append(f"  - from: \"{ver['from']}\"")
                out.append(f"    value: {ver['value']}")
                out.append(f"    source: {ver['source']}")
        elif k in RAW:
            out.append(f"{k}: {v}")
        elif k in ("id", "identifier", "kind", "type", "scope", "program", "role", "implemented"):
            out.append(f"{k}: {v}")
        else:
            out.append(f"{k}: " + json.dumps(v, ensure_ascii=False))
    for k in it:
        if k not in ORDER and k != "dir":
            sys.exit(f"unknown key {k} in {it['id']}")
    path = V + it["dir"] + "/" + it["id"] + ".yaml"
    open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")
    print("wrote", path)

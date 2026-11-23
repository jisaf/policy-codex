"""Write supplied/parameter item YAML files from a compact Python spec (scratch generator)."""
import json, sys, os

root = sys.argv[1]
specs = json.load(open(sys.argv[2]))

def q(s):
    return json.dumps(s, ensure_ascii=False)

for sp in specs:
    d = sp.get("dir", "supplied")
    lines = [f"id: {sp['id']}", f"name: {q(sp['name'])}", f"identifier: {sp['identifier']}", f"kind: {sp.get('kind','supplied')}", f"type: {sp['type']}"]
    if "options" in sp:
        lines.append("options: [" + ", ".join(sp["options"]) + "]")
    lines += [f"scope: {sp['scope']}", f"program: {sp.get('program','All')}"]
    lines.append(f"meaning: {q(sp['meaning'])}")
    if sp.get("precision"):
        lines.append(f"precision: {q(sp['precision'])}")
    if sp.get("supplied_by"):
        lines.append(f"supplied_by: {q(sp['supplied_by'])}")
    if "versions" in sp:
        lines.append("versions:")
        for v in sp["versions"]:
            val = v["value"]
            vs = json.dumps(val) if not isinstance(val, dict) else "{" + ", ".join(f"{k}: {json.dumps(x)}" for k, x in val.items()) + "}"
            lines.append(f"  - {{from: {q(v['from'])}, value: {vs}, source: {v['source']}}}")
    lines.append("sources: [" + ", ".join(sp["sources"]) + "]")
    lines.append("tags: [" + ", ".join(sp["tags"]) + "]")
    if sp.get("open"):
        lines.append("open: [" + ", ".join(sp["open"]) + "]")
    lines.append(f"rationale: {q(sp['rationale'])}")
    path = os.path.join(root, d, sp["id"] + ".yaml")
    open(path, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("wrote", path)

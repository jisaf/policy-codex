"""Build verbatim excerpts from document files by line range and print them as sources.md entries.
usage: python3 -I mkexcerpts.py <volume dir> <spec.json>  (prints to stdout)
spec: [{"s": "S3150", "title": ..., "doc": "D-81", "cite": ..., "url": ..., "ranges": [[a, b], ...]}]
Page furniture (page numbers, the CCR running head) inside a range is dropped; ranges are joined by "> ...".
"""
import json, re, sys

vol, specpath = sys.argv[1], sys.argv[2]
specs = json.load(open(specpath))
HEAD = re.compile(r"^\s*(CODE OF COLORADO REGULATIONS.*|Income Maintenance \(Volume 3\)\s*|\d{1,3})\s*$")
out = []
for s in specs:
    lines = open(f"{vol}/documents/{s['doc']}.md", encoding="utf-8").read().split("\n")
    blocks = []
    for a, b in s["ranges"]:
        seg = [l.rstrip() for l in lines[a - 1:b] if not HEAD.match(l)]
        # collapse runs of blank lines
        clean = []
        for l in seg:
            if l.strip() == "" and (not clean or clean[-1].strip() == ""):
                continue
            clean.append(l)
        while clean and clean[-1].strip() == "":
            clean.pop()
        while clean and clean[0].strip() == "":
            clean.pop(0)
        blocks.append(clean)
    body = []
    for i, blk in enumerate(blocks):
        if i:
            body += [">", "> ...", ">"]
        body += ["> " + l.strip() if l.strip() else ">" for l in blk]
    out.append(f"### {s['s']}. {s['title']}\n\nDocument: {s['doc']}\n\n{s['cite']} {s['url']}\n\n" + "\n".join(body) + "\n")
sys.stdout.write("\n" + "\n".join(out))

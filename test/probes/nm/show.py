import yaml
S = "/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/"
cs = {c["id"]: c for c in yaml.safe_load(open(S + "x-cases-nonmagi.yaml"))}
for k in ["X-WAWDHCBS", "X-IRA", "X-DEEM"]:
    c = cs[k]; print("==", k, c["as_of"], c.get("relationships"))
    for pid, p in c["persons"].items():
        f = p["facts"]; md = p.get("month_defaults", {})
        print(pid, {x: f[x] for x in f if f[x] not in (0, False, "none") and x not in ("immigration_status", "state_of_residence")}, {x: md[x] for x in md if md[x] not in (0, False)})

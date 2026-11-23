"""Receipt spike: groups the harness differences by variant and model, so each
class can be explained once. Usage: python3 classify.py results/harness.txt"""
import re, sys, collections
MAIN = {"leap_person_unearned_income", "leap_household_income", "leap_is_eligible", "snap_person_unearned_income",
        "snap_allotment", "af_unearned_income_other_than_ssi", "af_relative_deemable_unearned_income", "af_countable_income",
        "af_oap_grant", "af_category", "af_deemed_relative_income", "af_deemed_sponsor_income"}
groups = collections.defaultdict(lambda: collections.defaultdict(set))
counts = collections.Counter()
for line in open(sys.argv[1]):
    m = re.match(r"^([AB]) (\S+) (\S+) (\S+)(?: @(\S+))?: old=(\S+) new=(\S+)", line)
    if not m:
        continue
    model, case, pid, ident, mo, o, n = m.groups()
    variant = re.sub(r"^G-(LEAP|SNAP|AFclient|AFspousedeemed|AFsponsordeemed)-", "G-*-", case)
    counts[(model, variant)] += 1
    if ident in MAIN:
        base = re.match(r"^G-(LEAP|SNAP|AFclient|AFspousedeemed|AFsponsordeemed)-", case)
        groups[(model, variant)][f"{base.group(1) if base else case}:{ident} {o}->{n}"].add(1)
for (model, variant), n in sorted(counts.items(), key=lambda x: (x[0][1], x[0][0])):
    print(f"{model} {variant} ({n} values): " + "; ".join(sorted(groups[(model, variant)]))[:600])

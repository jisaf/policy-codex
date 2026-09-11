#!/usr/bin/env python3
"""Reference checker and renderer for the one-ledger codex (Approach B+).

Spike tooling, not the product. It exists to prove that the ledger is
machine-checkable: every reference resolves, every derived item has tests,
and every rule-level test and household-level case evaluates to the value
the author wrote down.

Usage:
  python3 codex_tool.py check                 validate, run rule tests and cases
  python3 codex_tool.py render                write codex.md, handoff.md, tests/rule-tests.yaml
                                              and the Approach A ledgers from the same source
  python3 codex_tool.py impact <identifier>   list everything downstream of one item
"""
import calendar
import datetime as dt
import glob
import math
import os
import re
import sys

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
VOLUME_DIR = os.path.dirname(HERE)
LEDGER_DIR = os.path.join(HERE, "ledger")
A_DIR = os.path.join(VOLUME_DIR, "approach-a")

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MONTH_RE = re.compile(r"^\d{4}-\d{2}$")

BLOCK_OPS = {"all", "any", "case", "exists", "exists_related", "each", "some_month"}
MONTH_BINDING_OPS = {"each", "some_month", "count_months", "avg"}


# ----------------------------------------------------------------------------
# Loading
# ----------------------------------------------------------------------------

class Ledger:
    def __init__(self):
        self.meta = {}
        self.items = []
        self.by_identifier = {}
        self.by_id = {}
        self.enum_options = set()

    @classmethod
    def load(cls, ledger_dir=LEDGER_DIR):
        led = cls()
        for path in sorted(glob.glob(os.path.join(ledger_dir, "*.yaml"))):
            doc = yaml.safe_load(open(path)) or {}
            if "volume" in doc:
                led.meta = doc
            for it in doc.get("items", []) or []:
                it["_file"] = os.path.basename(path)
                led.items.append(it)
        for it in led.items:
            led.by_identifier[it["identifier"]] = it
            led.by_id[it["id"]] = it
            for opt in it.get("options", []) or []:
                led.enum_options.add(opt)
        return led

    def item(self, identifier):
        return self.by_identifier[identifier]


def load_sources():
    path = os.path.join(VOLUME_DIR, "sources.md")
    out = {}
    if os.path.exists(path):
        for line in open(path):
            m = re.match(r"^### (S\d+)\. (.*)$", line.strip())
            if m:
                out[m.group(1)] = m.group(2)
    return out


def load_open_questions():
    path = os.path.join(VOLUME_DIR, "open-questions.md")
    out = {}
    if os.path.exists(path):
        for line in open(path):
            m = re.match(r"^### (OQ-\d+)\.? (.*)$", line.strip())
            if m:
                out[m.group(1)] = m.group(2)
    return out


# ----------------------------------------------------------------------------
# Date and month helpers
# ----------------------------------------------------------------------------

def to_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    if isinstance(v, str) and DATE_RE.match(v):
        return dt.date.fromisoformat(v)
    raise TypeError(f"not a date: {v!r}")


def month_of(d):
    d = to_date(d)
    return f"{d.year:04d}-{d.month:02d}"


def add_months(m, n):
    y, mo = int(m[:4]), int(m[5:7])
    idx = y * 12 + (mo - 1) + n
    return f"{idx // 12:04d}-{idx % 12 + 1:02d}"


def months_ending(n, m):
    return [add_months(m, -(n - 1 - i)) for i in range(n)]


def months_from_to(a, b):
    out = []
    cur = a
    while cur <= b:
        out.append(cur)
        cur = add_months(cur, 1)
    return out


def first_day(m):
    return dt.date(int(m[:4]), int(m[5:7]), 1)


def years_between(d1, d2):
    d1, d2 = to_date(d1), to_date(d2)
    years = d2.year - d1.year
    try:
        anniv = d1.replace(year=d2.year)
    except ValueError:
        anniv = dt.date(d2.year, 3, 1)
    if d2 < anniv:
        years -= 1
    return years


# ----------------------------------------------------------------------------
# Static validation
# ----------------------------------------------------------------------------

LITERAL_POSITIONS = {"in": [2], "rel": [1], "exists_related": [1]}


def walk_refs(expr, led, errors, where, month_bound, item):
    """Collect identifier references and check scope discipline."""
    refs = set()

    def visit(e, mb, lit=False):
        if isinstance(e, str):
            if lit or DATE_RE.match(e) or MONTH_RE.match(e):
                return
            if e in led.by_identifier:
                refs.add(e)
                tgt = led.by_identifier[e]
                if tgt.get("scope") in ("person-month", "month") and not mb:
                    errors.append(f"{where}: references {e} (scope {tgt['scope']}) without a month in context")
                return
            if e in led.enum_options or e == "P":
                return
            errors.append(f"{where}: unresolved reference {e!r}")
            return
        if isinstance(e, (int, float, bool)) or e is None:
            return
        if not isinstance(e, list) or not e:
            errors.append(f"{where}: malformed expression {e!r}")
            return
        op = e[0]
        if op == "P":
            return
        if op in ("det_date", "det_month"):
            refs.add("determination_date")
            return
        if op in ("rel", "exists_related"):
            refs.add("relationships")
        if op == "of":
            visit(e[2], mb)
            return
        if op == "at":
            visit(e[2], mb)
            visit(e[1], True)
            return
        if op in MONTH_BINDING_OPS:
            visit(e[1], mb)
            visit(e[2], True)
            return
        if op == "case":
            for arm in e[1:]:
                if arm[0] == "else":
                    visit(arm[1], mb)
                else:
                    visit(arm[0], mb)
                    visit(arm[1], mb)
            return
        lits = LITERAL_POSITIONS.get(op, [])
        for i, sub in enumerate(e[1:], start=1):
            if i in lits:
                continue
            visit(sub, mb)

    visit(expr, month_bound)
    return refs


def dependencies(led):
    deps = {}
    errs = []
    for it in led.items:
        if it["kind"] != "derived":
            deps[it["identifier"]] = set()
            continue
        mb = it["scope"] in ("person-month", "month")
        deps[it["identifier"]] = walk_refs(it["derived"], led, errs, it["id"], mb, it)
    return deps, errs


def validate(led):
    errors, warnings = [], []
    ids, idents = set(), set()
    for it in led.items:
        w = it.get("id", "?")
        for f in ("id", "name", "identifier", "kind", "type", "scope", "program", "meaning"):
            if f not in it:
                errors.append(f"{w}: missing {f}")
        if it["id"] in ids:
            errors.append(f"{w}: duplicate id")
        ids.add(it["id"])
        if it["identifier"] in idents:
            errors.append(f"{w}: duplicate identifier {it['identifier']}")
        idents.add(it["identifier"])
        if it["kind"] not in ("supplied", "derived", "parameter"):
            errors.append(f"{w}: bad kind {it['kind']}")
        if it["type"] not in led.meta.get("types", []):
            errors.append(f"{w}: bad type {it['type']}")
        if it["scope"] not in led.meta.get("scopes", []):
            errors.append(f"{w}: bad scope {it['scope']}")
        if it["program"] not in ("All", "Medicaid", "SNAP"):
            errors.append(f"{w}: bad program {it['program']}")
        if it["type"] == "one of" and not it.get("options"):
            errors.append(f"{w}: enumeration without options")
        if it["kind"] == "supplied" and "supplied_by" not in it:
            errors.append(f"{w}: supplied fact without supplied_by")
        if it["kind"] == "derived":
            if "derived" not in it:
                errors.append(f"{w}: derived fact without derivation")
            if it.get("implemented") not in ("assembly", "engine"):
                errors.append(f"{w}: derived fact without implementation target")
            if not it.get("tests"):
                errors.append(f"{w}: derived fact has no rule-level tests")
        if it["kind"] == "parameter" and "value" not in it and "versions" not in it:
            errors.append(f"{w}: parameter without value")
        for t in it.get("tests", []) or []:
            for k in (t.get("given") or {}):
                if k not in led.by_identifier:
                    errors.append(f"{w} {t.get('id')}: given references unknown {k}")
            if it.get("scope") in ("person-month", "month") and "month" not in t:
                errors.append(f"{w} {t.get('id')}: per-month item test needs a month")
    deps, derrs = dependencies(led)
    errors += derrs
    # cycles
    state = {}

    def dfs(n, path):
        state[n] = 1
        for d in deps.get(n, ()):
            if state.get(d) == 1:
                errors.append("cycle: " + " -> ".join(path + [d]))
            elif state.get(d) is None:
                dfs(d, path + [d])
        state[n] = 2

    for n in deps:
        if state.get(n) is None:
            dfs(n, [n])
    # sources and open questions
    sources = load_sources()
    oqs = load_open_questions()
    for it in led.items:
        for s in it.get("sources", []) or []:
            if s not in sources:
                errors.append(f"{it['id']}: cites unknown source {s}")
        for q in it.get("open", []) or []:
            if q not in oqs:
                errors.append(f"{it['id']}: cites unknown open question {q}")
        if it["kind"] == "derived" and not it.get("sources"):
            if not it["identifier"].startswith("age"):
                warnings.append(f"{it['id']}: derived fact cites no source")
    # unused supplied facts
    used = set()
    for s in deps.values():
        used |= s
    for it in led.items:
        if it["kind"] in ("supplied", "parameter") and it["identifier"] not in used:
            warnings.append(f"{it['id']}: {it['kind']} fact {it['identifier']} is never referenced")
    return errors, warnings, deps


# ----------------------------------------------------------------------------
# Evaluation
# ----------------------------------------------------------------------------

class Unknown(Exception):
    pass


class Case:
    """A household with facts, built from a test or a case file."""

    def __init__(self, led, as_of, persons=None, month_facts=None, params=None):
        self.led = led
        self.det_date = to_date(as_of)
        self.persons = {}       # pid -> {identifier: value}
        self.months = {}        # pid -> {month: {identifier: value}}
        self.month_defaults = {}  # pid -> {identifier: value}
        self.relationships = {}  # pid -> [[rel, pid]]
        self.month_facts = month_facts or {}  # month -> {identifier: value}
        self.month_facts_default = {}
        self.params = params or {}
        for pid, p in (persons or {}).items():
            self.add_person(pid, p)

    def add_person(self, pid, p):
        facts = dict(p.get("facts", {}))
        self.persons[pid] = {}
        self.months[pid] = {}
        self.month_defaults[pid] = dict(p.get("month_defaults", {}) or {})
        self.relationships[pid] = p.get("relationships")
        for k, v in facts.items():
            self.set_fact(pid, k, v)
        for m, mf in (p.get("months", {}) or {}).items():
            for k, v in mf.items():
                self.months[pid].setdefault(m, {})[k] = self.coerce(k, v)

    def coerce(self, identifier, v):
        it = self.led.by_identifier.get(identifier)
        if it and it["type"] == "calendar date" and isinstance(v, (str, dt.date, dt.datetime)):
            return to_date(v)
        return v

    def set_fact(self, pid, identifier, v, test_month=None):
        it = self.led.by_identifier[identifier]
        if it["scope"] in ("person-month",):
            if isinstance(v, dict) and all(MONTH_RE.match(str(k)) for k in v):
                for m, mv in v.items():
                    self.months[pid].setdefault(m, {})[identifier] = self.coerce(identifier, mv)
            elif test_month is None:
                # a scalar for a per-month fact in a test with no month applies to every month
                self.month_defaults[pid][identifier] = self.coerce(identifier, v)
            else:
                self.months[pid].setdefault(test_month, {})[identifier] = self.coerce(identifier, v)
        elif it["scope"] == "month":
            if isinstance(v, dict):
                for m, mv in v.items():
                    self.month_facts.setdefault(m, {})[identifier] = mv
            elif test_month is None:
                self.month_facts_default[identifier] = v
            else:
                self.month_facts.setdefault(test_month, {})[identifier] = v
        else:
            self.persons[pid][identifier] = self.coerce(identifier, v)


class Evaluator:
    def __init__(self, led, case):
        self.led = led
        self.case = case
        self.memo = {}
        self.stack = []

    # --- value lookup -------------------------------------------------------
    def parameter(self, it):
        ident = it["identifier"]
        if ident in self.case.params:
            return self.case.params[ident]
        if "versions" in it:
            best = None
            for v in it["versions"]:
                if to_date(v["from"]) <= self.case.det_date:
                    if best is None or to_date(v["from"]) >= to_date(best["from"]):
                        best = v
            return None if best is None else best["value"]
        v = it["value"]
        if it["type"] == "calendar date":
            return to_date(v)
        return v

    def value(self, ident, person, month, P=None):
        it = self.led.by_identifier[ident]
        scope = it["scope"]
        if it["kind"] == "parameter":
            return self.parameter(it)
        if scope == "case":
            if ident == "determination_date":
                return self.case.det_date
            return None
        if scope == "month":
            if month is None:
                raise ValueError(f"{ident} needs a month")
            mf = self.case.month_facts.get(month, {})
            if ident in mf:
                return mf[ident]
            return self.case.month_facts_default.get(ident)
        if scope == "global":
            key = (ident, None, None)
        elif scope == "person":
            if person is None:
                raise ValueError(f"{ident} needs a person")
            key = (ident, person, None)
        else:
            if person is None or month is None:
                raise ValueError(f"{ident} needs a person and a month")
            key = (ident, person, month)
        # overrides / supplied values
        if scope == "person":
            if ident in self.case.persons.get(person, {}):
                return self.case.persons[person][ident]
        elif scope == "person-month":
            mf = self.case.months.get(person, {}).get(month, {})
            if ident in mf:
                return mf[ident]
            if ident in self.case.month_defaults.get(person, {}):
                return self.case.month_defaults[person][ident]
        if it["kind"] == "supplied":
            return None
        if key in self.memo:
            return self.memo[key]
        if key in self.stack:
            raise RuntimeError("cycle at " + ident)
        self.stack.append(key)
        try:
            v = self.eval(it["derived"], person, month if scope != "person" else month, P)
        finally:
            self.stack.pop()
        self.memo[key] = v
        return v

    # --- expression evaluation --------------------------------------------
    def eval(self, e, person, month, P=None):
        if isinstance(e, bool) or isinstance(e, (int, float)):
            return e
        if e is None:
            return None
        if isinstance(e, str):
            if DATE_RE.match(e):
                return to_date(e)
            if MONTH_RE.match(e):
                return e
            if e in self.led.by_identifier:
                return self.value(e, person, month, P)
            return e  # enumeration literal
        op = e[0]
        ev = lambda x, mo=month, pe=person, pp=P: self.eval(x, pe, mo, pp)
        if op == "P":
            return P
        if op == "det_date":
            return self.case.det_date
        if op == "det_month":
            return month_of(self.case.det_date)
        if op == "month":
            if month is None:
                raise ValueError("no month in context")
            return month
        if op == "all":
            saw_unknown = False
            for sub in e[1:]:
                v = ev(sub)
                if v is False:
                    return False
                if v is None:
                    saw_unknown = True
            return None if saw_unknown else True
        if op == "any":
            saw_unknown = False
            for sub in e[1:]:
                v = ev(sub)
                if v is True:
                    return True
                if v is None:
                    saw_unknown = True
            return None if saw_unknown else False
        if op == "not":
            v = ev(e[1])
            return None if v is None else (not v)
        if op == "otherwise":
            v = ev(e[1])
            return ev(e[2]) if v is None else v
        if op == "unknown":
            return ev(e[1]) is None
        if op in ("<", "<=", ">", ">=", "="):
            a, b = ev(e[1]), ev(e[2])
            if a is None or b is None:
                return None
            if isinstance(a, dt.date) or isinstance(b, dt.date):
                a, b = to_date(a), to_date(b)
            if op == "<":
                return a < b
            if op == "<=":
                return a <= b
            if op == ">":
                return a > b
            if op == ">=":
                return a >= b
            return a == b
        if op == "in":
            a = ev(e[1])
            return None if a is None else (a in e[2])
        if op in ("+", "*"):
            vals = [ev(s) for s in e[1:]]
            if any(v is None for v in vals):
                return None
            out = 0 if op == "+" else 1
            for v in vals:
                out = out + v if op == "+" else out * v
            return out
        if op == "-":
            a, b = ev(e[1]), ev(e[2])
            return None if a is None or b is None else a - b
        if op == "/":
            a, b = ev(e[1]), ev(e[2])
            return None if a is None or b is None else a / b
        if op == "min":
            a, b = ev(e[1]), ev(e[2])
            return None if a is None or b is None else min(a, b)
        if op == "years_between":
            a, b = ev(e[1]), ev(e[2])
            return None if a is None or b is None else years_between(a, b)
        if op == "first_day":
            m = ev(e[1])
            return None if m is None else first_day(m)
        if op == "month_of":
            d = ev(e[1])
            return None if d is None else month_of(d)
        if op == "month_before":
            m = ev(e[1])
            return None if m is None else add_months(m, -1)
        if op == "month_after":
            m = ev(e[1])
            return None if m is None else add_months(m, 1)
        if op == "months_ending":
            n, m = ev(e[1]), ev(e[2])
            return None if n is None or m is None else months_ending(int(n), m)
        if op == "months_from_to":
            a, b = ev(e[1]), ev(e[2])
            return None if a is None or b is None else months_from_to(a, b)
        if op == "at":
            m = ev(e[2])
            return None if m is None else self.eval(e[1], person, m, P)
        if op in ("each", "some_month", "count_months"):
            months = ev(e[1])
            if months is None:
                return None
            vals = [self.eval(e[2], person, m, P) for m in months]
            if op == "each":
                if any(v is False for v in vals):
                    return False
                return None if any(v is None for v in vals) else True
            if op == "some_month":
                if any(v is True for v in vals):
                    return True
                return None if any(v is None for v in vals) else False
            return None if any(v is None for v in vals) else sum(1 for v in vals if v)
        if op == "avg":
            months = ev(e[2])
            if months is None:
                return None
            vals = [self.eval(e[1], person, m, P) for m in months]
            if any(v is None for v in vals) or not vals:
                return None
            return sum(vals) / len(vals)
        if op == "case":
            for arm in e[1:]:
                if arm[0] == "else":
                    return ev(arm[1])
                c = ev(arm[0])
                if c is None:
                    return None
                if c:
                    return ev(arm[1])
            return None
        if op == "exists":
            group = ev(e[1])
            if group is None:
                return None
            saw_unknown = False
            for pid in group:
                v = self.eval(e[2], person, month, pid)
                if v is True:
                    return True
                if v is None:
                    saw_unknown = True
            return None if saw_unknown else False
        if op == "exists_related":
            rels = self.case.relationships.get(person)
            if rels is None:
                return None
            cands = [pid for r, pid in rels if r in e[1]]
            saw_unknown = False
            for pid in cands:
                v = self.eval(e[2], person, month, pid)
                if v is True:
                    return True
                if v is None:
                    saw_unknown = True
            return None if saw_unknown else False
        if op == "rel":
            target = ev(e[2])
            rels = self.case.relationships.get(person)
            if rels is None:
                return None
            return any(r in e[1] and pid == target for r, pid in rels)
        if op == "in_group":
            target = ev(e[1])
            group = ev(e[2])
            return None if group is None else (target in group)
        if op == "of":
            target = ev(e[1])
            if target is None:
                return None
            return self.eval(e[2], target, month, P)
        if op == "lookup":
            table = ev(e[1])
            key = ev(e[2])
            if table is None or key is None:
                return None
            return table.get(key)
        raise ValueError(f"unknown operator {op!r}")


# ----------------------------------------------------------------------------
# Tests
# ----------------------------------------------------------------------------

def build_test_case(led, it, t):
    as_of = (t.get("given") or {}).get("determination_date") or t.get("as_of") or led.meta.get("default_as_of")
    case = Case(led, as_of, params=t.get("parameters") or {})
    case.add_person("p1", {"relationships": t.get("relationships"), "month_defaults": t.get("month_defaults")})
    month = t.get("month")
    for k, v in (t.get("given") or {}).items():
        case.set_fact("p1", k, v, test_month=month)
    for pid, facts in (t.get("others") or {}).items():
        case.add_person(pid, {"facts": facts})
    return case, month


def values_equal(got, expect):
    if expect == "unknown":
        return got is None
    if got is None:
        return False
    if isinstance(expect, float) or isinstance(got, float):
        try:
            return math.isclose(float(got), float(expect), rel_tol=1e-9, abs_tol=1e-9)
        except (TypeError, ValueError):
            return False
    if isinstance(expect, str) and DATE_RE.match(expect):
        return to_date(got) == to_date(expect)
    return got == expect


def run_rule_tests(led, out):
    passed = failed = 0
    for it in led.items:
        for t in it.get("tests", []) or []:
            case, month = build_test_case(led, it, t)
            ev = Evaluator(led, case)
            person = None if it["scope"] in ("global", "case", "month") else "p1"
            try:
                got = ev.value(it["identifier"], person, month)
                ok = True
                if "expect" in t:
                    ok = values_equal(got, t["expect"])
                if "expect_length" in t:
                    ok = ok and isinstance(got, list) and len(got) == t["expect_length"]
                if "expect_first" in t:
                    ok = ok and got and got[0] == t["expect_first"]
                if "expect_last" in t:
                    ok = ok and got and got[-1] == t["expect_last"]
            except Exception as ex:  # noqa
                ok, got = False, f"error: {ex}"
            if ok:
                passed += 1
            else:
                failed += 1
                out.append(f"FAIL {t.get('id')} ({it['identifier']}): expected {t.get('expect')!r}, got {got!r}")
    return passed, failed


def load_cases():
    path = os.path.join(HERE, "tests", "cases.yaml")
    return yaml.safe_load(open(path)) or []


def run_cases(led, out):
    passed = failed = 0
    for c in load_cases():
        case = Case(led, c["as_of"], params=c.get("parameters") or {},
                    month_facts=c.get("month_facts") or {})
        for pid, p in c["persons"].items():
            case.add_person(pid, p)
        ev = Evaluator(led, case)
        for pid, expectations in (c.get("expect") or {}).items():
            for ident, exp in expectations.items():
                it = led.by_identifier[ident]
                pairs = exp.items() if (it["scope"] == "person-month" and isinstance(exp, dict)) else [(None, exp)]
                for month, e in pairs:
                    try:
                        got = ev.value(ident, pid, month)
                        ok = values_equal(got, e)
                    except Exception as ex:  # noqa
                        ok, got = False, f"error: {ex}"
                    if ok:
                        passed += 1
                    else:
                        failed += 1
                        where = f"{c['id']} {pid}.{ident}" + (f"@{month}" if month else "")
                        out.append(f"FAIL {where}: expected {e!r}, got {got!r}")
    return passed, failed


# ----------------------------------------------------------------------------
# Rendering: pattern English
# ----------------------------------------------------------------------------

class Renderer:
    def __init__(self, led):
        self.led = led

    def fact(self, ident):
        it = self.led.by_identifier[ident]
        if it["kind"] == "parameter":
            v = it.get("value")
            if v is None and it.get("versions"):
                v = it["versions"][-1]["value"]
            return f"{it['name']} ({self.lit(v)})"
        return it["name"]

    def lit(self, v):
        if v is True:
            return "yes"
        if v is False:
            return "no"
        if isinstance(v, float) and v.is_integer():
            return str(int(v))
        return str(v)

    def inline(self, e):
        """Single-line English for an expression."""
        if isinstance(e, bool):
            return self.lit(e)
        if isinstance(e, (int, float)):
            return self.lit(e)
        if isinstance(e, str):
            if e in self.led.by_identifier:
                return self.fact(e)
            return e
        op = e[0]
        i = self.inline
        if op == "P":
            return "that person"
        if op == "det_date":
            return "the Determination Date"
        if op == "det_month":
            return "the month containing the Determination Date"
        if op == "month":
            return "the month"
        if op == "not":
            return "it is not the case that " + i(e[1])
        if op == "otherwise":
            return f"{i(e[1])}, otherwise {i(e[2])}"
        if op == "unknown":
            return f"{i(e[1])} is unknown"
        if op in ("<", "<=", ">", ">=", "="):
            words = {"<": "is less than", "<=": "is at most", ">": "is more than", ">=": "is at least", "=": "is equal to"}
            return f"{self.operand(e[1])} {words[op]} {self.operand(e[2])}"
        if op == "in":
            return f"{i(e[1])} is one of: " + ", ".join(e[2])
        if op in ("+", "*", "-", "/"):
            words = {"+": " plus ", "*": " times ", "-": " minus ", "/": " divided by "}
            return words[op].join(self.operand(s) for s in e[1:])
        if op == "min":
            return f"the lesser of {i(e[1])} and {i(e[2])}"
        if op == "years_between":
            return f"the number of whole years between {i(e[1])} and {i(e[2])}"
        if op == "first_day":
            return f"the first day of {i(e[1])}"
        if op == "month_of":
            return f"the month containing {i(e[1])}"
        if op == "month_before":
            return f"the month before {i(e[1])}"
        if op == "month_after":
            return f"the month after {i(e[1])}"
        if op == "months_ending":
            return f"the {i(e[1])} consecutive months ending with {i(e[2])}"
        if op == "months_from_to":
            return f"the months from {i(e[1])} through {i(e[2])}"
        if op == "at":
            return f"{i(e[1])} for {i(e[2])}"
        if op == "count_months":
            return f"the number of months in {i(e[1])} for which {i(e[2])}"
        if op == "avg":
            return f"{i(e[1])} averaged over {i(e[2])}"
        if op == "rel":
            return "this person is a " + " or ".join(e[1]) + f" of {i(e[2])}"
        if op == "in_group":
            return f"{i(e[1])} is in {i(e[2])}"
        if op == "of":
            return f"{i(e[1])}'s {i(e[2])}"
        if op == "lookup":
            return f"{i(e[1])}, for {i(e[2])}"
        if op in BLOCK_OPS:
            return "(" + "; ".join(self.block(e)) + ")"
        raise ValueError(op)

    def operand(self, e):
        """Inline rendering with parentheses around constructs that would otherwise be ambiguous as operands."""
        if isinstance(e, list) and e and e[0] in ("+", "*", "-", "/", "otherwise", "min", "years_between", "count_months", "avg"):
            return "(" + self.inline(e) + ")"
        return self.inline(e)

    def block(self, e, indent=0):
        """Multi-line English. Returns a list of lines."""
        pad = "  " * indent
        if not (isinstance(e, list) and e and e[0] in BLOCK_OPS):
            return [pad + self.inline(e)]
        op = e[0]
        if op in ("all", "any"):
            head = "all of the following are true:" if op == "all" else "any of the following is true:"
            lines = [pad + head]
            for sub in e[1:]:
                sub_lines = self.block(sub, indent + 1)
                sub_lines[0] = pad + "  - " + sub_lines[0].lstrip()
                lines += sub_lines
            return lines
        if op == "case":
            lines = []
            for n, arm in enumerate(e[1:]):
                if arm[0] == "else":
                    lines.append(pad + "otherwise " + self.inline(arm[1]))
                else:
                    cond = self.block(arm[0], indent + 1)
                    lead = "if " if n == 0 else "else if "
                    lines.append(pad + lead + cond[0].lstrip() + ("" if len(cond) == 1 else ""))
                    lines += cond[1:]
                    lines.append(pad + "  then " + self.inline(arm[1]))
            return lines
        if op == "exists":
            lines = [pad + f"there is a person in {self.inline(e[1])} such that"]
            return lines + self.block(e[2], indent + 1)
        if op == "exists_related":
            rels = ", ".join(e[1][:-1]) + (", or " if len(e[1]) > 1 else "") + e[1][-1]
            lines = [pad + f"there is a person of whom this person is a {rels} such that"]
            return lines + self.block(e[2], indent + 1)
        if op == "each":
            return [pad + f"in each of {self.inline(e[1])}:"] + self.block(e[2], indent + 1)
        if op == "some_month":
            return [pad + f"in at least one of {self.inline(e[1])}:"] + self.block(e[2], indent + 1)
        raise ValueError(op)

    # --- compact engineer form ---------------------------------------------
    def compact(self, e):
        if isinstance(e, bool):
            return "true" if e else "false"
        if isinstance(e, (int, float)):
            return self.lit(e)
        if isinstance(e, str):
            if e in self.led.by_identifier:
                return e
            if DATE_RE.match(e) or MONTH_RE.match(e):
                return e
            return repr(e)
        op = e[0]
        c = self.compact
        if op == "P":
            return "P"
        if op in ("det_date", "det_month", "month"):
            return op
        if op in ("<", "<=", ">", ">=", "=", "+", "*", "-", "/"):
            return "(" + f" {op} ".join(c(s) for s in e[1:]) + ")"
        if op == "in":
            return f"{c(e[1])} in {{{', '.join(repr(x) for x in e[2])}}}"
        if op == "case":
            arms = []
            for arm in e[1:]:
                if arm[0] == "else":
                    arms.append("else " + c(arm[1]))
                else:
                    arms.append(f"{c(arm[0])} -> {c(arm[1])}")
            return "case(" + "; ".join(arms) + ")"
        if op in ("rel", "exists_related"):
            return f"{op}([{', '.join(repr(x) for x in e[1])}], {c(e[2])})"
        return op + "(" + ", ".join(c(s) for s in e[1:]) + ")"


# ----------------------------------------------------------------------------
# Rendering: documents
# ----------------------------------------------------------------------------

def approvals_for(led, it):
    pol = led.meta.get("approval_policy", {})
    roles = list(pol.get("by_program", {}).get(it["program"], []))
    roles += pol.get("by_kind", {}).get(it["kind"], [])
    for tag in it.get("tags", []) or []:
        roles += pol.get("by_tag", {}).get(tag, [])
    seen, out = set(), []
    for r in roles:
        if r not in seen:
            seen.add(r)
            out.append(r)
    return out


def fmt_value(v):
    if v is True:
        return "yes"
    if v is False:
        return "no"
    if isinstance(v, list):
        return "[" + ", ".join(fmt_value(x) for x in v) + "]"
    if isinstance(v, dict):
        return "{" + ", ".join(f"{k}: {fmt_value(x)}" for k, x in v.items()) + "}"
    return str(v)


def render_tests_table(it):
    tests = it.get("tests") or []
    if not tests:
        return []
    lines = ["Examples"]
    for t in tests:
        given = dict(t.get("given") or {})
        bits = []
        if t.get("as_of"):
            bits.append(f"as of {t['as_of']}")
        if t.get("month"):
            bits.append(f"month {t['month']}")
        if t.get("parameters"):
            bits.append("parameters " + ", ".join(f"{k}={fmt_value(v)}" for k, v in t["parameters"].items()))
        for k, v in given.items():
            bits.append(f"{k}={fmt_value(v)}")
        if t.get("relationships") is not None:
            bits.append("relationships " + fmt_value(t["relationships"]))
        if t.get("others"):
            bits.append("others " + fmt_value(t["others"]))
        if t.get("month_defaults"):
            bits.append("other months " + fmt_value(t["month_defaults"]))
        exp = fmt_value(t.get("expect", ""))
        if "expect_length" in t:
            exp = f"{t['expect_length']} months, {t['expect_first']} through {t['expect_last']}"
        lines.append(f"  {t['id']}: given " + "; ".join(bits) + f" => {exp}")
    return lines


def item_block(led, it, R, sources, oqs, deps):
    L = []
    L.append("```")
    L.append(f"ID            {it['id']}")
    L.append(f"Fact          {it['name']}")
    L.append(f"Identifier    {it['identifier']}")
    L.append(f"Kind          {it['kind'].capitalize()}")
    typ = it["type"] + (": " + ", ".join(it["options"]) if it.get("options") else "")
    L.append(f"Type          {typ}")
    L.append(f"Scope         {it['scope']}")
    L.append(f"Program       {it['program']}")
    if it.get("role"):
        L.append(f"Role          {it['role']}")
    L.append("Meaning       " + it["meaning"].strip())
    if it.get("precision"):
        L.append("Precision     " + it["precision"].strip())
    if it.get("assumption"):
        L.append("Assumption    " + it["assumption"].strip())
    if it["kind"] == "supplied":
        L.append("Supplied by   " + it["supplied_by"].strip())
    if it["kind"] == "parameter":
        if "versions" in it:
            for v in it["versions"]:
                L.append(f"Value         {R.lit(v['value'])} effective {v['from']}")
        else:
            L.append(f"Value         {R.lit(it['value'])}")
    if it["kind"] == "derived":
        lines = R.block(it["derived"])
        L.append("Derived as    " + lines[0])
        for ln in lines[1:]:
            L.append("              " + ln)
        uses = sorted(deps.get(it["identifier"], []))
        if uses:
            L.append("Uses          " + ", ".join(led.by_identifier[u]["name"] for u in uses))
    if it.get("sources"):
        L.append("Source        " + "; ".join(f"{s} {sources.get(s, '')}" for s in it["sources"]))
    if it.get("effective"):
        L.append(f"Effective     {it['effective']['from']} to {it['effective']['to']}")
    if it["kind"] == "derived":
        L.append("Implemented   " + ("Fact assembly" if it["implemented"] == "assembly" else "Determination engine"))
    L += render_tests_table(it)
    L.append("Approval      " + ", ".join(approvals_for(led, it)))
    L.append("Status        Draft")
    if it.get("open"):
        L.append("Open          " + "; ".join(f"{q} {oqs.get(q, '')}" for q in it["open"]))
    L.append("```")
    return L


def render_codex_md(led, deps):
    R = Renderer(led)
    sources, oqs = load_sources(), load_open_questions()
    meta = led.meta
    out = [f"# Codex: {meta['title']}", ""]
    out.append(f"Volume `{meta['volume']}`, version {meta['version']}. {meta['status']}")
    out.append("")
    out.append("One ledger. Every item is a fact: supplied, derived, or parameter. A rule is a derived fact. Where a derived fact runs is the `Implemented` tag, which can change without changing the item. Derivations are written only in the pattern catalog in the repository README; this document is rendered from `ledger/*.yaml` by `codex_tool.py` and is never edited by hand.")
    out.append("")
    out.append("## Approval policy")
    out.append("")
    pol = meta.get("approval_policy", {})
    out.append("Roles: " + ", ".join(pol.get("roles", [])) + ".")
    out.append("")
    for prog, roles in pol.get("by_program", {}).items():
        out.append(f"- Program {prog}: {', '.join(roles)}")
    for kind, roles in pol.get("by_kind", {}).items():
        out.append(f"- Kind {kind}: adds {', '.join(roles)}")
    for tag, roles in pol.get("by_tag", {}).items():
        out.append(f"- Tag `{tag}`: adds {', '.join(roles)}")
    out.append("")
    chapters = [
        ("Supplied facts", lambda i: i["kind"] == "supplied"),
        ("Parameters", lambda i: i["kind"] == "parameter"),
        ("Derived facts, shared", lambda i: i["kind"] == "derived" and i["program"] == "All"),
        ("Derived facts, Medicaid community engagement", lambda i: i["kind"] == "derived" and i["program"] == "Medicaid"),
        ("Derived facts, SNAP work requirements", lambda i: i["kind"] == "derived" and i["program"] == "SNAP"),
    ]
    out.append("## Contents")
    out.append("")
    for title, pred in chapters:
        items = [i for i in led.items if pred(i)]
        out.append(f"- {title} ({len(items)} items)")
    out.append("")
    for title, pred in chapters:
        items = [i for i in led.items if pred(i)]
        out.append(f"## {title}")
        out.append("")
        for it in items:
            out.append(f"### {it['id']} {it['name']}")
            out.append("")
            out += item_block(led, it, R, sources, oqs, deps)
            out.append("")
    return "\n".join(out) + "\n"


def render_handoff_md(led, deps):
    R = Renderer(led)
    out = ["# Engineer handoff: work requirements", ""]
    out.append("Generated from `ledger/*.yaml`. One line per item. `@assembly` items are implemented in the fact-assembly layer; `@engine` items in the determination engine. Types and scopes are those of the codex. `unknown` propagates: any derivation whose inputs are unknown is unknown unless an `otherwise` supplies a default, and an unknown outcome is reported as *cannot determine* with the list of unknown supplied facts.")
    out.append("")
    out.append("## Supplied facts (the interface the fact-assembly layer must deliver)")
    out.append("")
    out.append("| Identifier | Type | Scope | Program | Consumed by |")
    out.append("|---|---|---|---|---|")
    consumers = {}
    for k, ds in deps.items():
        for d in ds:
            consumers.setdefault(d, []).append(k)
    for it in led.items:
        if it["kind"] == "supplied":
            cons = ", ".join(sorted(consumers.get(it["identifier"], []))) or "(none)"
            out.append(f"| `{it['identifier']}` | {it['type']} | {it['scope']} | {it['program']} | {cons} |")
    out.append("")
    out.append("## Parameters")
    out.append("")
    out.append("| Identifier | Value | Type | Program | State election |")
    out.append("|---|---|---|---|---|")
    for it in led.items:
        if it["kind"] == "parameter":
            v = it.get("value")
            if v is None:
                v = it["versions"][-1]["value"]
            se = "yes" if "state_election" in (it.get("tags") or []) else ""
            out.append(f"| `{it['identifier']}` | {R.lit(v)} | {it['type']} | {it['program']} | {se} |")
    out.append("")
    for target, title in (("assembly", "Fact assembly layer"), ("engine", "Determination engine")):
        out.append(f"## Derived facts: {title}")
        out.append("")
        out.append("```")
        for it in led.items:
            if it["kind"] == "derived" and it["implemented"] == target:
                ntests = len(it.get("tests") or [])
                role = "  [outcome]" if it.get("role") == "outcome" else ""
                out.append(f"{it['identifier']} : {it['type']} [{it['scope']}]{role}")
                out.append(f"  = {R.compact(it['derived'])}")
                out.append(f"  depends: {', '.join(sorted(deps.get(it['identifier'], []))) or '-'}")
                out.append(f"  tests: {ntests}   id: {it['id']}")
        out.append("```")
        out.append("")
    out.append("## Dependency graph, derived facts only")
    out.append("")
    out.append("```mermaid")
    out.append("flowchart LR")
    for target, title in (("assembly", "Fact assembly"), ("engine", "Determination engine")):
        out.append(f"  subgraph {target}[{title}]")
        for it in led.items:
            if it["kind"] == "derived" and it["implemented"] == target:
                shape = f'{it["identifier"]}[["{it["identifier"]}"]]' if it.get("role") == "outcome" else f'{it["identifier"]}["{it["identifier"]}"]'
                out.append("    " + shape)
        out.append("  end")
    for it in led.items:
        if it["kind"] == "derived":
            for d in sorted(deps.get(it["identifier"], [])):
                if led.by_identifier[d]["kind"] == "derived":
                    out.append(f"  {d} --> {it['identifier']}")
    out.append("```")
    out.append("")
    return "\n".join(out) + "\n"


def export_rule_tests(led):
    out = []
    for it in led.items:
        for t in it.get("tests") or []:
            rec = {"id": t["id"], "item": it["id"], "identifier": it["identifier"],
                   "implemented": it.get("implemented"),
                   "as_of": t.get("as_of") or led.meta.get("default_as_of")}
            for k in ("month", "parameters", "given", "relationships", "others", "month_defaults"):
                if k in t:
                    rec[k] = t[k]
            for k in ("expect", "expect_length", "expect_first", "expect_last"):
                if k in t:
                    rec[k] = t[k]
            out.append(rec)
    return out


# ----------------------------------------------------------------------------
# Approach A rendering: two ledgers from the same source
# ----------------------------------------------------------------------------

def a_codes(led):
    """Assign Approach A codes. DE = data element, RV = reference value, RL = rule."""
    codes = {}
    n_de = n_rv = n_rl = 0
    for it in led.items:
        if it["kind"] == "supplied" or (it["kind"] == "derived" and it["implemented"] == "assembly"):
            n_de += 1
            codes[it["identifier"]] = f"DE-{n_de:03d}"
        elif it["kind"] == "parameter":
            n_rv += 1
            codes[it["identifier"]] = f"RV-{n_rv:03d}"
        else:
            n_rl += 1
            codes[it["identifier"]] = f"RL-{n_rl:03d}"
    return codes


def a_ledger_of(code):
    return "data dictionary" if code.startswith("DE-") else "rules codex"


def render_approach_a(led, deps):
    R = Renderer(led)
    sources, oqs = load_sources(), load_open_questions()
    codes = a_codes(led)
    consumers = {}
    for k, ds in deps.items():
        for d in ds:
            consumers.setdefault(d, []).append(k)

    def cite(ident):
        c = codes[ident]
        return f"{c} {led.by_identifier[ident]['name']}"

    # ---- data dictionary
    dd = ["# Data Dictionary: Work Requirements", ""]
    dd.append("Ledger 1 of 2 in Approach A. Owned by the fact-assembly (data) team. Holds every data element the rules consume, and the derivation logic for derived data elements. Rules live in `rules-codex.md`; reference values (thresholds, ages, dates) live there too and are cited from here by RV code.")
    dd.append("")
    dd.append("Rendered from the same canonical source as Approach B+ so that the content is identical and only the structure differs. A hand-authored data dictionary would not have that guarantee.")
    dd.append("")
    dd.append("## Data elements")
    dd.append("")
    dd.append("| Code | Element | Data type | Cardinality | Programs | Source system | Consumed by rules |")
    dd.append("|---|---|---|---|---|---|---|")
    for it in led.items:
        if it["kind"] == "supplied":
            cons = ", ".join(codes[c] for c in sorted(consumers.get(it["identifier"], [])) if codes[c].startswith("RL-"))
            dd.append(f"| {codes[it['identifier']]} | {it['name']} | {it['type']} | {it['scope']} | {it['program']} | {it['supplied_by']} | {cons or '-'} |")
    dd.append("")
    dd.append("### Definitions")
    dd.append("")
    for it in led.items:
        if it["kind"] == "supplied":
            dd.append(f"**{codes[it['identifier']]} {it['name']}.** {it['meaning'].strip()}")
            extra = []
            if it.get("options"):
                extra.append("Allowed values: " + ", ".join(it["options"]) + ".")
            if it.get("sources"):
                extra.append("Source: " + "; ".join(f"{s} {sources.get(s, '')}" for s in it["sources"]) + ".")
            extra.append("Approval: " + ", ".join(approvals_for(led, it)) + ".")
            if it.get("open"):
                extra.append("Open: " + "; ".join(it["open"]) + ".")
            dd.append(" ".join(extra))
            dd.append("")
    dd.append("## Derived data elements")
    dd.append("")
    dd.append("Computed by the fact-assembly layer and delivered to the rules engine as if supplied. Derivation logic is normative and requires the approvals listed.")
    dd.append("")
    for it in led.items:
        if it["kind"] == "derived" and it["implemented"] == "assembly":
            dd.append(f"### {codes[it['identifier']]} {it['name']}")
            dd.append("")
            dd.append("```")
            dd.append(f"Data type      {it['type']}" + (": " + ", ".join(it["options"]) if it.get("options") else ""))
            dd.append(f"Cardinality    {it['scope']}")
            dd.append(f"Programs       {it['program']}")
            dd.append("Definition     " + it["meaning"].strip())
            if it.get("precision"):
                dd.append("Precision      " + it["precision"].strip())
            lines = R.block(it["derived"])
            dd.append("Derivation     " + lines[0])
            for ln in lines[1:]:
                dd.append("               " + ln)
            ins = sorted(deps.get(it["identifier"], []))
            dd.append("Inputs         " + ", ".join(cite(i) for i in ins))
            xref = [i for i in ins if codes[i].startswith("RV-") or codes[i].startswith("RL-")]
            if xref:
                dd.append("Cross-ledger   " + ", ".join(codes[i] for i in xref) + " (rules codex)")
            if it.get("sources"):
                dd.append("Source         " + "; ".join(f"{s} {sources.get(s, '')}" for s in it["sources"]))
            dd.append("Consumed by    " + (", ".join(codes[c] for c in sorted(consumers.get(it["identifier"], []))) or "-"))
            dd.append("Approval       " + ", ".join(approvals_for(led, it)))
            dd.append("Status         Draft")
            if it.get("open"):
                dd.append("Open           " + "; ".join(f"{q} {oqs.get(q, '')}" for q in it["open"]))
            dd.append("```")
            dd.append("")
    # ---- rules codex
    rc = ["# Rules Codex: Work Requirements", ""]
    rc.append("Ledger 2 of 2 in Approach A. Owned by the policy team and implemented by the rules-engine team. Rules consume data elements from `data-dictionary.md` by DE code. Reference values are held here.")
    rc.append("")
    rc.append("## Reference values")
    rc.append("")
    rc.append("| Code | Name | Value | Program | State election | Source |")
    rc.append("|---|---|---|---|---|---|")
    for it in led.items:
        if it["kind"] == "parameter":
            v = it.get("value")
            if v is None:
                v = it["versions"][-1]["value"]
            se = "yes" if "state_election" in (it.get("tags") or []) else ""
            src = ", ".join(it.get("sources") or [])
            rc.append(f"| {codes[it['identifier']]} | {it['name']} | {R.lit(v)} | {it['program']} | {se} | {src} |")
    rc.append("")
    for it in led.items:
        if it["kind"] == "parameter" and it.get("assumption"):
            rc.append(f"- {codes[it['identifier']]}: {it['assumption']}" + (" Open: " + ", ".join(it["open"]) + "." if it.get("open") else ""))
    rc.append("")
    rc.append("## Rules")
    rc.append("")
    for it in led.items:
        if it["kind"] == "derived" and it["implemented"] == "engine":
            rc.append(f"### {codes[it['identifier']]} {it['name']}")
            rc.append("")
            rc.append("```")
            rc.append(f"Program        {it['program']}")
            rc.append(f"Evaluated per  {it['scope']}")
            rc.append(f"Result type    {it['type']}" + (": " + ", ".join(it["options"]) if it.get("options") else ""))
            if it.get("role"):
                rc.append("Role           outcome")
            rc.append("Statement      " + it["meaning"].strip())
            lines = R.block(it["derived"])
            head = "Satisfied when " if it["type"] == "yes/no" else "Result         "
            rc.append(head + lines[0])
            for ln in lines[1:]:
                rc.append("               " + ln)
            ins = sorted(deps.get(it["identifier"], []))
            de = [i for i in ins if codes[i].startswith("DE-")]
            rl = [i for i in ins if codes[i].startswith("RL-")]
            rv = [i for i in ins if codes[i].startswith("RV-")]
            if de:
                rc.append("Data elements  " + ", ".join(cite(i) for i in de) + " (data dictionary)")
            if rl:
                rc.append("Rules used     " + ", ".join(cite(i) for i in rl))
            if rv:
                rc.append("Ref. values    " + ", ".join(cite(i) for i in rv))
            if it.get("sources"):
                rc.append("Source         " + "; ".join(f"{s} {sources.get(s, '')}" for s in it["sources"]))
            if it.get("effective"):
                rc.append(f"Effective      {it['effective']['from']} to {it['effective']['to']}")
            rc.append("Approval       " + ", ".join(approvals_for(led, it)))
            rc.append("Status         Draft")
            if it.get("open"):
                rc.append("Open           " + "; ".join(f"{q} {oqs.get(q, '')}" for q in it["open"]))
            rc.append("```")
            rc.append("")
    # ---- interface
    itf = ["# Interface Contract: Data Dictionary to Rules Codex", ""]
    itf.append("What crosses the boundary between the two ledgers, in both directions, and the places where the split forces an awkward placement.")
    itf.append("")
    n_de_used = sum(1 for it in led.items if codes[it["identifier"]].startswith("DE-") and any(codes[c].startswith("RL-") for c in consumers.get(it["identifier"], [])))
    back = [(it, [i for i in sorted(deps.get(it["identifier"], [])) if not codes[i].startswith("DE-")]) for it in led.items if codes[it["identifier"]].startswith("DE-") and it["kind"] == "derived"]
    back = [(it, xs) for it, xs in back if xs]
    legal_in_dd = [it for it in led.items if codes[it["identifier"]].startswith("DE-") and "Legal" in approvals_for(led, it)]
    itf.append("## Counts")
    itf.append("")
    itf.append(f"- Data elements consumed by at least one rule: {n_de_used}")
    itf.append(f"- Derived data elements that reach back into the rules codex for reference values: {len(back)}")
    itf.append(f"- Data dictionary entries whose approval includes Legal: {len(legal_in_dd)}")
    itf.append("")
    itf.append("## Data elements the rules consume")
    itf.append("")
    itf.append("| Code | Element | Consuming rules |")
    itf.append("|---|---|---|")
    for it in led.items:
        c = codes[it["identifier"]]
        if c.startswith("DE-"):
            rls = [codes[x] for x in sorted(consumers.get(it["identifier"], [])) if codes[x].startswith("RL-")]
            if rls:
                itf.append(f"| {c} | {it['name']} | {', '.join(rls)} |")
    itf.append("")
    itf.append("## Derived data elements that depend on the rules codex")
    itf.append("")
    itf.append("These live in the data dictionary because the fact-assembly layer computes them, but their logic cites reference values held in the rules codex. A change to the reference value is a rules-codex change set that silently changes a data element.")
    itf.append("")
    for it, xs in back:
        itf.append(f"- {codes[it['identifier']]} {it['name']} uses " + ", ".join(cite(x) for x in xs))
    itf.append("")
    itf.append("## Data dictionary entries requiring Legal approval")
    itf.append("")
    itf.append("Policy interpretation that the split placed on the data side. The data dictionary's approval path was designed for data stewards, not statutory interpretation.")
    itf.append("")
    for it in legal_in_dd:
        itf.append(f"- {codes[it['identifier']]} {it['name']}" + (" (open: " + ", ".join(it["open"]) + ")" if it.get("open") else ""))
    itf.append("")
    itf.append("## Code map")
    itf.append("")
    itf.append("| Approach A code | Codex ID | Identifier |")
    itf.append("|---|---|---|")
    for it in led.items:
        itf.append(f"| {codes[it['identifier']]} | {it['id']} | `{it['identifier']}` |")
    itf.append("")
    # ---- tests split
    data_tests, rule_tests = [], []
    for rec in export_rule_tests(led):
        (data_tests if codes[rec["identifier"]].startswith("DE-") else rule_tests).append(dict(rec, code=codes[rec["identifier"]]))
    return "\n".join(dd) + "\n", "\n".join(rc) + "\n", "\n".join(itf) + "\n", data_tests, rule_tests


# ----------------------------------------------------------------------------
# Impact
# ----------------------------------------------------------------------------

def impact(led, deps, ident):
    consumers = {}
    for k, ds in deps.items():
        for d in ds:
            consumers.setdefault(d, set()).add(k)
    seen, frontier = [], [ident]
    while frontier:
        cur = frontier.pop()
        for c in sorted(consumers.get(cur, [])):
            if c not in seen:
                seen.append(c)
                frontier.append(c)
    return seen


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------

def main(argv):
    cmd = argv[1] if len(argv) > 1 else "check"
    led = Ledger.load()
    errors, warnings, deps = validate(led)
    if cmd == "check":
        print(f"items: {len(led.items)}  (supplied {sum(1 for i in led.items if i['kind']=='supplied')}, parameters {sum(1 for i in led.items if i['kind']=='parameter')}, derived {sum(1 for i in led.items if i['kind']=='derived')})")
        for e in errors:
            print("ERROR", e)
        for w in warnings:
            print("warn ", w)
        out = []
        p, f = run_rule_tests(led, out)
        print(f"rule tests: {p} passed, {f} failed")
        cp, cf = run_cases(led, out)
        print(f"case expectations: {cp} passed, {cf} failed")
        for line in out:
            print(line)
        return 1 if (errors or f or cf) else 0
    if cmd == "render":
        if errors:
            for e in errors:
                print("ERROR", e)
            return 1
        open(os.path.join(HERE, "codex.md"), "w").write(render_codex_md(led, deps))
        open(os.path.join(HERE, "handoff.md"), "w").write(render_handoff_md(led, deps))
        os.makedirs(os.path.join(HERE, "tests"), exist_ok=True)
        yaml.safe_dump(export_rule_tests(led), open(os.path.join(HERE, "tests", "rule-tests.yaml"), "w"), sort_keys=False, allow_unicode=True)
        dd, rc, itf, dtests, rtests = render_approach_a(led, deps)
        os.makedirs(os.path.join(A_DIR, "tests"), exist_ok=True)
        open(os.path.join(A_DIR, "data-dictionary.md"), "w").write(dd)
        open(os.path.join(A_DIR, "rules-codex.md"), "w").write(rc)
        open(os.path.join(A_DIR, "interface.md"), "w").write(itf)
        yaml.safe_dump(dtests, open(os.path.join(A_DIR, "tests", "data-tests.yaml"), "w"), sort_keys=False, allow_unicode=True)
        yaml.safe_dump(rtests, open(os.path.join(A_DIR, "tests", "rule-tests.yaml"), "w"), sort_keys=False, allow_unicode=True)
        cases_src = os.path.join(HERE, "tests", "cases.yaml")
        if os.path.exists(cases_src):
            open(os.path.join(A_DIR, "tests", "cases.yaml"), "w").write(open(cases_src).read())
        print("rendered codex.md, handoff.md, tests/rule-tests.yaml, and approach-a/*")
        return 0
    if cmd == "impact":
        ident = argv[2]
        codes = a_codes(led)
        hit = impact(led, deps, ident)
        print(f"{ident} ({codes[ident]}) is used, directly or indirectly, by {len(hit)} items:")
        for h in hit:
            it = led.by_identifier[h]
            print(f"  {it['id']:8} {codes[h]:7} {it['implemented'] if it['kind']=='derived' else it['kind']:9} {h}")
        ledgers = sorted({a_ledger_of(codes[h]) for h in hit} | {a_ledger_of(codes[ident])})
        print("Approach A ledgers touched: " + ", ".join(ledgers))
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))

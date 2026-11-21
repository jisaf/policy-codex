# Stakeholder review: implementing the `co` volume in Progress Corticon

Reviewer role: senior Progress Corticon developer (Corticon Studio vocabularies, rulesheets,
ruleflows, ruletests; Corticon.js and Corticon Server deployment) asked to implement this codex for a
state eligibility system and pass its conformance suite. Read-only review at commit `933ce0c`
(branch `ccr-9d19bf4c-wmnwcl`; the later commits up to `28fd4f9` add only other reviews). Question
answered: could I do it without guessing?

Short answer: **not as delivered, but close.** Every derivation can be expressed in Corticon, and the
suite's stdin/stdout protocol drives Corticon.js or Corticon Server without change. What stops me is
not Corticon. (1) The documented commands hand me the wrong volume. (2) The exported CO suite holds
16 expectations that no faithful engine can meet. (3) Five case-shaping conventions the codex engine
applies are in no document (section 5), and I found them only by reading `src/engine/evaluate.ts`. With
those five built into my adapter, a payload-fidelity test (below) passes 4,196 of 4,197. The
Corticon work itself is large: unknown propagation costs 3-5 times the codex's own size, and closures,
month windows and list outputs need redesign. Estimate 220-385 person-days (section 6).

The Drools and fact-graph reviews (stakeholder-drools.md, stakeholder-factgraph.md) found the
suite problems in B-1 to B-3 on their own. Three engines reaching the same blockers is a strong
signal; the fixes are cheap.

Prototype files (not in the repo): `/tmp/claude-0/corticon-proto/` holds `vocabulary.md`,
`rulesheets.md`, `ruleflow.csv`, and `adapter/` (a runnable adapter sketch and a fidelity mock).

---

## 1. What I read and ran

| Step | Result |
|---|---|
| `npm run conformance` (as docs/conformance.md says) | Wrote **146 cases from `mwr`**, not `co`. `--volume co` (undocumented) gives 2,047 cases (2,032 rule tests, 15 household), **4,197 expectations**, `notes: []`. |
| `npm run handoff` | Also defaults to `mwr`. The committed `handoff.md` is the **MWR** handoff (last regenerated 2026-09-11). I generated the CO handoff (10,738 lines, 1,283 items) into my scratch directory rather than overwrite the tracked file. |
| `npm run conform:self` on the CO suite | Shipped adapter: 29 checked, 4 passed, **25 failed, 4,168 unimplemented** (it loads `volumes[0]`). 5 of 7 runs died with `spawnSync /bin/sh EPIPE` instead. |
| Codex evaluator, CO-aware, out of process, over the exported CO suite | **4,181 passed, 16 failed**: the suite is not self-consistent (B-2). |
| My Corticon adapter, dry run | Builds all 2,047 payloads: 186,732 PersonMonth rows, 25 MB at a 60-month window. |
| My adapter, fidelity mock (codex evaluator fed only the Corticon payload) | First run **117 failed** (scope routing, S-1). After the fix, **4,196 passed, 1 failed** (CO-305-T1, unsatisfiable). |
| `npm run check` | OK: 2,032/2,032 rule tests, 2,165/2,165 case expectations (in process, which hides B-2). |

Volume shape that drives the Corticon design: 1,283 items. 367 person supplied, 107 person-month
supplied, 194 person derived, 361 person-month derived, 3 global derived, and 251 parameters
(83 with dated versions, 17 tables keyed by household size). There are **no case-scope items**:
every household-level value (`snap_household_gross_income` and the rest) is held per person. The
dependency graph has no cycles. It is up to 26 levels deep, and `snap_allotment` sits at depth 22.
Operators across the 558 derivations: `all` 458, `not` 405, `case` 337 (in 159 items), `any` 240,
`otherwise` 135 (72 items), `reachable` 25 (16 items), `exists_related` 31, `shared_relative` 9,
`at` 26, and date or month arithmetic in 53 items.

## 2. Mapping onto Corticon

### 2.1 Vocabulary

| Codex | Corticon | Notes |
|---|---|---|
| case | `Case` root entity | `determination_date`, `determination_month_index`. |
| person | `Person` (`Case.person` 1..*) | 561 attributes in the volume, 178 in the SNAP slice. `person_index` is needed because the suite compares groups as ordered arrays (N-1). `relationships_stated` is needed because unstated relationships are unknown, not none. |
| relationships | `Relationship` entity (`Person.relationship`, `Relationship.to` -> Person), `role` as a CDT | The suite already expands inverses. The role list is not closed in any document (N-3). |
| person-month | `PersonMonth` (`Person.personMonth`), `month_index` Integer + `month_label` String | 468 attributes. The rows must be **materialized by the adapter**, because Corticon has no "any month" (S-4). |
| parameters | `Params` entity (scalars) + decision-table rulesheets (17 size tables) | Scalars are filled from versions only where the payload left them null, so the 27 per-case overrides in the suite win. |
| one of | String CDT with enumerated values, one per item | All 52 have option lists; all 309 options are valid identifiers. |
| money, hours, rate | Decimal | Do not round money (S-8). |
| month | Integer index + label | No month type; arithmetic on `y*12+m-1`. |
| group of persons | many-to-many self-association + Boolean `<name>_known` | An association cannot say "unknown" (13 items). |
| list of months | comma-joined String or child entity | CO-1973 only; no list attributes. |
| table keyed by person | child entity | CO-1927. |

Every derived item must be a **base** attribute, not transient: the suite expects all 558 derived
identifiers, and transient attributes are not returned. The full sketch is in
`/tmp/claude-0/corticon-proto/vocabulary.md`.

### 2.2 Rulesheets and ruleflow

Rulesheets follow dependency layers, not chapters or tags: SNAP's tag groups (`income`,
`verification`, `household`) cut across layers. ECE (CO-340) reads the household gross income,
categorical eligibility reads ECE, and the gross income test reads categorical eligibility. In
Optimized Inferencing, Corticon orders rules inside a sheet by their dependencies. Order between
sheets is the ruleflow's job, so the ruleflow has to be a topological sort of the item dependency graph. My SNAP
ruleflow (`ruleflow.csv`) has 19 sheets. Two of them run in Advanced Inferencing with Looping (the
CO-419 and CO-305 closures). A program-per-decision-service split works: SNAP's closure is 341
items, Colorado Works' 429, all outcomes together 1,243.

### 2.3 Collection operators

| Codex | Corticon |
|---|---|
| `exists` (P22), `exists_related` | `->exists(...)`, guarded by `_known = T` and `->exists(x = null) = F` |
| `filter` (P37) | `+=` into a derived association, plus `_known` |
| `sum` (P19, P39) | `->sum` over a child or link collection, null-guarded |
| `count` (P38) | `->size`. VERIFY that it fires and gives 0 on an empty association (CO-01 p1 needs `no_eligible_members`). |
| sums over a member's month (CO-334 and the other household sums) | A link association `PersonMonth.snap_unit_member_month` joined on `month_index`, so the sum is a plain child `->sum`. Two filtered sums in one expression (CO-334) become member-level contribution attributes, which avoids the full-versus-limiting filter trap (VERIFY). |
| `shared_relative` (P43), `has_relative_in` (P45) | Two-hop alias joins through `Relationship`. Not recursive, so no difficulty. |

### 2.4 Recursive closures

The 16 `reachable` items (CO-305, CO-419, CO-500, CO-604, CO-605, CO-663, CO-900, CO-982, CO-1000,
CO-1009, CO-1158, CO-1160, CO-2241, CO-2277, CO-2278, CO-2279) need a fixpoint. In Corticon that
means Advanced Inferencing with Looping over a working entity (`SnapReach`): seed with self, extend
across edges whose crossing condition is T, and stop when nothing new is added. Fifteen of the 16
have an edge condition that reads derived facts (CO-305 reads ages and the elderly/disabled
separate-household flag). So the closure has to run inside the ruleflow, after those facts; it
cannot be precomputed in fact assembly. Households in the suite have at most 6 persons (1,758 of
2,047 cases have one), so cost is not the issue. Determinism is (S-7): the codex's unknown result
depends on edge order, and a fixpoint cannot reproduce that.

### 2.5 Ordered `case`, rulesheet conflicts and overrides

The codex `case` is first-match, and an **unknown condition makes the whole result unknown**: it
does not fall through (evaluate.ts). Corticon columns are independent rules. Using the Overrides
row (arm 1 overrides 2..n) gives first-match, but it would let arm 2 fire when arm 1 is null. The
faithful form is K4 in `rulesheets.md`: column k requires arms 1..k-1 = `F` and arm k = `T`, and no
column fires on a null. That makes the columns mutually exclusive, so the conflict checker stays
clean, and an N-arm `case` stays N columns (CO-387: 6 arms, 6 columns plus one helper sheet). This
depends on an `F` cell not matching null (VERIFY).

### 2.6 Unknown propagation, `otherwise`, and Corticon null

The codex uses Kleene logic throughout: false dominates `all`, true dominates `any`, arithmetic with
an unknown is unknown, and a group is unknown when one member's test is (P34, P37, P39). Corticon's
null is a workable carrier only if every rule is written for it. The conventions I apply are K1-K7
in `rulesheets.md`:

- **K1:** a stub guard on every derived column (B-3).
- **K2:** `all`/`any` as one column per dominating input plus one all-T (or all-F) column; Kleene
  logic then falls out, because a null leaves the attribute null.
- **K3:** guard rows on every arithmetic operand, and only for the operands the codex reads on that
  branch. CO-379's first arm never reads the cap, so it must not require it.
- **K5:** no raw comparison over a nullable operand in a condition row.
- **K6:** `_known` flags for groups.

K4 is the `case` form in 2.5; K7 is rule statements (2.10).

`otherwise` (72 items) is a column with `x = null`. **This is the largest cost driver:** my 10-item
chain went from about 2,400 characters of S-expression to 11 rulesheets, about 57 columns and about
100 condition and guard rows.

### 2.7 Dated parameter versions

Size tables become decision tables keyed by size and by a date-range cell on `determination_date`.
Example: CO-370 is 12 columns, `[2025-10-01..2026-10-01)` and `[2026-10-01..*]`. A missing key or
an uncovered date fires nothing, so the result is null, which is exactly the codex's `lookup` miss
and "no version in force". Scalar parameters are set by a Params sheet with the same date cells,
guarded by `= null` so suite overrides win. Two traps, both in code only (S-5):

- A version's `to` is **exclusive** (versions.ts), but an item's `effective.to` is **inclusive**.
- Every parameter is read as of the **determination date**, even when the month being evaluated is
  in the past (the ABAWD look-back in CO-417).

I would generate these sheets from the parameter YAML: 83 versioned items, and each federal fiscal
year adds a version.

### 2.8 Months and days

Corticon's Date operators (`addDays`, `addMonths`, `daysBetween`, `yearsBetween`, `.month`) cover
P9, P46 and P47. Months are integer indexes, and `first_day` is an anchor date `.addMonths(n)`.
Points to verify:

- `yearsBetween` on Feb-29 birthdays. The codex counts a Feb 29 birthday as reached on Mar 1 in
  non-leap years (evaluate.ts `yearsBetween`), and no CO test covers it.
- Corticon.js date handling and time zones against `daysBetween` in CO-2308, CO-951 and CO-952,
  which prorate by days.
- The codex's `ceil`/`round` epsilons (S-5).

The codex itself works around a missing month-of-year operator with fixed anchors (CO-1006 `2000-11`,
CO-1292 `2000-08`). Corticon would write `.month`, but the translation has to be proved equal.

### 2.9 Effective ranges

There are three items with `effective` (CO-255, CO-412 from 2025-07-04, CO-1974 from 2027-01-01).
An item out of force evaluates to **unknown**. Corticon's rulesheet effective and expiration dates
select which sheet version runs, and the sheet's attributes would simply never be assigned. That
looks similar, but it binds to the decision service's execution or effective date, not to each
case's `determination_date`. So I write these as a condition row on `determination_date` instead.
Hidden effective logic is worse (S-9): CO-1289 switches formulas at the literal `2028-08` inside
its derivation, and CO-1190 hard-codes `2018-01..2025-12`.

### 2.10 Rule statements and the plain-English trace

Corticon is good at this: each column posts a Rule Statement with embedded values, an entity alias,
a severity, and Source Name and Link fields for the S-ids. But an item's `meaning` describes the
whole item, not one arm (CO-387's meaning lists all six reasons). It can serve as the rulesheet's
description, not as a column statement. What maps to a column is the pattern-English line for one
arm, which `src/engine/render.ts` `block()` produces but nothing exports per arm (S-11). explain.ts
also lists the missing supplied facts behind a "cannot determine". Corticon has no equivalent; it
would take a post-pass sheet that posts a message per null input. The suite grades no explanations,
so none of this is checked.

## 3. Prototype (SNAP)

Everything is in `/tmp/claude-0/corticon-proto/`:

- **`vocabulary.md`**: entities, associations, CDTs, and the type map, with counts.
- **`rulesheets.md`**: ten chained items laid out as rulesheets: CO-313 eligible household size,
  CO-332 person gross income, CO-334 household gross income, CO-370 standard deduction, CO-378
  adjusted income, CO-379 excess shelter, CO-381 net income, CO-383 maximum allotment, CO-2307 full
  month allotment, CO-387 eligibility status. Plus the CO-305 closure and the K1-K7 conventions.
- **`ruleflow.csv`**: the SNAP ruleflow.
- **`adapter/`**: the conformance adapter (section 5).

## 4. Every place I had to guess or redesign

Ranks: **blocking** (I could not do my job, or a wrong answer would ship), **should-fix**, **note**.

### 4.1 Blocking

**B-1. Every documented entry point gives me the wrong volume.** `npm run conformance`, `npm run
handoff` and `conform:self` default to `codex.json` `volumes[0]`, which is `mwr`.
`scripts/adapters/codex-self-lib.ts:19` hard-codes it. The committed `handoff.md` is the MWR
handoff. docs/conformance.md names `volumes/mwr/tests/cases.yaml` and never mentions `--volume`.
`test/export/conformance.test.ts` builds only the MWR suite, and no CI step builds or grades a CO
suite.
- *Why it matters:* a Corticon team following the README would implement and "pass" 146 MWR
  cases and ship a CO engine that was never graded.
- *Fix:* write per-volume suites (`conformance/<volume>/suite.json`) or make `--volume` required.
  Have codex-self read `suite.codex.volume`. Commit a `handoff-co.md` or generate both. Add CI that
  runs `conform:self` out of process on every volume and requires 0 failed.

**B-2. The exported CO suite has 16 expectations no faithful engine can meet.** Proved by running
the codex's own evaluator, CO-aware, over the exported suite: 4,181 of 4,197 pass.
- 15 come from rule tests that put `determination_date` in `given`: CO-1394-T5/T6/T9,
  CO-1415-T3/T4, CO-1418-T3/T4, CO-1427-T5/T6, CO-1438-T5/T6, CO-1451-T5/T6/T7 and CO-1462-T4.
  `makeCase` uses that date as the determination date. `buildSuite` instead keeps `as_of`
  (2026-10-01) and files `determination_date` under `persons.p1.facts`, but CO has no such item.
  30 cases carry it; in 15 the outcome changes (for example `pending` where the codex says
  `past_due`).
- 1 is CO-305-T1: p2 appears only in relationship triples, so the codex never makes p2 a person.
  `withRelationshipEdges` does, p2's unknown `snap_is_household_member` then makes the group
  unknown, and the expectation `["p1","p3","p4","p5"]` becomes unreachable.
- *Fix:* in `ruleTestCase`, take `as_of` from `given.determination_date` and drop the fact. Reject
  edges to undeclared persons (or declare p2 in CO-305-T1). The CI step in B-1 would have caught
  both.

**B-3. Derived values stated as facts replace their derivation, and the contract does not say so.**
1,102 of 2,047 cases give a derived identifier as input (403 distinct derived identifiers), for
example `snap_eligible_household_size: 3` in CO-387-T1. Four household cases do too: CO-01 and
CO-02 (`ma_mmmna_standard`), CO-08 (`cw_eligibility_status`, `cw_grant_amount`), and CO-83
(`meets_public_assistance_citizenship_requirement`). evaluate.ts reads case data before the rule,
so the stated value wins.
- *Why it matters:* a forward-chaining engine overwrites the stub unless every derived column
  carries a `= null` guard (K1). Without knowing this rule, my first design would have failed about
  half the suite. It is also why every derived attribute in Corticon must be "assign only if
  absent".
- *Fix:* state it in docs/conformance.md, list the stubbed identifiers per case
  (`stubbed: [...]`), and keep household cases free of stubs.

### 4.2 Should-fix

**S-1. Household cases put person-month facts in `facts`.** There are 205 values (41 identifiers)
in 11 household cases, for example CO-01's `ma_excess_real_property_is_for_sale` and
`is_destitute_migrant_or_seasonal_farmworker`. The codex routes facts by item scope; the documented
shape says `facts` are person facts. My adapter followed the document and failed 117 expectations
until it routed by scope.
- *Fix:* apply `classifyFact` to household persons in `householdSuiteCase`, as rule tests already
  are.

**S-2. Suite item rows lack `type`, `scope` and `options`; `implemented` appears on 591 of 1,283.**
The adapter needs type to convert Corticon's output (Decimal serialization, Date format, group
association to ordered array) and scope to find the holder and route facts (S-1). I had to
generate `codex-meta.json` from the ledger.
- *Fix:* add `type`, `scope`, `options` and `uses` to `SuiteItem`.

**S-3. The reference adapter breaks on a CO-sized batch.** `codex-self.ts` reads stdin with
`fs.readFileSync(0)`, which throws `EAGAIN` on a pipe carrying the 2.4 MB CO batch, and `conform.ts`
then reports `EPIPE` (5 of my 7 runs). This is the adapter a Node-hosted Corticon.js wrapper would
copy.
- *Fix:* read stdin asynchronously, as `adapter/corticon-adapter.mjs` does.

**S-4. No month horizon (guess G-MONTHS).** `month_defaults` apply to every month, and the codex
engine evaluates any month lazily. A forward-chaining engine must materialize PersonMonth rows, and
nothing says which months.
- The ten items that read other months' rows, each with a window I had to infer:
  - CO-417 (`count_months` over the 36-month ABAWD period from the 2023-07 clock start);
  - CO-1968, CO-1969 and CO-1974, the last over CO-1973's month list, which runs back to the
    supplied `ma_most_recent_determination_effective_date` and so is unbounded;
  - CO-2003 (`avg` over 3 months);
  - CO-1008 (the LEAP program year from November);
  - CO-561, CO-566, CO-1007 and CO-1281 (`at` a month taken from a supplied date).
- My adapter guesses 60 months back and 15 ahead, plus every month the case names. The fidelity
  mock shows the suite **passes with a 12-month window** (0 months: 10 failures; 3 months: 5). So
  a Corticon build with a window too short for the 36-month ABAWD clock would pass conformance and
  be wrong in production.
- Cost: 186,732 PersonMonth rows and 25 MB of payload for the suite at 60 months, against 39,374
  rows and 6.4 MB at 12.
- *Fix:* publish per item the months it reads relative to the evaluated month (`reads_months:
  [-36, -1]`, or "from <fact>"). Add a test that needs the full window.

**S-5. Operator semantics live in code, not in conventions.md.** I had to read evaluate.ts and
versions.ts for:
- `case` returning unknown on an unknown condition instead of falling through;
- `lookup` of a missing key returning unknown, so size 0 gives an unknown standard deduction (P24
  and P42 are silent);
- a versioned parameter with no version in force returning unknown;
- version `to` exclusive against `effective.to` inclusive;
- `ceil` being `Math.ceil(x - 1e-9)` and `round` being `floor(x + 0.5 + 1e-9)`, so the codex's
  floor (`-ceil(-x)`, CO-2307, CO-2308, CO-417) is `floor(x + 1e-9)`;
- `years_between` with Feb 29;
- `count_months` and `avg` returning unknown if any month is unknown, and `avg` of no months
  returning unknown;
- parameters dated by the determination date regardless of month.

Also, `derived:` is an S-expression with about 50 operator names (`of`, `P`, `at`,
`exists_related`, `in_group`, `det_month`, ...) that the P-catalog never names; the mapping lives
only in render.ts.
- *Fix:* an operator table in conventions.md: name, P-number, unknown rule, rounding.

**S-6. The derivations are not portable YAML.** 55 derivations use a bare `=` (`[=, a, b]`). YAML
1.1 parsers read it as the `value` tag: PyYAML stops at CO-1725, and SnakeYAML (YAML 1.1, the usual
Java parser) is likely to do the same. Java is where Corticon tooling lives.
- *Fix:* quote `"="` in the files, or better, ship `handoff.json` (derivation trees, type, scope,
  options, uses, versions).

**S-7. `reachable` with an edge condition is order-dependent when an edge is unknown.** The walk
returns null as soon as it examines an unknown edge to a node not yet queued. I reproduced this at
`933ce0c`: the same four-person graph gives `null` or `["p1","p2","p3","p4"]` depending only on the
order of p1's relationship list. The 15 conditioned closures are affected (the list in 2.4, less CO-419). A fixpoint
engine (Corticon looping, Datalog, Drools) can only compute the order-independent answer.
- *Fix:* define it as "unknown if and only if the T-only closure differs from the T-or-unknown
  closure", and implement that.

**S-8. Money is not dollars and cents.** conventions.md says `money` is "US dollars and cents", but
derived money is unrounded unless the rule rounds (P41). The suite expects, for example,
45.27317999999999 (CO-1289), 604.6451612903226 (CO-951), 179.6400000000001 (CO-658), 1803.33...
(CO-1750) and 31.846153846153847 hours (CO-402).
- *Why it matters:* a Corticon developer declares money Decimal and rounds to 2 places by habit;
  the suite would then fail.
- *Fix:* say in conventions.md that money is unrounded unless the derivation rounds, and state a
  required division precision.

**S-9. Time logic hidden inside derivations.**
- CO-1289's parent-fee formula switches at the literal `2028-08`.
- CO-1190 tests `2018-01..2025-12`.
- CO-1215 compares to `2013-12-31`.
- CO-1006 and CO-1292 use fixed anchors because there is no month-of-year operator.

A version-driven implementation (Corticon effective dates, a parameter service) will not see these
changes.
- *Fix:* express the 2028-08 change as item versions or `effective` ranges, and add a
  month-of-year operator.

**S-10. Parameters stated as person facts are silently ignored.** There are 37 values. CO-951-T8 and
T9 set `af_oap_payment_floor: 0`, but the value in force is 189 and the expectation uses 189. A
Corticon adapter that honoured the stated value would fail; one that ignored it would pass for the
wrong reason.
- *Fix:* make check reject parameter identifiers in `given`/`others` and move them to `parameters`.

**S-11. Nothing exported can drive Corticon rule statements.** `meaning` is per item; Corticon
statements are per column.
- *Fix:* export the `block()` pattern-English line per derivation arm, and the S-ids per item, in
  the handoff JSON (S-6), so statements can be generated. If explanations matter, add expected
  "cannot determine" reasons to household cases.

### 4.3 Notes

**N-1.** Groups are compared as arrays in case person order (`valuesMatch`). This is undocumented;
the adapter sorts by `person_index`. Document it, or compare as sets.

**N-2.** CO-305's edge condition is evaluated from the node the walk is at, so the closure is
directional. The meaning's "each member's value of this item is the same set" is not guaranteed by
the derivation.

**N-3.** Types used but not in conventions.md's table: `rate` (57 items), `list of months` (1),
`table keyed by household size` (17, mentioned only in P42). The relationship-role list is closed
only in evaluate.ts `INVERSE_ROLE` (11 roles; design-colorado.md names 8). A CDT needs the closed
list.

**N-4.** CO has no case-scope items, so household-level values are per person and computed once per
member. Corticon would naturally model a unit entity, but fidelity to per-person keys (and to N-2)
argues for keeping them per person. This multiplies work by household size.

**N-5.** Household cases state identifiers no item defines, and the codex ignores them silently:
`has_domestic_violence_waiver` (10, CO-01, CO-02, CO-04 among them), `lpr_entry_date` (4),
`utility_allowance_amount` (2), `transfers_within_lookback` (1). These look like stale names from
renames; check should warn.

**N-6.** CO-333 carries `open: [OQ-1]`, but OQ-1's Items list now names only CO-308. 138 items
carry open questions, and the engineer is told to implement the assumption and flag the item. In
Corticon that means a rule-statement category per OQ.

**N-7.** No item carries `status`, though conventions.md lists `Status Draft | Reviewed | Approved`.
A deployment cannot tell approved rules from drafts. The README's "draft throughout" covers it
today.

**N-8.** The brief's `eval-case.ts co <case> <identifier> [...]` usage is wrong: the script takes a
comma-separated list, and its fourth argument is an unvalidated month. `eval-case co CO-01
snap_allotment snap_eligibility_status` evaluates `snap_allotment` for the month
"snap_eligibility_status" and prints null for everyone.

### 4.4 Redesigns Corticon forces (my cost, not codex defects)

| # | Redesign | Items |
|---|---|---|
| R-1 | Kleene null discipline K1-K7 in every column | all 558 derived |
| R-2 | Looping closures over a working entity | 16 `reachable` items |
| R-3 | Adapter-materialized PersonMonth window plus same-month link associations | the 10 cross-month items in S-4, 26 `at` reads, every household sum |
| R-4 | Groups as association plus `_known` | 13 |
| R-5 | List output as String or child entity | CO-1973 |
| R-6 | Size tables as decision tables | 17 tables, 83 versioned items |
| R-7 | All derived attributes base (not transient), and Kleene helpers transient | 558, plus an estimated 300 helpers |
| R-8 | Forward chaining computes every item for every PersonMonth (no laziness). Values agree, cost does not. | all |

## 5. Conformance: can the suite drive Corticon as it stands?

**Transport: yes.** Batch mode (`--batch`) spawns one process with the whole suite on stdin. A Node
adapter can `require` a Corticon.js `decisionServiceBundle.js` and call `execute(payload, config)`
in process, with no server and no per-case JVM start. Corticon Server works the same way through an
HTTP client posting each case to the REST execute endpoint with the decision-service name header.
Corticon.js is the better CI fit; Server in CI needs a running licensed instance (check Progress
licensing for both).

**Semantics: only with five adapter conventions found in code, not in the contract:**

1. Read `persons.<p>.facts.determination_date` as the determination date (B-2).
2. Route facts by item scope (S-1).
3. Pass derived-identifier facts as stubs that rules must not overwrite (B-3).
4. Ignore parameter identifiers in person facts (S-10).
5. Return groups sorted by case order (N-1).

Even then, CO-305-T1 stays unsatisfiable (B-2).

**Null versus unimplemented.** Corticon returns null both for "unknown" and for "no rule written
yet". The harness grades a reported null against the codex's value, so an incomplete Corticon build
would show spurious failures (and spurious passes where the codex expects null). The adapter must
report only identifiers on an implemented allowlist generated from the Corticon project.

**The sketch** is in `/tmp/claude-0/corticon-proto/adapter/`:
- `corticon-lib.mjs`: suite case to Corticon object graph (Case, Person, Relationship with `#ref`,
  PersonMonth window, Params), and Corticon result back to suite values with type conversion and
  group ordering.
- `corticon-adapter.mjs`: Corticon.js, REST, or dry-run mode, with async stdin.
- `mock-codex.ts`: replaces the decision service with the codex evaluator reading *only the
  payload*.

Results, all through `scripts/conform.ts --batch`:

| Run | Result |
|---|---|
| Dry run | 4,197 unimplemented |
| Mock | 4,196 passed, 1 failed (CO-305-T1) |
| Mock with 12-month window | 4,196 passed, 1 failed (the same case) |
| Mock with 0-month window | 4,187 passed, 10 failed |

Corticon JSON details (entity metadata, reference syntax, Date and Decimal serialization,
synchronous or asynchronous `execute`) differ between releases and are marked VERIFY in the code.

## 6. Effort, risks, performance

| Work | Person-days |
|---|---|
| Spike: null in conditions and actions, `->size`/`->sum` on empty collections, `F` against null, looping closure, Corticon.js JSON/Date/Decimal, 20 SNAP rule tests end to end | 15-25 |
| Vocabulary: 1,283 identifiers, 52 CDTs, associations (generated from the codex) | 10-20 |
| Parameters: 251 items, Params sheet, 17 size decision tables (generator recommended) | 10-20 |
| Rulesheets: 558 derived items. The prototype ran about 3-4 columns per non-table item plus guards, so about 2,000-2,500 columns, each with ruletests | 120-200 |
| Closures and joins: 16 `reachable`, 4 `shared_relative`, 22 `exists_related`, 3 `has_relative_in` items | 15-25 |
| Months and dates: windows, links, the cross-month and month-arithmetic items, `days_between` proration | 10-20 |
| Adapter, allowlist, CI wiring | 10-15 |
| Conformance burn-down to 0 failed on 4,197 expectations | 30-60 |
| **Total** | **220-385** (about 1-1.8 FTE-years; a team of three for 4-7 months) |

SNAP alone (137 derived items, a 341-item closure, about 840 SNAP expectations): 60-100 person-days.

**Risks**, highest first:

1. **Drift.** This branch changed 1,126 of 1,283 items relative to `origin/main` (`npm run check`).
   Every change set becomes a manual rulesheet edit. The suite catches drift only on tested paths,
   and S-4 shows it misses window errors. A generator from codex S-expressions to Corticon assets
   would remove most of the cost, but Corticon's `.ecore`/`.ers` XML is not a supported generation
   target.
2. **Null semantics:** the VERIFY items in 2.3-2.6. If `F` matches null, or arithmetic on null
   throws, the K-conventions change shape. That is why the spike comes first.
3. **Closure determinism** (S-7).
4. **Decimal precision** (S-8). Division must keep at least 10 decimal places in Corticon.js and
   in Server.

**Performance.** Rules are cheap and households are small. Volume comes from the payload and from
evaluating everything.
- CO-01 at a 60/15 window is 5 persons × 76 months = 380 PersonMonth rows, about 0.5 MB in, and
  about 380 × 361 + 5 × 194 ≈ 138,000 derived assignments before Kleene helpers. Each program's
  unit-month links add about 1,900 link pairs.
- The whole suite is 186,732 rows and 25 MB.
- I expect sub-second to a few seconds per case on Server and slower on Corticon.js. This is a
  guess to measure in the spike.
- Mitigations: one decision service per program (SNAP needs 341 items, not 1,283), a per-program
  window from S-4, and returning only requested attributes.
- Closures are not the risk: n is at most 6 in the suite and about 12 in practice, and looping is
  O(n²) per closure. Corticon's loop iteration limit and loop checker need configuring, not tuning.

## 7. Summary

Counts: **3 blocking, 11 should-fix, 8 notes**, plus 8 Corticon-side redesigns.

Top five changes, in priority order:

1. **Make conformance per-volume and self-proving** (B-1, S-3). Per-volume suite and handoff,
   codex-self reading the suite's volume with async stdin, and CI running it out of process on
   every volume with 0 failed.
2. **Make the CO suite honest** (B-2, B-3, S-1, S-10). Use `determination_date` as `as_of`, no
   ghost persons, household facts routed by scope, stubbed derived identifiers documented and
   listed, parameter facts rejected.
3. **Publish a machine-readable handoff** (S-2, S-6, S-11, S-4). JSON with derivation trees, type,
   scope, options, uses, versions, the pattern-English line per arm, and each item's month window;
   type and scope also in the suite's item rows.
4. **Write the operator semantics into conventions.md** (S-5, S-7, S-8). Unknown rule per operator,
   version-range ends, rounding epsilons, Feb 29, parameter dating, money precision; and make
   `reachable` order-independent.
5. **Take time logic out of derivations** (S-9). Versions or effective ranges for CO-1289's 2028-08
   change and CO-1190's tax years, and a month-of-year operator for CO-1006 and CO-1292.

What works well:
- Stable ids and identifiers, explicit types, scopes and option lists.
- Every derived item has rule tests (2,032), and the expectations are recomputed (`notes: []`).
- Kleene semantics that are consistent and implementable once known.
- Dated parameter versions with sources.
- `precision` text that explains the edge cases a rulesheet author needs.
- An acyclic dependency graph.
- A language-neutral batch protocol with partial coverage, which is exactly what a Corticon team
  wants to burn down against.

## Disposition

Engineering fix round (engine, scripts, suite builder, adapters, tests and
docs; no ledger item edited). "Follow-up" items are listed, file by file, in
`docs/reviews/engineering-item-followups.md` (§ numbers below).

| Finding | Disposition |
|---|---|
| B-1 Every entry point gives the wrong volume | **Fixed.** conformance, conform, conform:self, handoff, governance and the new export run every volume in codex.json unless given `--volume`/`CODEX_VOLUME`; suites and results are per volume (`conformance/<volume>/`); the reference adapter takes the suite's `codex.volume`; `handoff/co.md` is committed beside `handoff/mwr.md`; README and docs/conformance.md say so. `npm run check` now runs the reference adapter out of process on every volume and requires 0 failed and 0 unimplemented (CI is unavailable, so the local check is the gate). |
| B-2 16 unmeetable expectations | **Fixed.** `as_of` from `given.determination_date`; no person made from a triple. The co suite passes its reference engine out of process: 4330/4330. |
| B-3 Derived values replace their rules, undocumented | **Fixed.** docs/conformance.md ("What a case means") and operators.md (Resolution, step 5) state it; each case lists its stated derived values under `overrides`. Keeping household cases free of them: follow-up §2 (CO-01, CO-02, CO-08, CO-83). |
| S-1 Household person-month facts in `facts` | **Fixed.** Household cases are routed by scope like rule tests. |
| S-2 Item rows lack type, scope, options | **Fixed.** `suite.items` carries type, scope, options, role, effective and uses; `npm run export` writes the full items as JSON. |
| S-3 Reference adapter breaks on a CO batch | **Fixed.** stdin is read as a stream; a test pipes a multi-megabyte batch through it. |
| S-4 No month horizon | **Partly fixed.** Each suite case carries `months_read`, the first and last month the reference engine read for it. A per-item `reads_months` was declined: several windows depend on supplied dates and parameters (CO-1973, CO-417), so a static window would be wrong or unbounded. A test that needs the full 36-month window: follow-up §8. |
| S-5 Operator semantics in code | **Fixed.** `docs/operators.md` (one entry per operator: unknown rule, empty input, rounding, version ends, Feb 29, parameter dating), linked from conventions.md, which it overrides where they differ. |
| S-6 Bare `=`; no machine-readable handoff | **Fixed / follow-up.** `npm run export` writes `conformance/<volume>/ledger.json` (trees, type, scope, options, uses, used_by, versions, effective, pattern English); the parser test pins both `=` forms. Quoting the files: follow-up §1. |
| S-7 `reachable` order-dependent | **Fixed.** Your definition (unknown iff the true-only closure differs from the true-or-unknown one) is what the engine now computes; tests run every permutation. No expectation changed. |
| S-8 Money is not dollars and cents | **Fixed (documented).** conventions.md's money type now says unrounded unless the rule rounds; operators.md "Numbers" states the binary64 model and the precision a decimal engine needs. Items that perhaps should round: follow-up §4. |
| S-9 Time logic inside derivations | **Follow-up §3** (CO-1289, CO-1190, CO-1215, CO-306, CO-1672; CO-1006 and CO-1292 with a `month_of_year` operator, to be added with the items that use it). The follow-up notes that moving a `[month]` comparison into versions changes it from month-evaluated to determination-date. |
| S-10 Parameters as person facts ignored | **Fixed (reported).** The suite drops them and lists them under `ignored`; `npm run check` warns on each (37 in co). Rejecting them as errors was declined for now, since it would block 37 tests the policy rounds own; fixing the tests is follow-up §2. CO-951-T8/T9 (stated 0, ledger 189) give the same expectation with 0 as a real override, since the floor is not reached. |
| S-11 Nothing drives rule statements | **Partly fixed.** `ledger.json` carries each derivation's pattern English line by line (one `case` arm per line) and each item's S-ids. A structured per-arm export was not built. |
| N-1 Groups compared in order | **Fixed (documented).** |
| N-2 CO-305's closure is directional | **Fixed (documented)** in operators.md `reachable`. |
| N-3 Types missing; role list not closed | **Fixed.** conventions.md's Types table adds rate, list of months, relationships and household-size tables; the roles are a closed list in volume.yaml (`relationship_roles`) that the engine reads and check enforces with a warning. |
| N-4 No case-scope items | **Follow-up §9.** |
| N-5 Identifiers no item defines | **Fixed (reported):** check warns, the suite lists them under `ignored`; renaming them is follow-up §2. |
| N-6 CO-333 `open: [OQ-1]` | **Follow-up §7.** |
| N-7 No item carries `status` | **Declined** in this round: approval workflow is out of scope, and the README's "draft throughout" still describes the volume. |
| N-8 eval-case usage | **Fixed.** Identifiers may be separate arguments or comma-separated, a `YYYY-MM` argument is the month, and an unknown identifier or case is an error. |

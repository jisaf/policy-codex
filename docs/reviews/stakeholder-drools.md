# Stakeholder review: implementing the Colorado codex in Drools

Reviewer role: senior rules developer asked to implement the Colorado volume as rules-as-code in
Drools (DRL with a Java fact model, or DMN), with the codex as the specification and its conformance
suite as the acceptance test. Read-only review at `933ce0c` (branch `ccr-9d19bf4c-wmnwcl`; the two
commits after it add only review files). I read docs/conventions.md, docs/conformance.md,
scripts/conformance.ts, scripts/conform.ts, scripts/adapters/, src/export/conformance.ts and
src/engine/evaluate.ts. I generated the CO handoff and suite in a scratch copy of the repo (both
scripts default to the MWR volume, see S-7), ran the reference adapter over the CO suite, and built and
ran a working Drools prototype of a 10-item SNAP chain, driven by `scripts/conform.ts`.

## Verdict

**Not without guessing, if the documents are the spec. Yes, if `src/engine/evaluate.ts` is.** The
ledger's machine form, the `derived:` expression tree in each YAML item, is precise and consistent
enough to generate code from: 558 derived items, 56 operators, no item-level cycles, no scope leaks
(details under "What works well"). But what those operators *mean* (how unknown passes through a
filter, what "this person" is inside a closure, what a `case` does with an unknown condition, how
numbers round, which date picks a parameter version) is written down only in evaluate.ts, which is
712 lines of TypeScript. conventions.md's pattern catalog is a phrasebook, not a semantics. A Drools
team that works from conventions.md and handoff.md will ship wrong answers in places the suite barely
tests. A team that ports evaluate.ts operator by operator, as I did for the prototype, can match it.
That includes matching one behaviour that is a bug (B-2).

The suite can drive a JVM engine as it stands. My adapter ran all 2,047 CO cases through
`scripts/conform.ts --batch` in 3.2 s. But the CO suite is not self-consistent: the reference engine
fails 16 of its own expectations (B-3), and nothing in CI runs it.

Prototype result: every slice expectation the prototype can answer passes (20 passed, 0 failed). The
rest are honestly reported as unimplemented: 4,177 across the whole suite, 73 inside the slice,
because those tests need derived inputs outside the 10 items.

## What I ran

| Step | Result |
|---|---|
| `npm run handoff -- --volume co` | 1,283 items, 10,738-line handoff. Without `--volume co` it writes the MWR handoff, which is the `handoff.md` checked in today. |
| `npm run conformance -- --volume co` | 2,047 cases (2,032 rule tests, 15 household), 4,197 expectations, `notes: []` |
| Reference adapter (`codex-self`) on the CO suite | **4,181 passed, 16 failed**. It had to be patched to load `co`, and fed from a file because a pipe fails with `EAGAIN` (S-7). |
| Drools prototype on the full CO suite, via `npm run conform -- --adapter …/run-adapter.sh --batch` | 2,047 cases, 20 checked, 20 passed, 0 failed, 4,177 unimplemented; 3.2 s wall-clock including JVM start and the DRL compile |
| Order test: same household, two orderings of the relationship triples (B-2) | evaluate.ts: `[p1,p2,p3,p4]` vs `null`. The Drools prototype reproduces both answers, because I copied the walk. |
| Static analysis of all 558 derived expressions (`analysis/analyze.ts`) | 0 item-level cycles; max derivation depth 26 (`sebt_verification_status`); 0 person-scope items reading month facts outside `at`/`each`; 0 uses of `[P]` outside a binder |

Toolchain: JDK 21, Maven 3, Drools **10.1.0** (`drools-engine`, `drools-mvel`, `drools-xml-support`)
from Maven Central, snakeyaml-engine 2.7, Jackson 2.17. The DRL compiles at session start through
`KieServices.getKieClasspathContainer()`.

## The mapping, construct by construct

| Codex construct | Drools shape I chose | Why / what it costs |
|---|---|---|
| Supplied fact (474) | One generic fact `Val(id, person, month, value)`. `value` is a Boolean, a Double, a String, a List of person ids, a Map, or a sentinel `Tri.UNKNOWN`; never Java null. | Generator-friendly and 1:1 with codex identifiers. 474 typed POJOs + 558 derived classes would be unmaintainable against a ledger that changes weekly. Java null is avoided because DRL constraints treat it as "no match", which is not "unknown". |
| Derived item (558) | Two rules per item. (1) A **need** rule propagates demand to the item's inputs. (2) A **compute** rule waits for every input `Val` and, guarded by `not Val(same key)`, inserts the result computed in the right-hand side from `Tri` helpers. | evaluate.ts is demand-driven (backward chaining) and Rete is forward chaining. `Need` facts emulate the goal stack. The `not Val` guard reproduces "a value the case supplies for a derived item replaces its rule". 1,098 rule tests and 3 households rely on that (S-1). |
| Parameter (251, 83 versioned) | A `Registry` service. A generic `resolve` rule inserts `Val(param)` = the version in force **on the determination date**, or the case's `parameters` override. | Matches `paramInForce(it, c.det)`. It is not what a Drools team would build by default, which is a parameter keyed by the month being evaluated (S-3). |
| Scopes | person → `Val(month == null)`; person-month → `Val(month == m)`; global → `Val(person == null)`; case and month scopes are unused in CO (0 items) | Fine. Case-wide facts are modelled person-scope and repeated on every person (N-3). |
| Which months exist | Only those demanded. The adapter inserts `Need` per expectation; `at`, `months_ending`, `months_from_to` and `months_after` produce further month Needs from data. | A fixed month horizon does not work: `snap_abawd_countable_months_in_period` walks from 2023-07, and `ma_community_engagement_review_months` and `leap_is_eligible` depend on supplied dates. |
| Relationships | `Rel(person, role, other, ord)` plus a `RelsStated(person)` marker | A person with no `relationships` key is unknown; `[]` is known-empty. A `List<Rel>` field would lose that distinction (S-4). `ord` is needed because of B-2. |
| `reachable` (25 uses, 21 with an edge condition) | Computed in Java (`SnapHousehold.members`) from collected `Val`/`Rel` facts | A recursive DRL query (`query reachable` in resolve.drl) compiles and answers plain reachability, but a query can only succeed or fail. It cannot return "unknown because an edge's condition is unknown". |
| `shared_relative`, `has_relative_in`, `exists_related`, `rel` | `Rel` joins in the LHS for the known case; Java for the unknown case | The same two-valued-LHS limitation applies. |
| Unknown / `otherwise` (Kleene logic, 135 `otherwise`s) | All three-valued logic happens in the RHS through `Tri.all/any/not/otherwise/…`. The LHS only waits for inputs. | Writing the logic in the LHS needs one rule per truth value per connective (true, false and unknown variants), which multiplies quickly. Drools ends up as a dependency scheduler, and the policy logic lives in generated Java expressions. |
| `case` (337) | One rule per item with `Tri.caseOf(arm…)`, not one rule per arm ordered by salience | An unknown condition must stop the case. Salience-ordered first-match rules and DMN FIRST-hit tables skip past it instead (S-5). |
| `at`, `months_*`, `days_after`, `days_between`, `years_between` | Java helpers that copy addMonths, addDays and daysBetween in UTC, and yearsBetween with its 29-February rule | `java.time` agrees with all of them. The rules themselves are unstated (N-5). |
| Effective ranges (3 items) | A `resolve` rule at salience 100 inserts UNKNOWN when the item is not in force on the determination date; the adapter drops supplied values for such items | Item `to` is inclusive and parameter-version `to` is exclusive (S-3). |

## The prototype

Location: `/tmp/claude-0/drools-proto/` (outside the repo, as briefed).

- `src/main/resources/codex/snap/snap-chain.drl`: ten real items, each with a need rule and a compute
  rule: `age` (CO-300), `snap_is_household_member` (CO-304), `snap_household_members` (CO-305),
  `snap_eligible_household_members` (CO-312), `snap_eligible_household_size` (CO-313),
  `snap_is_categorically_eligible` (CO-342), `snap_gross_income_limit` (CO-345),
  `snap_household_gross_income` (CO-334), `snap_meets_gross_income_test` (CO-347),
  `snap_eligibility_status` (CO-387, an outcome).
- `src/main/resources/codex/snap/resolve.drl`: the generic resolution rules, salience-ordered to
  copy the order of checks in `value()`: not in force, then parameter, then case data, then
  month_defaults, then supplied-but-unstated (UNKNOWN), then derived-outside-slice (OUT). It also
  holds a recursive reachability query for contrast.
- `src/main/java/codex/drools/`: `Val`, `Need`, `Default`, `Person`, `Rel`, `RelsStated`, `CaseInfo`;
  `Tri` (the operator library); `Registry` (reads the ledger YAML: kind, scope, effective, versions);
  `SnapHousehold` (the CO-305 closure); `Slice`; `Adapter` (the conformance adapter).
- `run-adapter.sh` is the one shell command `conform.ts` needs. `analysis/` holds the scripts and
  outputs behind every number in this review: `analyze.ts`, `order.ts`, `closure.ts`, `pm.ts`,
  `grade2.ts`, `results-drools.json`.

`Tri.OUT` is a prototype-only fourth value meaning "an item the slice does not implement and the
case did not supply". It propagates like unknown, but the adapter omits it, so the harness counts it
as `unimplemented` rather than a spurious pass or fail. Getting that right forced me to work out which
sentinel wins in each operator. In Kleene operators (`all`, `any`, `exists`) OUT beats UNKNOWN,
because the OUT input might have been the deciding value. In strict operators (`+`, comparisons,
`filter`) UNKNOWN beats OUT. `sum` and `case` take the first missing value they meet. That table is
also, in effect, the missing spec of B-1.

What the slice shows:

1. **The mechanical part is easy.** Every compute rule is the item's `derived` tree turned into a Java
   expression over `Tri`, plus an LHS listing the inputs. A generator from the YAML AST can emit both
   rules per item. Hand-writing 558 items would not be sensible.
2. **Group-dependent demand works but is verbose.** The members of `snap_household_members` are known
   only after it is computed, so CO-312 and CO-334 each need a second need rule keyed on the group's
   value, and a `collect … size == Tri.size($g)` gate before computing.
3. **Closures and unknowns end up in Java.** CO-305's `reachable` with an edge condition cannot be a
   DRL query (see the table). The Java walk had to copy evaluate.ts's breadth-first order exactly to
   agree with it (B-2).
4. **Eager demand over-approximates.** CO-305's edge condition can read four facts of any person in
   the case, so the need rule demands them for everyone. The Java walk then reads only what
   evaluate.ts would read, so the answers agree. The work done, and any "which unknown facts caused
   this" list (S-6), do not.

## Findings

### Blocking

**B-1. Operator semantics are defined only by `src/engine/evaluate.ts`.** conventions.md lists
patterns P1–P47 as English templates. It does not define the 56 operators the ledger actually uses
(`analysis/analyze.ts` counts them: `all` 458, `not` 405, `case` 337, `of` 323, … `each` 1). It also
leaves these unstated:

- **Conditional `reachable`** (21 uses: `snap_household_members`, `ma_magi_household_members`,
  `ma_ssi_*`). handoff.md and render.ts write it as "the persons joined to this person by X **such
  that** C", the same phrase as the P37 filter "all persons in G **such that** C". It is not a filter.
  C gates each edge during the walk (`ev(cond, cur, m, other)`), so a person reachable only through a
  failing edge is excluded even when C is true of that person. Inside C, "this person" is the person
  the walk has reached, not the item's own person. Nowhere else in the codex does "this person"
  change meaning. P36 in conventions.md does not mention a condition at all. Read from the documents,
  CO-305 has two plausible meanings, and they give different households.
- **Unknown, per operator.** `filter` checks every member and returns unknown if any member's
  condition is unknown. `sum` returns unknown at the first unknown member. `exists` is true at the
  first true member. `case` returns unknown on an unknown condition, does not try later arms, and
  returns unknown when no arm matches and there is no `else`. `unknown` (P5) is never itself unknown.
  `in` and `=` return unknown when their input is unknown. P34 says only "unknown propagation through
  every pattern unless otherwise supplies a default".
- **Empty groups and month lists.** The sum of an empty group is 0 and its count is 0. `exists` over
  an empty group is false. `avg` over no months is unknown, `each` over no months is true,
  `some_month` false, `count_months` 0. None of this is written down.
- **Binding.** `of` keeps the outer "that person". `at` changes the month but not the date used for
  effective ranges and parameter versions. `persons` lists the case's persons in declaration order.

Why it matters to me: every one of these is a place where Drools and DMN idioms default to something
else (S-5). The suite exercises few of them on unknown inputs (S-8), so a wrong guess would pass CI.

Fix: add a `docs/operators.md` with one entry per operator: arity, what each slot binds ("this
person", "that person", month), what it returns on unknown input, what it returns on an empty
group or month list, and whether order matters. Make evaluate.ts cite each entry. Rename the
conditional-`reachable` rendering, e.g. "the persons joined to this person by X, crossing an edge only
where C (this person = the person reached, that person = the next one)", and add it to P36. Publish a
JSON Schema for the `derived` tree.

**B-2. `reachable` with an edge condition depends on the order of the relationship list.**
evaluate.ts walks breadth-first and skips an edge to an already-reached person *before* evaluating its
condition. Whether an unknown edge condition makes the whole group unknown therefore depends on
whether the walk meets that edge before or after it reaches the same person by a known edge. Example
(`analysis/order.ts`, run against the real ledger): household p1–p4, with p3's date of birth
unstated, so the "child under 22" condition on the p4→p3 parent edge is unknown. Relationships:
spouse p1–p2, buys_prepares_with p1–p4, buys_prepares_with p2–p3, parent p4→p3. The same four triples
with the first two swapped give `snap_household_members(p1)` = `[p1,p2,p3,p4]` in one order and
`null` in the other.

The logically correct answer is the group: p3 is certainly in it, through p2's
buys_prepares_with edge. A Drools engine has no inherent fact order, so it cannot reproduce this
without deliberately copying the walk, which I did (`SnapHousehold.java`, with `Rel.ord`). This
affects the household closures of SNAP, MAGI and SSI deeming, so `snap_eligibility_status`,
`ma_magi_*` and everything downstream of them. An answer that should be known comes out as "cannot
determine", depending on the order a caseworker happened to enter the relationships.

Fix: define the closure as the persons reachable by edges whose condition is true. The result is
unknown only if some edge from that set with an unknown condition leads to a person *outside* it.
That rule is order-independent and cheap. Implement it in evaluate.ts and add both orderings above as
rule tests on CO-305.

**B-3. The CO conformance suite fails its own reference engine, and no check runs it.** Running
`codex-self` (the reference adapter) over the CO suite gives 16 failures:

- **15 rule tests put `determination_date` in `given`**: CO-1394-T5/T6/T9, CO-1415-T3/T4,
  CO-1418-T3/T4, CO-1427-T5/T6, CO-1438-T5/T6, CO-1451-T5/T6/T7, CO-1462-T4. `makeCase` uses that
  value as the determination date, and that is how the expectations were computed (e.g. `past_due`).
  `buildSuite` keeps `as_of` instead and files `determination_date` under `persons.p1.facts`. CO has
  no `determination_date` item, so every engine reading the suite, the reference engine included,
  ignores it and evaluates at `as_of` (`pending`).
- **CO-305-T1**: `others` restates p1 and leaves out p2, who appears only in relationship triples.
  `runTest` builds the case without p2, so the expectation is `[p1,p3,p4,p5]`.
  `withRelationshipEdges` then creates p2 as a person in the suite case, so the household any adapter
  sees is different, and the reference engine evaluates it to `null`.

To reach 0 failed, an independent engine would have to guess that a `determination_date` fact
overrides `as_of`, which the reference adapter itself does not do. Nothing caught this:
`codex-self-lib.ts` loads `manifest.volumes[0]` (MWR) whatever suite it is given;
`test/export/conformance.test.ts` covers only MWR; and `npm run conform:self` on the 2.3 MB CO suite
dies with `EPIPE`, because the child's `fs.readFileSync(0)` gets `EAGAIN` on a pipe (it works when
stdin is redirected from a file). Fix: in `ruleTestCase`, set `as_of` from `given.determination_date`
(or have check reject it in `given`). Make `withRelationshipEdges` add no person the test did not
declare, or have check reject edges to undeclared persons. Fix CO-305-T1. Make `codex-self-lib`
honour `--volume`/`CODEX_VOLUME` and read stdin as a stream. Add a CO run of `conform:self` to
`npm run check`.

### Should-fix

**S-1. Suite inputs need the reference engine's routing rules, which docs/conformance.md does not
state.** To agree with `makeCase`, my adapter had to:

- route **205** person-month facts that household cases give as scalars in `facts` (CO-01:
  `electronic_data_source_monthly_earned_income`, `ma_mmmna_standard`, …) to month defaults, which
  needs each identifier's scope, which the suite does not carry;
- ignore **37** parameter values given as person facts in rule tests (CO-642-T1..T4 give
  `ssi_federal_benefit_rate_individual`, `ma_special_income_group_pct`), because `paramOf` wins.
  They match the ledger values today, so these tests pass by coincidence;
- drop identifiers the ledger does not have (`has_domestic_violence_waiver`, `lpr_entry_date`,
  `transfers_within_lookback` in CO-01/02/04; `utility_allowance_amount` in CO-92);
- ignore supplied values for items out of force;
- read `months` entries only for person-month items;
- let a supplied value for a **derived** item replace its rule. 1,098 of 2,032 rule tests do this, as
  do CO-01/02 (`ma_mmmna_standard`), CO-08 (`cw_eligibility_status`, `cw_grant_amount`) and CO-83.

Each of these is a reasonable design. None is in the adapter contract. Fix: make `buildSuite`
normalise every case (route by scope, move parameter values into `parameters`, drop unknown
identifiers with a note, record the routing). Add `scope`, `type` and `options` to `suite.items`.
State in docs/conformance.md that "a value for a derived identifier replaces its rule" is part of the
contract.

**S-2. The numeric model is unstated, and it is JavaScript's.** Arithmetic is IEEE-754 binary64,
folded left to right. `ceil` is `Math.ceil(x − 1e-9)` and `round` is `Math.floor(x + 0.5 + 1e-9)`,
so halves round toward +∞, negatives included. Neither epsilon is in P41. Division by zero (e.g.
`snap_counted_income_of_ineligible_member` and `snap_counted_shelter_cost_of_member` divide by the
count of an empty household) gives NaN or Infinity, which `JSON.stringify` writes as `null`. In the
suite that is indistinguishable from unknown. A Jackson-based adapter would write a bare `NaN` token
that `conform.ts` cannot parse (I had to special-case it).

Drools teams default to `BigDecimal` for money, and DMN/FEEL arithmetic is decimal128. Both usually
land within the harness's 1e-9 tolerance, but a `<=` against a limit, e.g. income/FPL ratios against
1.33 or 2.60, can flip at a tie, and the epsilon roundings can differ. Fix: state the numeric model
in conventions.md (binary64, written order, the two epsilons). Make division by zero an explicit
unknown, or an error, rather than NaN.

**S-3. Dates: three rules a Drools build would get wrong by default.**

- Every parameter version **and** every item's effective range is chosen by the determination date,
  even when the expression is evaluating another month: ABAWD's 36-month lookback, community
  engagement lookbacks, retroactive coverage months, `months_from_to` from 2023-07. P25
  "[parameter] as of [date]" is in the catalog, but no operator implements it.
- An item's `effective.to` is inclusive (`inForce`: `date > e.to`), while a parameter version's `to`
  is exclusive (`versionInForce`: `date >= v.to`). conventions.md defines neither, and `versions` is
  not mentioned there at all.
- A person-scope derived fact such as `age` is computed once, at the determination date, and used
  unchanged in every month. The `snap_mandatory_child_age` edge in CO-305 and the Medicaid child
  tests therefore use today's age for past months.

Fix: state all three in conventions.md under Scopes and Effective dating. If the month-independent
reading is not intended, implement P25 and give `at` a date as well as a month.

**S-4. The relationship model lives in code comments.** `relationships` is listed in handoff.md's
`Uses:` (e.g. CO-305) but there is no such item in the CO ledger. These rules are found only in
evaluate.ts, types.ts and the comment at the top of cases.yaml:

- direction: `[role, other]` on p means "p is role of other";
- the inverse table (`INVERSE_ROLE`);
- roles with no inverse (`guardian`, `caretaker relative` and `relative` are in `RELS` but not in
  `INVERSE_ROLE`);
- "no `relationships` key" means unknown, while `[]` means none;
- inside `reachable` and `shared_relative`, *another* person's unstated relationships are read as none
  (`c.rels[cur] ?? []`), not as unknown.

Fix: add a supplied item `relationships` (type relationships, scope person) whose options are the
roles, and whose meaning and precision state the direction, the inverses, and the stated/unstated
rule.

**S-5. `case` and unknown inputs diverge from Drools and DMN idioms.** P33 does not say what an
unknown condition does. In evaluate.ts it stops the `case`, which returns unknown. The idioms behave
differently:

- a DMN FIRST-hit decision table simply does not match a row whose input is null, and moves on;
- FEEL's `if c then a else b` takes the else branch when `c` is null;
- FEEL's `x = null` is `false`, not null;
- DRL rules ordered by salience fire the next arm whose LHS matches.

With 337 `case`s, this is the single largest silent-divergence risk for any implementation that maps
`case` onto the platform's own conditional. Fix: one sentence in P33, plus a rule test per program
outcome with an unknown first-arm condition (see S-8).

**S-6. "Cannot determine, with the list of unknown supplied facts that caused it" has no definition
and no test.** conventions.md (Completeness) makes this list mandatory for engineers. The only
definition is `explain.ts` `missingFacts`: every supplied fact the *lazy* trace happened to visit and
found missing. That depends on short-circuit order. An eager engine such as Drools visits more facts
and reports a larger list. eval-case's output for CO-01 LEAP shows that the list includes other
persons' facts. The suite carries no expectation for it. Fix: define the list, e.g. "the unknown
supplied facts whose value, if known, could change the outcome" (computable by re-evaluating with
each one set), or explicitly "in left-to-right short-circuit order". Then add it to household
expectations.

**S-7. The tooling defaults to the MWR volume.** `npm run handoff` and `npm run conformance` write
the MWR volume unless given `--volume co`. The committed `handoff.md` is titled "Work requirements
under H.R.1". An engineer who opens it, as conventions.md "Engineer handoff" says to, gets the wrong
volume. `codex-self-lib.ts` hard-codes `volumes[0]`, and `conform:self` breaks on CO-sized input
(B-3). Fix: make `--volume` required (or move `co` first in `codex.json`); commit the CO handoff as
`volumes/co/handoff.md`, or generate it in CI; and apply the codex-self fixes in B-3.

**S-8. Unknown paths are almost untested.** Only 2 of 4,197 suite expectations are `null` (CO-377-T5
and CO-2300-T5, both shelter costs). Three-valued propagation, `otherwise`, `case` stopping on
unknown, `filter` turning unknown, and the empty-group rules are the hardest parts to port. A
conformance run is where a Drools team would discover them, and today it would not. Fix: add at least
one unknown-input rule test per operator family and per program outcome, plus one household case with
deliberately missing facts and an expected *cannot determine*.

**S-9. Some unknowns are silent, with no supplied fact to blame.** `lookup` with a key not in the
table returns unknown (`k in tbl ? tbl[k] : null`). So does a parameter on a date no version covers;
for example, `leap_income_limit_monthly` starts 2026-11-01, so a determination dated earlier finds no
limit. So does an item out of force. Each yields "cannot determine" with an empty missing-facts list,
which breaks conventions.md's "approvers must never see a silent default" in spirit. In Drools I
would make these errors. Fix: make a lookup miss an evaluation error. Have governance check that
every parameter has a version covering `default_as_of` and every test's `as_of`.

### Notes

**N-1. YAML 1.1 parsers.** The bare `=` in flow sequences (`[=, a, b]`) is read by YAML 1.1 as the
`tag:yaml.org,2002:value` key. PyYAML fails on 53 CO item files (the first is
`shared/CO-1725.yaml`), and `scripts/codex_tool.py` uses PyYAML. SnakeYAML 2.x, Jackson YAML and
snakeyaml-engine read all 1,283 files; I checked all three. Fix: have the emitter quote `"="`.

**N-2. Groups are ordered arrays.** `gradeCase` compares groups element by element.
`reachable`, `shared_relative` and `persons` return persons in case-declaration order; `filter` keeps
its input's order; a supplied group keeps the order it was supplied in. An engine that stores groups
as sets fails on order alone. Either state the order in conventions.md or compare groups as sets in
`valuesMatch`.

**N-3. Case-wide facts are repeated per person.** CO has no case-scope items. `snap_application_date`,
`verification_request_date`, `cccap_application_county` and similar are person-scope and repeated on
every person, and nothing says what happens when persons disagree. In Drools I would model a `Case`
fact. Either use the `case` scope or add a governance check that all persons agree.

**N-4. Rule tests are mostly small integration tests.** Counting the derived items each rule test
needs, given what it supplies (static over-approximation): median 2, p75 6, p90 21, max 214. 821
tests need exactly one. A full SNAP status needs 69 derived items. So an incremental port gets slow
signal: my 10-item slice could answer only 20 of its 93 expectations. Tagging tests that supply every
direct `Uses` input as unit tests would let a team bring items up one at a time.

**N-5. Birthdays on 29 February.** `yearsBetween` counts the anniversary of a 29 February birth on 1
March in a common year. `java.time.Period` and FEEL agree, but neither P9 nor `age`'s precision says
so. Add one sentence.

**N-6. handoff.md flattens nested blocks.** In the handoff, nested derivations are flattened onto one
line joined by `;   -`. CO-305's condition is unreadable there. An engineer will use the YAML tree
anyway; consider printing the s-expression form (`render.ts` already has it) under each item.

**N-7. `implemented: engine` on parameters.** 33 parameters carry `implemented: engine`, which is
otherwise a derived-item field. It is harmless, but it puzzles anyone mapping that field to "who owns
this item".

## Conformance: can the suite drive a Drools engine?

Yes, with the caveats above. The contract is right for a JVM engine:

- it is language-agnostic, with JSON over stdin and stdout;
- `--batch` mode means one JVM start for the whole suite;
- the per-expectation `(person, identifier, month)` triples are exactly the goals a demand-driven
  engine needs, so the adapter turns `expect[]` into `Need` facts directly;
- the `unimplemented` category lets a team watch coverage grow without a wall of red;
- `codex.sha` pins the suite to a commit.

The adapter I would ship is the one in the prototype (`Adapter.java`), generalised:

- read `{"cases": [...]}`;
- per case, one stateful `KieSession` with the persons, the relationships (with their order), the
  supplied values routed as `makeCase` routes them, and a `Need` per expectation;
- `fireAllRules`;
- answer each expectation from the resulting `Val`s, writing unknown as `null` and non-finite numbers
  as `null`, and omitting anything not implemented;
- on a runtime error, return no values for that case, so it counts as unimplemented, and log it to
  stderr.

Gaps that stop it from being purely spec-driven: the suite carries no parameter values, scopes or
types, so the adapter must read the ledger YAML too (S-1); there are the 16 self-inconsistent
expectations (B-3); and the suite exercises almost no unknown paths (S-8).

## DRL or DMN?

**DMN/FEEL** fits the *expression* semantics better. FEEL's `and`/`or` are Kleene, `not(null)` is
null, and arithmetic and comparisons with null give null. It fits the *structure* worse:

- `if` and FIRST-hit tables fall through on null (S-5), and `null = null` is true;
- arithmetic is decimal, not binary64 (S-2);
- closures need recursive BKMs;
- there is no memoisation across the per-person and per-month invocations that `of`, `filter` and
  `sum` imply;
- the order-dependent walk (B-2) cannot be expressed at all.

**DRL** handles fact granularity, demand and memoisation naturally. Its LHS is two-valued, though, so
three-valued logic must sit in a Java helper library and the LHS reduces to "wait for inputs".

Either way the policy logic is generated Java. My recommendation:

- generate DRL need and compute rule pairs, plus a typed `Tri` runtime, from the YAML trees;
- treat the codex YAML as the only source; never hand-edit a rule;
- keep Drools for what the platform wants it for (audit, the KIE tooling, deployment).

If Drools is not mandated, a direct Java port of evaluate.ts (about 700 lines) with a code generator
from the trees is cheaper and lower-risk than either.

## Effort and risks

Estimate for one senior and one mid-level engineer, engine layer only. Fact assembly from CBMS/PEAK
for 474 supplied facts is a separate and larger project.

| Work | Estimate |
|---|---|
| `Tri` runtime: 56 operators, date and number semantics, unknown/OUT rules, unit tests against evaluate.ts | 1.5 weeks |
| Generator, YAML tree → need and compute DRL + Java RHS, incl. group-dependent demand, `at` and month-list ops, closures | 3–4 weeks |
| Registry, parameters, effective ranges, case routing; the adapter; CI against a pinned codex sha | 1 week |
| Burn-down to 0 failed on 2,047 cases, after B-3 is fixed upstream | 2–3 weeks |
| "Cannot determine" fact lists, once S-6 defines them | 1 week |
| **Total** | **≈ 9–11 weeks**, then about a day per codex release to regenerate, rerun and triage |

Hand-writing idiomatic DRL instead would take roughly 0.5–1 day per derived item, so 280–560
engineer-days, plus permanent drift from a ledger that changes several times a week. I would not
do it.

Risks:

1. **Semantics drift.** Until B-1 lands, any change to evaluate.ts silently changes the
   specification. Pin the engine to a codex sha and diff evaluate.ts on every bump.
2. **The B-2 behaviour may be "fixed" upstream.** Copying it now means a known behaviour change
   later.
3. **Numeric divergence** at ties if anyone substitutes `BigDecimal` (S-2).
4. **Thin unknown coverage** (S-8): wrong three-valued behaviour would pass CI.
5. **Eager-demand cost.** Closures demand facts for every person; that is fine at household size but
   should be measured for large cases.
6. **Explainability parity.** The codex's `explain.ts` trace has no Drools equivalent beyond the
   audit log, and S-6 is undefined.
7. **Platform.** Apache KIE 10.x requires Java 17+, and the `mvel` and executable-model
   build paths differ. I used the `mvel` route; the executable model should be tested before
   production.

## Summary

Counts: **3 blocking, 9 should-fix, 7 notes.**

Top five changes, in priority order:

1. **B-1**: write the operator reference (unknown rule, empty rule, binding, order for each of the 56
   operators), and fix the conditional-`reachable` wording.
2. **B-3**: make the CO suite self-consistent (`determination_date` in `given`, CO-305-T1) and run
   `conform:self` for CO in `npm run check`.
3. **B-2**: make `reachable` order-independent and add the two-ordering tests.
4. **S-1**: normalise suite inputs in `buildSuite` and put scope, type and options in `suite.items`,
   so an adapter does not have to copy `makeCase`.
5. **S-8 with S-5**: add unknown-path tests per operator and per outcome, starting with `case` and
   `filter`.

What works well:

- The `derived` trees are a clean, complete, generatable intermediate form: no item-level cycles, no
  scope leaks, at most 26 levels deep.
- Parameters are versioned with no gaps or overlaps.
- The suite always carries the codex's current evaluation, and the harness is language-agnostic,
  batchable and partial-coverage aware. A JVM adapter dropped straight in and ran the whole CO suite
  in 3 seconds.
- Allowing a case to supply any derived value makes rule-by-rule bring-up practical.
- The verbatim citations make it unusually easy to settle "is the code or the codex wrong".

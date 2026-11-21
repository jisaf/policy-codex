# Stakeholder review: compiling the Colorado volume into a fact graph

Reviewer role: engineer building a new rules-as-code engine for this codex, modelled on two existing
fact-graph engines: the IRS Direct File Fact Graph (`direct-file/fact-graph-scala`, XML fact
dictionaries with Writable and Derived facts, collections, completeness and placeholders) and Code for
America's `fact_graph` Ruby gem (entity and aggregate facts, dry-schema inputs, evaluation that
continues past unmet dependencies). The codex (`volumes/co`, 1,283 items) is the specification and the
engine has to pass its conformance suite. Read-only review at commit `933ce0c` (branch
`ccr-9d19bf4c-wmnwcl`). Nothing in the repository was changed except this file.

Everything I built is under `/tmp/claude-0/factgraph-proto/`, outside the repository:

| File | What it is |
|---|---|
| `dump-items.ts` → `co-items.json` | the 1,283 items, parsed by the app's own YAML parser (`src/engine/yaml.ts`) |
| `gen-suite.ts` → `suite.json` | the **co** conformance suite (2,047 cases, 4,197 expectations, `notes: []`), written outside the repo |
| `graph.py` → `graph-report.json` | the dependency graph built from the `derived` expressions (section 2) |
| `ruby/codex_fg.rb`, `ruby/snap_chain_graph.rb` | the SNAP chain as a `FactGraph::Graph` (section 3) |
| `ruby/adapter.rb` | a conformance adapter for it (docs/conformance.md contract, `--batch`) |
| `ruby/demo.rb` → `demo-output.txt` | unknown propagation, dated parameters, fact_graph's aggregate behaviour |
| `df/gen_df_xml.py` → `df/snap-chain.xml` | the same chain as a Direct File `FactDictionaryModule` (55 facts) |
| `symmetrize.ts`, `yaml_diverge.rb` | two checks used in the findings |

Headline. The codex compiles into a fact graph more cleanly than I expected, and the numbers behind
that are good: 558 derived items, 2,614 edges, **no cycles at all** (not even through per-month `at`
or another person's value), a longest chain of 25 edges, and an operator set (53 operators) small
enough to compile mechanically. The Ruby prototype passes every expectation it answers:
**27 passed, 0 failed, 4,170 unimplemented** against the 2,047-case co suite through `scripts/conform.ts`,
and the Direct File fragment validates against Direct File's own `FactDictionaryModule.rng`.
CfA's `fact_graph` is the better fit; Direct File's model strains badly on three things the codex uses
constantly: per-person groups over a relationship graph, a month dimension, and dated parameter
tables. Two things stopped me from trusting a green conformance run: the conformance tooling quietly
targets the `mwr` volume, and the co suite almost never expects `unknown` (2 of 4,197 expectations),
which is exactly where both engines' semantics differ from the codex (section 6, B1 and B2).

---

## 1. Mapping the codex onto the two models

### 1.1 Kinds

| Codex | Count | Direct File Fact Graph | CfA fact_graph |
|---|---|---|---|
| Supplied | 474 | `<Writable>` fact (`/persons/*/wagesGross`), with `<Limit>`s for range checks | `input` with a dry-schema predicate, `per_entity: true` for person facts |
| Derived | 558 | `<Derived>` fact | `fact ... do dependency ...; proc ... end` |
| Parameter (83 with dated `versions`, 36 of them with more than one) | 251 | `<Derived>` constant; versions become a `<Switch>` on a writable `/asOf` (Direct File itself versions by `<TaxYear>` and a dictionary per year) | `constant`, or a fact reading `:as_of` and choosing the version; fact_graph's own idiom (one graph subclass per tax year, `Ty2024Graph < TaxYearGraph`) does not fit dates that change on Oct 1, Jan 1, Jul 1 and in between |

A codex `Example` (rule test) frequently *gives a derived item's value* (1,102 of 2,047 suite cases set
at least one derived fact, 3,053 settings in all). The codex's evaluator lets a case value win over the
derivation (`evaluate.ts` checks case data before deriving). Neither engine allows that: Direct File
throws `"<path> is not writable"`, and fact_graph only reads `input` keys a fact declares. The adapter
has to make every derived fact overridable (the prototype does it by declaring an optional input of the
same name on every derived fact). This is the single biggest piece of adapter plumbing the suite forces.

### 1.2 Types

| Codex type | Count | Direct File | fact_graph (dry-schema) |
|---|---|---|---|
| yes/no | 640 | `Boolean` | `:bool` |
| money | 264 | `Dollar` (BigDecimal, **HALF_EVEN to cents on construction**) | `type?: Numeric` |
| whole number | 158 | `Int` | `:integer` |
| rate | 57 | `Rational` (`3/10`) | `Numeric` |
| one of | 52 | `Enum` with an `optionsPath` | `included_in?: [...]` |
| calendar date | 47 | `Day` (with `/year`, `/month`, `/day` extracts) | `:string` + format, or `:date` |
| table keyed by household size | 17 | **none**: one `<Switch>` case per (version, row) | a Hash constant |
| hours | 16 | `Rational` | `Numeric` |
| group of persons | 13 | a derived `Collection` (Filter result), but only over a fixed collection | Array of entity ids |
| month, list of months | 11 | **none** (Day as first-of-month) | `"YYYY-MM"` strings |
| text, person | 7 | `String`, `CollectionItem` | String, entity id |

### 1.3 Scopes and the time dimension

The volume declares five scopes; co uses three. Supplied facts are `person` (367) and `person-month`
(107); derived facts are `person-month` (361), `person` (194) and `global` (3); parameters are
`global` (251). No item is `case` or `month` scoped, and no suite case uses `month_facts`.

| Codex scope | Direct File | fact_graph |
|---|---|---|
| person | `/persons/*/x` in a writable `Collection` | `per_entity: :persons` |
| person-month | `/persons/*/x` **for the one month the dictionary describes** | `per_entity: :persons`, one evaluation per month |
| global | root fact `/x` | non-entity fact |
| case, month | root fact (unused in co) | non-entity fact (unused in co) |

Neither engine has a time dimension (Direct File's own monthly concepts are enums such as
`monthsLivedWithTPInUS`, and its age is `taxYear - dateOfBirth/year`). What I propose, and what the
prototype implements, is a **month-sliced graph**:

1. The graph describes one month. `month` and `as_of` are top-level inputs; every person-month fact
   means "in that month"; person facts are month-invariant and are simply recomputed per slice.
2. An expectation for month *m* evaluates the slice for *m*. Person-scope expectations evaluate the
   determination month's slice.
3. The 29 references that read another month (`at` with a month other than "the month", and the
   bodies of `each`, `some_month`, `count_months`, `avg`) are cross-slice reads: a memoised call to
   evaluate the slice for that month with the same case input. Because the identifier-level graph has
   no cycle even through these edges (section 2), the slice-to-slice calls form a DAG and always
   terminate.
4. The month set is not static: windows are sized by parameters (`snap_abawd_period_months`,
   `ma_community_engagement_application_lookback_months`, ...), so slices are created on demand, not
   declared up front.

A nested collection `/persons/*/months/*` would be the Direct File-native shape, but the dictionary
never nests collections, a `<Dependency>` path cannot be computed (no "the month before this one"), and
`Find` + alias per read is unworkable at 29 sites. In fact_graph a `(person, month)` entity collection
also fails: a per-entity fact reading a fact of a *different* collection gets indexed by its own entity
id (`Fact#dependency_facts` takes `dependency_fact[entity_id]`), which is the wrong row.

Two codex behaviours make the time dimension harder than it needs to be (finding S4): parameters are
chosen by the determination date, not by the month being evaluated (`paramInForce(it, c.det)`), and
nine person-scope items silently pin per-month inputs to the determination month with `at ... det_month`
(e.g. `snap_is_in_elderly_disabled_separate_household`, CO-2304, which feeds `snap_household_members`,
CO-305).

### 1.4 Relationships and closures

Relationships are per-person lists of `[role, other]`; 11 roles appear in the suite (child 246, parent
243, spouse 150, buys_prepares_with 74, tax_dependent 36, tax_filer 28, grandchild 15, grandparent 14,
caretaker 12, dependent 11, shares_heat_with 4). Unstated relationships are unknown, not empty.

| Codex | Uses | Direct File | fact_graph |
|---|---|---|---|
| `of [P] x` (P28) | 323 | a relative path inside a `Filter`/`CollectionSum` over the filtered item | dependency on an aggregate `x__by_person` (non-entity facts receive the `{entity_id => value}` hash); 119 distinct targets need one |
| `filter`, `sum`, `exists`, `count` (P37–P39, P22) | 36, 55, 31, 33 | `Filter`, `CollectionSum`, `Count`/`CollectionSize` | Ruby in the proc |
| bodies that mix "this person" and "that person" | 39 bodies in 27 items | **not expressible**: a `Filter` predicate is compiled in the filtered item's context and cannot see the outer person | Ruby closure over both ids |
| `rel`, `exists_related`, `has_relative_in` (P21, P26, P45) | 48, 31, 4 | needs an edge collection `/relationships/*` {from, to, role}, then a two-variable predicate: not expressible | Ruby over `ctx[:rels]` |
| `reachable` with a condition (P36) | 25 (21 conditional) | **not expressible**: no fixed-point traversal | BFS in the proc (`K.reachable`) |
| `shared_relative` (P43) | 9 | not expressible | two-hop lookup in the proc |

Direct File is anchored on one filer: `familyAndHousehold/*/relationship` is each person's relation to
the taxpayer. The codex computes every outcome for every person, and each person's household is a
group reached from that person (`snap_household_members` for p1 and p2 can differ: in CO-01 p1's is
`[]` and p2's is `[p2, p3, p4, p5]`). In the Direct File fragment I therefore had to replace
`snap_household_members` with a writable `/persons/*/inApplicantSnapHousehold` that fact assembly
computes, and make the household the applicant's only.

### 1.5 `unknown`, completeness and `dependency_unmet`

| Codex | Direct File | CfA fact_graph |
|---|---|---|
| a fact is known or `unknown` | `Result.Complete` / `Result.Placeholder` / `Result.Incomplete` | a value / `FactGraph::Error` |
| `all(false, unknown) = false`, `any(true, unknown) = true` | same (`AllOperator`, `AnyOperator` short-circuit on `Complete(false/true)`) | **no**: a fact with an Error dependency is skipped unless `allow_unmet_dependencies: true`, so `all(false, unknown)` comes out as an Error |
| `filter`/`sum` over a group: unknown if any member is | `Filter` treats an incomplete test as false and marks the result incomplete; `CollectionSum` incomplete | **an aggregate silently drops members whose value is an Error** (`Fact#call`: `.reject { result.is_a? FactGraph::Error }`) |
| `otherwise` (P4): a *known* default | `Switch(IsComplete(x) → x, True → default)`; **not** `<Placeholder>`, whose value stays incomplete downstream | `allow_unmet_dependencies` and a branch in the proc |
| `[x] is unknown` (P5) | `Not(IsComplete(x))` | `dep.is_a?(FactGraph::Error)` |
| outcome unknown → "cannot determine" with the missing supplied facts | `Explanation` tree | `Error#fact_bad_inputs` key paths |

Direct File's `Result` is a superset of the codex: if an adapter reports only `Complete` values as
known, its semantics line up operator for operator, and `Placeholder` adds a "provisional value" the
codex has no word for. fact_graph's error model is binary, so the prototype layers a Kleene value type
on top (`K::Unknown`, carrying root causes), sets `allow_unmet_dependencies: true` everywhere and never
returns a `FactGraph::Error` from a derived fact, precisely because aggregates would drop it.
`ruby/demo.rb` shows the gem's own fixture doing so:

```
income per applicant: {0=>50, 1=>500, 2=>"Error"}
total_applicant_income = 550  (the codex would say unknown)
```

and the prototype carrying the cause instead:

```
snap_household_gross_income[p0] = #<unknown missing:pension_income>
snap_meets_gross_income_test[p0] = #<unknown missing:pension_income>
```

### 1.6 Ordered `case`, effective ranges, versions

* Ordered `case` (P33, 337 uses): Direct File `<Switch>` is ordered, but an incomplete `<When>` is
  skipped and a *later* arm's value is returned as a placeholder; the codex returns unknown at the first
  unknown condition. Reported strictly (placeholder = unknown) the two agree. In fact_graph it is Ruby
  `if/elsif`, with the unknown check written by hand (`K.case_`).
* `otherwise`: 72 items, 135 uses (above).
* Dated parameter versions: `from` inclusive, `to` **exclusive**, contiguous in every one of the 83
  versioned parameters (I checked: no gaps or overlaps). Three series end (`sebt_poverty_guideline_table`
  and `sebt_poverty_guideline_each_additional` at 2027-07-01, `leap_income_limit_monthly` at
  2027-05-01): after that the parameter is unknown, which an engine must reproduce.
* Item `effective` ranges (3 items: `ma_veteran_personal_needs_allowance`, `snap_is_in_abawd_age_range`,
  `ma_community_engagement_status`): `to` is **inclusive** and an item out of force is unknown and its
  rule never runs. Same key name, opposite inclusivity (finding S5).

---

## 2. Graph properties of the co volume

Built by `graph.py` from the `derived` expressions as parsed by the app (`co-items.json`). Edges follow
`check.ts`'s reference rules (role lists in `reachable`/`rel`/`exists_related` and option lists in `in`
are not references; `det_date`/`det_month` count as reads of the determination date). Each edge is
labelled *same* (same person, same month), *month* (another month) or *person* (another person's value,
via `of` or a `reachable` condition).

| Measure | Value |
|---|---|
| Nodes | 1,283 (474 supplied, 251 parameter, 558 derived) |
| Edges | 2,614: 2,347 same, 262 person-shifted, 28 month-shifted, 1 both |
| Distinct operators used | 53 (`all` 458, `not` 405, `P` 386, `case` 337, `of` 323, `any` 240 ...) |
| Longest chain | **25 edges** (below) |
| Cycles | **none**: not on the full graph, so none through `at` and none through another person's value |
| Outcomes (volume.yaml + `role: outcome`) | 133, all present in the ledger |
| Outcome closure, median | 43 items |
| No consumer and not an outcome | 16 (11 derived, 5 parameters) |
| Not reachable from any outcome | 36 (15 derived, 15 parameters, 6 supplied) |

Longest chain (25 edges), from SUN Bucks into the SNAP income chain:

```
sebt_verification_status → sebt_pending_verification_count → sebt_school_enrollment_verification_is_pending
→ sebt_requires_verification_of_school_enrollment → snap_is_eligible → snap_full_month_allotment
→ snap_benefit_reduction → snap_household_net_income → snap_homeless_shelter_deduction
→ snap_excess_shelter_deduction → snap_adjusted_income_before_shelter → snap_earned_income_deduction
→ snap_household_earned_income_for_deduction → snap_household_earned_income → snap_eligible_household_members
→ snap_is_ineligible_member → snap_is_ineligible_student → snap_is_student_exempt
→ snap_is_single_parent_full_time_student_exemption → snap_household_members
→ snap_is_in_elderly_disabled_separate_household → snap_meets_elderly_disabled_separate_household_election
→ snap_person_gross_income → snap_person_earned_income → snap_self_employment_income → self_employment_gross_receipts
```

Fan-in hotspots: `age` 67, `wages_gross` 29, `is_pregnant` 25, `snap_household_members` 25,
`receives_ssi` 19, `social_security_income` 19, `snap_is_household_member` 19, `ma_meets_residency` 19.
Among derived items: `age`, `snap_household_members`, `snap_is_household_member`, `ma_meets_residency`,
`ma_is_aged_blind_or_disabled` 15, `ma_meets_citizenship_requirement` 14, `cw_assistance_unit_members` 12,
`cw_is_dependent_child` 12, `cccap_is_eligible_child` 12. Fan-out: `af_deemed_relative_income` 25,
`af_countable_income` 23, `cccap_person_pending_verification_count` 20.

Unusually large closures (median 43): `ma_verification_status` 561, `ma_pending_verification_count`
554, `chp_verification_status` 522, `ma_msp_category` 515, `ma_family_planning_status` 511,
`ma_bccp_eligibility_status` 501, `ma_emergency_medicaid_status` 492, `ma_magi_eligibility_status` 480.
The reason is one link: `ma_magi_eligibility_status` (CO-554) → `ma_is_emergency_medicaid_only`
(CO-510, closure 478) → `ma_meets_requirements_other_than_status` (CO-1150) → `af_category` (CO-953)
→ `af_barred_by_colorado_works` (CO-1511) → `cw_eligibility_status` (CO-921). A MAGI determination
therefore depends on 70 Colorado Works and 35 Adult Financial items, and in completeness terms a
missing Colorado Works fact can leave a MAGI child's status undetermined unless something earlier
short-circuits. For comparison: `snap_allotment` 177, `cccap_eligibility_status` 187,
`af_category` 168, `cw_grant_amount` 104, `leap_is_eligible` 48.

Cross-program edges: CHP+→Medicaid 40, Medicaid→AdultFinancial 5, ColoradoWorks→AdultFinancial 5,
CCCAP→ColoradoWorks 3, SunBucks→SNAP 3, and five single edges.

Unused or unreachable items (outcome pruning would drop them): `chp_copayment`,
`chp_presumptive_eligibility`, `cw_meets_work_participation`, `cw_unit_size`, `ma_cbwd_premium`,
`ma_csra_minimum`, `ma_is_presumptively_eligible_child`, `ma_is_presumptively_eligible_pregnant`,
`ma_retroactive_coverage_start_month`, `ma_sga_blind`, `ma_sga_non_blind`, `ma_transfer_lookback_months`,
`ma_transfer_penalty_days`, `ma_wawd_premium`, `snap_abawd_hr1_effective_date`, `snap_is_work_registrant`;
unreachable as well: the CHP+ cost-sharing family (`chp_copayment_income_band`,
`chp_cost_sharing_annual_limit`, `chp_is_exempt_from_cost_sharing`, `chp_scheduled_copayment`, ...),
`attested_household_income_pct_fpl`, `cw_work_activity_hours`, `ma_eligibility_start_date`,
`ma_retroactive_coverage_months`, `snap_work_registration_max_age` (full list in `graph-report.json`).

---

## 3. Prototype: the SNAP full-month allotment chain

Fourteen derived items, chosen so the slice includes a dated parameter table, a person-month income
chain, a household aggregation over another person's values, ordered `case` with `otherwise`, and a
conditional relationship closure:

`age` (CO-300), `snap_is_household_member` (CO-304), `snap_household_members` (CO-305),
`snap_eligible_household_members` (CO-312), `snap_eligible_household_size` (CO-313),
`snap_maximum_allotment` (CO-383), `snap_gross_income_limit` (CO-345), `snap_person_earned_income`
(CO-330), `snap_person_unearned_income` (CO-331), `snap_person_gross_income` (CO-332),
`snap_household_gross_income` (CO-334), `snap_meets_gross_income_test` (CO-347),
`snap_benefit_reduction` (CO-384), `snap_full_month_allotment` (CO-2307); 9 parameters, 17 supplied
facts, and 10 "frontier" items outside the slice that a case may give (as rule tests do) and that are
otherwise unknown-and-unimplemented.

### 3.1 (b) fact_graph Ruby graph class: run

`ruby/snap_chain_graph.rb` (211 lines) on a 295-line support layer (`ruby/codex_fg.rb`: the Kleene
value type, a DSL with `supplied`, `parameter`, `frontier`, `by_person` and `derived`, and parameter
versions read from the ledger rather than retyped). Ruby 3.3.6 was available; the gem pins Ruby 4.0.10
in `.ruby-version` but its `lib/` loads unchanged on 3.3 with activesupport 8.1 and dry-schema 1.17
installed into the proto directory.

```
npm run conform -- --adapter "ruby .../ruby/adapter.rb" --batch --suite .../suite.json
conform (...) on codex@933ce0c...: 2047 cases, 27 checked, 27 passed, 0 failed, 4170 unimplemented
```

The adapter answers an expectation only when its identifier is in the slice and its value does not
depend on a frontier item the case left unstated (the unknown carries an `:unimplemented` cause).
That rule is dynamic, so a short-circuit that never reaches the frontier still answers (5 of 9
`snap_household_members` rule tests pass although the elderly/disabled separate-household rule is
unimplemented, because the buys-and-prepares arm is never reached). Of the 92 slice expectations in the
suite, 27 are answerable today:

| Identifier | Answered / in suite |
|---|---|
| `age`, `snap_is_household_member`, `snap_benefit_reduction`, `snap_full_month_allotment` (rule tests) | 2/2, 3/3, 3/3, 3/3 |
| `snap_maximum_allotment`, `snap_person_unearned_income` | 4/4, 4/4 |
| `snap_household_members` | 5/9 rule tests, 3/13 household |
| `snap_person_earned_income`, `snap_person_gross_income`, `snap_household_gross_income`, `snap_gross_income_limit`, `snap_meets_gross_income_test`, `snap_eligible_household_*` | 0: every test reaches a frontier item (finding S6) |

`ruby/demo.rb` (output in `demo-output.txt`) also shows the FY2026 tables being chosen for a
determination date of 2026-09-15 (`snap_maximum_allotment` 546, limit 2,292) and FY2027 for 2026-10-01
(562, 2,345).

### 3.2 (a) Direct File fact dictionary fragment: schema-validated, not run

`df/gen_df_xml.py` emits `df/snap-chain.xml`: 55 facts, 1,874 lines, valid against
`df-client-app/src/fact-dictionary/generate-src/xml-src/FactDictionaryModule.rng` (for calibration,
32 of Direct File's own 36 modules validate against that schema; it is approximate). I could not run it:
there is no `sbt` here, and building the Scala/Scala.js toolchain was out of proportion to the question.
What the translation needed:

* 14 codex items became 26 derived facts: two `otherwise` helpers (`/persons/*/snapExcludedEarnedIncomeOrZero`,
  the `middleInitial` idiom), a helper for "rounded down" because there is no floor node
  (`Round(max(0.50, d) − 0.50)` with HALF_UP, valid only for two-decimal Dollars), and a helper
  collection for the ineligible members.
* Each table lookup became 16 `<Case>`s (2 versions × 8 sizes) plus a dated "over 8" branch; 53 cases
  in all for two tables and three dated scalars. All 17 household-size tables in the volume would cost
  hundreds of cases and grow with every version.
* `age`: Day extracts (`/asOf/year − ../dateOfBirth/year`, minus one before the birthday). The codex's
  Feb 29 rule (counts on Mar 1 in a non-leap year) has no expression: Direct File has no leap-year node
  (`constants.xml` hard-codes `/isTaxYearLeapYear`).
* `snap_household_members` could not be written (section 1.4); the household is the applicant's, from a
  writable membership fact.
* `snap_child_support_exclusion` reads the three prior months (`avg` over `months_ending 3`), so it is
  writable too.

### 3.3 What the prototype taught

* Hand translation is not the way. Each item had to be checked operator by operator against
  `evaluate.ts` (unknown handling, the `1e-9` nudges in rounding, string table keys, the person order
  of groups), and that checking is identical for every item. The operator set is small and regular
  enough that a compiler from the S-expression IR to facts is the right tool (section 5).
* Getting `unknown` right in fact_graph means not using its error mechanism for unknown at all.
* The adapter is the easy part (71 lines); the case-shaping rules (derived overrides, month merging,
  entity order = suite key order, groups as id lists, numeric keys of tables as strings) are where a
  first adapter goes wrong.

---

## 4. Which model fits better

**CfA fact_graph fits better**, with a compiler in front of it. Its procs are Turing-complete, so
nothing in the codex is inexpressible; entities map to persons; aggregate facts give cross-person reads;
dry-schema gives typed supplied facts and bad-input reporting with key paths; and "evaluation continues
past unmet dependencies" is the right instinct for "cannot determine, with the list of what is
missing". Where it strains:

1. Error semantics are binary and aggregates drop errored entities (section 1.5). Compiled code must
   use its own unknown value. This is the dangerous one: the natural, idiomatic translation silently
   computes 550 where the codex says unknown.
2. One entity collection per fact, entity ids are array indices, and a per-entity fact cannot read
   another collection's row: no native time dimension and no (person, month) entity.
3. No cycle detection (a cycle recurses until the stack overflows; `Fact#call` memoises only after
   completion). Harmless today because the codex is acyclic.
4. Evaluation is eager: every fact for every entity, every time. With 1,283 items, 5 persons and a few
   months that is fine; a 36-month ABAWD window multiplies it.
5. Procs are opaque: the graph's own introspection (`facts_with_dependency`, `leaf_facts_depending_on_input`)
   still works, but explanation is whatever the compiler emits.

**Direct File's Fact Graph** has the better semantics (its `Result` with placeholders is a faithful
superset of the codex's known/unknown; `Explanation`; persisted writable facts; limits) and the worse
expressiveness for this codex:

1. Single anchor and single-variable quantifiers: no per-person groups, no join between "this person"
   and "that person" (39 quantifier bodies in 27 items), no relationship graph, no closure (25
   `reachable`). These are core to SNAP, MAGI and Colorado Works households, not edge cases.
2. No month dimension, no `Month` type, no month arithmetic; date arithmetic is `Day − Days` only (no
   `Day + Days`, no days between two Days).
3. No map/table type: tables become `Switch` cascades.
4. Numeric model differs: Dollar is BigDecimal rounded HALF_EVEN to cents on construction, the codex
   computes in doubles and rounds only where an item says.
5. Versioning is per tax year (a dictionary per year), not per dated parameter version.

Making Direct File fit means extending its Scala core (new CompNodes for a relationship edge
collection, `Reachable`, a binding for the outer item in `Filter`/`CollectionSum`, a month-shift
dependency, `Lookup`, `YearsBetween`, `Floor`), which is a fork of the engine.

### 4.1 What the codex should change to compile into a fact graph more easily

1. **Publish the IR.** Emit the parsed items (identifier, kind, type, options, scope, `derived`,
   `versions`, `effective`, uses) as JSON next to `suite.json`, pinned to the same sha (S1).
2. **Declare relationship roles** in `volume.yaml` with inverses and symmetry, as data, not as
   `INVERSE_ROLE` in `src/engine/evaluate.ts` (S2).
3. **Declare assistance units as derived collections.** Give `snap_household`, the CW assistance unit,
   the LEAP economic unit and the MAGI household an identity and a unit scope, so unit-level facts are
   computed once per unit and a consumer cannot add up four copies of one allotment (S3).
4. **Make the time dimension explicit.** Per item, whether it is evaluated per month or as of the
   determination month, and the month window it reads (`reads_months: [-36, -1]`); per parameter,
   whether its version follows the determination date or the benefit month (S4).
5. **One meaning for `to`.** (S5)
6. **Unit-isolated rule tests and operator truth tables**, including `unknown` (B2, S6).

---

## 5. Conformance-driven development

### 5.1 The adapter

The contract in `docs/conformance.md` is good and was enough to write an adapter in an afternoon. The
prototype's `ruby/adapter.rb` does:

1. Read `{"cases": [...]}` once (`--batch`; spawning Ruby per case would cost 2,047 interpreter starts).
2. Map suite person ids to entity indices in the suite's key order (groups are compared as ordered
   lists, and the codex orders them by `Object.keys(c.persons)`).
3. For each month an expectation names (or the determination month for person scope), build one input:
   person `facts` ∪ `month_defaults` ∪ `months[m]`, relationships with ids mapped, `parameters`
   overrides, `as_of`, `month`. Derived values given in the case override the derivation.
4. Evaluate once per month, memoised; answer each expectation in the slice; report `unknown` as `null`;
   omit anything whose unknown traces to an unimplemented item, so the harness counts it as
   `unimplemented`, never `failed`.

For production the same adapter becomes the graph's test harness: CI runs `conform` against a pinned
sha and fails on `failed > 0`, and `unimplemented` is the burn-down chart. The order of work follows
the graph, bottom-up from the supplied facts, because most rule tests are integration tests (S6).

### 5.2 Effort

Estimates for one engineer who knows the target engine, to `0 failed, 0 unimplemented` on the co
suite (4,197 expectations), assuming the codex fixes B1 and S1 first.

| Work | fact_graph | Direct File Fact Graph |
|---|---|---|
| IR loader (from `ir.json`, or YAML 1.2) | 1–2 days | 1–2 days |
| Compiler: 53 operators → facts, Kleene values, overrides, groups, relationships, parameters | 1.5–2 weeks | 2–3 weeks (XML generator) |
| Engine extensions | none | 4–6 weeks: relationship edges + `Reachable`, outer-item binding in quantifiers, month shift, `Lookup`, `YearsBetween`/`Floor`/day arithmetic, a strict unknown mode for `Filter`; Scala + Scala.js + tests |
| Time dimension (month slices, memoised cross-month reads, on-demand windows) | 3–5 days | inside the extensions |
| Adapter | 2 days (prototype exists) | 3–4 days (JVM, `--batch`) |
| Burn-down of semantic mismatches | 1–2 weeks | 2–3 weeks |
| Unknown-semantics fixtures (until B2 is fixed codex-side) | 2–3 days | 2–3 days |
| **Total** | **≈ 4–6 engineer-weeks** | **≈ 10–14 engineer-weeks, plus owning a fork** |

Hand translation instead of a compiler: 558 items at 20–40 minutes each is 190–370 hours before review
and debugging, and it drifts from the codex on every change set. A compiler regenerates on every sha.

---

## 6. Findings

### Blocking

**B1. The conformance tooling silently targets `mwr`, and the reference adapter cannot run the co suite.**
`scripts/conformance.ts:27`, `scripts/handoff.ts:25` and `scripts/governance-report.ts:22` default to
`manifest.volumes[0]` (`mwr`); `scripts/adapters/codex-self-lib.ts:19` hard-codes it.
`docs/conformance.md` says the suite is built from `volumes/mwr/tests/cases.yaml` and never mentions
`--volume co`. Following the documentation, `npm run conformance` writes 146 mwr cases, not co's 2,047,
and `handoff.md` at the repo root is the mwr handoff. Running the reference adapter on the co suite:
on the first 300 cases it reports **9 failed** (every `snap_household_members` rule test, evaluated
under mwr's identically named item: expected `["p1","p2"]`, got `null`), and on the full suite the
harness dies with `spawnSync /bin/sh EPIPE` (S8). Why it matters to me: an engine team following the
docs grades itself against the wrong volume with a green CI; and the harness's own proof
(`conform:self` must be 0 failed) does not exist for co. Fix: require `--volume` (or read it from
`suite.codex.volume` in `codex-self-lib.ts`), add `conform:self` for co to `check.yml`, and update
`docs/conformance.md` and `README.md`.

**B2. The suite almost never tests `unknown`.** 2 of 4,197 expectations are `null` (CO-2300-T5
`snap_counted_shelter_cost_of_member`, CO-377-T5 `snap_shelter_costs`). Unknown propagation is where
fact-graph engines diverge from the codex: fact_graph skips a fact with an errored dependency (so
`all(false, unknown)` is an error, not `false`) and drops errored entities from aggregates (the 550
above); Direct File returns a placeholder from a later `Switch` arm and its `<Placeholder>` is not
`otherwise`. An engine that silently defaults would pass the co suite today. Why it matters: the
conventions say approvers must never see a silent default (`docs/conventions.md`, Completeness), and
the suite is the only thing that can hold an independent engine to it. Fix: (a) a volume-independent
`conformance/semantics.json` with the three-valued truth table of every pattern P1–P47 (`all`, `any`,
`not`, `otherwise`, `case`, `filter`, `sum`, `count`, `exists`, `reachable`, `at`, `each`, `lookup` with
a missing key, a parameter with no version in force, an item out of force); (b) for every outcome at
least one household case with one supplied fact left unstated, expecting `null`.

### Should-fix

**S1. No machine-readable IR; YAML 1.1 loaders misread 53 items.** The suite's `items` rows carry
`id/identifier/kind/program` only, and `handoff.md` is Markdown, so a compiler must parse the YAML.
PyYAML (YAML 1.1) fails on 53 files because `[=, a, b]` reads `=` as the `tag:yaml.org,2002:value`
tag (first: `shared/CO-1725.yaml`, `shared/CO-505.yaml`, `medicaid/CO-1175.yaml`). Ruby's Psych agreed
with the app on all 1,283 files (`yaml_diverge.rb`). Fix: write `conformance/ir.json` beside
`suite.json` with the same `codex.sha`; and quote the operator (`"="`) in the YAML.

**S2. Relationship roles are not part of the codex.** The 11 roles and their inverses exist only in
`INVERSE_ROLE` (`src/engine/evaluate.ts`); `volume.yaml` lists the type `relationships` but no roles;
`docs/design-colorado.md` lists eight in prose. The suite does expand inverses for the adapter, but a
production engine receiving CBMS data must do it itself, from TypeScript. Typed roles are also what a
fact graph needs to generate an edge collection and to reject a misspelled role in a derivation
(today `["rel", ["spuse"], ["P"]]` would simply never match). Fix: `relationship_roles:` in
`volume.yaml` (`{id, inverse, symmetric}`), checked by `check.ts` in derivations and tests.

**S3. Assistance units have no identity.** Household-level outcomes are person-month facts copied onto
every member: CO-01 carries `snap_allotment` 336 on p2, p3, p4 and p5. The engine recomputes the same
household per member (`snap_household_members` has fan-in 25) and a consumer that sums per-person
values over-counts the benefit fourfold. Fix: a derived-collection declaration (`unit: snap_household`,
keyed by its member set) with unit-scope facts; at minimum a `constant_over: snap_household_members`
annotation on unit-level items (CO-2307, CO-385, CO-387, ...).

**S4. The time dimension is implicit.** (a) Nine person-scope items read per-month facts `at det_month`
(`snap_is_in_elderly_disabled_separate_household` CO-2304, `snap_meets_ece_eligibility`,
`snap_weekly_hours_worked`, `snap_weekly_earnings_worked`, `ma_csra_increased`, `chp_copayment_income_band`,
`chp_cost_sharing_annual_limit`, `chp_copayment`, `af_is_oap_age`), so household composition is fixed
at the determination month while income varies by month. (b) Look-back windows are parameter-sized
(`snap_abawd_period_months`, `ma_community_engagement_*_months`), so the months an evaluation needs are
known only at run time. (c) Parameters follow the determination date even when the month evaluated is
another fiscal year: CO-05 (as_of 2026-04-10) expects values for 2027-01 and 2027-04 under the April 2026
parameter set. Why it matters: these are the decisions a time-dimensioned engine must reproduce, and they
are visible only by reading `evaluate.ts`. Fix: per item, an explicit `evaluated: per month | as of
determination month` and `reads_months` window; per parameter, `version_by: determination_date |
month`. The declared but unused `month` scope is the natural home for month-varying parameters.

**S5. `to` means two things.** `versions[].to` is exclusive (`versionInForce`), `effective.to` is
inclusive (`inForce`); `docs/conventions.md` states neither. Fix: document both in Effective dating, or
rename (`until` / `through`).

**S6. Rule tests are mostly integration tests.** Of 2,032 rule tests, 821 (40%) give every derived input
of the item under test; 934 (46%) give only supplied facts. For an engine built test-first this means
items cannot be implemented and verified one at a time: my slice could answer 27 of its 92 expectations,
and all three `snap_person_earned_income` tests (CO-330) need `snap_self_employment_income` (CO-1702).
Fix: at least one unit-isolated test per item (given = its direct uses), generated where missing and
tagged `unit` vs `integration`.

**S7. Numeric semantics are unstated.** The reference engine computes in doubles, with `ceil(a − 1e-9)`
and `floor(a + 0.5 + 1e-9)` (`evaluate.ts:482–483`); a decimal engine (Direct File's Dollar rounds
HALF_EVEN to cents at every step) can land on the other side of a rounding boundary wherever an
intermediate value has more than two decimals (rates, day prorations, averages), and the harness
tolerance is 1e-9, so the suite will report it as a failure without saying which side is right. Table keys are strings (`"1"`..`"8"`) looked up with a JS number, so `8.0` must become `"8"` in
Ruby or Python. Fix: a paragraph in `docs/conventions.md`: money arithmetic is exact (or double), rounding
happens only where an item says, table keys are integers written as strings.

**S8. The reference adapter's stdin read fails on a large batch.** `scripts/adapters/codex-self.ts:11`
uses `fs.readFileSync(0)`, which throws `EAGAIN` on a non-blocking pipe: piping the 1.3 MB co batch
into it fails, and `conform.ts` then reports EPIPE. It is documented as "the simplest possible example
of an adapter", so others will copy it. Fix: read stdin as a stream (`for await (const c of process.stdin)`).

### Notes

**N1. No cycles anywhere** (2,614 edges, including the 29 month-shifted and 263 person-shifted). Keep it
so with a governance check: fact_graph has no cycle detection, and Direct File guards with a test
(`noCircularDeps.test.ts`).

**N2. MAGI status depends on Colorado Works.** `ma_magi_eligibility_status` reaches `cw_eligibility_status`
through CO-510 → CO-1150 → CO-953 → CO-1511 (closure 480, 105 of them cash items). Worth a policy
owner's look; for an engine it means a module split by program is not possible.

**N3. 16 items have no consumer and are not outcomes; 36 are unreachable from any outcome** (section 2).
An engine that computes outcomes only will never evaluate, or test in a household case, the CHP+
cost-sharing family or the Medicaid premiums. Make them outcomes or mark them informational.

**N4. `case` and `month` scopes are declared and unused in co**, and no suite case uses `month_facts`.

**N5. One-directional relationship edges are harmless today.** 42 suite cases state an edge on one person
only; re-evaluating them with symmetric edges (`symmetrize.ts`, through the app's own evaluator)
changed 0 of their expectations. An edge-collection model is safe on today's suite.

**N6. 39 quantifier bodies in 27 items mix "this person" and "that person"** (all 21 conditional
`reachable`s, 10 `filter`s, 5 `exists`, 2 `sum`, 1 `exists_related`). These are the items any engine
without a two-variable binding cannot express; listing them in the handoff would help an engine team
size the work.

---

## 7. Summary

Counts: 2 blocking, 8 should-fix, 6 notes.

Top five, in priority order:

1. **B1**: make the conformance tooling volume-explicit and prove `conform:self` on co.
2. **B2**: test `unknown`: operator truth tables and a missing-fact case per outcome.
3. **S1**: publish the parsed IR next to the suite.
4. **S4 with S3**: make the time dimension and assistance units explicit in the item grammar.
5. **S6**: one unit-isolated rule test per item.

What works well: the derivation language is small, regular and fully machine-readable; the graph is
acyclic, shallow enough (25) and has a modest median closure (43); parameters carry dated, contiguous
versions read from the ledger; `unknown` is specified precisely enough that an independent engine can
match it; and the adapter contract (one JSON in, one JSON out, `unimplemented` is not `failed`, batch
mode, sha pinning) let a working fact_graph adapter reach 27/27 passing in under a hundred lines.

## Disposition

Engineering fix round (engine, scripts, suite builder, adapters, tests and
docs; no ledger item edited). "Follow-up" items are listed, file by file, in
`docs/reviews/engineering-item-followups.md` (§ numbers below).

| Finding | Disposition |
|---|---|
| B1 Tooling targets `mwr`; reference adapter cannot run co | **Fixed.** Every script runs every volume by default (`--volume`/`CODEX_VOLUME` to choose); the reference adapter takes the suite's `codex.volume` and reads stdin as a stream; `npm run check` runs it out of process on every volume and requires 0 failed and 0 unimplemented (mwr 197/197, co 4330/4330). README and docs/conformance.md updated. |
| B2 The suite almost never tests unknown | **Fixed, in part as proposed.** (a) The three-valued tables are written down per operator in `docs/operators.md` and tested in `test/engine/operators.test.ts` (all, any, not, otherwise, unknown, case, comparisons, arithmetic, filter, sum, count, exists, reachable, at, each, some_month, count_months, avg, lookup miss, no version in force, item out of force via the trace). They are engine unit tests, not an exported volume-independent `semantics.json`; that fixture was not built. (b) Every program outcome has a cannot-determine case in its suite (133 co, 4 mwr): a household case (or the outcome's rule test) with one supplied fact removed, expecting `null`, with the missing facts listed. |
| S1 No machine-readable IR; YAML 1.1 | **Fixed / follow-up.** `npm run export` writes `conformance/<volume>/ledger.json` next to the suite, pinned to the same sha: identifier, kind, type, options, scope, tree, versions, effective, uses, used_by, pattern English. Both `=` forms parse in the app; codex_tool.py accepts the bare form; quoting the files is follow-up §1. |
| S2 Relationship roles not part of the codex | **Fixed.** `relationship_roles` in volume.yaml (`{id, inverse}`; a symmetric role names itself), read by the engine, carried in the suite and ledger.json, and checked (a warning) in derivations, tests and cases. |
| S3 Assistance units have no identity | **Follow-up §9** (a modelling change to the item grammar for the policy owners). |
| S4 Time dimension implicit | **Partly fixed (documented).** operators.md and conventions.md state that parameters follow the determination date for every month, that person-scope facts are computed once, and what `at` rebinds; each suite case carries `months_read`. Per-item `evaluated`/`reads_months` and per-parameter `version_by` were declined in this round: they are grammar changes to items the policy rounds own, and several windows depend on case data. |
| S5 `to` means two things | **Fixed (documented)** in conventions.md (Effective dating) and operators.md. Renaming to `until`/`through` was declined: it would touch every versioned item for no change in meaning. |
| S6 Rule tests are integration tests | **Partly fixed.** Each rule-test case carries `isolation: unit` or `integration` (821 of 2,032 co tests are unit). Writing the missing unit tests: follow-up §8. |
| S7 Numeric semantics; table keys | **Fixed (documented):** operators.md "Numbers" and "Tables" (string keys; a number key reads its decimal string), P41. |
| S8 Reference adapter stdin | **Fixed.** |
| N1 No cycles; keep it so | **Fixed.** `npm run check` now finds dependency cycles statically and blocks on one (none in either volume). |
| N2 MAGI depends on Colorado Works | **Follow-up §9** (policy question). |
| N3 Items with no consumer | **Follow-up §7** (listed). |
| N4 `case` and `month` scopes unused | **Noted.** Unchanged; operators.md states what each scope reads. |
| N5 One-directional edges harmless | **No action.** The engine still records both directions of a triple; a person named only in a triple now gets no relationships, and check warns. |
| N6 Mixed this/that bodies | **Fixed.** `ledger.json` lists, per item, the binders whose body reads both persons (`mixed_binding`). |

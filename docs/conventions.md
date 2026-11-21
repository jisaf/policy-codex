# Codex conventions

The ledger grammar the app's engine implements. The app is the reference implementation; this document is the human-readable statement of the same rules. The exact meaning of every operator a derivation uses (arguments, unknown propagation, empty groups, numbers, dates) is in `docs/operators.md`. Where this document and operators.md disagree, operators.md and the engine (`src/engine/evaluate.ts`) win, and this document is corrected.

## Item shape

```
ID            <volume>-<nnn>              stable, never reused
Fact          <Name>                      the name approvers and engineers both use
Identifier    <snake_case>                the machine name, derived from the Fact name; changed only through a change set that keeps the ID
Kind          Supplied | Derived | Parameter
Type          see Types
Scope         see Scopes
Program       All | Medicaid | SNAP       which program's meaning this item carries
Role          outcome                     only on derived facts that are a program result
Meaning       plain sentences; the definition an approver signs
Precision     how edge cases are measured (day boundaries, rounding, time zone)
Override      one county-facing sentence where a statute governs over the Colorado rule paragraph the item would
              otherwise follow: the paragraph superseded, the statute, the date (YAML statute_override); the
              plain-English trace repeats it as a "Statute over rule:" line
Supplied by   where the value comes from, in words (supplied facts only)
Derived as    the derivation, written only in catalog patterns (derived facts only)
Uses          every fact and parameter the derivation references
Source        citation and verbatim excerpt of the governing text
Effective     <date> to <date | present>
Implemented   Fact assembly | Determination engine
Examples      rule-level tests; the given facts and the expected value
Approval      roles that must sign, drawn from the volume's approval policy
Status        Draft | Reviewed | Approved
Open          numbered interpretation questions, cross-referenced to open-questions.md
Accepts from  other programs' facts a derived item reads on purpose (YAML accepts_from)
```

Fields that do not apply are omitted, not left blank.

### Types

| Type | Meaning |
|---|---|
| yes/no | Boolean. May be `unknown`. |
| whole number | Integer. |
| money | US dollars. Not rounded: a money value is whatever the arithmetic gives (it may carry more than two decimals, e.g. 604.6451612903226) unless the rule itself rounds (P41). Nothing rounds to cents. |
| hours | Non-negative number of hours, may be fractional. |
| rate | A decimal fraction or multiplier (1.33, not 133). |
| calendar date | A date without time, `YYYY-MM-DD`. |
| month | A calendar month, `YYYY-MM`. |
| text | Free text. |
| one of: a, b, c | Enumeration. Options are listed on the item. |
| person | A reference to a person in the case. |
| group of persons | A list of person references, in the order the case declares its persons (compared as an ordered list, not a set). |
| list of months | Months in ascending order. |
| relationships | A person's `[role, other]` pairs; the roles and their inverses are declared in `volume.yaml` (`relationship_roles`). Unstated is unknown; an empty list is none. |
| table keyed by <key> | A parameter table (`table keyed by person`, `table keyed by household size`). Keys are strings; a whole-number key reads its decimal string. |
| table keyed by income band | A parameter table whose keys are the inclusive upper bounds of income bands (as decimal fractions of the poverty guideline, `"1.33"`) and whose values are the amounts for each band; read with P48. A band the rule leaves open at the top ("175.01% and above") is the row keyed `"above"`, never an invented bound. |
| table keyed by year | A parameter table keyed by calendar year, such as a benefit level per summer. |
| table keyed by number of days | A parameter table keyed by a count of days (`"1"` to `"30"`), such as the Adult Financial partial month payment figures (9 CCR 2503-5 3.581.D.4); read with P24/P42 as a lookup by a whole number. |
| table keyed by option | A parameter table keyed by the options of a `one of` fact (a county, a region, a dwelling type, a service type), read with P24. A row is an amount, or an option of another `one of` item (a county's region), and the lookup then yields that option. Every option the rule reaches has a row (a 0 where the rule states no amount), so no lookup misses. |

Numbers are IEEE 754 binary64, computed in the order written; see `docs/operators.md`, Numbers.

### Scopes

| Scope | Meaning |
|---|---|
| Per person | One value per person in the case. |
| Per person per month | One value per person for each calendar month. |
| Per case | One value for the application or renewal as a whole. |
| Per month | One value for everyone for each calendar month, such as a national rate. |
| Global | One value for everyone, as of the determination date. Parameters are Global unless stated. |

Every parameter version and every item's effective range is chosen by the **determination date**, also when a rule evaluates another month (a look-back, a retroactive or future month). A per-person derived fact is computed once per case, on the determination date: `age` is today's age in every month evaluated.

### Completeness

Every fact is either **known** or **unknown**. A derivation whose inputs are unknown produces `unknown` unless a pattern supplies a default (see `otherwise`); `docs/operators.md` states, operator by operator, which unknown inputs decide the result and which do not. An outcome that is `unknown` is reported as *cannot determine*, together with the list of unknown supplied facts that caused it: the unstated supplied facts the evaluation asked for, evaluating left to right and short-circuiting as operators.md describes. Engineers must implement this propagation; approvers must never see a silent default. The three unknowns with no supplied fact behind them (a table lookup with no row, a parameter with no version in force, a division by zero) are reported as warnings by `npm run check` and on the trace.

## Naming and vocabulary

Adopted from the Colorado vocabulary review (docs/reviews/vocabulary-reuse.md, section 5). It governs new items; an existing identifier is renamed only where its name misleads, through a change set that keeps the item's ID (the renames made so far are listed in docs/colorado-notes.md).

1. **A prefix means "defined by this program's rule".** An item whose meaning cites one program's rule carries that program's prefix (`ma_`, `chp_`, `snap_`, `cw_`, `af_`, `cccap_`, `leap_`, `sebt_`), supplied facts included, and its program field is that program.
2. **No prefix means neutral.** A shared item's meaning names no program and no program's exclusions and is true as written for every reader; its program is `All`. Method prefixes are allowed for items defined by a method several programs adopt by reference: `ssi_` (the SSI financial methodology), `magi_` (MAGI-based income); `federal_` marks a federal figure (`federal_poverty_guideline_annual_table`).
3. **A program reads another program's prefixed item only when its rule names that program's result** (CHP+ applying the MAGI household and income rules, CCCAP's Colorado Works Child Care reading Colorado Works eligibility, SUN Bucks reading SNAP eligibility, Medicaid reading OAP receipt). The reading item lists each such identifier in `accepts_from`; governance warns on any other cross-program read (`read.cross_program`). A definitional borrow is fixed by giving the program its own fact, or by making the fact neutral.
4. **Yes/no:** `<prefix>is_<state>`, `<prefix>has_<thing>`, `<prefix>receives_<payment>` (a payment actually made), `<prefix>meets_<named test>` (a comparison with a limit or requirement), `<prefix>requires_verification_of_<element>`. An eligibility result is `<prefix>is_eligible` or `<prefix><group>_is_eligible`. Never a bare noun or participle.
5. **Money:** monthly unless the name says otherwise. The noun alone when it is the thing (`grant`, `allotment`, `deduction`, `premium`); no `_amount`. A period suffix only when not monthly: `_annual`, `_for_season`, `_at_<event>`. Plural `costs` and `expenses`.
6. **Income vocabulary:** supplied income facts state the gross amount received, before any program's exclusions; `_gross` says so where the name could be read otherwise (`wages_gross`). A "countable" or "net" figure is always a program's or a method's own derived item and carries its prefix (`snap_self_employment_income`, `cw_self_employment_net_profit`); `_net` is never shared. A program does not count its own grant as income.
7. **Rates:** `_pct_fpl` for an income-to-poverty ratio, `_pct` for a limit stated as a share, `_rate` for a multiplier applied to an amount. All are decimal fractions (1.33, not 133).
8. **Ages:** `_min_age` and `_max_age` are inclusive; `_age_limit` is exclusive ("under").
9. **Tables** end in `_table`; the step beyond the last row is `<table stem>_each_additional`; the unit goes in the stem when two tables differ by unit (`cccap_poverty_guideline_monthly_table`).
10. **One-of:** `_status` for an outcome with reasons, `_category` for a group, `_type` for a supplied classification. Never `is_` or `meets_`.
11. **Receipt of another program's benefit** is a supplied fact about the person's case (`receives_ssi`, `receives_tanf_cash`), never this volume's own determination of that program; the month's amount is a separate supplied money fact (`ssi_income`, `tanf_cash_income`), and each meaning says which of the two it is.
12. **Unknown is never silent.** Where a rule reads an unstated supplied fact as a value (`otherwise`), the fact's meaning or precision says "If not stated, <program> reads this as <value>."

### Words with more than one meaning

Adopted from the same-word audit (docs/reviews/audit-same-word-different-meaning.md, section 3) under the product-owner decision that supplied facts are program-neutral statements of what is true of the person. Some words mean different things in different programs: household, unit, member, parent, child, sibling, caretaker, guardian, relative, spouse, head, dependent, lives with, absent, student, school, disabled, blind, elderly, homeless, institution, resident, income, earned, unearned, countable, resources, assets, shelter, utility, medical expense, work, employment, hours, lump sum, in-kind, month. The audit's glossary (section 1) lists each program's definition with its excerpt.

13. **A supplied fact states what happened or what is true, never a program's classification of it.** The neutral fact describes the person, the relationship, the receipt, the holding or the setting in words that need no program's rule to apply (`nighttime_residence_type`, `education_program_type`, `title_ii_benefit_type`, `child_welfare_payment_type`). Two exceptions: (i) a finding made outside this volume, recorded as an event, may be a supplied fact with the finding program's prefix (a county's medical certification, `af_and_so_medical_certification_received`; a state contractor's finding, `ma_wawd_limited_disability_finding`; a court order; an SSA award; another program's case status under rule 11); (ii) a figure the rule itself takes as attested (the product-owner decision on lighter determinations), named for what it is (`attested_household_income_pct_fpl`).
14. **A program's meaning of a shared word is a derived item with that program's prefix**, citing that program's definition (`snap_is_homeless`, `sebt_is_homeless_child`, `cccap_is_family_experiencing_homelessness`). Never a second supplied fact, never a relationship role, and never a stand-in read through `otherwise` from another program's fact.
15. **An unprefixed derived item has one meaning.** A shared item that combines neutral facts names no program (`is_related_to`, `half_siblings`, `is_married`). A shared item that states a definition several programs adopt names every program that reads it in its meaning (`is_full_time_secondary_student_finishing_before_nineteen`: Medicaid and Colorado Works). A program whose definition differs reads its own prefixed item instead. A shared item may not stand for "what each program counts" (the retired `has_unearned_income`).
16. **Relationship roles name legal or factual relationships only**: parent (legal: natural or adoptive), stepparent, spouse (legally married), holds_out_as_spouse_with, grandparent, legal_guardian, foster_parent, other_relative, has_primary_responsibility_for, provides_regular_care_to, tax_filer and tax_dependent (a tax fact), buys_prepares_with, shares_heat_with. Siblings are derived from parent and stepparent (`siblings`, `full_siblings`, `half_siblings`, `step_siblings`), not stated. No role carries a program's term (caretaker relative, adult caretaker, non-parent caretaker, parental control, head of household). Each role's meaning is written in volume.yaml next to its inverse.
17. **Co-residence is `lives_with`, never an edge.** A relationship says how two people are related, not where they live. A household, caretaker or custody item that asks whether persons live together reads `lives_with` (and the program's own temporary-absence rule); where a reader still crosses an edge as co-residence because `lives_with` is not stated, its precision says so (rule 12).
18. **Facts about a home or a household have one value per home or unit**, read from one place: a case-scope fact, or the unit's head where the rule names one; never a value each member repeats.

Naming of the program items: `<prefix><the program's own term>`, using the rule's term rather than the shared word (`cccap_adult_caretaker_of`, `ma_caretaker_relative_of`, `cw_caretaker_of`, `snap_is_under_parental_control_of_household_member`, `sebt_is_homeless_child`).

**accepts_from.** Rule 3 is unchanged: a program reads another program's prefixed item only when its rule names that program's result, and lists it in `accepts_from`. A neutral fact or a one-meaning shared derived item needs no `accepts_from`. Governance enforces the class with two checks: `read.shared_definition` warns when a program's rule reads an unprefixed derived item whose meaning names other programs but not the reader (each program's names are declared in volume.yaml, `programs[].names`); and `name.prefix` warns on a supplied fact whose program is one program but whose identifier lacks that program's prefix (rule 13: a program's finding carries its prefix; anything else is made neutral).

**Another program's exemption or status (rule 11 applied).** Where a rule names another program's status that this volume itself determines (community engagement's "not exempt from a work requirement under" SNAP, 42 CFR 435.554(c)(7)), the reader reads this volume's own item through `accepts_from`, and a supplied case fact stands in only as `otherwise` for a household the case does not determine.

## Pattern catalog

Derivations are written only in these patterns. Words in brackets are slots filled with a fact, a parameter, a literal, or another pattern. A missing pattern is a catalog change, made by the tech member and recorded here, never a reason to write prose in `Derived as`.

Logic

- P1 `all of the following are true:` followed by an indented list
- P2 `any of the following is true:` followed by an indented list
- P3 `it is not the case that [condition]`
- P4 `[condition], otherwise [value]` supplies a default when the condition is unknown
- P5 `[fact] is unknown`

Comparison

- P6 `[number] is less than | at most | at least | more than | equal to [number]`
- P7 `[fact] is [option]` for enumerations and yes/no
- P8 `[date] is on or before | on or after | before | after [date]`

Dates and months

- P9 `the number of whole years between [date] and [date]`
- P10 `the month containing [date]`
- P11 `[whole number] months before | after [month]`
- P12 `[date] is within the [N] days | months ending on [date]`
- P13 `the [N] consecutive months ending with [month]`

Monthly facts

- P14 `[per-month fact] for [month]`
- P15 `[condition] in each of [months]`
- P16 `the number of months in [months] for which [condition]`
- P17 `[per-month fact] averaged over [months]`

Arithmetic

- P18 `[number] plus | minus | times | divided by [number]`
- P19 `the sum of [number fact] for each [person] in [group] where [condition]`
- P20 `the count of persons in [group] where [condition]`

Persons and relationships

- P21 `[person] is a [relationship] of [person]` relationships are supplied facts
- P22 `there is a person in [group] such that [condition]`
- P23 `all persons in [group] such that [condition]`

Parameters

- P24 `[parameter table] for [key]`
- P25 `[parameter] as of [date]` (`as_of`) selects the version in effect on that date, for a rule that applies a figure from a date other than the determination date (the poverty guideline a program adopts each July 1 or October 1, read from the one federal table). Every other read of a parameter is as of the determination date (see Scopes). Implemented in the hard-coded numbers fix round

Added during the work-requirements spike, because the policy needed them

- P26 `there is a person of whom this person is a [relationship, ...] such that [condition]`
- P27 `[person] is in [group]`
- P28 `[person]'s [fact]` reads another person's fact
- P29 `[table keyed by person] for [month], for [person]`
- P30 `in at least one of [months]: [condition]`
- P31 `the lesser of [number] and [number]`
- P32 `the month after [month]`, `the first day of [month]`, `the months from [month] through [month]`
- P33 `if [condition] then [value]; else if ...; otherwise [value]` for enumerated outcomes. The first condition that is true chooses; a condition that is **unknown** makes the result unknown and later conditions are not tried; no true condition and no `otherwise` is unknown
- P34 unknown propagation through every pattern unless `otherwise` supplies a default, operator by operator as `docs/operators.md` states it

Added for the Colorado SNAP chapter (phase 2), because household composition, income aggregation, and the allotment arithmetic needed them

- P35 `every person in the case` the group of every person the case names
- P36 `the persons joined to this person by [relationship or relationship]` the persons reachable from this person over a chain of the named relationships, this person included; unknown when this person's relationships are unstated. With a condition, `the persons joined to this person by [relationships], crossing an edge only where [condition]`: an edge is crossed only where the condition holds, with `this person` the person the chain has reached and `that person` the one across the edge (the only pattern where "this person" changes meaning). The group is the persons reachable over edges whose condition is true; it is unknown when an edge whose condition is unknown leads out of that group; it does not depend on the order relationships are listed in. It is not a filter: a person reachable only over an edge whose condition is false is out. (Items written before the engineering review say `such that` here; it reads the same.)
- P37 `all persons in [group] such that [condition]` the members for whom the condition holds, with `that person` bound to each member in turn (inline, or as a block with the condition indented); unknown when the condition is unknown for any member
- P38 `the number of persons in [group]`
- P39 `the sum of [number] for each person in [group]` with `that person` bound to each member (inline, or as a block `the sum for each person in [group] of` with the value indented); unknown when any member's value is unknown
- P40 `the greater of [number] and [number]`
- P41 `[number] rounded up to the next whole dollar`, `[number] rounded to the nearest whole dollar` (halves round up, toward +infinity). Both carry a 1e-9 tolerance for binary noise: rounding up is `ceil(x − 1e-9)`, rounding to nearest `floor(x + 0.5 + 1e-9)`. Rounding down is written as minus the rounding up of minus the number. These are the only roundings; a value no rule rounds is not rounded
- P42 `[table keyed by household size], for [whole number]` a lookup in a global table keyed by a number; the `table keyed by household size` type joins `table keyed by person`

Added for the MAGI household (phase 3)

- P43 `the persons who share a [relationship] with this person` the persons, other than this person, who have a person in that role in common with this person (with `parent`, the siblings); unknown when this person's relationships are unstated
- P45 `that person is a [relationship or relationship] of a person in [group]` inside a filter, sum or exists: the bound person stands in one of the roles to some member of the group (a join between the bound person and the group without rebinding either); unknown when that person's relationships are unstated
- P44 `[whole number] months after [month]`, `[whole number] months before [month]` (P11 as stated in the catalog, now implemented; the single-step forms of P32 remain)

Added for verification deadlines (phase 9)

- P46 `[whole number] days after [date]` the calendar date that many days after a date (a negative number counts back), so a period a rule states in days (10 days to return verification, a 90-day reasonable opportunity period) is computed from the date it runs from; unknown when either input is unknown

Added for SNAP initial-month proration (phase-10 open-question sweep)

- P47 `the number of days from [date] to [date]` the count of calendar days from the first date to the second (negative when the second is earlier), so a rule that prorates by days (10 CCR 2506-1 4.207.2.C's days remaining in the application month over the days in the month) can count them; unknown when either input is unknown

Added for the HCPF stakeholder fix round (Buy-In premiums re-based each state fiscal year)

- P48 `[table keyed by income band], for the band containing [number]` (`band`) the value of the first band, in ascending order of its upper bound, whose inclusive upper bound is at least the number; unknown when either input is unknown or the number is above the last bound. A premium schedule stated by income band (10 CCR 2505-10 § 8.100.6.P.1.f.iii, Q.1.g.iv) is then a dated parameter rather than literals in a `case`

Added for the engineering item follow-up pass (a calendar month without a fixed anchor)

- P49 `the calendar month number of [month]` (`month_of_year`) the number of the month in its year, 1 (January) to 12 (December); unknown when the month is unknown. A rule anchored to a month of each year (the LEAP program year from November, 9 CCR 2503-7 3.751.1; the compulsory attendance age on August 1, C.R.S. 22-33-104(1)(a)) finds the most recent such month as this month less the months since that calendar month, instead of counting whole years from a fixed anchor month

Added for the hard-coded numbers fix round (docs/reviews/audit-hardcoded-numbers.md)

- P50 `the most recent month number [n] on or before [month or date]` (`latest_month_of_year`) the most recent month, on or before the month (or the month containing the date), whose calendar month number is n; the month itself when its number is n; unknown when either input is unknown. A program year, school year or guideline year that starts in a month of each year (the LEAP program year in November, the compulsory attendance date in August, the school meal guideline year in July) is found from a whole-number month parameter, with no anchor month and no arithmetic in the rule
- P51 `[table keyed by a whole number], for [number], adding [amount] for each beyond its last row` and `[table], for [number], or its last row beyond it` (`lookup_extended`) a lookup that reads the table's last row itself: up to it, the row for the number; above it, the last row plus the amount for each number beyond it (the `_each_additional` step of the poverty guideline, the SNAP limits, the Colorado Works standards), or the last row itself ("6 or more"). A new table version with more or fewer rows needs no change to the rule
- P52 `the calendar year of [month or date]` (`year_of`) the year as a whole number; unknown when the month is unknown. A figure keyed by year (the Summer EBT benefit level of a summer) is read for the year of a month found with P50, with no anchor date

Added for the same-word audit fix round (full and half siblings)

- P53 `the persons who share every [relationship] with this person` (`shared_relative` with `"every"`) the persons, other than this person, whose persons in the role are exactly this person's: with `parent`, the full siblings, who share both legal parents; P43 without `every` gives full and half siblings. Unknown when this person's relationships are unstated

## Tests

Two levels live in the codex. Code-level tests are the engineer's and are out of scope.

**Rule-level tests** attach to one item. Each gives values for the facts in `Uses` and states the expected value. They are the `Examples` on the item and are exported to `tests/rule-tests.yaml` in this shape:

```yaml
- id: WR-021-T1
  item: WR-021
  as_of: 2027-03-15
  given:
    date_of_birth: 2007-03-15
  expect:
    age: 19
```

**Case-level tests** describe a whole household and the expected value of every outcome for every person. They exercise fact assembly and the determination engine together. They live in `tests/cases.yaml`:

```yaml
- id: C-01
  title: Single adult, 30, works 90 hours a month
  as_of: 2027-03-15
  persons:
    - id: p1
      date_of_birth: 1996-08-02
      ...
  months:
    p1:
      2027-02: {hours_worked: 90}
  expect:
    p1:
      medicaid_meets_community_engagement: yes
      snap_countable_month_2027_02: no
```

A rule test's `given` may state `determination_date`, which replaces `as_of`. A test may state a value for a derived item: that value replaces the item's rule for that person, which is how a test isolates one rule. Parameters are never stated as a person's facts (the engine ignores them there, and `npm run check` warns); a test that needs another parameter value states it under `parameters:`. Every person a relationship triple names is declared in the test.

An engine implementation passes when every rule-level test and every case-level test passes. A test that cannot be run against a layer because the item is implemented elsewhere is still exported; the engineer for that layer owns it.

## Approval

Each volume declares an approval policy: which roles must sign an item, keyed by the item's `Program` and tags. Approval attaches to items, and a change set is the vehicle that advances many items at once. Required approvers for a change set are the union of what its items require. Approval is a policy, not a workflow designer.

A policy may set `upstream_of_outcomes: true`: an item that any program's declared outcome reads, directly or through other items, then also requires that program's `by_program` roles, so a change to a shared or another program's item reaches every owner whose outcome it changes.

In the item file, `status` is `Draft`, `Reviewed` or `Approved` (absent reads as Draft), and `approval` is the record of signatures, one row per role: `{role, by, date, commit}`. Governance rejects an unknown status, a role the policy does not declare, an `Approved` item missing a required role's signature, and a `Reviewed` or `Approved` item that rests (directly or through what it reads) on an excerpt marked `Verification: unverified`; it warns on every item citing such an excerpt. An indexed parameter may carry `review_by`, the date its next version is due; governance warns once that date has passed.

## Effective dating and change sets

Every item carries `Effective`. A policy change produces a new version of an item with a new effective range; the previous version stays in the history.

Two kinds of date range are in the ledger, with different ends:

- An item's own `effective` range: `from` is the first day in force and `to` the **last** day in force (inclusive; `to: present` never ends). On a determination date outside it the item is unknown, its rule does not run, and a value stated for it is ignored.
- A parameter's `versions`: each `from` is the first day the value is in force and `to` the first day it is **not** (exclusive), so consecutive versions share a date. A determination date no version covers gives unknown (reported as a warning).

Date logic belongs in these ranges, not inside a derivation: a rule that changes on a date is two versions, not a comparison with a literal date.

A figure the State sets but has not published where it can be fetched (the LEAP program-year benefit levels, the CCCAP county entry limits) is still a parameter, never a supplied fact entered on each person: it carries an empty list of versions (`versions: []`) and names, in `open`, the question that records where the figure will come from. It is unknown on every date, with a `no-version` warning, until a dated version is loaded; a rule test or household case that needs a value states one under `parameters:`. A change set names the items changed, the reason, the source of the change, and the approvals collected. The diff between versions is the diff of the item text; the engineer's work is the diff of the generated engineer view.

## Engineer handoff

For a volume, the handoff is:

1. The items, which the engineer reads for meaning and provenance.
2. `handoff/<volume>.md` (`npm run handoff`, every volume by default), the engineer sheet: every item with its identifier, type, scope, target layer, dependencies, and the derivation in pattern English and as the expression tree.
3. `docs/operators.md`, the meaning of every operator in those trees.
4. `conformance/<volume>/ledger.json` (`npm run export`), the same items as JSON: trees, types, scopes, options, parameter versions, uses.
5. `conformance/<volume>/suite.json` (`npm run conformance`), the conformance suite built from the rule tests and `tests/cases.yaml`; see `docs/conformance.md`.
6. `open-questions.md`, interpretation questions still open. An engineer never resolves one of these; they implement the stated assumption and flag the item.

The engineer implements the derivations exactly, runs the suite, and reports which tests fail. A failing test means either the implementation or the codex is wrong, and the codex is corrected through a change set, never in code.

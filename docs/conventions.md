# Codex conventions

The ledger grammar the app's engine implements. The app is the reference implementation; this document is the human-readable statement of the same rules.

## Item shape

```
ID            <volume>-<nnn>              stable, never reused
Fact          <Name>                      the name approvers and engineers both use
Identifier    <snake_case>                the machine name, derived once from the Fact name, never changed
Kind          Supplied | Derived | Parameter
Type          see Types
Scope         see Scopes
Program       All | Medicaid | SNAP       which program's meaning this item carries
Role          outcome                     only on derived facts that are a program result
Meaning       plain sentences; the definition an approver signs
Precision     how edge cases are measured (day boundaries, rounding, time zone)
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
```

Fields that do not apply are omitted, not left blank.

### Types

| Type | Meaning |
|---|---|
| yes/no | Boolean. May be `unknown`. |
| whole number | Integer. |
| money | US dollars and cents. |
| hours | Non-negative number of hours, may be fractional. |
| calendar date | A date without time, `YYYY-MM-DD`. |
| month | A calendar month, `YYYY-MM`. |
| text | Free text. |
| one of: a, b, c | Enumeration. Options are listed on the item. |
| person | A reference to a person in the case. |
| group of persons | A set of person references. |
| table keyed by <key> | A parameter table. |

### Scopes

| Scope | Meaning |
|---|---|
| Per person | One value per person in the case. |
| Per person per month | One value per person for each calendar month. |
| Per case | One value for the application or renewal as a whole. |
| Per month | One value for everyone for each calendar month, such as a national rate. |
| Global | One value for everyone, as of the determination date. Parameters are Global unless stated. |

### Completeness

Every fact is either **known** or **unknown**. A derivation whose inputs are unknown produces `unknown` unless a pattern supplies a default (see `otherwise`). An outcome that is `unknown` is reported as *cannot determine*, together with the list of unknown supplied facts that caused it. Engineers must implement this propagation; approvers must never see a silent default.

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
- P25 `[parameter] as of [date]` selects the version in effect on that date

Added during the work-requirements spike, because the policy needed them

- P26 `there is a person of whom this person is a [relationship, ...] such that [condition]`
- P27 `[person] is in [group]`
- P28 `[person]'s [fact]` reads another person's fact
- P29 `[table keyed by person] for [month], for [person]`
- P30 `in at least one of [months]: [condition]`
- P31 `the lesser of [number] and [number]`
- P32 `the month after [month]`, `the first day of [month]`, `the months from [month] through [month]`
- P33 `if [condition] then [value]; else if ...; otherwise [value]` for enumerated outcomes
- P34 unknown propagation through every pattern unless `otherwise` supplies a default

Added for the Colorado SNAP chapter (phase 2), because household composition, income aggregation, and the allotment arithmetic needed them

- P35 `every person in the case` the group of every person the case names
- P36 `the persons joined to this person by [relationship or relationship]` the persons reachable from this person over a chain of the named relationships, this person included; unknown when this person's relationships are unstated
- P37 `all persons in [group] such that [condition]` the members for whom the condition holds, with `that person` bound to each member in turn (inline, or as a block with the condition indented); unknown when the condition is unknown for any member
- P38 `the number of persons in [group]`
- P39 `the sum of [number] for each person in [group]` with `that person` bound to each member (inline, or as a block `the sum for each person in [group] of` with the value indented); unknown when any member's value is unknown
- P40 `the greater of [number] and [number]`
- P41 `[number] rounded up to the next whole dollar`, `[number] rounded to the nearest whole dollar` (halves round up)
- P42 `[table keyed by household size], for [whole number]` a lookup in a global table keyed by a number; the `table keyed by household size` type joins `table keyed by person`

Added for the MAGI household (phase 3)

- P43 `the persons who share a [relationship] with this person` the persons, other than this person, who have a person in that role in common with this person (with `parent`, the siblings); unknown when this person's relationships are unstated
- P44 `[whole number] months after [month]`, `[whole number] months before [month]` (P11 as stated in the catalog, now implemented; the single-step forms of P32 remain)

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

An engine implementation passes when every rule-level test and every case-level test passes. A test that cannot be run against a layer because the item is implemented elsewhere is still exported; the engineer for that layer owns it.

## Approval

Each volume declares an approval policy: which roles must sign an item, keyed by the item's `Program` and tags. Approval attaches to items, and a change set is the vehicle that advances many items at once. Required approvers for a change set are the union of what its items require. Approval is a policy, not a workflow designer.

## Effective dating and change sets

Every item carries `Effective`. A policy change produces a new version of an item with a new effective range; the previous version stays in the history. A change set names the items changed, the reason, the source of the change, and the approvals collected. The diff between versions is the diff of the item text; the engineer's work is the diff of the generated engineer view.

## Engineer handoff

For a volume, the handoff is:

1. `codex.md`, the items, which the engineer reads for meaning and provenance.
2. `handoff.md`, the engineer sheet: every item with its identifier, type, scope, target layer, dependencies, and the derivation in compact form, plus the dependency graph.
3. `tests/rule-tests.yaml` and `tests/cases.yaml`, the conformance suite.
4. `open-questions.md`, interpretation questions still open. An engineer never resolves one of these; they implement the stated assumption and flag the item.

The engineer implements the derivations exactly, runs the suite, and reports which tests fail. A failing test means either the implementation or the codex is wrong, and the codex is corrected through a change set, never in code.

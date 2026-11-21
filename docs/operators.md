# Operator reference

The meaning of every operator a `derived:` expression can use, as the codex's
engine (`src/engine/evaluate.ts`) implements it. This is the specification an
independent implementation follows; `docs/conventions.md`'s pattern catalog
is the English an approver reads for the same trees. Where the two documents
disagree, this one and the engine win, and conventions.md is corrected.

Each entry gives the arguments, the result, what an unknown input does, what
an empty group or month list does, and anything the operator rebinds. The
conformance suite (`docs/conformance.md`) holds the codex to every rule here:
`test/engine/operators.test.ts` checks each one, and each program outcome has
a "cannot determine" case in the suite.

## The expression tree

A `derived:` value is JSON (written in YAML flow style):

- `true`, `false`, a number: that literal.
- A string:
  - `YYYY-MM-DD` or `YYYY-MM`: a date or month literal;
  - an identifier the volume has: that item's value for the current
    person and month (see Resolution);
  - anything else: the string itself (an option of a `one of` item, a role
    name, a table key).
- An array `[op, arg, ...]`: an operator applied to its arguments. A few
  arguments are not expressions and are never evaluated: the role lists of
  `rel`, `exists_related`, `has_relative_in`, `reachable`; the role of
  `shared_relative`; the option list of `in`; the `else` marker of `case`.

The operator `=` is written quoted (`["=", a, b]`) by the app. A bare `=`
reads the same in any YAML 1.2 parser, but YAML 1.1 parsers (PyYAML,
SnakeYAML 1.x) read it as the `value` tag; quote it when writing by hand.

`npm run export` writes every item's tree, with its parameters and versions,
to `conformance/<volume>/ledger.json`, so an engine team never has to parse
the YAML.

## Values

| Value | Representation |
|---|---|
| unknown | `null`. Every operator below says how it treats it. |
| yes/no | `true` / `false` |
| number (money, hours, rate, whole number) | IEEE 754 binary64 (a JavaScript number). See Numbers. |
| calendar date | `"YYYY-MM-DD"` string |
| month | `"YYYY-MM"` string |
| one of | the option string |
| person | the person's id in the case (`"p1"`) |
| group of persons | an array of person ids, in the order the case declares its persons (never sorted, never a set) |
| list of months | an array of months, ascending |
| table keyed by household size / by person | an object; keys are strings (`"1"`, `"2"`, ..., or person ids) |

Dates and months are compared as strings, which is chronological for these
fixed-width forms.

## The evaluation context

An expression is evaluated for:

- **this person** (`p`): the person the item is evaluated for;
- **the month** (`m`): for a `person-month` or `month` item, the month being
  evaluated; otherwise none;
- **that person** (`P`): the person bound by the innermost `filter`, `sum`,
  `exists`, `exists_related` or `reachable` condition; none outside them;
- **the determination date**: the case's `as_of` (a rule test's
  `given.determination_date` takes its place). It never changes inside an
  evaluation, not even under `at`.

### Resolution of an identifier

`value(identifier, this person, the month)` is decided in this order:

1. **Effective range.** An item whose `effective` range does not cover the
   determination date is unknown. Its rule never runs and a value stated for
   it in the case is ignored. `effective.from` and `effective.to` are both
   inclusive (`to: present` never ends).
2. **Parameter.** A value under the case's `parameters` wins. Otherwise a
   parameter with `versions` takes the version in force **on the
   determination date**: `from <= date < to` (`from` inclusive, `to`
   exclusive; the latest `from` wins). A date no version covers gives
   unknown and a `no-version` warning. A parameter without versions has its
   one `value`. The version is chosen by the determination date even when
   the expression is evaluating another month (an ABAWD look-back, a
   retroactive month, a future month of a case): there is no
   "parameter as of the month" in the engine.
3. **Case scope.** `determination_date` is the determination date; any other
   `case`-scope item is unknown (a stated value is not read).
4. **Month scope.** `month_facts[the month][id]`, else the case-wide
   default, else unknown.
5. **Stated values.** For a `person` item, the value stated for this person;
   for a `person-month` item, the value stated for this person in the month,
   else their `month_defaults` value. **This applies to derived items too: a
   stated value for a derived item replaces its rule** for that person (and
   month).
6. A supplied item with no stated value is unknown.
7. A derived item's rule is evaluated with this person and the month,
   `that person` unset, and the result is memoised per (identifier, person,
   month). A `person`-scope derived item is memoised per person, so it is
   computed once per case: `age` is the age on the determination date, used
   unchanged in every month (a past month's "child under 22" uses today's
   age). A `global` derived item is computed once per case.

## Logic

| Operator | Arguments | Result | Unknown | Notes |
|---|---|---|---|---|
| `all` | conditions, at least one | true when every one is true | false if any is false; otherwise unknown if any is unknown | Evaluated left to right; the first false stops it (later ones are not evaluated). |
| `any` | conditions, at least one | true when one is true | true if any is true; otherwise unknown if any is unknown | Left to right; the first true stops it. |
| `not` | condition | the negation | unknown in, unknown out | |
| `otherwise` | value, default | the value when it is known, else the default | the default only replaces unknown, never `false` or `0`; the default may itself be unknown | The only way to turn unknown into a value. |
| `unknown` | value | true when the value is unknown | never unknown | |
| `case` | arms `[condition, value]`, optionally a last `["else", value]` | the value of the first arm whose condition is true | **an unknown condition makes the result unknown: later arms are not tried**, even one that would match. No arm true and no `else`: unknown | Conditions are evaluated in order and only until one is true or unknown. A DMN first-hit table, FEEL `if`, or salience-ordered rules skip an arm whose condition is null; this does not. |

## Comparison

| Operator | Arguments | Result | Unknown |
|---|---|---|---|
| `<` `<=` `>` `>=` | two numbers, dates or months | the comparison | unknown if either side is unknown (both are always evaluated) |
| `=` | two values | strict equality: same type and value | unknown if either side is unknown. Two groups are never `=` (arrays compare by identity); no item compares groups. |
| `in` | value, a literal list | whether the value is in the list | unknown if the value is unknown |

## Numbers

Arithmetic is IEEE 754 binary64, evaluated in the written order:

| Operator | Arguments | Result | Unknown |
|---|---|---|---|
| `+`, `*` | two or more numbers | folded left to right from 0 (`+`) or 1 (`*`) | unknown if any operand is unknown |
| `-` | two numbers | a − b | unknown if either is |
| `/` | two numbers | a / b | unknown if either is. **Division by zero is unknown** and reported as a `division-by-zero` warning; the engine never produces NaN or Infinity. |
| `min`, `max` | two numbers | the lesser, the greater | unknown if either is |
| `ceil` | number | `Math.ceil(x − 1e-9)`: the next whole number up, except that a value within 1e-9 above a whole number is that number (so binary noise such as 2.0000000001 does not round up to 3) | unknown in, unknown out |
| `round` | number | `Math.floor(x + 0.5 + 1e-9)`: the nearest whole number; a half rounds **up, toward +infinity** (2.5 → 3, −2.5 → −2), as does a value within 1e-9 below a half | unknown in, unknown out |

There is no floor operator. A rule that rounds down writes `−ceil(−x)`,
which is `floor(x + 1e-9)`.

**Money is not rounded.** A money value is whatever the arithmetic gives
(45.27317999999999, 604.6451612903226) unless the rule itself applies `ceil`
or `round`; nothing rounds to cents. An implementation in decimal arithmetic
(BigDecimal, FEEL, a Dollar type) must not round intermediate values, and
should keep at least 15 significant digits in division; the conformance
harness compares numbers within 1e-9, so a result that differs only in binary
noise passes, but a comparison that lands exactly on a limit, or a rounding
of an exact half, can differ between binary and decimal arithmetic. Where
they differ, binary64 in written order is the codex's answer.

## Tables

| Operator | Arguments | Result | Unknown |
|---|---|---|---|
| `lookup` | table, key | the row for the key | unknown if the table or the key is unknown. **A key with no row is unknown** and reported as a `lookup-miss` warning. |
| `band` (P48) | table keyed by income band, number | the value of the first band, in ascending order of its upper bound, whose inclusive upper bound is at least the number (bounds compared with a 1e-9 tolerance) | unknown if the table or the number is unknown. **A number above the last bound is unknown** and reported as a `lookup-miss` warning. |

Table keys are strings. A number key is looked up as its decimal string (a
household size of 3 reads row `"3"`, and 3.0 is the same key); a person key
is the person's id. The step beyond the last row is a separate
`_each_additional` parameter that the rule applies itself.

## Persons and groups

| Operator | Arguments | Result | Unknown | Empty group |
|---|---|---|---|---|
| `persons` | none | every person of the case, in declaration order | never unknown | (a case has at least one person) |
| `count` | group | the number of members | unknown if the group is | 0 |
| `filter` | group, condition | the members for whom the condition is true, in the group's order | unknown if the group is, or if the condition is unknown for **any** member (every member is evaluated) | `[]` |
| `sum` | group, number | the sum over members, folded in the group's order | unknown if the group is, or at the first member whose value is unknown | 0 |
| `exists` | group, condition | true at the first member for whom the condition is true | otherwise unknown if any member's condition is unknown, else false | false |
| `in_group` | person, group | whether the person is a member | unknown if the group is unknown. An unknown person is not a member (false). | false |
| `of` | person, expression | the expression evaluated with **this person** = the given person | unknown if the person is unknown | |

Inside the condition or value of `filter`, `sum` and `exists`, **that
person** (`["P"]`) is the member being tested; this person and the month are
unchanged. `of` changes this person only: `that person` and the month stay
as they were outside it, so `["of", ["P"], x]` reads x for the member while
a bare `x` still reads it for this person.

## Relationships

A person's relationships are a list of `[role, other]` pairs, read "this
person is the `role` of `other`" (`[parent, p2]` on p1: p1 is p2's parent).
A case may also state `[role, from, to]` triples, which are recorded on both
persons: `[role, other]` on `from`, and `[inverse, from]` on `to` when the
role has an inverse. The roles and their inverses are declared in each
volume's `volume.yaml` (`relationship_roles`); a symmetric role is its own
inverse, and a role with no inverse is recorded on the first person alone. A
triple naming a person the case does not declare records nothing on that
person (the declared person's half still names them).

A person whose relationships are **not stated** (no `relationships` key) has
unknown relationships; a stated empty list means none. Where an operator
reads **another** person's relationships (the persons a walk reaches, the
middle person of `shared_relative`), unstated is read as none.

| Operator | Arguments | Result | Unknown |
|---|---|---|---|
| `rel` | roles, person | whether this person holds one of the roles toward the person | unknown if this person's relationships are unstated; an unknown person gives false |
| `exists_related` | roles, condition | true at the first of this person's pairs with one of the roles whose `other` (as **that person**) meets the condition; pairs are tried in the order listed | unknown if this person's relationships are unstated, or (when none is true) if the condition is unknown for some such pair; false when there are no such pairs |
| `has_relative_in` | roles, group | whether **that person** holds one of the roles toward a member of the group (a join between the bound person and the group, rebinding neither) | unknown if the group is unknown or that person's relationships are unstated. Only inside a binder. |
| `shared_relative` | role | the persons other than this person who have a person in `role` in common with this person (with `parent`: this person's siblings), in declaration order | unknown if this person's relationships are unstated |
| `reachable` | roles, optional condition | the persons joined to this person by a chain of the named roles, this person included, in declaration order | see below |

**`reachable`.** Without a condition, every person reachable from this person
over edges with one of the roles. With a condition, an edge from `cur` to
`other` is crossed only where the condition is true, evaluated with **this
person = `cur`** (the person the walk has reached, not the item's own person)
and **that person = `other`**. This is the only operator that changes what
"this person" means for its argument; the condition gates each edge and is
not a filter on the result (a person reachable only through an edge whose
condition is false is out even if the condition is true of them).

The result is a fixed point and does not depend on the order relationships
are listed in:

- a person is **in** if reachable over edges whose condition is true;
- the result is **unknown** if some edge whose condition is unknown leads
  from a person who is in to a person who is not (that person's membership
  turns on the unknown);
- an edge whose condition is unknown between two persons who are both in
  changes nothing;
- everyone else is **out**.

The result is unknown also when this person's relationships are unstated.
Because the condition is evaluated from the person reached, the closure is
directional: an edge may cross from p1 to p2 but not from p2 to p1, so two
members' groups need not be equal.

## Months and dates

| Operator | Arguments | Result | Unknown |
|---|---|---|---|
| `month` | none | the month in context | an error (not unknown) outside a month context |
| `det_date`, `det_month` | none | the determination date, its month | never unknown |
| `at` | expression, month | the expression evaluated with **the month** = the given month; this person, that person and the determination date are unchanged (parameter versions and effective ranges are still chosen by the determination date) | unknown if the month is unknown |
| `first_day` | month | its first day | unknown in, unknown out |
| `month_of` | date | the month containing it | unknown in, unknown out |
| `month_of_year` | month | its calendar month number, 1 (January) to 12 (December) | unknown in, unknown out |
| `month_before`, `month_after` | month | the month before or after | unknown in, unknown out |
| `months_before`, `months_after` | n, month | the month n months before or after | unknown if either is |
| `months_ending` | n, month | the n consecutive months ending with the month, ascending (`[]` for n ≤ 0) | unknown if either is |
| `months_from_to` | month a, month b | the months from a through b, ascending (`[]` when a is after b) | unknown if either is |
| `each` | months, condition | true when the condition is true in every month (evaluated with **the month** = each in turn; all are evaluated) | false if any month is false; otherwise unknown if any is unknown. **No months: true** |
| `some_month` | months, condition | true when the condition is true in some month | true if any month is true; otherwise unknown if any is unknown. **No months: false** |
| `count_months` | months, condition | the number of months in which the condition is true | unknown if the list or any month's condition is unknown. **No months: 0** |
| `avg` | **value, months** (value first) | the mean of the value over the months | unknown if the list is unknown, **empty**, or any month's value is unknown |
| `years_between` | date a, date b | whole years from a to b | unknown if either is. A 29 February birthday is reached on 1 March in a common year (born 2008-02-29: 18 on 2027-02-28, 19 on 2027-03-01). |
| `days_after` | n, date | the calendar date n days after (n may be negative) | unknown if either is |
| `days_between` | date a, date b | calendar days from a to b, negative when b is earlier | unknown if either is |

Date arithmetic is in the proleptic Gregorian calendar with no time of day
and no time zone (computed in UTC).

## Unknowns that no supplied fact explains

Three unknowns have no unstated supplied fact behind them: a `lookup` key
with no row (or a `band` number above the last bound), a versioned parameter with no version on the determination
date, and a division by zero. The engine reports each one: as a warning in
`npm run check` (with the rule test or case that hit it), on the trace (a
parameter's origin is `no-version`; the derived fact whose rule hit a lookup
miss or a division by zero carries the warning), and through the
`evaluate(..., warn)` hook. An item out of force is the fourth such unknown;
the trace shows it as `not-in-force`.

## "Cannot determine" and its missing facts

An outcome that is unknown is reported as *cannot determine*, with the
supplied facts it was waiting on. The reference definition is the one the
explain trace computes: the supplied facts the evaluation, **left to right
and short-circuiting as described above**, asked for and found unstated. It
depends on evaluation order: an engine that evaluates eagerly will find
more, and one that evaluates the same short-circuits in the same order will
find the same list. The conformance suite carries this list on each
cannot-determine case (`expect[].missing`) for information; it is not
graded.

## Errors

Evaluation stops with an error (not unknown) for: an identifier the volume
does not have, `["month"]` with no month in context, a `person` item with no
person, a `person-month` item with no month, `has_relative_in` outside a
binder, an unknown operator, and a dependency cycle. `npm run check` reports
each one; the conformance suite never contains one.

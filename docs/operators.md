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
| number (money, hours, rate, whole number) | IEEE 754 binary64 (a JavaScript number), always finite. See Numbers. |
| calendar date | `"YYYY-MM-DD"` string |
| month | `"YYYY-MM"` string |
| one of | the option string |
| person | the person's id in the case (`"p1"`) |
| group of persons | an array of person ids, in the order the case declares its persons (never sorted, never a set) |
| list of months | an array of months, ascending |
| table keyed by household size / by person / by option | an object; keys are strings (`"1"`, `"2"`, ..., person ids, or the options of a `one of` fact such as a county or a dwelling type); a row is an amount, or an option (a county's region) |

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
2. **Parameter.** A value under the case's `parameters` wins (it states one
   value for every date). Otherwise a parameter with `versions` takes the
   version in force on **the version date of the context**: `from <= date <
   to` (`from` inclusive, `to` exclusive; the latest `from` wins). The version
   date is:
   - with no month in context (a `person`, `global` or `case` item's rule,
     outside `at`, `each`, `some_month`, `count_months` and `avg`): the
     determination date;
   - in a month-scoped evaluation (a `person-month` item's rule, or under an
     operator that sets the month): the determination date when the month is
     the determination month, and **the first day of the month** for any
     other month.

   So each month is judged by the figures in force in it: a retroactive
   month, an ABAWD or lottery look-back month, an application month before
   the determination month and a future month of a case each read their own
   month's version (42 CFR 435.915(a)(2), "would have been eligible ... at the
   time"; 10 CCR 2505-10 8.100.4.G.1 and 8.100.5.C.1; each figure's own
   "effective October 1" or "effective January 1" version date). A rule whose
   text applies another date's figure to every month it evaluates says so
   with `as_of` (P25, Tables), which picks the version in force on the date
   it names: `[as_of, x, [det_date]]` for a figure fixed when the
   determination is made (the CCCAP parent fee assessed at application or
   redetermination, 3.124.C; LEAP's heating-season limit). The first day is
   used because the figures change on the first of a month (a COLA on
   January 1, a SNAP figure on October 1, a State fiscal year on July 1); a
   version that starts later in a month (an enactment date such as
   2025-07-04) is read from the next month, except in the determination
   month, and a rule that needs another day says so with `as_of`.

   A date no version covers gives unknown and a `no-version` warning. A
   parameter whose `versions` is an empty list (a figure the State sets but
   has not published where it can be fetched; the item names the open
   question) is covered on no date: unknown, with a `no-version` warning,
   every time. A parameter without versions has its one `value`. Before time
   audit T-3 (docs/reviews/time-audit.md) the version was chosen by the
   determination date in every month; the conformance suite names the
   contract it was built under (`volume.resolution.contract`, `month-v1`).
3. **Case scope.** `determination_date` is the determination date. Any other
   `case`-scope supplied item is the value stated in the case's
   `case_facts` (a rule test may give it among its facts; it is the case's,
   whichever person it is given on), else unknown. A `case`-scope derived
   item is evaluated once per case, with no person and no month in context.
   A case-scope fact states one value for the application as a whole: the
   application's date, the home's utility costs (convention rule 18).
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
   month). A `person`-scope derived item is memoised per person and a
   `global` one once per case, and their rules run **with no month in
   context** whichever month asked for them first (so their parameters are
   read on the determination date): each is one value per case, on the
   determination date. `age` (CO-300) is the age on the determination date
   wherever it is read; a rule that tests an age in the month it evaluates
   reads an age taken in that month instead (Ages in a month, below).

### Ages in a month

A month-scoped rule that tests an age condition **for the month it
evaluates** measures it in that month, never on the determination date (time
audit T-1). Where the program's text makes any day of the month count
(Medicaid: 10 CCR 2505-10 8.100.4.G.1 for MAGI, "eligible ... at any time
during a calendar month shall be eligible ... during the entire month";
8.100.5.C.1 for the Aged, Blind and Disabled categories, effective "the first
day of the month the person becomes eligible"; 8.100.5.C.3 for the
Children's Buy-In), a condition is met for the month if it is met on any day
of it, and since an age only grows, one day decides each condition:

| Condition | Day the age is taken on | Item |
|---|---|---|
| under N (a qualifying upper limit) | the first day of the month | `ma_age_on_first_day_of_month` (CO-4978) |
| N or older (a qualifying lower limit) | the last day of the month | `ma_age_on_last_day_of_month` (CO-5402) |
| under N "through the end of the month" of the Nth birthday | the last day of the month before | `ma_age_before_month` (CO-4790) |

A disqualifying condition takes the other day (a person is outside a group
for the whole month only if the condition holds on every day of it): the IMD
exclusion's "21 or older" reads the first day and its "under 65" the last.
These are ordinary items over `years_between`, `first_day`, `days_after` and
`month`; no operator is involved. A per-person rule about the determination
itself (presumptive eligibility, a person-scope category read by
person-scope rules) states the determination month explicitly:
`[at, ma_is_aged, [det_month]]`. The cash programs' per-person age items
(`cw_is_dependent_child`, `af_is_oap_age`) are measured on the determination
date in every month (OQ-951).

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
| `/` | two numbers | a / b | unknown if either is. **Division by zero is unknown** and reported as a `division-by-zero` warning. |
| `min`, `max` | two numbers | the lesser, the greater | unknown if either is |
| `ceil` | number | `Math.ceil(x − 1e-9)`: the next whole number up, except that a value within 1e-9 above a whole number is that number (so binary noise such as 2.0000000001 does not round up to 3) | unknown in, unknown out |
| `round` | number | `Math.floor(x + 0.5 + 1e-9)`: the nearest whole number; a half rounds **up, toward +infinity** (2.5 → 3, −2.5 → −2), as does a value within 1e-9 below a half | unknown in, unknown out |

**A number that is not finite is unknown.** NaN, Infinity and -Infinity are
never values. A supplied fact or a parameter stated as one (a case or an
adapter that passes `NaN`), and any operator result that is one (arithmetic
that overflows, `1e308 * 10`), is read as unknown from that point on and
reported as a `non-finite` warning: so a comparison against it is unknown,
not false, and a sum or rule that reads it is unknown, not a number. Before
this guard, a comparison against NaN decided "no" (every comparison with NaN
is false in IEEE 754), so a case with a NaN income reported "over the income
limit" rather than "cannot determine" (county supervisor walkthrough,
docs/reviews/ux-county-supervisor.md, engineering aside). An implementation
in another language applies the same rule: its NaN or infinity, whatever its
form, is unknown.

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
| `band` (P48) | table keyed by income band, number | the value of the first band, in ascending order of its upper bound, whose inclusive upper bound is at least the number (bounds compared with a 1e-9 tolerance). A row keyed `"above"` is the open top band: its value is the value for every number above the last bound | unknown if the table or the number is unknown. **A number above the last bound of a table with no `"above"` row is unknown** and reported as a `lookup-miss` warning. |
| `lookup_extended` (P51) | table keyed by a whole number, number, optionally an amount | up to the table's last (largest whole-number) row, the row for the number, as `lookup`; above it, the last row plus the amount for each number beyond the last row, or, with no amount, the last row itself ("6 or more") | unknown if the table or the number is unknown, or (above the last row) the amount is. **A number at or below the last row with no row is unknown** and reported as a `lookup-miss` warning. |
| `as_of` (P25) | a parameter's identifier (not evaluated), a date | the parameter's version in force on that date (`from` inclusive, `to` exclusive), whatever month is in context; a case's `parameters` override still wins, and the item's own effective range is still read on the determination date | unknown if the date is unknown; **a date no version covers is unknown** and reported as a `no-version` warning. |

Table keys are strings. A number key is looked up as its decimal string (a
household size of 3 reads row `"3"`, and 3.0 is the same key); a person key
is the person's id. The step beyond the last row is a separate
`_each_additional` parameter that the rule applies itself, written with
`lookup_extended` so the rule never restates the table's last row.

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
| `shared_relative` | role, optionally `"every"` | the persons other than this person who have a person in `role` in common with this person (with `parent`: this person's siblings), in declaration order. With `"every"` (P53): only those whose persons in `role` are exactly this person's (with `parent`: full siblings, who share both legal parents); another person's unstated relationships are read as none | unknown if this person's relationships are unstated |
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
| `at` | expression, month | the expression evaluated with **the month** = the given month; this person, that person and the determination date are unchanged. Parameters read inside it take the given month's version (Resolution step 2); effective ranges are still read on the determination date | unknown if the month is unknown |
| `first_day` | month | its first day | unknown in, unknown out |
| `month_of` | date | the month containing it | unknown in, unknown out |
| `month_of_year` | month | its calendar month number, 1 (January) to 12 (December) | unknown in, unknown out |
| `year_of` (P52) | month or date | its calendar year, as a whole number | unknown in, unknown out |
| `latest_month_of_year` (P50) | n (1 to 12), month or date | the most recent month, on or before the month (or the month containing the date), whose calendar month number is n: the month itself when its number is n | unknown if either is |
| `month_before`, `month_after` | month | the month before or after | unknown in, unknown out |
| `months_before`, `months_after` | n, month | the month n months before or after | unknown if either is |
| `months_ending` | n, month | the n consecutive months ending with the month, ascending (`[]` for n ≤ 0) | unknown if either is |
| `months_from_to` | month a, month b | the months from a through b, ascending (`[]` when a is after b) | unknown if either is |
| `each` | months, condition | true when the condition is true in every month (evaluated with **the month** = each in turn; all are evaluated) | false if any month is false; otherwise unknown if any is unknown. **No months: true** |
| `some_month` | months, condition | true when the condition is true in some month | true if any month is true; otherwise unknown if any is unknown. **No months: false** |
| `count_months` | months, condition | the number of months in which the condition is true | unknown if the list or any month's condition is unknown. **No months: 0** |
| `avg` | **value, months** (value first) | the mean of the value over the months | unknown if the list is unknown, **empty**, or any month's value is unknown |
| `sum_months` (P54) | months, value | the sum of the value for each month in the list, evaluated with **that month** = each month in turn and **the month unchanged** (unlike `each` and `avg`, which move the month): the value reads a month's fact with `at` and `that_month`, and can compare that month with the month in context | unknown if the list is unknown or any month's value is unknown. **No months: 0** |
| `that_month` | none | the month the innermost `sum_months` has bound | an error (not unknown) outside `sum_months`. A derived fact's own rule never sees it: each fact is computed in its own context, so a memoised value never depends on it |
| `years_between` | date a, date b | whole years from a to b | unknown if either is. A 29 February birthday is reached on 1 March in a common year (born 2008-02-29: 18 on 2027-02-28, 19 on 2027-03-01). |
| `days_after` | n, date | the calendar date n days after (n may be negative) | unknown if either is |
| `days_between` | date a, date b | calendar days from a to b, negative when b is earlier | unknown if either is |

Date arithmetic is in the proleptic Gregorian calendar with no time of day
and no time zone (computed in UTC).

## Receipt records (P55-P57)

**A recorded exception to the engine guardrail.** The product owner adopted
receipt records on 2026-11-23 (docs/plan-colorado.md, "Decision, 2026-11-23:
adopt receipt records"; the evidence is docs/reviews/receipt-spike.md). The
rules count unearned money by the kind of receipt, by whether it is paid once
or recurs, by the date it came in and by how often it is paid, and a scalar
fact per source cannot say all four of one payment without stating the same
money twice. The rule text that needs each operator is in the table below.
A second input of the same type, `earnings` (CO-5100), states the pay for
work the person performed, under the same recorded exception and read by
the same three operators (product-owner decision of 2026-11-23, "earned
income and resources move to records too"; earned-income records, step E0,
docs/design-earned-and-resource-records.md 2.6 and docs/reviews/earnings-e0.md):
the rules count earnings by the source of the pay, by its date and how
often it is paid, and a business's costs by kind, exactly as they count
receipts. No other list-of-records input exists; resources are step H0,
which adds P58 `largest` (design 3.4).

**The input.** A supplied fact of type `list of receipts`, scope `person`
(Colorado: `receipts`, CO-5000, and `earnings`, CO-5100): one record per
payment, or per stream of like payments, each a mapping of field to value.
"That receipt" names a record of either list; the operators do not tell
the lists apart, and a program's counting table for each list is keyed by
that list's kinds. The fact declares its record
schema once, in `record_fields`: each field's type (a scalar codex type), a
one-line meaning, the options of a `one of` field (for the `kind`, each with its
own one-line meaning in `option_meanings`), and exactly one of

- `required: true`: a rule that reads the field cannot determine when the
  record does not state it (`kind`, `amount`, `date`, a payment's
  `per_payment`, AmeriCorps `hours_served`);
- `default: <value>`: the value the rule text gives an unstated field
  (`frequency: monthly`, every earmark `0`, `retroactive: false`);
- `when_absent: "<meaning>"`: what leaving the field out means, for a field an
  operator gives that meaning to (`month`: the receipt recurs in every month).

A list that is not stated is **unknown**: every sum over it is unknown, and
the outcome is "cannot determine" (decision 4 of 2026-11-23). A **stated empty
list** means the person received no such money: every sum over it is 0.
`npm run check` blocks on a stated record that does not fit the schema (a
field the schema does not declare, a value of the wrong type, a kind that is
not one of the kinds, a `month` that is not its `date`'s month); a required
field left out is not an error, since that is how a case states that a value
is not known.

| Operator | Arguments | Result | Unknown | Rule text that needs it |
|---|---|---|---|---|
| `sum_receipts` (P55) | list, condition, value | the sum of the value over the records whose condition is true, with **that receipt** bound to each record in list order. The list is a list-of-receipts identifier (this person's) or `["of", person, list]` (that person's). A record whose condition is false is skipped and its value is never read | unknown if the list is unknown, or the condition of any record is unknown, or the value of a record whose condition is true is unknown. **No records: 0** | 9 CCR 2503-7 3.752.22.A ("received in the income verification period"); 10 CCR 2506-1 4.402.A.2 (each income converted by how often it is paid); 4.405.E (nonrecurring lump sums, of any source); 9 CCR 2503-5 3.520.786 (exempt by source, for the client, spouse and sponsor alike) |
| `receipt` (P56) | field name (not evaluated) | that receipt's field as the record states it (its `month`: the month it states, or its `date`'s month), else the default the schema declares | unknown when the record does not state a field that has no default; the field is then reported as a missing supplied fact (below). An error outside `sum_receipts`, and for a field the schema does not declare | as P55 |
| `received_in` (P57) | month | whether that receipt came in the month: its `month`, or the month of its `date`, is the month. A record that states neither recurs in every month, **unless it is paid once** (`frequency: once`): a one-time payment with no month and no date cannot be placed, so the result is unknown and its `month` is reported missing. **The month is the month in context** (the determination month outside one): a sum for another month (a quarter's or a year's earlier months) is written in that month, `["at", ["sum_receipts", ..., ["received_in", ["month"]] ...], ["that_month"]]`, so a receipt summed for month M reads M's parameter versions (Resolution step 2); naming any other month is an error | unknown if the month is, or as just said | 9 CCR 2503-7 3.752.21.I and 9 CCR 2503-5 3.520.785.B.1.a ("counted as income in the month received"); 10 CCR 2506-1 4.405.A (income received in the quarter) |

Inside the condition and the value of a receipt sum, an expression reads
**only** that receipt's fields, the month in context (and month arithmetic on
it, `that_month` included), case-scope facts and parameters. Parameters are
read in the month in context, which is the month `received_in` names (P57),
so the figures a receipt is counted with are those in force in the month it
is counted for. A fact of a
person (person or person-month scope, supplied or derived) is a type error
there: a rule that turns on the person (an SSI-age child, an
application-month destitution test) reads it outside the sum and chooses
between sums. A derived fact's own rule never sees "that receipt" (as for
"that month", P54), so there are no per-receipt derived items: a condition
several sums share is written in each.

**Counting tables.** Each program that counts receipts has one table keyed by
option (`table keyed by option`), keyed by kind, whose rows name a treatment
the table lists in its `options` (`counted`, `excluded`, a named special rule).
The type check refuses a lookup of a receipt's kind in a table that lacks a
row for any kind, or has a row for no kind, in any version; the constraint
check refuses a row whose treatment is not one of the table's options. A kind
is therefore never counted by default, and a new kind cannot be added
without a row in every program's table.

**Missing record fields.** A record field a rule needs and the record does
not state is reported on the trace as a missing supplied fact of the list's
owner, named `<list>[<index> <kind>].<field>` with the index from 0 in the
stated list: `receipts[0 other_one_time].date` for an undated one-time
payment that must be placed in or out of the LEAP income verification
period, `receipts[1 ?].kind` for a record that states no kind,
`earnings[0 wages].per_payment` for a weekly pay that states no amount per pay. The app's
"cannot determine" list and the conformance suite's `expect[].missing` carry
the same name (`src/engine/records.ts`, `recordFieldName`).

**For engine teams.** ledger.json and the suite give the fact's
`record_fields`; a case states the fact as a JSON list of objects
(docs/conformance.md).

- **Drools.** One `Receipt(owner, index, kind, amount, month, date,
  frequency, ...)` fact per record, the schema's defaults applied when the
  fact is inserted and every field without a default carried as the review's
  `Tri` (known value, or unknown). Each sum is an
  `accumulate(Receipt(owner == $p, <condition>) ; sum(<value>))`; a receipt
  whose condition is unknown makes the accumulate unknown, so the condition
  is evaluated to a `Tri` in the pattern's `eval`, not used as a filter that
  drops unknowns. A `ReceiptsStated(owner)` marker fact distinguishes an
  unstated list (unknown) from an empty one (0), exactly as the review's
  `RelsStated` does for relationships. A counting table is a lookup fact
  `Treatment(program, kind, treatment)` or a decision table with one row per
  kind.
- **Corticon.** A `Receipt` entity associated to `Person` (one to many),
  `->sum` over the association with the condition as a filter, the schema's
  defaults as attribute defaults on the vocabulary and the required fields
  left nullable with a null guard that makes the sum null. A counting table
  is a rulesheet whose condition column is the kind, one row per kind, which
  is how a Corticon author would write it; Corticon's completeness check then
  does what the codex's type check does (a kind with no row). The review's
  open VERIFY items on `->sum` over an empty association and on null guards
  apply unchanged; the suite has empty-list cases.
- **Fact graph (Direct File, fact_graph).** The concern in
  stakeholder-factgraph.md is that a `Filter`/`CollectionSum` predicate is
  compiled in the filtered item's context and cannot see an outer item, so a
  per-person sum over a top-level `/receipts/*` collection needs a binding
  for the person being evaluated. The codex removes both outer reads the
  predicate could need:
  1. **The person.** Every receipt sum reads the receipts of one person, the
     one the rule is evaluated for (or `that person`, inside a person
     binder, which the adapter already maps to an entity id). Model the
     receipts as a collection owned by the person entity, not a top-level
     collection with an owner reference: in fact_graph, an entity fact
     `receipts` per person; in Direct File, the collection
     `/persons/*/receipts/*` written by the adapter from `facts.receipts`
     when it loads the case (Direct File's own `/formW2s/*` with a `filer`
     reference is the shape to avoid). The sum is then
     `CollectionSum(Filter(../receipts/*, predicate))` relative to the
     person, with no outer binding.
  2. **Everything else the predicate reads.** The type check guarantees the
     predicate reads only the receipt's own fields (paths inside the
     filtered item), parameters and case-scope facts (absolute paths, which
     a `Filter` predicate may read in both engines), and the month. The
     month is the one value that varies with the evaluation: the adapter
     already materialises person-month facts per month (the review's month
     shift), so the receipt sums of month `m` live under that month and the
     adapter writes, when it loads the case, each receipt's placement as data
     the predicate reads from the receipt itself: `/persons/#p/receipts/#r/inMonth/#m`
     (true, false, or incomplete for a one-time receipt with no month or
     date), which is exactly `received_in` (P57) computed from the record's
     own fields. Month arithmetic in the codex's predicates is on the month
     of the sum (the calendar quarter, the LEAP period's months), each a
     fixed offset the adapter can write the same way.
  With both, no `Filter` needs an outer-item binding, and no grouping of
  receipts outside the graph is needed. A `Filter` that treats an incomplete
  predicate as false must not be used for these sums: an unknown condition
  makes the sum unknown (the review's strict unknown mode for `Filter`).
- **Conformance.** `SuiteCase.persons[].facts.receipts` is a list of
  objects; `items[].record_fields` is the schema; `expect[].missing` names a
  missing field `receipts[<i> <kind>].<field>`; the cannot-determine case for
  an outcome that reads receipts removes one record's `amount` first, and the
  whole list only when that decides nothing.

## Unknowns that no supplied fact explains

Four unknowns have no unstated supplied fact behind them: a number that is
not finite (see Numbers), a `lookup` key
with no row (or a `band` number above the last bound of a table with no open
top band, or a `lookup_extended` number below the last row with no row), a
versioned parameter with no version on the date it is read on (Resolution step 2; or on the date
`as_of` names; a parameter awaiting its figure has none on any date), and a
division by zero. The engine reports each one (the non-finite one as a
`non-finite` warning, against the fact stated as one or the rule that produced it): as a warning in
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

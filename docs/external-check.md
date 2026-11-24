# External sample check: send us cases, we compare the answers

This is for county and State eligibility staff who agree to help test the Colorado rules engine. You send us households shaped like real ones, with the answers you expect. We run them through the engine and send back a report that shows, for every person, program and month, whether the engine agrees with you. Where it does not, the report shows why it answered as it did and our first guess at the cause.

You do not need to know anything about the engine. You fill in a set of spreadsheets with plain column headings.

## In short

1. Copy the template folder, [external-check/template](../external-check/template/). It has nine sheets (CSV files) and two reference files.
2. Fill in one or more households. Leave out anything that could identify a person (see [Privacy](#privacy-send-de-identified-cases-only)).
3. For each household, write the results you expect and where each answer comes from: a CBMS result, a worker determination, or a policy expert.
4. Send the folder to us through the channel we agreed with you.
5. We send back a report, in a readable version (report.md) and a spreadsheet version (report.csv).

The folder [external-check/example](../external-check/example/) is a filled-in template of four made-up households, with the report the check produced for them. Open it next to this guide.

## Privacy: send de-identified cases only

Send cases that are shaped like real ones, never records of real people.

- **No names, no initials.** Call the people in a household Person 1, Person 2, and so on.
- **No numbers that identify anyone or any case:** no Social Security numbers, no CBMS, Medicaid, State or client ID numbers, no case numbers.
- **No addresses, phone numbers or email addresses.** Give the county, not the street.
- **Ages or shifted dates.** Give the person's age on the determination date in place of the date of birth, unless a birthday close to that date matters for the answer. If a date could identify someone, move every date in the household by the same number of days. Keep the moved dates in the same months, because results and limits are figured month by month, and many limits change on October 1, January 1 and July 1.
- **Notes in your own words,** never copied from a case file.

The converter refuses any column whose heading looks like an identifier (a name, an SSN, a case number, an address, a phone number or an email). It also refuses a cell that looks like a Social Security number, a phone number, an email address, a street address, or an ID number of five or more digits. When it refuses something, nothing from the folder is converted until the problem is removed.

On our side, the folders we receive stay on the machine that runs the check. They are never added to the repository: the repository ignores everything under `external-check/` except the blank template and the made-up example.

## The sheets

Each sheet is a CSV file that any spreadsheet program opens. Keep the first row (the headings) as it is. Each row after it is one record. A row whose first cell starts with `#` is a comment and is skipped.

Every sheet starts with a `case` column. That is your short label for the household (EX-1, A, County-3), the same on every sheet. It is not a case number: it may have at most 20 characters and never five digits in a row.

| File | One row per | Columns |
|---|---|---:|
| 1-households.csv | household | 4 |
| 2-persons.csv | person | 30 |
| 3-relationships.csv | pair of related persons | 5 |
| 4-earnings.csv | job or pay | 40 |
| 5-other-income.csv | payment or stream of payments other than pay | 38 |
| 6-resources.csv | resource (an account, a car, a home, a policy) | 67 |
| 7-expenses.csv | expense of a person or the household | 6 |
| 8-other-facts.csv | any other fact | 6 |
| 9-expected.csv | expected answer | 8 |

The record sheets (earnings, other income, resources) have a column for every detail a rule can read. Fill in only the columns that apply; most rows need three or four.

Two reference files sit beside the sheets:

- **data-dictionary.csv** lists every column and every fact you may state: its plain name, what it means, its type, its allowed values, whether it is always needed or only for some programs (and which), and what leaving it blank means. It also lists every result you can give an expected answer for. It is generated from the rules, so it is always current.
- **allowed-values.csv** lists every allowed value of every choice, with what it means. Filter it by the column you are filling.

### 1-households.csv

`case`, `description` (one line in your words), `determination date` (the date eligibility is decided), `notes`.

### 2-persons.csv

One row per person: `case`, `person` (Person 1, Person 2, ...), and the facts asked of every person. These are the first questions of the cross-program screening order (docs/reviews/screening-order.md): date of birth or age, sex, marital status, dwelling, pregnancy, state and county of residence, where the person lives (a private home, a facility) and any temporary absence, benefits the person already gets (SSI, Colorado Works cash, Adult Financial, SNAP, Medicaid, child welfare payments), disability and blindness found by Social Security, Medicare, immigration status and its dates, and whether the person files taxes.

- **Dwelling** is a short label for the home (home 1, home 2), so the check knows who lives together. Never an address.
- **age at determination date** may replace **Date of birth**. The date of birth is then set six months before the birthday that gives that age.
- **any earnings, any other income, any resources:** `no` means the person has none. `yes` means the rows on that sheet are all of them. Blank means "the rows on that sheet", or "not known" when there are none. The difference matters: "none" lets the engine decide, "not known" makes it answer "cannot determine".

### 3-relationships.csv

One row per related pair: `Person 1 | parent | Person 2` means Person 1 is the parent of Person 2. Give each pair once; the reverse (Person 2 is the child of Person 1) is added for you. This sheet also says who buys and prepares food together (`buys prepares with`), who shares heat (`shares heat with`), who files taxes jointly and who claims whom (`tax filer`). The allowed relationships are in allowed-values.csv.

**List every relationship.** A pair that is not listed is read as not related, and as not buying food or sharing heat together.

### 4-earnings.csv, 5-other-income.csv, 6-resources.csv

One row per job, payment or resource, with the person it belongs to.

- **Earnings** is pay for work: wages, self-employment, work-study, and pay from boarders.
- **Other income** is every other payment: Social Security, SSI, pensions, child support (on the row of the child it is paid for), unemployment, gifts, and so on.
- **Resources** are what the person owns: bank accounts, cars, a home, other property, life insurance, burial funds.

The first columns are the ones most rows need:

- `kind of earnings`, `kind of income`, `kind of resource`: one of the allowed values (wages, social security, bank account, vehicle, ...);
- `amount` (or `value` for a resource): dollars;
- `month`: the month it was received or held. **Leave it blank for an amount that is the same every month.**
- `date` and `how often paid`: for a payment on a given day, where a program counts pay by date (LEAP, CCCAP). A row with a date needs `how often paid` (once, weekly, biweekly, ...).

The other columns are details some rules read (an amount owed on a car, whether a home is lived in, a business's costs). Leave them blank unless they apply. data-dictionary.csv says what each one means and what blank means.

### 7-expenses.csv and 8-other-facts.csv

One row per fact: `case`, `person`, the expense or fact (its plain name from data-dictionary.csv), `month`, the amount or value, `notes`.

- **Expenses** are costs a person or the household pays: rent and other shelter costs, utilities, dependent care, child support paid, medical costs, health insurance and Medicare premiums.
- **Other facts** are everything else a program can ask: application dates, school enrollment, work hours, disqualifications on record, the heating arrangement, and so on.
- Leave `person` blank for a fact of the whole household (an application date, the heating arrangement). Write `all` to state the same value for every person of the household.
- Leave `month` blank when the value holds for every month.

The data dictionary marks each fact as needed for some programs and names them. You only need the facts for the programs you give expected answers for. When a fact a rule needs is missing, the engine answers "cannot determine" and the report names the missing fact, so you can add it and send the case again.

### 9-expected.csv

One row per answer you expect: `case`, `person`, `program`, `result`, `month`, `expected answer`, `source of the expected answer`, `notes`.

- **result** is the plain name of a result from data-dictionary.csv (sheet `expected`), for example "SNAP: eligibility status", "SNAP: allotment", "Colorado Works: basic cash assistance grant amount", "Medicaid: MAGI eligibility status".
- **Give the answer for each person** it applies to. A household answer, such as the SNAP allotment, is given for each member; `all` gives it for everyone.
- **month** is the month of the result. Blank means the month of the determination date. Leave it blank for a result that has no month (a due date).
- **expected answer** is one of the result's allowed values (eligible, over gross income limit, ...), an amount, `yes` or `no`, or `cannot determine`.
- **source of the expected answer** is one of `CBMS result`, `worker determination` or `policy expert`.
- **notes** is where to say why you expect it ("Work-Study pay is not counted").

### How to write values

| Type | Write |
|---|---|
| yes/no | yes or no |
| date | YYYY-MM-DD (2026-10-01) or M/D/YYYY (10/1/2026) |
| month | YYYY-MM (2026-10), M/YYYY, Oct 2026 or October 2026 |
| money | 1234.50 ($ and commas are fine) |
| rate | 50% or 0.5 |
| choice | a value from allowed-values.csv, with spaces or underscores (private dwelling) |
| person | Person 1, Person 2, ... |
| several persons | Person 1, Person 2 |

A blank cell means the fact is not known.

## What comes back

The report has three parts.

1. **A summary:** how many answers match and differ, by program, and the first triage hint of each difference.
2. **Results by case:** a table per household with each person, program, result and month, your expected answer, the engine's answer, and "match" or "differ".
3. **Differences:** for each answer that differs,
   - **Decisive rules:** the rules and facts that decided the engine's answer, then what decided each of those, with their values. Read it top down: "not eligible because the 300% income test was not met; that because the gross income was 3,100; that because earned income was 200 and unearned 2,900".
   - **Missing facts:** when the engine says "cannot determine", the facts the case did not state that the rules asked for.
   - **First triage hint:** our first guess at the cause, one of:
     - *data entry*: the case leaves out facts the rules need, or the expected answer may not match the facts sent;
     - *known limit*: a limit of the rules already recorded for the program owners (docs/reviews/known-limits.md);
     - *open question*: a question of policy already recorded and not yet settled (volumes/co/open-questions.md);
     - *rule gap*: none of the above; if the decisive facts match your case file, the rules may miss something, and we take it to the program's policy owner.

   A hint is a starting point, not a finding. We review every difference with you.

report.csv has one row per expected answer with the same columns, for sorting and filtering.

If the converter cannot read something you sent, you get import-issues.csv instead: one row per problem, with the file, the row number, the column and what is wrong. Nothing is guessed. Fix the rows and send the folder again.

## The worked example

[external-check/example](../external-check/example/) holds four made-up households, each derived from a stored test household (not real people), filled in exactly as you would fill the template:

- **EX-1:** a married couple of 68 and 70 on Social Security, recertifying for SNAP (source: policy expert).
- **EX-2:** an emancipated 16-year-old mother with a baby, earning $400 a month, applying for Colorado Works (source: worker determination).
- **EX-3:** an Old Age Pension applicant with savings and two cars; given with an age instead of a date of birth (source: CBMS result).
- **EX-4:** a widower in a nursing facility with $200 of Federal Work-Study pay in November (source: policy expert). This one differs on purpose. The expected answer follows 20 U.S.C. 1087uu, which keeps work-study pay out of income; the engine counts it in the long-term care income test.

Its [report](../external-check/example/report.md) shows 15 expected answers: 13 match and 2 differ. Both differences are EX-4 in November, and the first triage hint of each is known limit NM-KL-7, already recorded for the program owner for exactly this kind of case.

## For whoever runs the check

Put each folder you receive under `external-check/received/<name>/`. Everything under `external-check/` other than `template/` and `example/` is git-ignored, so received cases and their reports never reach the repository. Do not copy received cases into `volumes/co/tests/cases.yaml`: they are not stored households and do not join the check's gate. If a difference shows a real gap, write a new stored household for it through the normal review, with a probe built from the case rather than the case itself.

```
npm run external:import -- external-check/received/<name>   # writes cases.yaml, or import-issues.csv and exit 1
npm run external:check  -- external-check/received/<name>   # converts if needed, then writes report.md and report.csv
npm run external:check  -- <cases.yaml> [--out <dir>] [--title <text>]
npm run external:template                                   # rewrite the blank template after the volume changes
```

`external:check` exits 1 only when the import fails; differences are its output, not a failure. Send the folder's report.md and report.csv (or import-issues.csv) back to the sender. The report names the codex commit it ran on.

**How the template is built** (src/external/dictionary.ts, template.ts). A fact is in the template when a stored household states it, a rule reads it, and it is not a scalar income or resource fact: income is stated only as receipts and earnings (CO-5000, CO-5100) and resources as holdings (CO-5300); the scalar facts the records replace are being retired and are refused with a pointer to the record sheets. The persons sheet holds the cross-program first questions of the screening order (docs/reviews/screening-order.md); money facts named as a cost, an expense, a premium, a fee or an amount paid go on the expenses sheet; everything else is on other-facts. "Needed for" names the programs whose results read the fact, through any chain of rules. The results are the program outcomes in volume.yaml and the items marked as outcomes. test/external/template.test.ts fails when the committed template is not what `npm run external:template` writes, so run it after changing the volume and commit the result; it also checks that the example still imports into its committed cases.yaml.

**How a case is converted** (src/external/importer.ts). Each sheet's headings are matched to the template's, ignoring case. Values are read in the fact's type; anything that does not read is an issue with its file, row and column, and nothing is converted while any issue remains. Persons are p1, p2, ... in the case. Every person gets a stated (possibly empty) list of relationships, so a person with no row on the relationships sheet has none rather than unknown ones. "any ... = no" is an empty record list; a list with neither rows nor "no" is not stated. An expected "cannot determine" is `unknown` in the case's `expect` block. The cases are written in the stored-household shape (src/engine/cases.ts), with an `external` block holding each expected answer's source, notes and row.

**How a difference is explained** (src/external/runner.ts). Each answer is evaluated with the engine's trace (src/engine/explain.ts). The decisive lines are what decided the value, depth first: the inputs the evaluator marked decisive, or, where it marked none (a comparison, or a first-match rule that returns a plain value), every input, expanding the last two rules it read. The missing facts are the supplied facts the trace asked for and did not find. The triage hint is "data entry" when the engine cannot determine and facts are missing; otherwise the open entries of docs/reviews/known-limits.md and the open questions in volumes/co/open-questions.md whose items include a rule on the decisive lines, deepest first (a match on the result's own rule only counts when nothing deeper matches); otherwise "rule gap".

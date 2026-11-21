# UX discovery: HCPF eligibility policy analyst (phase 13)

Persona: Dana. I am an HCPF eligibility policy analyst with 12 years in Medicaid policy and no technical
background. Before the codex goes to the vendor, I have to approve its definitions and figures. I know
8.100 well. I do not know YAML, git, "derivations" or what an "identifier" is for.

Screenshots are in `/tmp/claude-0/ux/hcpf-analyst/`, outside the repo. I edited nothing except this file.

## How the app was made to show the current Colorado volume

The app has no local-ledger or dev mode:

- `npm run dev` and the built app both read `codex.json` and the volume files from `raw.githubusercontent.com/jisaf/policy-codex/main`
  (`src/ledger/source.ts`, `rawSource`).
- `src/config.ts` and `src/ui/router.ts` take no query parameter or environment variable that points the app at local files.
- GitHub `main` does not carry the Colorado work.

So I built the app (`npm run build`) and served it with `npx vite preview --port 4301 --strictPort`. I drove it with
Playwright, answering every `raw.githubusercontent.com/jisaf/policy-codex/<ref>/<path>` request from the
file on disk, as `e2e/fixtures/ledger.ts` does. Every `api.github.com` call got a 404.

I then picked "Colorado eligibility rules for the programs served by PEAK and CBMS (draft)" in the header
drop-down, which uses `#/co/...` URLs. The app showed the working tree at `6343635`: 1,406 items, and
"Conformance ... 4894 passed".

I stopped the server when I was done.

A real HCPF reviewer could not do any of this. Until `main` carries `volumes/co`, or the app gains a
"local files" mode, nobody outside engineering can review the Colorado volume in the app. This matches the
case worker's N6.

---

## Task 1: What "countable income" means for MAGI Medicaid, and the 2026 children's figure

**What I tried**

1. On first visit the drop-down said "Work requirements under H.R.1..." (`01-first-visit.png`). I had to know to
   switch it to Colorado. The switch opened the Medicaid program page directly (`02-co-selected.png`).
2. I typed **countable income** in the search box. The suggestions were Colorado Works, Adult Financial, Pickle,
   SSI-related, Colorado Works again and Disabled Adult Child (`11-search-typeahead-countable-income.png`).
   Pressing Enter opened **Colorado Works: countable income** (CO-910), the wrong program
   (`11-search-enter-countable-income.png`). The full results page had 52 items, and none was MAGI
   (`14-search-page-countable-income.png`).
3. I tried **MAGI income**. Enter opened "MAGI income disregard percentage", which says only "A number set by
   policy: 0.05 (S165, S168)" (`12-search-enter-MAGI-income.png`).
4. I tried **household income**. The eighth suggestion was "Medicaid: MAGI household income" (CO-503), below
   CHP+, LEAP, CCCAP and a school-meals item (`15-search-typeahead-household-income.png`).
5. On CO-503 and CO-502 ("person's MAGI-based income") the page opens with the formula ("... is (Gross wages plus
   Net earnings from self-employment ... minus Pretax deductions rounded to the nearest whole dollar")
   (`16-item-CO-502-top.png`). The plain definition I needed was not on the page body. I found it in two places:
   - in a pop-up card when I clicked a highlighted term;
   - under **"Approach A projection" → "Statement"**: "This person's own MAGI-based income for the month under
     42 CFR 435.603(e) and 10 CCR 2505-10 § 8.100.4.C - taxable earned and unearned income ... minus above-the-line
     pretax deductions".

   I would never have opened a section called "Approach A projection".
6. CO-503's meaning ("the sum of each household member's own MAGI income, except a tax dependent who is not
   required to file") is correct. The exclusions I sign off on (child support, SSI, TANF per 8.100.4.C.1.d) are in
   CO-502's "Precision" paragraph under "Details", in one 900-character sentence.
7. For the figure, the Medicaid program page lists under "Parameters in force" **"MAGI income limit, Children
   category, percent of FPL ... 1.42"** (`10-medicaid-program-full.png`). On the item page (CO-191) it reads "A
   number set by policy: 1.42 (S638, S641, S675, S676)" (`18-item-CO-191-top.png`). Under "Details" it says
   "1.42 = 142%". It has a version table: 133% to 2022-06-30, then 142%. The Decision record quotes
   § 8.100.4.G.2: "does not exceed 142% of the federal poverty level". **That matches the rule.**
8. The **2026 dollar figure**, the number I actually check against HCPF's MAGI income chart, is on no screen. I
   worked it out by hand from the HHS table in the same list. For a family of 3:
   - 27,320 × 1.42 / 12 = **$3,232.87** a month;
   - **$3,346.70** with the 5% disregard.
9. I found two further problems with the figure:
   - The codex starts using the 2026 guideline on **January 1, 2026**. HCPF starts on the date its annual memo
     sets. This is open as OQ-515, but nothing on the CO-191 page or the program page says so.
   - The worked example on "meets the Children MAGI category" (CO-545) gives "highest MAGI income standard ...
     =1.33" (`22e-child-category-page.png`). It made me doubt the 142% for a minute until I understood the
     example *supplies* that number.

**Finished?** Yes for the figure, partly for the definition. **Time:** about 35 minutes; with a definition on
each page, about 5. **Confidence:**
- High that 142% matches § 8.100.4.G.2.
- Medium on "countable income", because the codex has no MAGI item by that name. The meaning is spread over
  CO-502 (person), CO-503 (household) and CO-504 (percent of FPL), and I had to be sure I wasn't missing a
  fourth.

## Task 2: Which rules decide the children's category for a 17-year-old, and which facts they need

**What I tried**

1. Medicaid program page → "Medicaid: MAGI covered group" (CO-551). This page was the best thing I saw all day.
   It reads like the 8.100.4.G hierarchy: "if needy newborn then needy_newborn, else if in a continuous
   eligibility period then child, else if meets the Children MAGI category then child, ..."
   (`20-magi-covered-group-top.png`).
2. Under "Dependencies" I clicked "meets the Children MAGI category". It opened a pop-up card with the meaning
   and **"approval: Medicaid policy owner, CHP+ policy owner, Cash programs policy owner"**, which was a surprise
   for a Children's-category rule. The card ran off the bottom of the screen, and its "Open definition" link could
   not be reached, even after scrolling (`22c-popover-card-cut-off.png`, `22d-popover-after-scroll.png`).
3. On CO-545 itself (`22e-child-category-page.png`) the rule is clear:
   - under 19 or turns 19 this month, and
   - household income at or below the children's standard, or within it after the 5% disregard when Children is
     the person's highest standard.

   It uses five other rules, and each of those uses more.
4. "Which facts they need": "View in the graph" drew 54 boxes too small to read (`23-graph-child-category.png`).
   Ticking "supplied facts" gave 81 (`24-graph-child-with-facts.png`). I could not get a plain list of "facts this
   rule needs" anywhere.
5. I opened Cases → **CO-05**, because its title mentions "17-year-old sibling in a continuous eligibility
   period". The page opens on raw fact rows with identifiers; the result rows are much further down
   (`25-case-co05-top.png`).
6. I tried **New household** with Medicaid to make a 17-year-old (`27-new-household-medicaid.png`):
   - It said "35 outcomes need 303 supplied facts", in A-to-Z order, starting with "Adult Financial: AND-SO client
     has met the SSI and SSDI application duty".
   - "Try an example" offered **no households at all**, because every Colorado case has more than one person
     (`isRepresentableCase`, `src/ui/CasesView.tsx:121`).
   - With a birth date, citizenship, residence, zero wages and the tax questions filled in, the MAGI covered group
     came out "unknown". The "Not answered" list was led by "Continuous eligibility period start month", "Is
     deceased", "Is unable to be located" and "Has requested withdrawal from continuous eligibility"
     (`29-new-household-17yo-outcomes.png`).
   - There is no way to add the parent, so I could not test the household the ticket describes.

**What I could tell the vendor.** With the facts below computed outside the app, a 17-year-old fails the
Children's category only if household income is over 142% FPL (147% with the disregard). A denial of MAGI as a
whole can also come from citizenship or immigration status, residency, being an inmate, or the
continuous-eligibility ending events.

The children's category alone rests on **27 facts**:

| Group | Facts |
|---|---|
| Person | birth date, pregnancy, expected number of children, Medicare |
| Full-time secondary student | the "full-time secondary student expected to finish before age 19" fact |
| Tax household | tax filer, expects to be claimed, required to file, files jointly |
| Living arrangement | lives with, custodial parent, separation |
| Income | 12 income and deduction facts |

The full MAGI eligibility status rests on **219 facts**. I got these counts by tracing what each rule uses. The
app never lists them.

**Finished?** Partly: the rules, yes; the facts, no. **Time:** about 45 minutes. A walkthrough screen would take
10. **Confidence:**
- Medium on the rules.
- Low on the fact list, without a technical helper.
- I also could not tell from the screen why a full-time student fact appears for a rule that Colorado's
  8.100.4.E.1.d says has no student extension.

## Task 3: Find every Medicaid item that needs my sign-off, and approve one

**What I tried**

1. I looked for "approvals", "my items" or "sign-off" in the header, the Programs page and Browse
   (`30-browse-menu.png`). There is nothing.
2. Search for "approval", "sign-off", "Medicaid policy owner" and "Draft". It finds rule text that happens to
   contain those words ("Draft" finds a "draft_record" identity document), never items waiting for me
   (`32-search-medicaid-policy-owner.png`).
3. Browse → Table (`31-table.png`). It has filters for kind, program, scope, open question, validation, tags and
   group, but **no Status or "needs approval by" filter or column**. Its Program filter offers only "All",
   "Medicaid" and "SNAP": CHP+, Colorado Works, Adult Financial, CCCAP, LEAP and SUN Bucks are missing (hard-coded
   in `src/ui/TableView.tsx:116`).
4. The only places that mention approval at all:
   - the pop-up card from Task 2, which lists the required roles;
   - the "Approach A projection" box, which says **"Approval: Medicaid policy owner, Legal / Status: Draft"** on
     CO-2400 (`58-item-CO-2400.png`).

   They disagree. The engine requires Medicaid, Legal, CHP+ **and** Cash programs owners for CO-2400. The
   projection uses `approvals()` instead of `approvalsFor()` and hard-codes "Status: Draft"
   (`src/engine/graph.ts:137-138, 157-158`).
5. To approve, I turned on edit mode, opened CO-191 and pressed Edit (`34-editor-form.png`):
   - The editor showed **"1 problem(s)"** and a red **"Parameter has a value"** on an item I had not touched, while
     the constraint list below said the same check passed in green.
   - In the Text tab I typed "Status Approved" and "Approval Medicaid policy owner, Dana (HCPF), 2026-11-21"
     (`36-editor-typed-status-approved.png`). Nothing warned me.
   - Save to tray. The tray said **"no change"** (`38-tray-open.png`): the editor silently drops Status and
     Approval lines ("computed, ignored on read", `src/engine/item-block.ts:230`).
   - "Propose" was greyed out: "Add a GitHub token in Settings to propose changes."
6. Outside the app I counted what is waiting:
   - **785 of the 1,406 items** need the Medicaid policy owner's signature, because `upstream_of_outcomes`
     reaches cash and shared items.
   - The program breakdown is 450 Medicaid, 200 "All", 80 Colorado Works, 34 Adult Financial, 20 CHP+ and 1 SNAP.
   - Every one of them is Draft.

   The app shows none of this.

**Finished?** No. **Blocked.** I could neither list my queue nor record an approval, and the one attempt looked
as if it worked when it did not. **Time:** I gave up after about 30 minutes. **Confidence:** none in any answer
the app gave me.

## Task 4: The open questions HCPF must answer for long-term care, and an answer to one

**What I tried**

1. The bottom of the Medicaid program page lists **36 open questions** (`40-medicaid-open-questions-list.png`):
   - one line each, not grouped by topic, and with no owner;
   - the titles are **not links**: clicking OQ-519 did nothing (`41-oq-519.png`);
   - some titles start "Partly resolved:" and still count as open.
2. Search "long-term care": 117 items and **9 open questions**, of which **2 are already resolved**: OQ-379 and
   OQ-100 "Resolved (overruled)" (`42-search-long-term-care.png`).
3. Clicking OQ-519 in search opens the **Table**, filtered to the one item that carries it (patient payment,
   CO-658). It does not show the question (`44-oq519-page.png`).
4. On CO-658, Decision record → Open questions, each title expands to its body (`46-oq519-expanded.png`):
   - OQ-519: "The HCPF review's note C-13: § 8.100.7.B.3 states a personal needs allowance and room and board for
     members in an Alternative Care Facility ... No item computes a post-eligibility amount for an Alternative Care
     Facility resident ... The memo is on hcpf.colorado.gov and was not fetched."
   - It has no separate "assumption in force" line and does not say who owns the answer.
   - It does not say which household outcomes would change.
5. Proposing an answer: no screen has an "answer" or "propose" action for a question. The editor edits items only,
   and `open-questions.md` cannot be edited from the app.

**My long-term care list** (assembled by hand from search and the program page):
- OQ-99 and OQ-212: the OM 25-073 figures are unverified.
- OQ-200: what "otherwise eligible" means for emergency Medicaid.
- OQ-471: the income trust omits the family allowance.
- OQ-472: residency of a person who became incapable at or after 21.
- OQ-516: the 2025 spousal impoverishment and MSP figures are not loaded.
- OQ-519: the Alternative Care Facility personal needs allowance.
- OQ-520: the Part B premium in the patient payment.

The answer I would propose to OQ-519 is that, until the IM 25-030 figures are entered, ACF residents get no
patient payment from the codex and the vendor must not default to the nursing facility figure. There is nowhere
to put that answer.

**Finished?** Found the questions: partly, and I am not sure the list is complete. Proposed an answer: no.
**Time:** about 40 minutes. **Confidence:** medium that the list is complete. The program page does not say
which of the 36 are long-term care, and search mixes in resolved questions.

## Task 5: Is the H.R.1 October 2026 immigrant restriction in the codex, and which households does it change?

**What I tried**

1. Search "H.R.1" found only the SNAP ABAWD date (`50-search-H_R_1.png`). "HR 1" found nothing. "One Big
   Beautiful Bill" found two SNAP open questions. "immigrant" found the five-year rule items, not this
   (`52-search-immigrant.png`).
2. "October 2026" worked: "Medicaid: is in a status category for which federal payment is available from October
   2026" (CO-2400) (`53-search-October_2026.png`). So did "71109" and "federal payment limit", but I only thought
   of those after the fact.
3. CO-2400 is clear and correct:
   - from 2026-10-01, only citizens and nationals, LPRs, Cuban/Haitian entrants and COFA migrants;
   - its tests show refugee, asylee and other qualified non-citizens "no";
   - the excerpt quotes 1396b(v)(5) and CMS SHO #26-001.

   The page says nothing about which households this changes.
4. The case list has CO-74 ("before the federal payment limit (September 2026)") and CO-75 ("after ...
   (November 2026)"). I opened each and compared the Expectations tables by eye (`59-case-CO-74-expectations.png`,
   `59-case-CO-75-expectations.png`):
   - the refugee and asylee adults (p1, p2) and the parolee (p4) go from `eligible` / `title_xix` to
     `emergency_only` / `title_xix_emergency`;
   - the child (p3) stays `eligible`.

   The row label is **"Medicaid: meets the citizenship requirement: no"** for a refugee. That is the
   immigration-status test, not citizenship, and the label would alarm a reader.
5. The two questions that matter most to HCPF were in search results, but not on CO-2400's page in the open-questions list
   ("None open" unless I looked under the parameter):
   - OQ-517: how HCPF transitions current members;
   - OQ-518: Colorado's rule still admits refugees and asylees after the federal limit, so is there state-only
     coverage?

**Finished?** Yes for "is it in the codex". For "which households", only for the two test households; the app
cannot say "every refugee, asylee and parolee adult on MAGI goes to emergency-only". **Time:** about 30 minutes.
**Confidence:** high on the rule; medium on the household impact.

---

## Words and screens that confused me

| Quote | Where | Why |
|---|---|---|
| "Approach A projection" | every item | This is where the plain definition is, under a name that means nothing to me. |
| "a rule derived", "per person, per month person-month", "a number set by policy parameter" | item header | The label and the technical word run together and read as a stutter. |
| "1.42", "0.05", "0.68" | Parameters in force, CO-191 | I think in 142%. "1.42 = 142%" is only under Details. |
| "(S638, S641, S675, S676)" | CO-191 lead line | S-numbers are meaningless until opened. I want "10 CCR 2505-10 § 8.100.4.G.2". |
| "Conformance: npx vite-node scripts/adapters/codex-self.ts on codex@8d4897b8...: 4894 passed" | top of every program page | Engineering output, in the first line I read. |
| "governance: 0 errors, 468 warnings" | program page Health | 468 warnings sounds like the codex is not ready. Nobody tells me whether they matter to me. |
| "dup.similar Close to ma_income_limit_pregnant_pct ... (0.84)" | editor and tray | Reads like an error on a correct item. |
| "1 problem(s) / Parameter has a value" | editor on untouched CO-191 | A false alarm on the item I was about to approve. |
| "no change" | tray after I typed Status Approved | The app accepted my approval and then threw it away without saying so. |
| "No case C-01 in this volume." | tour step 4 on Colorado (`03-tour-step4.png`) | The tour sends Colorado readers to a work-requirements case ID. Steps 5-10 never come. |
| "Medicaid: meets the citizenship requirement: no" | CO-75 refugee adults | It is the immigration-status test. |
| "The HCPF review's note C-13", "[K]", "B-1 of the HCPF review", "Phase 7 (OQ-63, resolved)", "the Cornell copy (D-40, S201)" | OQ bodies, rationales | Authoring history. It tells me how the item was written, not what it says (agrees with caseworker S11). |
| `ineligible_medicaid_eligible`, `title_xix_emergency`, `emergency_only` | case expectations | Raw codes (agrees with caseworker S4). |
| "Partly resolved: ... open: ..." | OQ titles | I cannot tell open from closed at a glance. |

## What I needed and could not find

- A plain definition at the top of every rule and figure page. It exists (`meaning`) but is shown only for supplied facts (`src/ui/ItemView.tsx:228-233`).
- Figures in the units HCPF publishes: percent, and monthly dollars by household size for the current year, next to the rule text that states them.
- A list of the facts a rule or outcome needs, grouped (person, tax household, income), not a graph.
- My approval queue: items that need the Medicaid policy owner, their status, and a way to sign that does not need a GitHub token.
- Any visible item status. Every item is Draft, and the app never says so outside the Approach A box.
- Open questions as their own pages: the question, the assumption in force, owner, the items and household outcomes that change, and an "answer this" action.
- "What changes if this rule changes": the household outcomes, not 63 identifiers (`38-tray-open.png` "Impact").
- A multi-person "try a household" for Colorado.

## Findings by severity

| # | Finding | Severity | Task |
|---|---|---|---|
| F1 | No approval view, no status filter or column, and no way to sign. A typed Status/Approval is silently dropped ("no change"). | **Blocks** | 3 |
| F2 | Open questions cannot be answered or proposed from the app. An OQ link opens the Table, not the question. Program-page OQ titles are not links. | **Blocks** | 4 |
| F3 | The app cannot show the Colorado volume unless someone intercepts GitHub reads (no local mode; `main` lacks `co`). | **Blocks** (every task, for a real reviewer) | all |
| F4 | A rule or parameter page never shows its plain meaning in the body, only in a pop-up card or under "Approach A projection" → Statement. | Slows a lot | 1, 2 |
| F5 | Search: "countable income" opens Colorado Works. MAGI income has no item called countable income. "H.R.1" and "immigrant" miss the October 2026 Medicaid limit. | Slows a lot | 1, 5 |
| F6 | No "facts this rule needs" list; the graph is unreadable at 54–81 nodes. | Slows a lot | 2 |
| F7 | New household: 303 A-to-Z fields for Medicaid. "Try an example" is empty for every Colorado case. One person only. | Slows a lot | 2 |
| F8 | Approver roles shown in two places disagree: the Approach A box shows 2 roles and hard-coded "Draft"; the card shows 3. | Slows a lot (approval risk) | 3 |
| F9 | No household-impact view for a rule. CO-74/CO-75 must be compared by eye. | Slows a lot | 5 |
| F10 | Parameters shown as decimals (1.42), with no monthly dollar chart for the year. | Annoyance (slows checking) | 1 |
| F11 | The tour breaks on Colorado at step 4 ("No case C-01 in this volume"). | Annoyance | first run |
| F12 | Table Program filter offers only All/Medicaid/SNAP. | Annoyance | 3 |
| F13 | Editor flags "1 problem: Parameter has a value" on an untouched versioned parameter. | Annoyance (false alarm) | 3 |
| F14 | Pop-up card runs off-screen, so "Open definition" cannot be reached. | Annoyance | 2 |
| F15 | Engineering text at the top of program pages: conformance command, "468 warnings". | Annoyance | all |
| F16 | Search results mix resolved and open questions, and OQ titles hide their state in prose. | Annoyance | 4 |
| F17 | The CO-545 worked example supplies "highest standard = 1.33", which looks like it contradicts 142%. | Annoyance | 1 |
| F18 | The 2026 poverty guideline starts January 1 in the codex. OQ-515 says HCPF's date differs, and CO-191's page and the program page do not mention it. | Annoyance (figure risk) | 1 |

## Where I agree with the case worker's review (`stakeholder-caseworker.md`)

I do not repeat their per-household findings. I agree with:
- **S4**, raw outcome codes;
- **S10**, acronyms;
- **S11**, authoring history in meanings and question bodies (I hit it in OQ-519, CO-191 and CO-2400);
- **S8**, the case page leads with raw fact rows;
- **S13**, the one-person form. I would add that "Try an example" offers nothing for Colorado at all.

**N6**, the deployed app cannot read the Colorado volume, is my F3 and the first thing to fix. Their **S9**, the
story explaining Medicaid through continuous eligibility, is the same trap my 17-year-old ticket falls into: the
covered-group rule checks continuous eligibility before the Children's income test. The case worker reviewed
*households*; my gaps are about *sign-off* (F1, F8), *questions* (F2) and *finding a definition by its policy
name* (F4, F5). Their review does not cover those.

## My top 5 wishes

1. **"What needs my signature."** One list of the items I must sign, by chapter. Each row shows:
   - its plain meaning and figure;
   - its status;
   - who else must sign;
   - an Approve button that records my name and date, with no GitHub token.
2. **Every page starts with the definition in plain words, then the rule text it rests on.** Show the 8.100
   paragraph, not S-numbers. Show figures as 142% and as this year's monthly dollars by household size.
3. **Open questions as a to-do list for HCPF.** Filter by topic (long-term care) and owner. Each question shows
   the text, the assumption the codex uses now, what changes if we answer the other way, and a box to write our
   answer.
4. **Walk me through one person.** Pick a household, or build a 17-year-old and her mother. Then step down the
   8.100.4.G order rule by rule, with the value at each step and where it stopped. End with "the facts this rule
   needed", listed.
5. **"Who does this change?"** On any rule or figure: which household outcomes would change. For example,
   "refugee and asylee adults: eligible → emergency only from 2026-10-01". Name the law the way we name it
   (H.R.1, OBBBA, Working Families Tax Cut).

**Candidate views:**
- **(e) Approvals inbox** would have helped me most. My job is sign-off, and today it is impossible (Task 3). It
  should carry the plain diff and its effect on outcomes, so approving one figure shows the households it moves.
- **(b) Open-question decision queue** next (Task 4).
- **(d) Step-through case walkthrough** for the CBMS ticket (Task 2).
- **(a) By aid code / outcome** would have helped Task 5 ("which households end in emergency-only now"), once it
  lists the figures each outcome depends on.
- **(c) By role/agency** matters only as the filter on (e) and (b): "Medicaid policy owner".

**My ideal screen for my main task (approvals):**

```
+--------------------------------------------------------------------------------------+
| Colorado codex (draft)      Signed in as: Dana, Medicaid policy owner   [Help]       |
+--------------------------------------------------------------------------------------+
| NEEDS MY SIGNATURE   785 items   [Chapter: MAGI groups v] [Kind: figures|rules|all]  |
|                      Status: 785 Draft . 0 Reviewed . 0 Approved     [Search 8.100...] |
+------------------------------+-------------------------------------------------------+
| MAGI groups (62)          >  | Children's category income limit           Draft      |
|  [ ] Children's income limit | ----------------------------------------------------- |
|      142% FPL      Draft     | What it is: the highest household income at which a   |
|  [ ] Parent/caretaker limit  | child under 19 qualifies for MAGI Medicaid.           |
|      68% FPL       Draft     |                                                       |
|  [ ] 5% disregard  Draft     | Figure:  142% of FPL  (since 2022-06-30; 133% before) |
|  [ ] Children's category     |          2026 monthly: 1 $1,889  2 $2,561  3 $3,233   |
|      (rule)        Draft     |                        4 $3,905 ... (+5% = $3,347 @3) |
| Long-term care (140)      >  |                                                       |
| Verification (60)         >  | Rule text: 10 CCR 2505-10 § 8.100.4.G.2               |
| Shared with cash (114)    >  |  "...total household income does not exceed 142% of   |
|                              |   the federal poverty level..."        [open source]  |
|                              |                                                       |
|                              | Used by: Children's category, CHP+ income limit,      |
|                              |          CHP+ presumptive eligibility                 |
|                              | Households tested: 44 (all pass)    [see outcomes]    |
|                              | Open questions: OQ-515 (date HCPF adopts the 2026     |
|                              |   guideline)                          [answer]        |
|                              |                                                       |
|                              | Also must sign: CHP+ owner, Cash owner, Legal,        |
|                              |   State plan coordinator           (0 of 4 signed)    |
|                              |                                                       |
|                              | [ Approve ]  [ Approve with comment ]  [ Send back ]  |
+------------------------------+-------------------------------------------------------+
```

## Time and confidence summary

| Task | Finished | Realistic time | Confidence |
|---|---|---|---|
| 1 Countable income + 2026 children's figure | Partly (figure yes; definition by hunting) | 35 min | High on 142%, medium on the definition |
| 2 17-year-old denial: rules and facts | Partly (rules yes, facts no) | 45 min | Medium / low |
| 3 My sign-off queue; approve one | No (blocked; false "saved") | gave up at 30 min | None |
| 4 LTC open questions; propose an answer | Partly; no way to propose | 40 min | Medium |
| 5 H.R.1 October 2026 restriction and households | Yes for the rule; households only via two test cases | 30 min | High / medium |

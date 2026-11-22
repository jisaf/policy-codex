# UX retest (phase 13): CDHS cash-programs policy lead

Persona: Marcus, policy lead for Colorado Works and Adult Financial at CDHS. He was a county caseworker before
this job. He works in Excel and the rule manual, and he does not know YAML, git or code. His first walkthrough is
`docs/reviews/ux-cdhs-cash-lead.md`. Finding numbers F1–F17 below refer to that report.

**State tested.** Branch `ccr-9d19bf4c-wmnwcl` at fa11e8a, working tree.

**How the app was run.** I built into my scratch folder with `npm run build -- --outDir <scratch>/dist` and served it
with `npx vite preview --outDir <scratch>/dist --port 4312 --strictPort`. The app read the local tree through
`/__ledger/`, so I did not intercept any GitHub requests. The header showed "working tree (ccr-9d19bf4c-wmnwcl @
fa11e8a)". I drove it with Playwright (`chromium.launch()`, 1366x900, deviceScaleFactor 1). Each run used a fresh
browser with the CDHS persona stored, which is what the "CDHS policy" door does.

Screenshots and text dumps of the same screens are in `/tmp/claude-0/ux-retest/cdhs-cash-lead/`. File names below
are relative to that folder. I stopped the server when I was done. I edited nothing in the repo except this file.

**Scope.** The app defines policy as rules. It does not take a new household and does not calculate live (product
owner, 2026-11-21). I did not count "I can't enter my own family of three" against it. Where that limit still costs
Marcus something, I say so.

---

## 0. First impression

The bare URL now opens Colorado with a "What brings you here today?" page (`01-first-visit.png`). I picked **CDHS
policy**. That took me to **By role → CDHS policy** (`02-cdhs-door.png`), which shows four tiles:

- 880 items waiting on your sign-off
- 34 open questions you own
- 7 statute-over-rule departures
- 2 dated changes in the next year

Below the tiles are "Your programs", "What changed recently" and "Figures in force". This is the home page I asked
for (old wish: "What Cash owns, must approve, and has open"). F14 (wrong default volume, MWR tour) is fixed.

Two counts on the tiles don't add up:

- **"880 items waiting on your sign-off"**, but the four role lines under it total 1,199 (543 + 513 + 100 + 43).
- **"34 open questions you own"**, but the program lines total 36.

I guess shared items are counted once in the headline. The tile doesn't say so. (Annoyance.)

---

## 1. The same five tasks

### Task 1: Where does the grant standard live? Does it reflect the SB 26-181 freeze? What changes in July 2028?

**What I did**

1. On my role page, under **Figures in force**, I typed "grant standard" into **Find**. It narrowed to four Colorado
   Works rows and three Adult Financial rows (`03-roles-find-grant.png`). Each Colorado Works row reads "A table of
   11 rows … since July 1, 2026". The rule text underneath is the SB 26-181 section. I opened the no-caretaker
   table and saw dollar figures.
2. I set **As of** to 07/01/2028 (`04-roles-grant-asof-2028.png`). All four rows now say **"No version in force from
   July 1, 2028; see OQ-101, OQ-530."** In the first test this was an unexplained "unknown" (F12).
3. I opened the one-caretaker table's own page (`05-grant-standard-item.png`). It shows **"A number set by policy, in
   force on November 21, 2026"** with the eleven figures. Under Details → Versions, both versions are shown in full,
   2025-07-01→2026-07-01 (S414) and 2026-07-01→2028-07-01 (S1800). I could check by eye that the figures are the
   same (`06-grant-standard-versions-full.png`). This was F5.
4. I opened OQ-530 from the row (`09-oq530-page.png`). The page lists the eight chart items, the outcomes they
   reach, and the 10 stored households, CO-89 among them, that would move.

**Result**

- **Finished:** yes for "where" and "freeze". Partly for July 2028: the app shows the gap clearly, but it still
  cannot show the arithmetic or let me stage the new chart (see the new task, section 2).
- **Time:** about 8–10 minutes. It took 35–45 minutes in the first test.
- **Confidence:** high.

**What improved**

- I reached the figures in two clicks from my home page.
- The parameter page shows the figures, and Versions shows both periods side by side.
- "As of" gives a reason and names the question.
- The as-of date defaults to today (11/21/2026).

**Still wrong**

- The column header reads **"Household size"**, and Details says **"Type. table keyed by household size"**. The key
  is the number of children (0–10). The row for 0 says "$374.00", which reads as "a household of nobody". (Slows:
  this is exactly the misreading a county trainer would copy.)
- The chart is still three separate one-row tables (no caretaker, one, two), not the chart as 3.606.1.F prints it.
  The need standard is a separate set of tables, so "grant standard" in Find hides it. (Annoyance.)
- The 2028 note points to **OQ-101** as well as OQ-530. OQ-101 is about units with more than two caretakers and has
  nothing to do with July 2028. (Annoyance.)
- The Precision paragraph still opens with "Re-keyed from household size (1-11) to number of children (0-10) under
  the fix-round C-5 finding". That is authoring history, not policy. (Annoyance; first report F11.)

### Task 2: How the Colorado Works grant is computed for a family of three with earnings, step by step

**What I did**

1. **Walkthrough** lists 29 households by what they are, for example "A mother and her daughter apply on October 12
   with the mother's husband…" (`10-walkthrough-landing.png`). Review-round names have moved to a small "written
   for CDHS review B-1" tag. F15 is fixed here.
2. I picked CO-07, still the only eligible unit of three with earnings. I chose Program **Colorado Works** and
   Outcome **"basic cash assistance grant amount"**. The page shows **$387.00** and, right under it, **The budget**
   (`40-co07-budget.png`, full text in `13-walkthrough-CO-07-grant.txt`):

   | Line | What it is | Amount |
   |---|---|---|
   | Gross wages | Income | $400.00 |
   | Colorado Works: gross earned income | Income | $400.00 |
   | Colorado Works: payment countable earned income | Net | $132.00 |
   | Colorado Works: countable earned income | Net | $132.00 |
   | Colorado Works: countable income | Net | $132.00 |
   | Colorado Works: need standard | Standard | $439.00 |
   | Colorado Works: grant standard | Standard | $649.00 |
   | Colorado Works pregnancy allowance | **Deduction** | $10.00 |
   | Colorado Works: payment countable income | Net | $132.00 |
   | Colorado Works: grant before any sanction | **Income** | $517.00 |
   | Colorado Works: sanction reduction | Deduction | **$129.25** |
   | Colorado Works: basic cash assistance grant amount | Result | $387.00 |

3. The rule now reads **"… grant before any sanction minus … sanction reduction, rounded down to the whole dollar,
   but not less than 0."** The old "-1 times (-1 times …)" wording is gone.
4. I also opened CO-83 (deemed stepparent income, $0), CO-85 (child support, $488) and CO-08 ($0)
   (`12-walkthrough-co83-grant.txt`, `13-walkthrough-CO-85-grant.txt`, `13-walkthrough-CO-08-grant.txt`).

**Result**

- **Finished:** mostly. I can now read a real budget top to bottom and copy it, which F10 asked for. I still can't
  get my own $500 example, a family of three with no sanction. That is out of scope now, and no stored household
  is that clean.
- **Time:** about 15 minutes, down from 90+.
- **Confidence:** medium-high on the steps. The budget lines below would mislead a trainer.

**What improved**

- A budget table with an amount and a rule cite on every line.
- Plain rounding wording.
- "The outcome below is the household's result… read this person's own result above."
- Case titles describe households.

**Still wrong (budget table)**

- **The disregard is invisible.** $400 becomes $132 with no "67% disregard −$268" line. CO-83 goes from $1,500 −
  $90 to "deemed income $1,157" with no line for the stepparent's $253 need deduction. The two numbers a trainer
  must explain are the ones missing. (Slows.)
- **"Colorado Works pregnancy allowance — Deduction — $10.00"** appears in CO-07 and CO-85. Nobody in either unit
  is pregnant, and the $10 is neither added nor taken off ($649 − $132 = $517). It is the figure, listed because
  the rule could reach it. It is also an addition, not a deduction. (Slows; it would end up in a handout as a wrong
  line.)
- **"grant before any sanction" is labelled "Income"**. It is a subtotal. (Annoyance.)
- **CO-85:** the budget shows "countable income $200" and then a grant of $488, equal to the grant standard. The
  household's own title says child support is "never in the grant", but the payment-countable line ($0) isn't in
  the budget. So the table reads as $488 − $200 = $488. (Slows.)
- **Sanction reduction $129.25** on a whole-dollar grant (F17, unchanged).
- "Gross wages" in CO-07 has no person on it, while the other lines in CO-08 do ("Person 4: Gross wages").
  (Annoyance.)
- CO-07 opened on **Adult Financial: category = None** for Person 1, because Adult Financial sorts first. I had to
  click Colorado Works. (Annoyance.)
- The step list below the budget is still 72 steps for CO-83. It opens on eligibility, not on the money. With the
  budget above it, this matters less.

### Task 3: Everything that changes if I change the $90 earned income disregard

**What I did**

1. I opened CO-273 and turned on edit mode. **Edit** now shows "Program ColoradoWorks" and "No problems. 12
   constraints satisfied" (`15-disregard-editor.png`). F1 and F2 are fixed. I changed Value to 120 and chose
   **Save to tray**. This time the change was kept.
2. A yellow banner appeared on every page: **"Draft view. These pages include 1 draft change staged in this browser.
   They are not the rules in force. [Show the rules in force] [Open the tray] [Discard drafts]"**
   (`17-after-save.png`). F3 is fixed.
3. On my role page, Find "disregard" (`20b-roles-staged-figure.png`):

   > Staged, not in force — Draft value on November 21, 2026: **$120.00**. Needs sign-off from: Cash programs
   > policy owner. **3 stored households change:** CO-01 Person 4, October 2026: Colorado Works: deemed income of a
   > minor parent's non-participant parent $2,037.00 → $2,007.00 … CO-83 Person 1: countable income $1,157.00 →
   > $1,127.00 …

   This is the "what if" I asked for (old wish 1). It lists households and values, in words, with the approver.
4. **Approvals**: the inbox opened as **"Signing as SNAP policy owner"**, because SNAP is the CDHS persona's first
   role. There was no sign of my change (`19-inbox-120.png`). I switched Role to Cash programs policy owner. The
   CO-273 row is in the first chapter (`24-inbox-cash-CO-273-row.png`):
   - "What changed — Staged in this browser, against the version in force: **Figure: $90.00 → $120.00**;
     **Examples: 0 examples → 0 examples, edited**"
   - "Affects: 9 outcomes … **11 test households**: CO-01, CO-02, CO-07, CO-08, CO-71, CO-13 and 5 more"
   - "Why you sign: It is a ColoradoWorks item; AdultFinancial outcomes read it."
5. The tray (`18-tray-120.png`) still says **"Impact: 22 downstream item(s): af_and_grant, af_and_so_eligible, …"**
   in code names. Propose is still greyed out: "Add a GitHub token in Settings to propose changes."

**Result**

- **Finished:** yes, for "which rules and which test households, and how much". I still have nothing on real caseload,
  which I expect for a policy tool.
- **Time:** about 15 minutes, down from 60 plus a call to IT.
- **Confidence:** high on the three households. Medium on "no grant changes": I inferred it because no grant or
  eligibility line appears. Nothing says so.

**What improved**

- The editor accepts Colorado items.
- The draft banner.
- A household-by-household diff, in dollars, on the role page.
- The approver and the reason are shown at the point of the change.
- The impact list dropped from 50 to 22 items, with no more unexplained Medicaid/CHP+ items (OQ-542 was resolved).

**Still wrong**

- **Two different household counts for one change.** The inbox says "11 test households" (households that *read*
  the figure). The role page says "3 stored households change". I had to work out that they mean different things.
  The inbox, where I'd sign, should give the second number. (Slows.)
- **The inbox doesn't surface my staged change.** It doesn't start on my cash role, and staged rows aren't
  collected at the top. I found CO-273 only because parameters come first. See task 5 for a rule, which I had to
  page through to find. (Slows.)
- **"Examples: 0 examples → 0 examples, edited"**: I didn't touch any examples. (Annoyance.)
- The tray's Impact is still code names (F6, half fixed: the household diff is now on the role page, not in the
  tray).
- The Cases list still turns "ColoradoWorks 125/127" red under a draft (`21-cases-120.txt`). With the banner it
  no longer reads as "the rule", but it still reads as "I broke something" rather than "2 values move". (Annoyance.)
- No line says "no eligibility or grant changes in any stored household". That is the sentence I'd put in a memo.
  (Annoyance.)
- Propose still needs a GitHub token (F9). (Blocks sending it.)

### Task 4: Every open question assigned to cash programs, sorted by which I can answer today

**What I did**

1. **Questions** (`07-questions-landing.png`): "Decision queue (80)". Filters: Program, Owner, Kind of question
   (State policy choice / Blocked on a named document / Needs Legal / Ledger design), Search, "Affects an outcome",
   "Blocks certification", and "Only CDHS policy's (4 roles)", ticked by default.
2. Owner = **Cash programs policy owner** gave **16** (`08-questions-cash-owner.png`):
   - 13 grouped under "Cash programs policy owner — Human Services".
   - 2 owned by Medicaid where Cash "also answers": OQ-515 (poverty guideline date) and OQ-541 (case-wide facts).
   - 1 owned by Legal: OQ-138.
3. Kind = State policy choice narrowed it to 12 (`25-questions-cash-class.txt`).
4. I opened OQ-153 with **Answer**. I filled "The decision", "Citation", "Decided by" and "In the role of", then
   **Stage the answer**. It said: **"Staged in the change tray. OQ-153 is retitled 'Resolved: …' with your answer
   appended"**, and offered "Take OQ-153 off the 1 item that carry it" (`27-oq153-staged.png`). The tray shows
   "Answer to OQ-153" (`28-tray-after-answer.png`). Propose still needs a token.

**Result**

- **Finished:** yes. The app did my sort, with one error (OQ-530, below).
- **Time:** about 15 minutes, down from 2 hours.
- **Confidence:** medium-high that 16 is complete. OQ-542, which I missed last time, is now resolved.

**What improved**

- A real queue with an owner, an "also answers" list, a kind and a certification flag.
- "In force meanwhile", "Rule text it turns on", "Items carrying it", "If answered the other way".
- An Answer form that stages a change.
- Question links go to the question, not to the Table (F7 fixed).

**Still wrong**

- **OQ-530 is classed "State policy choice"**, and its page explains that class as "The published text leaves the
  reading to Colorado: an unpublished State plan election, a county figure…". But the statute fixes the method, and
  the question is blocked on the SSA COLA figures, a named document no allowed host serves. By the stopping rule it
  belongs in "Blocked on a named document". (Slows: it puts a question I *can't* answer in my "answer today" pile.)
- **OQ-530's "The reading in force until it is answered"** is the SB 26-181 background. It doesn't state the
  assumption, which is "no figure, so any grant from July 1, 2028 is unknown". (Annoyance.)
- **"If answered the other way"** says "The question names no single other value, so the new values are not
  worked out" on 15 of 16 questions. That includes OQ-153, which has an obvious other reading ("equal passes").
  Only OQ-104 is worked out ("no stored household result changes"). The promise in the page header ("what changes
  if answered the other way") is mostly a count. (Slows.)
- **Authoring language in the text**: "the HCPF reviewer says [K] … (F-1); the memo is on hcpf.colorado.gov, which
  **this session cannot fetch**" (OQ-515); "`documents/D-80.md:6739-6747`" (OQ-355); "Docs/reviews/engineering-item-
  followups.md section 9 (Drools N-3, Corticon N-4…)" (OQ-541); item names repeated ("Colorado Works: requests
  inclusion in the assistance unit, Colorado Works: requests inclusion in the assistance unit", OQ-101).
  (Annoyance.)
- The Medicaid-owned group is listed **before** my own group on my own filter. (Annoyance.)
- "Only CDHS policy's (4 roles)" has no "only Cash" setting. The Owner box works, but the checkbox suggests a
  shortcut that doesn't fit me. (Annoyance.)
- "Take OQ-153 off the 1 item that carry it": grammar. (Annoyance.)

### Task 5: Propose a change to one definition and see who else has to approve it

**What I did**

1. I opened CO-901 "Colorado Works: is a dependent child". The page now says **"Draft — Needs sign-off from Cash
   programs policy owner (0 of 1 signed)"** right under the meaning (`29-dependent-child-item.png`). F8 is fixed for
   the item page.
2. In edit mode, I added a temporary-absence sentence to Meaning in the Text editor: "No problems. 18 constraints
   satisfied" (`30-dependent-child-editor.png`). Save to tray kept it. The tray shows the "dup.similar … (1.00)"
   warning again and "68 downstream item(s)" in code names (`31-tray-dependent-child.png`).
3. In **Approvals** as Cash owner, I filtered Program = Colorado Works. My row was not on the first screen. It sits
   in a collapsed group, **"Colorado Works · Colorado Works and Adult Financial 83 items"**. I had to open the group
   and press "Show … more" twice (`32-inbox-CO-901-row.png`). The row shows:
   - **What changed:** the whole old meaning → the whole new meaning, with no highlight of the sentence I added.
   - **Examples:** "4 examples → 4 examples, edited".
   - **Why you sign:** "It is a ColoradoWorks item; AdultFinancial outcomes read it."
4. The Medicaid and CDEC inboxes don't list CO-901 at all. Last time its card named Medicaid, CHP+ and CDEC as
   approvers. Now only Cash signs, and the reason is stated.
5. Propose: same token message.

**Result**

- **Finished:** partly. I can stage the change and see who signs and why. I still can't send it.
- **Time:** about 15 minutes to the token wall, down from 45.
- **Confidence:** high on "who approves".

**What improved**

- Approvers on the item page and in the inbox, each with a reason.
- The text editor works.
- The approver list is now narrower and consistent across pages.

**Still wrong**

- **Propose requires a GitHub token** (F9, unchanged). (Blocks.)
- **No way to find "my staged changes" in the inbox**: no "in my tray" filter, no search box, no staged group at the
  top. The route `#/co/inbox/CO-901`, which the view's own description says takes "a change or item id", ignores
  the id and opens the SNAP inbox (`32b-inbox-CO-901-arg.txt`). (Slows.)
- **The meaning diff isn't highlighted**: two 300-character paragraphs side by side. (Annoyance.)
- **"Draft" means two things.** The yellow banner's "Draft view" means *my unsent edit*. The grey "Draft" badge on
  every row (and "Status: Draft (513)") means *never approved*. Every item in the volume is "Draft". (Annoyance;
  confusing for an approver.)
- "Show 9 more of 9 left" (paging wording). (Annoyance.)

---

## 2. New task: prepare the July 2028 chart and see who moves

Marcus's real July 2028 job: stage a +2% chart for SFY 2028-29, see which stored households get a grant again,
and see who signs. The scope note says "what changes" compares stored cases before and after a staged change, so
this should be possible.

**What I did**

1. From the role page I knew the eight items (OQ-530), and that CO-89 and nine other households rest on them.
2. In edit mode, I opened CO-276 and chose Edit. The Text editor shows **one** Value line,
   `{"0":374,"1":488,…,"10":1574}`, and **no versions or dates**. Advanced (Form) shows no versions either. I raised
   every cell by 2% (`36-grant-chart-plus2-editor.png`). The checker said "parses, all constraints satisfied … No
   problems. 18 constraints satisfied."
3. **Save to tray → the tray says "edit · no change"** (`37-tray-grant-chart-plus2.png`), with five "dup.similar"
   warnings. My figures were dropped without a word. This is the same symptom as F1, with a new cause:
   `mergeBlock` (`src/engine/item-block.ts:112-119`) ignores the Value line of any versioned parameter, "since it
   would shadow `versions`". The editor shows the line and lets me change it.

**Result**

- **Finished:** no. **Blocks.**
- **Time:** 10 minutes to the dead end.
- **Confidence:** none in any preview.

Even if the edit had been kept, it would have overwritten the 2026–28 figures, not added a period from July 1, 2028.
For a parameter with versions, the editor needs a "new version from [date]" action. At the least it should refuse
the Value edit with a message instead of reporting "No problems".

The rest of this task does work. **By outcome → Colorado Works → PH-CW-BCA** (`35-outcome-cw-bca.png`) lists the
figures eligibility depends on, with the chart tables and OQ-530 beside them, and the four stored households that
land on the code (CO-07, CO-13, CO-85, CO-86). I could brief the budget office from that page.

---

## 3. Marcus's top 5 remaining problems

1. **He can't send anything.** Propose needs a GitHub token (F9). Answering a question, signing and editing all stop
   in the tray. (Blocks.)
2. **A dated parameter can't be changed, and the edit is silently dropped.** A versioned figure's Value edit passes
   every check and then becomes "no change". There is no way to add a new period, which every annual chart, COLA
   or FPL update needs. (Blocks.)
3. **The budget table leaves out the lines that matter and lists ones that don't.** No 67%/100% disregard line, no
   stepparent needs line, no payment-countable line for CO-85, a $10 "pregnancy allowance" deduction that is never
   applied, a subtotal labelled "Income", and $129.25 cents. (Slows; wrong handout risk.)
4. **The approver's inbox doesn't show the change being approved.** It opens on the wrong role (SNAP), staged rows
   aren't grouped or filterable, and "11 test households" (that read it) disagrees with the role page's "3 stored
   households change". (Slows.)
5. **The question queue is right about owners but weak on consequences and class.** "If answered the other way" is
   worked out for 1 of 16 cash questions, and OQ-530 is filed as a policy choice when it is blocked on the SSA COLA
   figures. Reasoning text still carries authoring notes ("this session cannot fetch", file paths, "[K] (F-1)").
   (Slows.)

## 4. Does each view earn its place? (Marcus)

| View | Verdict | Why |
|---|---|---|
| **By role** (CDHS policy) | **Yes, my home page.** | Figures in force with Find and As of, the staged-draft household diff, "what changed recently" with before→after values, departures, and my question count, all on one page. It is the best screen in the app for my job. Fix the headline counts. |
| **Questions** | **Yes.** | It took task 4 from 2 hours to 15 minutes. The Owner filter and Answer form are what I asked for. It needs the other-reading worked out and a better class check. |
| **Walkthrough** | **Yes.** | The budget table is the training handout I wanted. Fix the missing and phantom lines. The 72-step list is reference only. |
| **Approvals** | **Earns it only with fixes.** | Plain diffs and "why you sign" are right. But it doesn't open on my role, it doesn't show *my* change first, and its household count isn't "who changes". Without a propose path, it ends in a dead end. |
| **By outcome** (aid codes) | **Marginal for me.** | Useful once, for "which figures does a CW grant depend on". Counties and CBMS mapping need it more than I do. The placeholder banner is clear. |

## 5. Wrong or confusing in the views themselves

- **Owner and class on questions.** Owners look right for all 16 cash questions. The class is wrong for **OQ-530**
  ("State policy choice"; it is blocked on SSA COLA figures), and arguably for OQ-376 (DMV lawful-presence match:
  Legal and operations "also answer" it, but it is filed as a policy choice).
- **"The reading in force until it is answered"** (OQ-530) states background, not the assumption. Several "In force
  meanwhile" cells are cut off mid-sentence with "…".
- **"If answered the other way"**: "The question names no single other value, so the new values are not worked
  out" is the answer for nearly every question, including a two-way question like OQ-153.
- **Counts:**
  - Role tile "880 items waiting" vs role lines totalling 1,199.
  - "34 open questions" vs program lines totalling 36.
  - Questions with Owner = Cash: 16, while the Cash group heading says 13.
  - Inbox "11 test households" vs role page "3 stored households change" for the same staged figure.
- **Labels:**
  - "Household size" as the key of the grant and need standard tables, whose key is the number of children.
  - Program names as code: "It is a ColoradoWorks item; AdultFinancial outcomes read it", "Program ColoradoWorks".
  - "Examples: 0 examples → 0 examples, edited" on edits that didn't touch examples.
  - "Draft" as both "never approved" and "my unsent edit".
- **Budget table:**
  - Phantom "Colorado Works pregnancy allowance — Deduction — $10.00" when no one is pregnant.
  - The disregard and stepparent-needs subtractions have no line.
  - "grant before any sanction" is labelled Income.
  - Cents on the sanction reduction.
  - CO-85's payment-countable $0 is left out.
- **Aid-code cells:**
  - "Figures it depends on" for PH-CW-BCA includes "Colorado state code CO" and the sponsor deduction cap, but the
    grant standard only appears under the collapsed "Every figure this outcome can reach (24)".
  - The rule text reads "the number of people in the people in Colorado Works: assistance unit members…".
  - Case titles in this view still carry "Phase 8:" and "CDHS review B-2:" prefixes, which Walkthrough has already
    moved into a tag.
- **Due dates:** not part of Marcus's tasks; not retested here.
- **Route args:** `#/co/inbox/<id>` is documented as "a change or item id" but is ignored.
- **The tray** stays open over the next page after navigation and hides it (`20-roles-figure-staged.png`).
- **The graph** (`#/co/graph/CO-273`) opens on "Pick an item to see what feeds it" instead of the item. Marcus no
  longer needs the graph for task 3, so I did not retest F2 further. The Table/Form program lists no longer
  hard-code Medicaid/SNAP.

## 6. First-report findings: where they stand

| # | Then | Now |
|---|---|---|
| F1 | Text editor rejects CO items; edit silently dropped | **Fixed** for unversioned items. **New variant** for versioned parameters (section 2). |
| F2 | Program lists hard-coded MWR | Fixed in the editor and filters. Graph not retested. |
| F3 | Draft shown as "in force", no banner | **Fixed** (banner, "Show the rules in force"). |
| F4 | One-person intake, empty examples | Out of scope by decision. Walkthrough replaces it for reading. |
| F5 | Parameter page shows "table" | **Fixed** (values and versions shown). The "household size" key label remains. |
| F6 | Impact as code names; no household diff | **Half fixed:** household diff on the role page. Tray still uses code names. |
| F7 | No question page/owner/status | **Fixed** (Questions view). Class and other-reading are weak. |
| F8 | Approvers hidden, no reason | **Fixed** (item page, inbox "Why you sign"). |
| F9 | Propose needs GitHub token | **Unchanged.** Blocks. |
| F10 | Grant story explains eligibility, not money | **Largely fixed** (budget table). Lines are missing or phantom. |
| F11 | Jargon, rounding formula | Rounding fixed. "Approach A projection" and authoring history in Precision remain. |
| F12 | 2028 "unknown" unexplained; stale as-of date | **Fixed.** |
| F13 | Search misses the $90 parameter | Not retested. Role-page Find covers it. |
| F14 | MWR default and tour | **Fixed.** |
| F15 | Case titles named after review rounds | **Fixed** in Walkthrough. Still in By outcome and Cases. |
| F16 | "Relationships: none stated" | Not seen in the new views. Cases page not retested. |
| F17 | Sanction reduction 129.25 | **Unchanged.** |

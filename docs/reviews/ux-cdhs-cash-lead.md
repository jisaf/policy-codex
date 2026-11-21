# UX discovery (phase 13): CDHS cash-programs policy lead

Persona: Marcus, policy lead for Colorado Works and Adult Financial at CDHS. Before this job I was a county
caseworker. I live in Excel and the rule manual. I don't know YAML, git or code, and I had never heard the word
"derivation".

Branch `ccr-9d19bf4c-wmnwcl` at 6343635. I changed nothing in the repo except this file.

## How the app was made to show the local Colorado volume

The app has no local-ledger mode. `src/ledger/source.ts` always reads `https://raw.githubusercontent.com/jisaf/policy-codex/<ref>/...`.
The README says `npm run dev` "reads the ledger from GitHub main". No query parameter changes the source. So I did
what `e2e/fixtures/ledger.ts` does:

- I built into a private folder, `npx vite build --outDir <scratchpad>/dist-cash`, so I would not overwrite the shared
  `dist/` while other walkthroughs ran in parallel. I served it with `npx vite preview --port 4302 --strictPort --outDir <same>`.
- In Playwright (`chromium.launch()`, 1366x900, deviceScaleFactor 1), `page.route` answered every
  `raw.githubusercontent.com/jisaf/policy-codex/**` read with the file on disk, and every `api.github.com/**` read
  with a 404.
- The app then showed `co` at the current working tree: Settings reported "co at main, 1406 items, 820 sources, 217
  open questions". The program page reported "4894 passed, 0 failed".

Screenshots are in `/tmp/claude-0/ux/cdhs-cash-lead/` (all paths below are relative to that folder). Some `.txt` files
beside them hold the same panels as text. I stopped the server when I was done.

---

## 1. The tasks

### Task 1: Where does the grant standard live? Does it reflect the SB 26-181 freeze? What changes in July 2028?

**What I tried**

1. First visit (`01-first-visit.png`). The header dropdown already says "Work requirements under H.R.1...". I took the
   tour. All ten steps are about Medicaid community engagement (`02-tour-step3.png`, `02-tour-step6.png`,
   `02-tour-step9.png`). Nothing in it told me Colorado is in the dropdown.
2. I switched the dropdown to "Colorado eligibility rules for the programs served by PEAK and CBMS (draft)". That
   opened Programs, with Medicaid first (`03-co-programs-landing.png`). The program button reads "ColoradoWorks", as
   one word.
3. ColoradoWorks (`04-cw-program-top.png`) lists 24 outcomes first, most of them "verification is pending", then the
   cases, then **Parameters in force** (`05-cw-parameters-in-force.png`). That is where the grant standard is, as
   three rows (no caretaker, one caretaker, two caretakers) plus "each additional child". The value cell reads
   `{0: 374, 1: 488, 2: 620, 3: 754, ...}`.
4. The row name is not a link. I clicked the orange code chip, then "Open definition" (`07-grant-standard-card.png`).
   The item page (`08-grant-standard-item.png`) says only **"A number set by policy: table (S414, S1800, S1801, S1803, S1804)"**.
   The page for the grant standard does not show the grant standard.
5. Under Details, "Versions" lists `2025-07-01 → 2026-07-01 table S414` and `2026-07-01 → 2028-07-01 table S1800`
   (`09-grant-standard-item-expanded.png`). That is the freeze, but each value cell just says "table". I could not
   see the two versions side by side to check that they are the same numbers. The freeze explanation is in
   "Precision", one 120-word sentence that starts "Re-keyed from household size (1-11) to number of children (0-10)
   under the fix-round C-5 finding...". Under Decision record, the SB 26-181 text (S1800) is quoted in full. That was
   the most useful thing on the page.
6. To check July 2028, I found the "As of" date box above Parameters in force (it defaults to 10/01/2026, not
   today) and set it to 07/01/2028 (`06-cw-parameters-asof-2028-07.png`). All eight chart rows turned to **"unknown"**,
   with no note saying why.
7. Under Open questions on the program page, I expanded **OQ-530 "Colorado Works standards from July 1, 2028"**
   (`11-oq530-expanded.png`). It explains the gap: from July 1, 2028 the statute requires the prior year plus the
   greater of 2% and the three-year average SSA COLA. The SSA figures were not fetched, so no version exists. It names
   case CO-89. The references in that text (S1800, D-171, CO-274...) are plain text, not links.
8. Case CO-89 (`12-case-co89-top.png`): a unit determined in August 2028 gets "unknown" for need standard, grant
   standard, eligibility and grant. That confirmed it.

**What I would change in July 2028** (worked out myself; the app did not help with this): add a version from
2028-07-01 to all eight chart items (CO-274 to CO-277 and CO-351 to CO-354). Each figure would be the 2027-28 figure
times (1 + the greater of 2% and the average SSA COLA for FY 2026-27 through 2028-29), or whatever CDHS adopts in the
3.606.1.F rule if that is higher. At the 2% floor, the one-caretaker/two-children grant goes from 620 to about 632.
The app cannot preview a "+2%" chart, and it does not say how to round.

- Finished: yes, for finding the standard and confirming the freeze. Partly, for July 2028 (the app shows the gap but not the arithmetic).
- Realistic time: 35–45 minutes. Most of it was finding Colorado and working out that the orange chip is the way in.
- Confidence: high on the freeze (the bill text is quoted). Medium on the July 2028 list of items, because I had to trust
  OQ-530's "Items:" line to know all eight tables need a version.

### Task 2: How the Colorado Works grant is computed for a family of three with earnings, step by step

**What I tried**

1. I opened the grant outcome from the program page (`13-cw-grant-amount-item.png`). The rule reads:
   **"the greater of 0 and -1 times (-1 times (Colorado Works: grant before any sanction minus Colorado Works: sanction reduction) rounded up to the next whole dollar)"**.
   It took me a while to see that "minus one times, round up, minus one times" means "drop the cents". The example
   underneath is a run of `receives_title_iv_foster_adoption_kinship_payment=false; others {"p2":{...}}`.
2. I followed the chain by clicking chips: grant before sanction (CO-1260), then payment countable income (CO-923),
   then payment countable earned income (CO-922) (`14-chain-0.png` to `14-chain-3.png`). CO-922 is one paragraph of
   nested "else if it is not the case that ... is unknown". Its example is the clearest thing I found: $400 wages,
   ongoing case, answer 132.
3. Then I wanted a family of three. **Cases → New household → ColoradoWorks** (`16-new-household.png`,
   `17-new-household-cw.png`) asks for **"24 outcomes need 196 supplied facts"** for one person, p1 only. The
   **"Try an example" list is empty**: it offers only "choose a household…". I could not enter a mother and two
   children.
4. I read the case titles looking for a three-person unit with earnings (`15-co-cases-list.png`). The titles are
   named after review rounds ("CDHS review B-1", "Phase-10 facts round"), not after the household. The only fit is
   CO-07: "Two-parent Colorado Works unit with a parent serving a second-level sanction, an SSI child on AND-CS,
   months straddling the sixty-month limit...". It has a unit of three and $400 wages, but also a sanction, so it is
   not a clean training example.
5. In CO-07, the grant row's story (`19-co07-grant-story.png`) explains **eligibility**: residency, citizenship,
   "is a dependent child is no / no / yes". It does not explain the money. "Show everything" (`21-co07-grant-everything.png`)
   has the numbers: grant standard 649, payment countable income 132, grant before sanction 517, sanction reduction
   **129.25**, grant 387. When I expanded "payment countable earned income", it said **"132 memo see above"**
   (`46-co07-earned-income-node.png`), so the $400 and the 67% were somewhere higher in a 255-line tree. The same page
   says "Relationships: none stated" although CO-07 states eight relationships.

**What I would put in county training** (pieced together from CO-907, CO-913, CO-922, CO-1260 and CO-914; **not
checked in the app**, because I could not enter the household): a mother and two children, $500 gross wages a month,
applying.

1. Find the row and column on the 3.606.1.F chart. One caretaker, two children: need standard $421, grant standard $620.
2. Income test at application: take $90 off each earner's gross ($500 − $90 = $410). Add countable unearned income.
   The unit passes only if the total is **below** $421. Equal fails, which is OQ-153's reading.
3. Payment, first certification period (or a new job): 100% of earnings is disregarded, so countable earned income is
   $0. Grant = $620 − $0 = $620. Drop any cents.
4. Payment after the first certification period, same job: 67% is disregarded, so $500 × 0.33 = $165 counts.
   Grant = $620 − $165 = $455. An ongoing case is tested against the need standard with the same 67% disregard
   ($165 < $421).
5. A sanction then takes $1 (first level) or 25% (second and third), and the result is rounded down.

- Finished: partly. I have the steps, but I could not run my own family of three.
- Realistic time: 90 minutes or more, and I would still ask IT to run the example before I put it in front of counties.
- Confidence: medium. The rules read clearly enough once decoded, but I never saw the app produce my $620 and $455.

### Task 3: Everything that changes if I change the $90 earned income disregard

**What I tried**

1. Search for "90 disregard" (`10-search-90-disregard.png`) found CO-922 and two resolved open questions, but **not
   the $90 parameter itself**. "earned income disregard" found it third, after the SSI disregard.
2. On CO-273, Dependencies lists five rules that use it (`22-disregard-item-deps.png`). I didn't expect two of them:
   it also enters the **payment** for a disqualified member (CO-923) and budgetary-unit deeming (CO-2353). The name
   says "(at application / minor-parent deeming)".
3. "View in the graph" (`23-disregard-graph.png`) showed **20 nodes, all Medicaid** ("Medicaid: emergency Medicaid
   status", "Medicaid: MAGI eligibility status"...) and not one Colorado Works box. The program checkboxes offer only
   All, Medicaid and SNAP. The labels are too small to read.
4. I turned on edit mode, clicked Edit, and changed `Value 90` to `120` in the text editor. The checker said
   **"line 7 Program must be All, Medicaid, or SNAP"** (`25-editor-disregard.png`) on a line I hadn't touched. Save
   to tray worked, but the tray said **"edit · no change"** (`27-tray-after-120.png`). My edit had been dropped
   without any warning.
5. Under Advanced → Form (`28-form-editor-disregard.png`), the Program box was empty (its choices are All, Medicaid,
   SNAP). I set Value to 120 and saved. This time the tray kept it (`29-tray-form-120.png`). **"Impact: 50
   downstream item(s)"** is a list of code names: `af_and_grant`, `cccap_parent_fee`, `ma_magi_eligibility_status`,
   `chp_verification_status`... Why would CHP+ verification move when I change a cash disregard? The tray didn't say.
   (OQ-542, "MAGI eligibility reaches Colorado Works eligibility", explains it. It is not listed on either cash
   program page.)
6. Which households: the tray has no case list. By accident I opened Cases and saw three rows go red:
   **CO-01 and CO-02 "ColoradoWorks 125/127", CO-83 "ColoradoWorks 7/9"** (`30-cases-with-staged-120.png`). Inside,
   p4's deemed income went from 2037 to 2007 (CO-01), and p1's countable income from 1157 to 1127 (CO-83)
   (`32-CO-01-failing-under-120.png`, `32-CO-83-failing-under-120.png`). No eligibility or grant changed. To me, a red
   "failed" count reads as "I broke something", not "these households change".
7. Then I turned edit mode off and reloaded. The program page still listed **"Colorado Works earned income disregard
   ... 120"** under **Parameters in force**, and CO-83 still read "16/18 expectations met" (`45-reader-mode-staged-120.png`).
   Nothing says that this is my draft and not the rule.

- Finished: partly. I have the rule list (five direct, 50 downstream, as code names) and three test households. I
  have nothing on real caseload.
- Realistic time: 60 minutes, plus a call to IT to ask why my first edit did nothing.
- Confidence: low on "which households" (test cases only, found by accident). Medium on "which rules".

### Task 4: Every open question assigned to cash programs, sorted by which I can answer today

**What I tried**

1. No page lists open questions. "Browse" offers Table, Graph, Sources and Documents (`33-browse-menu.png`).
2. The ColoradoWorks program page lists 9 (OQ-101, 102, 104, 153, 252, 354, 376, 530, 531). AdultFinancial lists 4
   (OQ-138, 250, 352, 355). Each is a fold-out paragraph of 150 to 400 words with no owner, no status and no "what I
   need from you" line.
3. Table, with "Cash assistance" picked in the last box and sorted by Open (`35-table-cash-open-sorted.png`), gives the
   same 13. The Table's Program filter only offers All, Medicaid and SNAP. Clicking an open question in Search goes to
   the Table filtered by that question (`36-oq-from-search.png`), not to the question.
4. Nothing is "assigned" to anyone. `volume.yaml` has a "Cash programs policy owner" role, but open questions have no
   owner. I missed **OQ-542** (it asks the Medicaid owner whether MAGI may depend on a Colorado Works determination,
   through `af_category` and `af_barred_by_colorado_works`). The two Adult Financial items it names don't carry it, so
   it is not on my program pages.

**My sort** (by hand, after reading every body; the app gave me no column to do this with):

| Can answer today (state policy choice, mine) | Need someone else | Blocked on a document |
|---|---|---|
| OQ-153 income equal to need standard: equal fails (J.4) | OQ-138 SSDI route to AND-SO: statute vs rule, Legal | OQ-530 SFY 2028-29 chart / SSA COLA figures |
| OQ-104 monthly equivalent of 30/20 weekly hours | OQ-376 DMV lawful-presence match: Legal and ops | OQ-531 diversion cap in the TANF State plan |
| OQ-252 sanction default "none"; county diversion limit as a yes/no | OQ-542 MAGI reaching CW: Medicaid owner first | OQ-250 HCA tier dollar maximums |
| OQ-354 order of offsets in CW death reimbursement | | |
| OQ-355 prepaid plot and the $2,500 burial limit | | |
| OQ-352 whether income comes off the $79 PNA | | |
| OQ-101 more than two caretakers (I can answer it; the app needs facts it does not have) | | |
| OQ-102 which dollar measure "needs" means in minor-parent deeming | | |

- Finished: yes, but by reading about 3,500 words of question bodies.
- Realistic time: 2 hours.
- Confidence: medium. I'm not sure 13 (or 14 with OQ-542) is all of them.

### Task 5: Propose a change to one definition and see who else has to approve it

**What I tried**

1. I picked "Colorado Works: is a dependent child" (CO-901) and wanted to add the temporary-absence rule to its
   meaning (`37-dependent-child-item.png`).
2. Text editor: same "Program must be All, Medicaid, or SNAP" error, and the tray said "no change" again
   (`38-dependent-child-text-edit.png`, `39-tray-dependent-child-text.png`).
3. Form editor: Program blank again. The tray kept the change, with a warning, **"dup.similar Close to
   cw_has_dependent_child (CO-902) ... (1.00)"**, and "Impact: 94 downstream item(s)" (`42-tray-dependent-child-form.png`).
4. **Who approves** is not on the item page and not in the tray. I found it only by going to a different item
   (CO-921) that mentions CO-901 and clicking its chip (`40-dependent-child-card.png`): **"approval: Cash programs
   policy owner, Medicaid policy owner, CHP+ policy owner, Child care policy owner (CDEC)"**. Nothing says why
   Medicaid, CHP+ and CDEC sign a Colorado Works definition. Likewise the grant-standard chart card says
   "Child care policy owner (CDEC)", and I don't know why.
5. Propose is greyed out: "Add a GitHub token in Settings to propose changes." Settings asks for a "GitHub token" and
   an "AI provider key" (`43-settings.png`). I don't have either and wouldn't know how to get one.

- Finished: no. I staged the change but could not propose it, and I learned who approves only by a side route.
- Realistic time: 45 minutes to the dead end.
- Confidence: medium on the approver list; I have no idea whether those four people actually receive anything.

---

## 2. Words and screens that confused me

- "**A number set by policy: table**" (the grant standard's own page), and "Versions ... table / table".
- `{0: 374, 1: 488, 2: 620, ...}`, and "type: table keyed by household size" when the key is the number of children.
- "**the greater of 0 and -1 times (-1 times (...) rounded up to the next whole dollar)**": this is "drop the cents".
- "**Program must be All, Medicaid, or SNAP**" on a Colorado Works item I hadn't touched.
- "**edit · no change**" in the tray after I made a change.
- "**memo · see above**", "evaluated", "case", "parameter" as tags on trace lines; "★" (it's a tooltip only).
- "**Approach A projection**" (every item page), "**Conformance: npx vite-node scripts/adapters/codex-self.ts on codex@8d4897b...**" (program page).
- "a rule derived", "a fact we are told supplied", "for everyone global", "per person, per month person-month".
- "**dup.similar Close to cw_has_dependent_child (CO-902): ... (1.00)**".
- "**50 downstream item(s): af_and_grant, af_and_so_eligible, ...**", which are code names, not rule names.
- Precision paragraphs full of authoring history: "Re-keyed ... under the fix-round C-5 finding", "CDHS review B-5:".
- Case titles: "Phase-10 facts round", "CDHS review B-2", "Phase 8:".
- "ColoradoWorks", "AdultFinancial" as button labels; "AND-SO", "AND-CS", "HCA", "PNA" never spelled out.
- Three ways into an item (row name: no; orange chip: card; "Open definition": page), with different results.
- "Relationships: none stated" on CO-07, which states eight relationships.

## 3. What I needed and couldn't find

- The chart itself, as a chart: rows by caretakers, columns by children, one tab per effective period, so I could
  compare 2025-26 with 2026-28.
- A "what if" for a figure (+2% on the chart, $90 → $120) that shows households and outcomes that change, in words, without editing anything.
- A way to enter a family of three, or at least an example list that isn't empty.
- A budget-style explanation of the grant: chart amount, earnings, disregard, countable, grant, sanction, paid.
- A list of open questions that are mine, with status, what's blocking, and an "answer" button.
- Who approves, and why, on the item page and in the tray.
- A way to propose without a GitHub token.
- A banner when I'm looking at my own draft instead of the rule in force.

---

## 4. Top 5 wishes, and which candidate view helps

1. **"What if I change this number?"** Type a new figure, see "3 of 94 test households change: CO-83 p1 countable
   income $1,157 → $1,127; no eligibility or grant changes", grouped by program, and say why Medicaid shows up.
   No editing, no token.
2. **A step-through of a household's grant, like a budget worksheet**, in the words of the rule, with each figure,
   its cite, and the option to change one fact ("make it $500 instead of $400").
3. **An open-question queue for cash programs**: who owns it, "can answer / needs Legal / blocked on document X",
   the assumption in force, what changes if answered the other way, and an "Answer" button.
4. **Show the chart and its versions on the parameter page**, with an "As of" date, and say "no figure: see OQ-530"
   when it is unknown.
5. **Approvals shown where I edit**: "This change needs Cash (you), Medicaid, CHP+ and CDEC, because CHP+ and CCCAP
   read 'dependent child'", and a propose path that doesn't need GitHub.

**Candidate views, ranked for my work:**

- **(d) Step-through case walkthrough: helps most.** It directly answers task 2, and with an editable fact it becomes
  my "what if" for tasks 1 and 3. The CO-07 trace has every number; it needs to read top to bottom like a budget, not
  as an 80-node tree with "memo see above".
- **(b) Open-question decision queue: second.** It solves task 4 outright, if it has an owner and a "blocked on" column
  and pulls in questions like OQ-542 that touch my items through other programs.
- **(e) Approvals inbox: third.** It helps task 5 only if it also says *why* each approver is on the list, and if it
  works without a GitHub token.
- **(c) By role/agency: fourth.** "What Cash owns, must approve, and has open" would have been my home page. It
  overlaps (b) and (e).
- **(a) By aid code/outcome: least for me.** It's useful for counties and CBMS mapping. My questions start from a
  figure or a rule, not an aid code.

**My ideal screen for my main job ("what happens if this figure changes"):**

```
+---------------------------------------------------------------------------------+
| Colorado Works > Standards of Assistance (3.606.1.F)      As of [07/01/2028 v]  |
|---------------------------------------------------------------------------------|
| Version: 07/01/2026 - 06/30/2028  (SB 26-181: no COLA)   [compare with 2025-26] |
|            Children:   0    1    2    3    4    5   ...  10   +each            |
| No caretaker   Need    0  117  245  368  490  587  ...  977   +67              |
|                Grant   0  173  362  543  724  869  ... 1460   +90              |
| One caretaker  Need  253  331  421  510  605  697  ... 1065   +67              |
|                Grant 374  488  620  754  894 1031  ... 1574   +90              |
| Two caretakers ...                                                              |
| ! 07/01/2028 onward: no figure yet - OQ-530 (owner: Cash; blocked on SSA COLA)  |
|---------------------------------------------------------------------------------|
| TRY A CHANGE   ( ) +2% all cells   ( ) +[  ]%   ( ) edit cells   [Preview]      |
|---------------------------------------------------------------------------------|
| PREVIEW (draft - not in force; figures illustrative)                            |
|  Test households affected: 24 of 94                                             |
|   CO-07  Dana (unit of 3)   grant  $387 -> $397      [walk through]             |
|   CO-85  unit of 2          grant  $488 -> $497      [walk through]             |
|   ...                                                                           |
|  Other programs that read this: CCCAP (Colorado Works child care), AF           |
|  Approvals needed: Cash (you) - CDEC (CCCAP reads the grant)                    |
|  [Save as draft]   [Send for approval]                                          |
+---------------------------------------------------------------------------------+
```

---

## 5. Findings with severity

| # | Finding | Severity | Task |
|---|---|---|---|
| F1 | The text editor rejects every Colorado program item: "Program must be All, Medicaid, or SNAP" (`src/engine/item-block.ts:168`). Save to tray then records **"no change"** and silently drops the edit (`27-tray-after-120.png`, `39-...`). | **Blocks** | 3, 5 |
| F2 | MWR-era program lists are hard-coded in the Form editor's Program box (blank for CW), the Table's Program filter, and the Graph's checkboxes. The graph focused on the $90 disregard shows 20 Medicaid nodes and no Colorado Works node (`23-disregard-graph.png`). | **Blocks** (misleading) | 3 |
| F3 | A staged draft shows as "Parameters in force" in reader mode, survives a reload, and turns case counts red, with no "draft" banner (`45-reader-mode-staged-120.png`). Anyone sharing the browser would read 120 as the rule. | **Blocks** (wrong answer) | 3 |
| F4 | "New household" takes one person only, and "Try an example" is empty for Colorado (`isRepresentableCase` requires a single p1 with no months). I could not test a family of three. Extends caseworker S13. | **Blocks** | 2 |
| F5 | The parameter page doesn't show its values ("table"); versions show "table"; the program page shows `{0: 374, ...}`; the type says "keyed by household size". | Slows a lot | 1 |
| F6 | The tray's Impact is a list of code names with no household or outcome diff. Household effects appear only as red pass counts on the Cases list. Medicaid and CHP+ items in the list are unexplained (OQ-542). | Slows a lot | 3 |
| F7 | No open-question page, owner, status or "blocked on" field. Question links go to the Table. OQ-542 is invisible from the cash pages because its items don't carry it. | Slows a lot | 4 |
| F8 | Approvers appear only on a token card reached from another item. They are not on the item page or in the tray, and nothing says why Medicaid, CHP+ or CDEC sign a CW definition or the grant chart. | Slows a lot | 5 |
| F9 | Propose needs a GitHub token; there is no path for a non-technical approver. | **Blocks** | 5 |
| F10 | The grant story explains eligibility, not money. The figures are in "Show everything", and the earnings step is "memo · see above". Agrees with caseworker S1. | Slows a lot | 2 |
| F11 | Rounding written as "-1 times (-1 times (...) rounded up ...)"; jargon such as "memo", "Approach A projection", the "Conformance: npx vite-node..." line, "global", "person-month". | Annoyance (slows reading) | 1, 2 |
| F12 | "As of" set to 07/01/2028 shows "unknown" with no pointer to OQ-530. The date defaults to 10/01/2026, not today. | Annoyance | 1 |
| F13 | Search: "freeze" finds nothing; "90 disregard" doesn't return the $90 parameter. The parameter's name hides its use in the payment (CO-923) and budgetary-unit deeming (CO-2353). | Annoyance | 3 |
| F14 | The tour and the default volume are the MWR volume; Colorado is a long title in a dropdown. | Annoyance | all |
| F15 | Case titles name review rounds, not household shapes, so I couldn't find "family of three with earnings" by title. The one that fits (CO-07) carries a sanction. | Slows a lot | 2 |
| F16 | "Relationships: none stated" on CO-07, which states eight. Agrees with caseworker S7. | Annoyance | 2 |
| F17 | Sanction reduction shows as 129.25 on a whole-dollar grant. Similar to caseworker S3. | Annoyance | 2 |

**Where I agree with the caseworker review (`stakeholder-caseworker.md`):**

- **S1**: stories don't explain amounts. That was my biggest problem on task 2.
- **S7**: wrong "Relationships: none stated", seen again on CO-07.
- **S10**: acronyms are not spelled out.
- **S11**: meanings and precisions carry authoring history.
- **S13**: the New household form is single-person. For a policy lead, the empty example list makes it worse, not just inconvenient.
- **S4**: raw codes such as `not_in_unit_did_not_request` also appear in my traces.
- **N6**: load speed was fine locally (about 2 to 5 s).

What is new here: F1–F3 and F9 are editing and governance failures a caseworker never reaches. F5–F8 are about
parameters, impact and ownership, which is a policy lead's work rather than a case worker's.

**What worked:** the SB 26-181 text is quoted right on the item. OQ-530 is a clear, honest explanation. Case CO-89
proves the gap. Every number I needed for CO-07's grant was in the trace. The rule chain is followable chip by chip.
The Form editor did save a change once I found it.

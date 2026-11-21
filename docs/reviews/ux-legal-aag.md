# UX discovery walkthrough: assistant attorney general (phase 13)

Persona: Priya, an assistant attorney general who advises HCPF and CDHS. I read statutes and rules all day. I do not
know YAML, git or code, and I have no GitHub account. I opened the app to do five things I would really be asked to
do. Wherever I say "I", I mean Priya. Wherever I state a fact about the ledger, I checked it against the files.

## How the app was run

- **Build.** `npx vite build --outDir <scratchpad>/dist-legal`. I used a private output folder so that other walkthroughs
  building `dist/` at the same time could not overwrite mine.
- **Serve.** `npx vite preview --port 4303 --strictPort --outDir <same folder>`.
- **Local Colorado volume.** The app has no local-ledger mode: `npm run dev` also reads GitHub main, per the README. I
  used the same method as `e2e/fixtures/ledger.ts`. Playwright (`chromium.launch()`, deviceScaleFactor 1, 1366×900)
  answered every `raw.githubusercontent.com/jisaf/policy-codex/<ref>/...` request from the files on disk, at the working
  tree of `6343635`, and returned 404 for `api.github.com`. Because of that, the item "change history" (which comes from
  the GitHub API) could not be tested.
- **Server.** Stopped when I was done.
- **Screenshots.** All are in `/tmp/claude-0/ux/legal-aag/`. A `.txt` beside a screenshot holds the same panel's text.

The first screen (`01-first-visit.png`) opens on the **other** volume, "Work requirements under H.R.1, Medicaid
community engagement and the SNAP ABAWD time limit". I had to notice the drop-down and switch it to "Colorado
eligibility rules ... (draft)". None of the four doors fits a lawyer: program administrator, anyone, subject-matter
expert, engineer. I picked "Read the rules for a program".

---

## Task 1: Every place the codex follows a federal statute over Colorado's own rule text

**What I tried, step by step**

1. **Searched "H.R.1"** (`03-search-0.png`).
   - Result: 1 item (an informational date parameter, CO-176), 5 sources and 4 open questions.
   - The four open questions (OQ-1, OQ-31, OQ-32, OQ-251) were the best lead. Their titles say things like "which
     Colorado's SNAP rule has not adopted".
2. **Searched "override"** (`03-search-1.png`). Result: 8 open questions, and some of them have nothing to do with this
   (OQ-96 "income trust ... override", OQ-132 LEAP).
3. **Searched "federal law overrides".** Result: **"Nothing matches"** (`03-search-2.png`). Yet that exact phrase opens
   six items' override notes in the ledger. Search does not look inside the override note.
4. **Searched "119-21"** (`03-search-3.png`). Result: 18 items. This is a better list, but it mixes overrides with
   items that merely cite the Act. A Medicaid student-loan item and a retroactive-coverage parameter, for example, are in
   the same list as the SNAP overrides.
5. **Opened CO-308, "SNAP: is an eligible non-citizen"** (`04-item-co308.png`, `05-co308-expanded.png`).
   - The page shows the rule, an example, then five collapsed sections.
   - Under Details, the **Assumption** paragraph says "The amended statute (S8, S9) controls over 10 CCR 2506-1 4.305
     and 7 CFR 273.4".
   - Under Decision record I found the statute (S8, S9), the Colorado text being overridden (S751, 4.305.1.H on COFA
     migrants) and the reasoning (OQ-1, a very long paragraph).
   - **The one-sentence "statute over rule" note that the ledger keeps for exactly this purpose is not on the page at
     all.** I saw it only after turning on edit mode and opening the editor (`27-co166-editor.png`, the "Override"
     line).
6. **Opened a case trace for a person whose result rests on an override** (CO-87, Task 5). The engine writes a
   "Statute over rule:" line for these. The app's trace never shows it (`19-co87-trace-SNAP_ABAWD.png`).

**What the ledger actually holds.** I checked the files. Seven items carry a statute-over-rule note:

| Item | What wins | Colorado text it departs from |
|---|---|---|
| CO-308 SNAP eligible non-citizen | Pub. L. 119-21 sec. 10108 | 10 CCR 2506-1 4.305 |
| CO-412 SNAP ABAWD age range | sec. 10102 | 4.000 ABAWD definition (ends at 54) |
| CO-166 SNAP ABAWD maximum age (64) | sec. 10102, as FNS reads it | 4.000 |
| CO-414 SNAP ABAWD exemptions | sec. 10102 | 4.311.1 (homeless, veterans, former foster youth) |
| CO-1243 SNAP heating/cooling utility allowance via LEAP | sec. 10103 | 4.407.31.A.1.b |
| CO-119 SNAP elderly/disabled resource limit ($4,750) | FNS FY2027 figure, 7 U.S.C. 2014(g) | 4.408.E ($4,500) |
| CO-929 OAP citizenship | C.R.S. 26-2-111(2)(c), a **Colorado statute** | 9 CCR 2503-5 3.520.68.A |

**What is missing.** Medicaid is not on that list, though the codex does the same thing there:

- OQ-518 says § 8.100.3.G.1.g "has not been amended for 1396b(v)(5) and still admits refugees, asylees ...". The codex
  "applies the federal limit (CO-509)" through CO-2400.
- CO-509 carries no override note and no `legal` tag.
- CO-1190 follows 26 U.S.C. 108(f)(5) over § 8.100.4.C.1.b.xv's "tax years 2018 through 2025" (OQ-217, HCPF review S-10:
  "flagged for HCPF rule cleanup"). It also has no override note.

So even the hidden marker would give me an incomplete answer. The overrides I would most likely be asked about at
HCPF (H.R.1 sec. 71109, the non-citizen limit) are the ones without the marker.

**Did I finish?** Only with help outside the app. Inside the app I could assemble about 5 of the 9 by reading open
questions one at a time. I could not have known the list was complete. **Realistic time:** half a day, and I would
still not trust the list. **Confidence:** low.

**Where I got lost**

- `03-search-2.png`: search does not reach the override text.
- `08-oq518-click.png`: clicking an open question in search opens a **table of items filtered by that question**, not
  the question. I wanted to read the question.
- `05-co308-expanded.png`: the override is not on the item page.

---

## Task 2: One Medicaid rule, traced to the verbatim regulation and its source document

I chose CO-509, "Medicaid: meets the citizenship requirement". It is the rule I would most likely have to defend
after H.R.1.

**Step by step**

1. **Item page** (`11-co509-expanded.png`). The rule reads clearly enough:
   - citizen;
   - or qualified non-citizen past the five-year rule (or exempt), **and** before 2026-10-01 or in a federal-payment
     category;
   - or lawfully present and pregnant or under 19.

   21 test cases with clear given/expected values. That is genuinely useful to a lawyer: they are hypotheticals.
2. **Decision record → Sources.** Every excerpt is printed in full: 42 CFR 435.406, 8 U.S.C. 1613, § 8.100.3.G.1.g.iii,
   iv, v, vii and ix, Pub. L. 119-21 sec. 71109 and CMS SHO #26-001. This is the best part of the app for me. The
   paragraph citation is on every excerpt ("10 CCR 2505-10 § 8.100.3.G.1.g.iv"), with the rule version ("current
   Secretary of State text", "rule version effective 11/14/2026").
3. **Clicked the document link "10 CCR 2505-10 § 8.100 ..." (D-65)** (`13-doc-d65-landing.png`).
   - The link lands at the **top of the whole of § 8.100**, a page 216,000 pixels tall.
   - The paragraph I came from is not marked in the text. It sits 18,000 px down (`14-doc-d65-at-g1g-iv-in-fulltext.png`),
     and I found it with Ctrl-F.
   - The excerpts are repeated in a separate list after the full text, 184,000 px down. With `?excerpt=S656` that card
     is highlighted (`15-doc-d65-excerpt-param.png`), but no link I clicked carries that parameter.
4. **Clicked the excerpt title (S656), and later a source chip in a trace** (`16-source-s656-landing.png`,
   `23-after-source-chip.png`). Both open the Sources page **at S1, or wherever the previous page was scrolled**, not at
   S656. The excerpt I clicked is expanded somewhere among about 1,800 others.
5. **Provenance.** The document page says "Retrieved 2026-11-21 ... converted to plain text without editorial change"
   and gives the Secretary of State URL. That is the statement I need. But nothing tells me that anyone checked the
   excerpt against the document, so I compared S656 by eye.

**Good enough for an appeal hearing?** For **finding and quoting** the law: yes, better than our desk binders. Every
condition has its paragraph and verbatim text, and the rule version is dated.

As an **exhibit**: no, not yet.

- There is no printable "authority for this rule" page: rule, conditions, each condition's paragraph, the text and the
  effective date.
- Everything says "Status: Draft", and the "Approval: Medicaid policy owner, Legal" line records no one and no date.
- The Colorado rule text (iii, iv, v) still admits refugees and asylees. The codex denies them full coverage after
  October 1, 2026 on the strength of 42 U.S.C. 1396b(v)(5). The page does not say, at the top, "this rule departs from
  § 8.100.3.G.1.g because...". I had to find OQ-518 in the open-questions list to learn that HCPF has not amended the
  rule. A hearing officer will ask exactly that question first.
- Some sources are Cornell LII copies, not the Secretary of State (SNAP's D-18 for 4.305). I would not cite LII at a
  hearing.

**Time:** about 40 minutes for one rule, most of it lost in the document page. **Finished:** yes. **Confidence in the
chain:** high for the text, medium for "is this the right reading".

---

## Task 3: Items tagged for Legal review, open questions that need a legal opinion, and recording my opinion

**Step by step**

1. **Table → Tags → "Legal review"** (`07-table-legal-tag.png`). Result: 57 items, each marked "1 warning".
2. **What does the warning mean?** I clicked into an item. I learned only in the editor's Checker that it says "Legal
   sign-off is required (legal tag or open question)".
3. **Looked for "what Legal must approve".** I found three different answers, and the app shows me only the first:

   | Definition | Count | Where |
   |---|---|---|
   | the `legal` tag | 57 | Table tag filter "Legal review" |
   | tags whose approver is Legal in volume.yaml (`legal`, `immigration`, `state_election`) | 200 | not shown anywhere in the app; only in the "Approach A projection" per item ("Approval ... Legal") |
   | the Checker's "legal tag or open question" | 191 | the "1 warning" on table rows |

4. **Open questions that need a legal opinion.**
   - No open question names an owner or says "needs Legal". The status table in `docs/reviews/open-question-status.md`
     classes them as "state policy choice" and similar, but the app does not show that.
   - Programs → Medicaid lists 35 questions with their full bodies (`09-program-medicaid-expanded.png`), resolved and
     open mixed together.
   - By my own reading, 24 open questions sit on items that Legal must approve. Examples: OQ-1, OQ-44, OQ-213, OQ-394,
     OQ-510, OQ-517, OQ-518, OQ-533. I had to work that out myself.
5. **How would I record my opinion?** I turned on edit mode, opened CO-166 and pressed Edit (`27-co166-editor.png`). It
   is a block of field text with "Text / Advanced / Chapter" tabs and a "1 problem(s)" pill. I typed a sentence into the
   Assumption, pressed "Save to tray" and opened the tray (`28-tray.png`). What happened:
   - The tray lists **69 downstream items by code name** (`snap_requires_verification_of_ssn`, ...). That is for a
     sentence of commentary that changes no answer.
   - Two "dup.similar" warnings appear.
   - "Propose" is greyed out: **"Add a GitHub token in Settings to propose changes."** I do not have GitHub, and I would
     not be allowed to create a token on a state laptop.
   - There is no "Approve", "Sign off", "Answer this question" or comment box anywhere. `docs/governance.md` says
     approval is "the normal GitHub review".

**Finished?** I found a partial list of 57. I could not reliably find "questions for Legal", and **I could not record an
opinion at all.** **Time:** an hour to get this far. **Confidence:** low that the list is complete; none that my opinion
was recorded.

---

## Task 4: "Unverified" figures and what depends on them

**Step by step**

1. **Searched "unverified".** Result: 25 hits (14 items, sources and questions). Most of them are noise from SNAP's
   "unverified expenses", a different meaning.
2. **The real ones are two sources, S1228 and S1230, from HCPF OM 25-073** (D-125, "not retrieved"). They supply:
   - the transfer-penalty divisor (CO-832);
   - the nursing-facility personal needs allowance (CO-887);
   - the four regional income-trust limits (CO-1981 to CO-1984).
3. **Opened S1228** (`10-source-s1228.png`).
   - The title ends "(unverified)".
   - The figures sit in a box headed **"Statute text"** on a page that says **"Verbatim excerpts of the governing text.
     Nothing here is interpretation."**
   - The ledger file says, in a line the app drops: "Verification: unverified ... supplied by the product owner ... **They
     are not a quotation of the memo's text.**"

   To a lawyer that is the most important sentence on the page, and it is the one that is hidden.
4. **Opened CO-832** (`31-co832-expanded.png`). The headline says "A number set by policy: 10814.64 (S366, S648,
   S1228)". "Unverified" appears only inside Details → Precision.
5. **What depends on these figures?**
   - The item's "Used by" gives only the next step (transfer penalty days and months).
   - The Graph (`30-graph-co832.png`) draws 25 nodes in unreadable 6-point labels and leaves out the divisor itself,
     because "parameters" is unticked.
   - Working it out by hand, about 35 rules sit downstream of the six figures. They include:
     - Medicaid patient payment;
     - LTC eligibility status;
     - transfer penalty months;
     - HCBS and PACE eligibility;
     - the 300% special income group, and through it the Medicare Savings Program and emergency Medicaid paths.
   - In the CO-01 household, the grandmother's **$179.64 patient payment** rests on the unverified $110.36 allowance.
     Her trace does not say so.

**Finished?** Partly: I found the figures. The dependency list is my own work. **Time:** 45 minutes. **Confidence:**
medium on the figures, low on the dependency list.

---

## Task 5: A client appeals a SNAP denial

There is no whole-household SNAP denial among the 27 cases. The nearest is **CO-87**: a 58-year-old man is removed from
his SNAP household because he used his three ABAWD months. This is the appeal I would actually get. His advocate will
say: "Colorado's own rule, 10 CCR 2506-1 4.000, ends ABAWD at 54."

**Step by step**

1. **Cases → CO-87** (`17-cases-list.png`, `18-co87-top.png`). The title tells the story well, and "as of 2026-10-01"
   is shown. The page leads with about 40 rows of supplied facts by code name.
2. **Expectations → his "SNAP: this person's participation" row** (`20-co87-participation-trace.png`). It reads
   "ineligible_member_abawd_time_limit because: is ineligible under the ABAWD time limit is yes; ABAWD status is
   limit_reached". The ABAWD row gave a fuller story (`19-co87-trace-SNAP_ABAWD.png`):
   - in the age range: yes;
   - exempt: no;
   - countable months: 3;
   - limit: 3;
   - "eligibility regained is **unknown**".

   The "unknown" frightened me until I worked out that it did not matter.
3. **"Show everything"** (`21-co87-participation-everything.png`, `22-co87-age-range-node.png`). It is a tree of
   if/else text. Under "is in the ABAWD age range" it gives date of birth 1968-03-03 and "at most SNAP ABAWD maximum
   age (64)", with chips S127, S128, S1301 and S1302. Other branches say "SNAP: is a boarder ... unknown / missing" and
   "disqualified for refusing ... an SSN ... unknown / missing" on a person whose result is decided.
4. **The age ceiling is where the case turns, so I clicked a source chip.** It went to the Sources page but not to the
   excerpt (`23-after-source-chip.png`). I opened CO-166 instead (`24-co166-expanded.png`).
   - Version "2025-07-04 → present: 64, source **S1302**".
   - S1302 is **an FNS proposed rule published November 10, 2026**, five weeks *after* this determination date, with
     comments open until December 10, 2026.
   - The Assumption says so frankly.
5. **"Statute over rule."** Nowhere in the trace or on the case does the app say that the denial departs from 4.000. The
   engine has a sentence for exactly this ("Federal law overrides the ABAWD definition of 10 CCR 2506-1 4.000, which
   still ends the age range at 54 ...") and the UI does not render it. I would have walked into the hearing without
   knowing the rule manual says the opposite.
6. **"What the rule said on that date."**
   - Items do carry dated versions and effective ranges. That is the right idea.
   - CO-166 has **no version before July 4, 2025**, so the codex cannot say what the rule was for an earlier
     determination.
   - The case page has no "re-run as of" control.
   - The governance document says a division director can view "a pinned commit (`@<sha>`)", but nothing in the app
     offers it. I would not know to type it into the address bar.

**Could I reconstruct the denial?** The **why**, yes:

> Three countable months (July to September 2026) under Colorado's fixed clock (4.311.3.C.2). Age 58 is inside the
> time limit's range as amended by Pub. L. 119-21 sec. 10102. No exemption applies. His $600 pension is prorated at
> half ($300) for the remaining member.

The **"what the rule said on that date"**, only partly. The codex's figure rests on a later proposed rule, and the
departure from the Colorado text is hidden.

**Time:** about 50 minutes, and I knew which case to open. For a real client who is not in the case list I would have
to rebuild the household in "New household", which takes one person only (the caseworker review, S13). **Confidence:**
high on the arithmetic, medium on defending the age reading.

---

## Words and screens that confused me

| Quote | Where | Why |
|---|---|---|
| "Statute text" | every excerpt, including 10 CCR regulations, CMS letters and the product-owner figures (`10-source-s1228.png`) | Wrong label for a regulation or a memo, and badly wrong for figures that are not a quotation at all |
| "Verbatim excerpts of the governing text. Nothing here is interpretation." | Sources page header | Not true of S1228 and S1230 |
| "a rule derived", "a number set by policy parameter", "per person person" | item headers | The English and the code word run together |
| "1 warning" | every Legal-tagged row in Table | It means "Legal sign-off is required", but you only find that out in the editor |
| "Approach A projection", "RL-095", "RV-098", "DE-002" | item pages | Means nothing to me |
| "Conformance: npx vite-node scripts/adapters/codex-self.ts on codex@8d4897b...: 4894 passed" | top of Programs (`02-co-programs.png`) | A command line on the home page |
| "co @ main" | tray header | This was not main |
| "Partly resolved: ... open: ..." titles, and bodies with "Phase 8:", "Open-question sweep (2026-11-21):", "CDHS stakeholder review fix round" | open questions | Reads like a lab notebook. I needed the current position first and the history last. OQ-31's body still says the draft "follows that literal reading" (65) before the resolution moves it to 64. |
| "dup.similar Close to snap_abawd_min_age (0.60)" | tray | Noise when the change is one sentence |
| "unknown" / "missing" on facts that do not change a decided result | trace | Agrees with caseworker S6 |
| `ineligible_member_abawd_time_limit`, `limit_reached` | case results | Raw codes. Agrees with caseworker S4 |
| "Open question" filter with "any", "any" and 217 full titles | Table (`06-table-top.png`) | The drop-down is wider than the page |
| Program filter offers only "All, Medicaid, SNAP" | Table and Graph | No CHP+, Colorado Works, AND/OAP, CCCAP, LEAP or SUN Bucks |

## What I needed and could not find

1. A list of every place the codex departs from Colorado rule text, with:
   - the statute that controls;
   - the paragraph it departs from;
   - the date from which it departs;
   - whether the agency has been told.
2. Each such note shown on the item, on the case trace and in the printed explanation.
3. A page per open question, with: its current position first; who must answer it; whether it is a legal question; and
   what changes if it is answered the other way.
4. A way to record a legal opinion and a Legal sign-off without GitHub, with my name and the date on the item afterwards.
5. A trustworthy "verified / not verified" mark on every figure, carried through to every result that uses it.
6. A link from a rule's condition straight to that paragraph **highlighted in the document**, plus a check that the
   excerpt matches the document word for word.
7. "What did the codex say on date X?": a date picker that re-evaluates a case and shows the item versions in force.
8. A printable record for a hearing: the facts, each step, the text relied on and the version dates.

## Findings and severity

Ranked by how often they blocked one of my five tasks.

| # | Finding | Tasks hit | Severity |
|---|---|---|---|
| L1 | The statute-over-rule note is stored but never shown: not on the item page, not in the trace ("Statute over rule:" is built in `explain.ts` and unused by `Trace.tsx`), not searchable | 1, 2, 5 | **blocks the task** |
| L2 | No way for Legal to record an opinion or sign-off. Propose needs a GitHub token, and there is no approve or answer action | 3 | **blocks the task** |
| L3 | The Medicaid H.R.1 departures (CO-509/CO-2400 over § 8.100.3.G.1.g; CO-1190 over § 8.100.4.C.1.b.xv) carry no override note and CO-509 no Legal tag, so the codex's own marker gives an incomplete list | 1, 2 | **blocks the task** (wrong answer if trusted) |
| L4 | Excerpts that are not quotations (S1228, S1230) are shown under "Statute text" on a page that promises verbatim text, and the "Verification: unverified ... not a quotation" line is dropped. Unverified status is not carried to dependent items or traces | 4, 2 | **blocks the task** (misleads) |
| L5 | Three different definitions of "needs Legal" (57 / 191 / 200). The app filters only the 57 | 3 | slows a lot |
| L6 | Open questions have no page, owner or "legal question" class. Clicking one opens a filtered table | 1, 3 | slows a lot |
| L7 | Source links do not scroll to the excerpt, and document links land at the top of a 216,000 px page with the paragraph unmarked | 2, 5 | slows a lot |
| L8 | No "as of date" re-run and no visible pinned version, and parameters have no version before their first source (CO-166 before July 4, 2025) | 5 | slows a lot |
| L9 | CO-166's only source for the value applied to an October 2026 determination is a proposed rule published November 10, 2026 | 5 | slows a lot (defensibility) |
| L10 | Default volume is the other volume, and there is no door for legal or audit work | all | annoyance |
| L11 | Table and Graph program filters list only All, Medicaid and SNAP. The open-question drop-down overflows the page | 3, 4 | annoyance |
| L12 | The tray's impact list names 69 items by code for a comment-only edit | 3 | annoyance |
| L13 | "Statute text" label on regulations and guidance. Some sources are Cornell LII rather than the official text | 2 | annoyance |

**Where I agree with the caseworker review** (`stakeholder-caseworker.md`). I am not repeating these as new findings:

- S4: raw outcome codes.
- S6: "missing" on defaulted facts (I hit it on CO-87: boarder and SSN "unknown").
- S8: the case page leads with fact rows.
- S10/S11: meanings and questions carry authoring history.
- S1: the story stops before the reasoning.

What the caseworker could not see, because they work from the result back, is that **the legal basis of a result**
(the override, the unverified figure, the proposed-rule source) **never reaches the trace**. For me that matters more
than the arithmetic.

## Top 5 wishes, in my own words

1. "When the codex is doing something the Colorado rule book does not say, tell me in red on the rule, on the case and
   in the explanation: which statute, which paragraph it departs from, and since when."
2. "Give me one list of the questions that need a lawyer, with the current reading at the top and the history folded
   away. Let me write my answer there, and sign off, without GitHub."
3. "Never call something 'statute text' unless it is. Mark every figure nobody could check, and mark every result that
   uses it."
4. "When I click a citation, take me to that paragraph in the official text, highlighted."
5. "Let me pick a date and see exactly what the codex said then: which versions, which sources, what result. Then let
   me print it for the hearing."

## Which candidate views would help most

1. **(b) Open-question decision queue: most help.** It would serve Tasks 1 and 3 directly if:
   - it can be filtered to "Legal";
   - it lists overrides as a kind of decision ("statute applied over rule; agency has not amended");
   - each entry has the text it turns on, the assumption in force, the affected outcomes and an answer box that does not
     need GitHub.
2. **(e) Approvals inbox.** This is where my sign-off would live: "waiting on Legal: 200 items, 24 questions", grouped
   by change, in plain language. Without it, Legal is a word in a YAML file.
3. **(d) Step-through case walkthrough.** For Task 5, provided each step shows the rule text, the version date and any
   statute-over-rule or unverified flag, and the whole walkthrough can be printed.
4. **(c) By role.** A "Legal" role page that is simply (b) and (e) filtered would be my home page.
5. **(a) By aid code.** Least useful to me. I argue from rules, not from codes.

## My ideal screen for my main task (Task 1, and the legal queue)

```
+------------------------------------------------------------------------------------------+
| Colorado (draft)   [Legal ▾]  Search law, rules, questions ...            Priya (Legal)  |
+------------------------------------------------------------------------------------------+
| LEGAL QUEUE      Waiting on you: 24 questions · 7 departures · 200 items to sign         |
| Filter: [Program: all ▾] [Kind: departure | question | sign-off] [Status: open ▾]        |
+------------------------------------------------------------------------------------------+
| ! DEPARTURE  SNAP · ABAWD age range (CO-412, CO-166)                    since 2025-07-04 |
|   Codex applies:  Pub. L. 119-21 sec. 10102 -> time limit ages 18-64                     |
|   Rule says:      10 CCR 2506-1 4.000 "ABAWD ... aged 18-54"   [open paragraph ->]       |
|   Why:            federal statute controls; no CDHS letter yet (OQ-533)                  |
|   Weakest point:  64 rests on FNS proposed rule 91 FR 72439 (Nov 10, 2026, not final)    |
|   Affects:        12 outcomes · 3 test households (CO-87, CO-93 ...)  [see cases ->]     |
|   Agency told?    [ ] CDHS notified      Owner: SNAP policy owner + Legal                |
|   Your opinion:   [ text .............................................. ]               |
|                   (o) Agree  ( ) Agree with caveat  ( ) Disagree     [Record & sign]     |
|------------------------------------------------------------------------------------------|
| ! DEPARTURE  Medicaid · non-citizen adults (CO-509, CO-2400)            since 2026-10-01 |
|   Codex applies:  42 U.S.C. 1396b(v)(5) ...  Rule says: § 8.100.3.G.1.g.iv(9)-(10) ...   |
|------------------------------------------------------------------------------------------|
| ? QUESTION   OQ-518 Colorado's rule still admits refugees ... after the federal limit    |
|   Current reading (1 para) · Text it turns on · If answered the other way: 6 outcomes    |
|   History (folded) ▸                                                                     |
|------------------------------------------------------------------------------------------|
| ~ UNVERIFIED FIGURE  OM 25-073 (not retrieved): PNA $110.36, divisor $10,814.64 ...      |
|   Used by: patient payment, LTC status, transfer penalty ... (35)   [Mark verified]      |
+------------------------------------------------------------------------------------------+
| [Print hearing packet]  [Export my opinions]                                             |
+------------------------------------------------------------------------------------------+
```

## Summary

- **Finished:**
  - Task 2: yes, with effort.
  - Task 5: yes for the "why"; partly for "what the rule said".
  - Task 1: not reliably.
  - Task 4: partly.
  - Task 3: no, because I could not record an opinion.
- **Blocking findings:** 4 (L1 to L4).
- **Slows a lot:** 5.
- **Annoyances:** 4.

The legal content I need is in the ledger, and some of it is unusually good: the verbatim excerpts, dated rule
versions, frank assumptions and test hypotheticals. The app does not yet bring the legally decisive parts (departures,
unverified figures, the sources dated after the decision) to where a lawyer reads.

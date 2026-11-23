import sys
src, out = sys.argv[1], sys.argv[2]
body = open(src).read().rstrip("\n")
head = (
    "# 9 CCR 2503-5 — Adult Financial programs (Income Maintenance, Volume 3), archived version effective August 30, 2022\n\n"
    "9 CCR 2503-5 (rule version 10320, effective 08/30/2022; an archived version, superseded). "
    "https://www.sos.state.co.us/CCR/GenerateRulePdf.do?ruleVersionId=10320&fileName=9%20CCR%202503-5\n\n"
    "Retrieved 2026-11-22 from the Colorado Secretary of State's official Code of Colorado Regulations (the archived PDF "
    "listed under \"Archived versions\" for 9 CCR 2503-5 as effective 08/30/2022, Permanent Rule adopted 07/08/2022, "
    "eDocket 2022-00267), converted with pdftotext; runs of spaces collapsed and repeated blank lines dropped, otherwise "
    "without editorial change. Kept because the current version (D-80) still cross-refers, in 3.534.D.2.C, 3.544.G.2.c "
    "and 3.549.G.2.c, to Section 3.520.68.B.2.b.1, which this version defines and the current version no longer has. "
    "Excerpts in sources.md quote this file.\n\n```\n"
)
open(out, "w").write(head + body + "\n```\n")

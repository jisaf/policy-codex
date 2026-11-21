import { expect, test } from "@playwright/test";

/* The approvals inbox on the working tree's Colorado volume: an HCPF
 * analyst's queue opens on her role, an approval is staged in the tray with
 * no GitHub token, the page says how it becomes a pull request, and Legal's
 * count is the same number wherever it is shown. */
test("the approvals inbox stages a signature and says how it becomes a PR", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("codex.tour", "1");
    localStorage.setItem("codex.persona", "hcpf");
    localStorage.setItem("codex.door", "reader");
  });
  await page.goto("/#/co/inbox");
  // The first load reads some 1,400 files from the working tree.
  await expect(page.locator(".viewhead h1")).toHaveText("Approvals inbox", { timeout: 30_000 });
  const mine = page.locator(".rolecounts li.on");
  await expect(mine).toContainText(/Medicaid policy owner: [\d,]+ items awaiting, 0 approved/, { timeout: 30_000 });
  const awaiting = Number((/: ([\d,]+) items awaiting/.exec((await mine.textContent())!)![1]).replace(/,/g, ""));
  await expect(page.locator(".shown-count")).toContainText(`Showing ${awaiting.toLocaleString("en-US")} items`);

  // The first group is open, figures first.
  const firstGroup = page.locator("details.inbox-group[open]").first();
  await expect(firstGroup.locator(".kindhead").first()).toContainText("Figures set by policy");
  const row = firstGroup.locator("article.inbox-row").first();
  await expect(row.locator(".change")).toHaveText("New, never approved.");
  const itemId = await row.getAttribute("data-item");

  // Approve asks for a name first, then stages the signature.
  await row.locator("button.approve").click();
  await expect(page.locator(".signer .bad")).toContainText("Type your name");
  await page.locator(".signer input").fill("Dana Lee (HCPF)");
  await row.locator("button.approve").click();
  const notice = page.locator(".inbox-notice");
  await expect(notice).toContainText("Staged in this browser only");
  await expect(notice).toContainText("Propose");
  await expect(page.locator(`article[data-item="${itemId}"] .staged-note`)).toContainText("signature is staged");
  await expect(page.locator(".draftbanner")).toBeVisible();

  // The tray holds it, and Propose says it needs a token.
  await notice.locator("button", { hasText: "Open the change tray" }).click();
  await expect(page.locator(".tray .entries")).toContainText(itemId!);
  await expect(page.locator(".tray .actions")).toContainText("GitHub token");
  await page.locator(".tray button", { hasText: "Close" }).click();

  // Legal: one definition, one number, in the header, the table and the list.
  await page.goto("/#/co/inbox?role=Legal");
  const legal = page.locator(".rolecounts li.on");
  await expect(legal).toContainText(/Legal: [\d,]+ items awaiting/, { timeout: 30_000 });
  const n = (/: ([\d,]+) items awaiting/.exec((await legal.textContent())!)![1]);
  await expect(page.locator(".inbox-definition")).toContainText("immigration status");
  await expect(page.locator(".inbox-definition")).toContainText(`${n} items in all`);
  await expect(page.locator(".shown-count")).toContainText(`Showing ${n} items`);
  await page.locator("details.allroles summary").click();
  await expect(page.locator('tr[data-role="Legal"] td.num').nth(1)).toHaveText(n);

  // A filter narrows the list and is kept in the address.
  await page.locator(".inbox-filters label", { hasText: "Cites unverified text" }).locator("input").check();
  await expect(page).toHaveURL(/unverified=1/);
  await expect(page.locator("article.inbox-row .flag.unverified").first()).toBeVisible();
});

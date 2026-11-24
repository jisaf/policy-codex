import { expect, test, type Page } from "@playwright/test";

/* The focused Map on the working tree's Colorado volume: centred on the $90
 * Colorado Works disregard it shows the Colorado Works rules that read it
 * (not Medicaid), finds the path to the grant step by step, goes a step
 * deeper, and stays readable (no text under 12px); on a phone the same map
 * is indented lists with the same expand controls. */

async function smallestText(page: Page): Promise<number> {
  return page.locator("section.mapview").evaluate((root) => {
    let min = Infinity;
    for (const el of root.querySelectorAll("*")) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
      if (!own || !(el as HTMLElement).offsetWidth) continue;
      min = Math.min(min, parseFloat(getComputedStyle(el).fontSize));
    }
    return min;
  });
}

test("the $90 disregard's map: its readers, the path to the grant, a step deeper", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });
  await page.goto("/#/co/map?center=CO-273");
  const view = page.locator("section.mapview");
  await expect(view.locator(".mcenter")).toContainText("earned income disregard", { timeout: 30_000 });

  // Depth 1: the centre and the five Colorado Works rules that read it.
  const boxes = view.locator(".mapcanvas .mnode");
  await expect(boxes).toHaveCount(6);
  await expect(view.locator('.mapcol[data-col="down-r1"] .mnode')).toHaveCount(5);
  await expect(view.locator(".mapcanvas .mnode", { hasText: "Medicaid" })).toHaveCount(0);
  await expect(view.locator(".mapedges path").first()).toBeAttached();
  expect(await smallestText(page)).toBeGreaterThanOrEqual(12);

  // The program filter lists the volume's programs.
  await view.locator(".mapprogs summary").click();
  await expect(view.locator(".mapprogs-menu")).toContainText("Colorado Works");
  await expect(view.locator(".mapprogs-menu")).toContainText("Adult Financial");
  await view.locator(".mapprogs summary").click();

  // How does it reach the grant? Numbered steps, the path highlighted.
  await view.locator(".pathfinder select").selectOption({ label: "Colorado Works: basic cash assistance grant amount" });
  const steps = view.locator(".mapsteps ol li");
  await expect(steps).toHaveCount(4);
  await expect(steps.last()).toContainText("basic cash assistance grant amount");
  await expect(view.locator('.mnode.onpath[data-id="CO-914"]')).toBeVisible();
  await expect(page).toHaveURL(/to=cw_grant_amount/);

  // Click a box to show its next step.
  const expandable = view.locator(".mnode:not(.onpath) button.mmain[aria-expanded=false]").first();
  const before = await boxes.count();
  await expandable.click();
  await expect(page).toHaveURL(/expand=/);
  await expect.poll(() => boxes.count()).toBeGreaterThan(before);

  // Re-centre on a reader.
  await view.locator('.mnode[data-id="CO-923"] button.linkish', { hasText: "Centre here" }).click();
  await expect(view.locator(".mcenter")).toHaveAttribute("data-id", "CO-923");
});

test("on a phone the program's map is indented lists with the same controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { localStorage.setItem("codex.tour", "1"); });
  await page.goto("/#/co/map?center=program:ColoradoWorks");
  const view = page.locator("section.mapview");
  await expect(view.locator(".maplists")).toBeVisible({ timeout: 30_000 });
  await expect(view.locator(".mapcanvas")).toHaveCount(0);

  const outcomes = view.locator('.tside[data-side="up"] > .ttree > .tgroup > ul > li.trow');
  await expect(outcomes).toHaveCount(8);
  await view.locator(".tside .mmore", { hasText: "+16 more outcomes" }).click();
  await expect(outcomes).toHaveCount(24);

  // Open one outcome's reads in place.
  const grant = view.locator('li.trow[data-id="CO-914"]');
  await grant.locator("> .trowhead button.tmain").click();
  await expect(grant.locator("> ul.tchildren li.trow").first()).toBeVisible();
  expect(await smallestText(page)).toBeGreaterThanOrEqual(12);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

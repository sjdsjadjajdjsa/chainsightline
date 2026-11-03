import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const out = new URL("../screenshots/", import.meta.url).pathname;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const width of [390, 1440, 3440]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(process.env.CHAINSIGHTLINE_URL ?? "http://127.0.0.1:3000", { waitUntil: "networkidle" });
  await page.screenshot({ path: out + "dark-" + width + ".png", fullPage: true });
  const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
  if (overflow.width > overflow.viewport) throw new Error("Horizontal overflow at " + width + ": " + JSON.stringify(overflow));
  if (width === 1440) {
    await page.getByRole("button", { name: "Use light theme" }).click();
    await page.screenshot({ path: out + "light-" + width + ".png", fullPage: true });
    await page.getByRole("button", { name: "Use dark theme" }).click();
    await page.getByRole("button", { name: "Try a synthetic example" }).click();
    await page.getByRole("button", { name: "Preview sample" }).click();
    await page.getByRole("button", { name: "Read explanation" }).click();
    await page.getByText("What remains unknown").waitFor();
    await page.getByRole("button", { name: /Approval worth reviewing/ }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Close evidence" }).click();
    await page.getByRole("button", { name: "Graph", exact: true }).click();
    await page.getByRole("img", { name: "Observed transfers between three synthetic addresses" }).waitFor();
  }
  if (errors.length) throw new Error(errors.join(" | "));
  console.log(JSON.stringify({ width, overflow, errors }));
  await page.close();
}
const invalid = await browser.newPage();
await invalid.goto(process.env.CHAINSIGHTLINE_URL ?? "http://127.0.0.1:3000");
await invalid.getByRole("button", { name: "Preview sample" }).click();
await invalid.locator("p[role=alert]").waitFor();
const health = await invalid.request.get((process.env.CHAINSIGHTLINE_URL ?? "http://127.0.0.1:3000") + "/api/health");
if (!health.ok()) throw new Error("Health check failed");
console.log("Browser interaction, validation and health checks passed");
await browser.close();

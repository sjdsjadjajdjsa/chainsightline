import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const base = process.env.CHAINSIGHTLINE_URL ?? "http://127.0.0.1:3000";
const out = fileURLToPath(new URL("../screenshots/", import.meta.url));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
  if (size.width > size.viewport) throw new Error("Horizontal overflow at " + label + ": " + JSON.stringify(size));
}
for (const width of [390, 1440, 3440]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.screenshot({ path: out + "light-" + width + ".png", fullPage: true });
  await noOverflow(page, "light " + width);
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + "dark-" + width + ".png", fullPage: true });
  await noOverflow(page, "dark " + width);
  await page.getByRole("button", { name: "Use light theme" }).click();
  if (width === 1440) {
    await page.getByRole("button", { name: "Use the sample address" }).click();
    await page.getByRole("button", { name: "Open the sample" }).click();
    await page.getByText(/The route below is still the invented example/).waitFor();
    await page.getByRole("button", { name: "Show the evidence" }).nth(2).click();
    const hide = page.getByRole("button", { name: "Hide the evidence" });
    if (await hide.getAttribute("aria-expanded") !== "true") throw new Error("Evidence did not expand");
    await page.locator(".is-open .evidence").waitFor();
    await page.locator(".is-open .evidence").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: out + "open-1440.png" });
    await hide.click();
    await page.locator(".is-open .evidence").waitFor({ state: "hidden" });
  }
  if (errors.length) throw new Error(errors.join(" | "));
  console.log(JSON.stringify({ width, errors }));
  await page.close();
}
const invalid = await browser.newPage();
await invalid.goto(base, { waitUntil: "networkidle" });
await invalid.getByRole("button", { name: "Open the sample" }).click();
await invalid.getByText("Enter an Ethereum address or transaction hash.").waitFor();
await invalid.getByRole("textbox").fill("not-an-address");
await invalid.getByRole("button", { name: "Open the sample" }).click();
await invalid.getByText("Enter a valid Ethereum address or transaction hash").waitFor();
const health = await invalid.request.get(base + "/api/health");
if (!health.ok()) throw new Error("Health check failed");
console.log("Browser interaction, validation and health checks passed");
await browser.close();

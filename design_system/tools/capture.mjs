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
  await page.addInitScript(() => sessionStorage.setItem("chainsightline-intro", "1"));
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
    await page.getByRole("button", { name: "Your keys" }).click();
    await page.getByRole("region", { name: "Your keys" }).waitFor();
    if (await page.getByRole("link", { name: /Get a free dRPC key/ }).getAttribute("href") !== "https://drpc.org/login") throw new Error("dRPC sign-up link missing");
    await page.getByRole("button", { name: "Hide your keys" }).click();
    await page.getByRole("button", { name: "See an invented example" }).click();
    await page.locator(".stamp", { hasText: "An invented example" }).waitFor();
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
const intro = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await intro.goto(base);
await intro.waitForTimeout(800);
await intro.screenshot({ path: out + "intro-1440.png" });
const overlay = intro.locator(".intro-overlay");
if (await overlay.evaluate(element => getComputedStyle(element).pointerEvents) !== "none") throw new Error("Intro blocks clicks");
await intro.waitForTimeout(1400);
if (await overlay.evaluate(element => getComputedStyle(element).visibility) !== "hidden") throw new Error("Intro did not finish");
await intro.reload();
if (await overlay.evaluate(element => getComputedStyle(element).display) !== "none") throw new Error("Intro replayed in the same session");
await intro.goto(base + "/?intro");
if (await overlay.evaluate(element => getComputedStyle(element).display) === "none") throw new Error("?intro did not replay the intro");
const reduced = await browser.newPage({ reducedMotion: "reduce" });
await reduced.goto(base);
if (await reduced.locator(".intro-overlay").evaluate(element => getComputedStyle(element).display) !== "none") throw new Error("Intro shown with reduced motion");
await reduced.getByRole("button", { name: "Use dark theme" }).click();
await reduced.reload();
if (await reduced.evaluate(() => document.documentElement.dataset.theme) !== "dark") throw new Error("Theme not remembered");
console.log("Intro, reduced motion and theme memory checks passed");
const invalid = await browser.newPage();
await invalid.goto(base, { waitUntil: "networkidle" });
await invalid.getByRole("button", { name: "Follow the line" }).click();
await invalid.getByText("Paste an Ethereum transaction hash.").waitFor();
await invalid.getByRole("textbox").fill("not-an-address");
await invalid.getByRole("button", { name: "Follow the line" }).click();
await invalid.getByText("Enter a valid Ethereum address or transaction hash").waitFor();
const health = await invalid.request.get(base + "/api/health");
if (!health.ok()) throw new Error("Health check failed");
if (process.env.CHAINSIGHTLINE_LIVE_TX) {
  const live = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await live.addInitScript(() => sessionStorage.setItem("chainsightline-intro", "1"));
  await live.goto(base, { waitUntil: "networkidle" });
  await live.getByRole("textbox").fill(process.env.CHAINSIGHTLINE_LIVE_TX);
  await live.getByRole("button", { name: "Follow the line" }).click();
  await live.locator(".stamp", { hasText: "Ethereum mainnet, block" }).waitFor({ timeout: 60000 });
  await live.waitForTimeout(800);
  await live.screenshot({ path: out + "live-1440.png", fullPage: true });
  console.log("Live transaction rendered: " + (await live.locator(".trail > li").count() - 2) + " stops");
}
console.log("Browser interaction, validation and health checks passed");
await browser.close();

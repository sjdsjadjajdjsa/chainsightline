import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";
const assets = fileURLToPath(new URL("../../docs/assets/", import.meta.url));
const base = process.env.CHAINSIGHTLINE_URL ?? "http://127.0.0.1:3000";
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Source+Serif+4:ital,wght@0,500;0,600;1,400&display=block">';
const banner = `<!doctype html><html><head>${fonts}<style>
*{margin:0;box-sizing:border-box}body{width:1280px;height:420px;background:#f4f0e6;color:#1d2928;font-family:"DM Sans",sans-serif;position:relative;overflow:hidden}
.mark{position:absolute;left:88px;top:70px;width:40px;height:132px}.mark i{position:absolute;left:18px;top:8px;width:4px;height:116px;background:#21685c;border-radius:2px}.mark b{position:absolute;left:8px;width:24px;height:24px;border-radius:50%;border:4px solid #21685c;background:#f4f0e6}
h1{position:absolute;left:160px;top:62px;font-family:"Source Serif 4",serif;font-weight:600;font-size:76px;letter-spacing:-1.5px}
p{position:absolute;left:162px;top:160px;font-family:"Source Serif 4",serif;font-style:italic;font-size:30px;color:#55615c}
.route{position:absolute;left:88px;right:88px;top:300px;height:4px;background:#21685c;border-radius:2px}
.stop{position:absolute;top:288px;width:28px;height:28px;border-radius:50%;border:4px solid #21685c;background:#f4f0e6}.start{background:#21685c;box-shadow:inset 0 0 0 4px #f4f0e6}.warn{border-color:#9a4f17}
.end{position:absolute;top:286px;left:1180px;width:12px;height:32px;border-radius:3px;background:#1d2928}
.label{position:absolute;top:330px;font-size:17px;color:#55615c;white-space:nowrap}.label strong{display:block;color:#1d2928;font-weight:600;font-size:18px}
</style></head><body>
<div class="mark"><i></i><b style="top:0"></b><b style="top:54px"></b><b style="top:108px"></b></div>
<h1>ChainSightline</h1><p>Follow the line. Every investigation, one stop at a time.</p>
<div class="route"></div>
<div class="stop start" style="left:80px"></div><div class="stop" style="left:350px"></div><div class="stop" style="left:620px"></div><div class="stop warn" style="left:890px"></div><div class="end"></div>
<div class="label" style="left:80px"><strong>Starting point</strong>The subject</div>
<div class="label" style="left:350px"><strong>0.42 ETH</strong>left the subject</div>
<div class="label" style="left:620px"><strong>125.00 USDC</strong>arrived back</div>
<div class="label" style="left:890px"><strong style="color:#9a4f17">Unlimited approval</strong>worth reviewing</div>
<div class="label" style="left:1070px;text-align:right;width:122px"><strong>The end</strong>of the evidence</div>
</body></html>`;
const { renderRoute } = await tsImport("../../packages/cli/src/main.ts", import.meta.url);
const { sampleInvestigation } = await tsImport("../../packages/core/src/sample.ts", import.meta.url);
const ansi = renderRoute(sampleInvestigation, { color: true, columns: 84, evidence: false, entered: "0x" + "ab".repeat(20) });
const colors = { "36": "#69c3aa", "1;36": "#69c3aa;font-weight:700", "1;35": "#c2a1e8;font-weight:700", "1;34": "#8eb6ec;font-weight:700", "33": "#eaa96a", "2": "#8b9690", "1": "#e6ebe5;font-weight:700" };
const escape = text => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const html = escape(ansi).replace(/\u001b\[([\d;]+)m([\s\S]*?)\u001b\[0m/g, (_, code, text) => '<span style="color:' + (colors[code] ?? "inherit") + '">' + text + "</span>");
const terminal = `<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=block"><style>
*{margin:0;box-sizing:border-box}body{background:#f4f0e6;padding:28px;width:960px}.window{background:#121a1b;border-radius:12px;overflow:hidden;box-shadow:0 18px 40px #1d292833}.bar{height:36px;display:flex;align-items:center;gap:8px;padding:0 16px;background:#1b2526}.bar i{width:12px;height:12px;border-radius:50%;background:#3a4846}.bar span{margin-left:12px;font:13px "JetBrains Mono",monospace;color:#8b9690}
pre{padding:8px 24px 24px;font:15px/1.55 "JetBrains Mono",monospace;color:#e6ebe5;white-space:pre}
</style></head><body><div class="window"><div class="bar"><i></i><i></i><i></i><span>chainsightline trace 0xabab…abab</span></div><pre>${html}</pre></div></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 420 }, deviceScaleFactor: 2 });
await page.setContent(banner, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: assets + "chainsightline-banner.png" });
const term = await browser.newPage({ viewport: { width: 960, height: 800 }, deviceScaleFactor: 2 });
await term.setContent(terminal, { waitUntil: "networkidle" });
await term.evaluate(() => document.fonts.ready);
await term.locator("body").screenshot({ path: assets + "cli.png" });
for (const theme of ["light", "dark"]) {
  const site = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  await site.addInitScript(value => { sessionStorage.setItem("chainsightline-intro", "1"); localStorage.setItem("chainsightline-theme", value); }, theme);
  await site.goto(base, { waitUntil: "networkidle" });
  await site.locator(".route-header").evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY - 24));
  await site.screenshot({ path: assets + "route-" + theme + ".png" });
}
await browser.close();
console.log("README assets written to docs/assets");

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { type Investigation } from "../../core/src/investigation";
import { sampleInvestigation } from "../../core/src/sample";
import { asSentence, describeMovement, evidenceSummary, kindName, roleName, roleOf, routeTitle, shortHash, type Role } from "../../core/src/route";
export const version = "0.1.0";
const root = fileURLToPath(new URL("../../../", import.meta.url));
export type Io = { out: (text: string) => void; err: (text: string) => void; color: boolean; columns: number };
const defaultIo = (): Io => ({
  out: text => process.stdout.write(text + "\n"),
  err: text => process.stderr.write(text + "\n"),
  color: Boolean(process.stdout.isTTY) && !("NO_COLOR" in process.env),
  columns: process.stdout.columns ?? 80,
});
function paint(color: boolean) {
  const style = (code: string) => (text: string) => color ? "\u001b[" + code + "m" + text + "\u001b[0m" : text;
  return { line: style("36"), subject: style("1;36"), counterparty: style("1;35"), spender: style("1;34"), warn: style("33"), dim: style("2"), bold: style("1") };
}
function wrap(text: string, width: number) {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (current && (current + " " + word).length > width) { lines.push(current); current = word; }
    else current = current ? current + " " + word : word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
export function renderRoute(investigation: Investigation, options: { color: boolean; columns: number; evidence: boolean; entered?: string }) {
  const p = paint(options.color);
  const width = Math.max(40, Math.min(options.columns, 96) - 8);
  const rail = p.line("│");
  const lines: string[] = [];
  const onRail = (text: string, style: (text: string) => string = value => value, indent = "") => wrap(text, width - indent.length).forEach(line => lines.push("  " + rail + "  " + indent + style(line)));
  const address = (value: string) => { const role: Role = roleOf(value, investigation); return p.dim(roleName[role]) + " " + p[role](shortHash(value)); };
  lines.push("", "  " + p.bold("ChainSightline") + "  " + p.dim("follow the line"), "");
  lines.push("  " + p.bold(routeTitle(investigation.movements.length)));
  if (investigation.synthetic) wrap("An invented example. ChainSightline is not connected to Ethereum yet.", width + 3).forEach(line => lines.push("  " + p.warn(line)));
  if (options.entered) wrap("You entered " + shortHash(options.entered) + ". The route below is still the invented example, not evidence about it.", width + 3).forEach(line => lines.push("  " + p.dim(line)));
  lines.push("");
  lines.push("  " + p.line("◉") + "  " + p.dim("Starting point"));
  onRail("The subject’s account.", p.bold);
  lines.push("  " + rail + "  " + address(investigation.subject));
  onRail((investigation.synthetic ? "Invented" : "Observed") + " Ethereum-style data at block " + investigation.blockNumber + ". " + asSentence(investigation.coverage.summary), p.dim);
  investigation.movements.forEach((movement, index) => {
    const warning = investigation.warnings.find(item => item.evidenceId === movement.evidenceId);
    const parts = describeMovement(movement, investigation);
    lines.push("  " + rail);
    lines.push("  " + (warning ? p.warn("○") : p.line("○")) + "  " + p.dim("Stop " + (index + 1) + ". " + kindName[movement.kind]));
    onRail(parts.before + parts.amount + parts.after, p.bold);
    lines.push("  " + rail + "  " + address(movement.from) + p.dim(" → ") + address(movement.to));
    if (warning) {
      lines.push("  " + p.line("├") + p.warn("──  ! " + asSentence(warning.title)));
      onRail(warning.reason, p.dim, "    ");
    }
    if (options.evidence) {
      onRail("Evidence " + movement.evidenceId, p.dim, "    ");
      onRail("From " + movement.from, p.dim, "    ");
      onRail("To   " + movement.to, p.dim, "    ");
      onRail(evidenceSummary(movement, investigation.synthetic), p.dim, "    ");
    }
  });
  lines.push("  " + rail);
  lines.push("  " + p.line("━") + "  " + p.dim("End of the line"));
  wrap("Where the evidence ends.", width).forEach(line => lines.push("     " + p.bold(line)));
  wrap(investigation.explanation.uncertainty, width).forEach(line => lines.push("     " + p.dim(line)));
  investigation.coverage.limitations.forEach(item => wrap(asSentence(item), width - 2).forEach((line, index) => lines.push("     " + (index ? "  " : "– ") + line)));
  lines.push("", "  " + p.dim("Read-only. ChainSightline never connects a wallet, signs anything or moves funds."), "");
  return lines.join("\n");
}
const help = `ChainSightline ${version}
Follow the evidence, one stop at a time.

Usage
  chainsightline trace <address or transaction>   Draw the route in your terminal
  chainsightline sample                            Draw the invented example route
  chainsightline web [--port 3000] [--no-open]     Open the website on this computer, no Docker needed

Options
  --evidence       Include full addresses and what each stop shows
  --json           Print the route as JSON instead of drawing it
  --no-color       Plain text output
  --rebuild        With web: rebuild the website before starting it
  -h, --help       Show this help
  -v, --version    Show the version

This preview is not connected to Ethereum yet. Every trace shows the same invented example.`;
function subjectKind(value: string) {
  if (/^0x[0-9a-fA-F]{40}$/.test(value)) return "address";
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) return "transaction";
  return null;
}
function openBrowser(url: string) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "rundll32.exe" : "xdg-open";
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  try { const child = spawn(command, args, { detached: true, stdio: "ignore" }); child.on("error", () => undefined); child.unref(); return true; } catch { return false; }
}
function run(command: string, args: string[]) {
  return new Promise<number>(resolve => { const child = spawn(process.execPath, [command, ...args], { cwd: root, stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } }); child.on("exit", code => resolve(code ?? 1)); });
}
async function web(args: string[], io: Io) {
  const portIndex = args.indexOf("--port");
  const port = portIndex >= 0 ? args[portIndex + 1] ?? "" : process.env.PORT ?? "3000";
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) { io.err("--port must be a number from 1 to 65535."); return 2; }
  const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
  if (args.includes("--rebuild") || !existsSync(root + "apps/web/.next/BUILD_ID")) {
    io.out("Building the ChainSightline website. This takes a few seconds the first time.");
    if (await run(next, ["build", "apps/web"]) !== 0) { io.err("The website could not be built."); return 1; }
  }
  const url = "http://127.0.0.1:" + port;
  const server = spawn(process.execPath, [next, "start", "apps/web", "--hostname", "127.0.0.1", "--port", port], { cwd: root, stdio: ["ignore", "ignore", "inherit"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  const stop = () => server.kill("SIGTERM");
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  const exited = new Promise<number>(resolve => server.on("exit", code => resolve(code ?? 0)));
  let ready = false;
  for (let attempt = 0; attempt < 60 && server.exitCode === null; attempt++) {
    try { if ((await fetch(url + "/api/health")).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) { stop(); io.err("ChainSightline did not start. Is port " + port + " already in use? Try --port 3001."); await exited; return 1; }
  io.out("ChainSightline is open at " + url);
  io.out("Press Ctrl+C to stop it.");
  if (!args.includes("--no-open") && !openBrowser(url)) io.out("Open " + url + " in your browser.");
  await exited;
  return 0;
}
export async function main(argv: string[], io: Io = defaultIo()) {
  const flags = new Set(argv.filter(arg => arg.startsWith("-")));
  const positional = argv.filter((arg, index) => !arg.startsWith("-") && argv[index - 1] !== "--port");
  const color = io.color && !flags.has("--no-color");
  const [command, value] = positional;
  if (flags.has("-v") || flags.has("--version")) { io.out(version); return 0; }
  if (!command || flags.has("-h") || flags.has("--help") || command === "help") { io.out(help); return 0; }
  if (command === "web") return web(argv, io);
  if (command !== "trace" && command !== "sample") { io.err("Unknown command \"" + command + "\". Run chainsightline --help."); return 2; }
  let entered: string | undefined;
  if (command === "trace") {
    if (!value) { io.err("Paste an Ethereum address or transaction hash after trace, for example:\n  chainsightline trace " + sampleInvestigation.subject); return 2; }
    if (!subjectKind(value)) { io.err("That doesn’t look like an Ethereum address (0x and 40 hex characters) or a transaction hash (0x and 64 hex characters)."); return 2; }
    entered = value;
  }
  if (flags.has("--json")) { io.out(JSON.stringify({ entered: entered ?? null, ...sampleInvestigation }, null, 2)); return 0; }
  io.out(renderRoute(sampleInvestigation, { color, columns: io.columns, evidence: flags.has("--evidence"), ...(entered ? { entered } : {}) }));
  return 0;
}

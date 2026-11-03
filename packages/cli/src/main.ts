import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { extractKey, keyLabel, keyNames, keysFile, resolveKeys, saveKey, type KeyName } from "../../chain/src/config";
import { investigate } from "../../chain/src/investigate";
import { ChainError, checkKey } from "../../chain/src/rpc";
import { type Investigation } from "../../core/src/investigation";
import { sampleInvestigation } from "../../core/src/sample";
import { asSentence, describeMovement, etherscanAddress, etherscanTx, evidenceSummary, kindName, lookalikeAddresses, nameOf, nameSource, revokeUrl, roleName, roleOf, routeTitle, shortHash, type Role } from "../../core/src/route";
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
const unsafe = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g;
function sanitize<T>(value: T): T {
  if (typeof value === "string") return value.replace(unsafe, "") as T;
  if (Array.isArray(value)) return value.map(sanitize) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)])) as T;
  return value;
}
export function renderRoute(input: Investigation, options: { color: boolean; columns: number; evidence: boolean }) {
  const investigation = sanitize(input);
  const p = paint(options.color);
  const width = Math.max(40, Math.min(options.columns, 96) - 8);
  const rail = p.line("│");
  const lines: string[] = [];
  const onRail = (text: string, style: (text: string) => string = value => value, indent = "") => wrap(text, width - indent.length).forEach(line => lines.push("  " + rail + "  " + indent + style(line)));
  const twins = lookalikeAddresses(investigation);
  const address = (value: string) => { const role: Role = roleOf(value, investigation); const name = nameOf(value, investigation); const hash = twins.has(value) ? value : shortHash(value); if (name && nameSource(value, investigation) === "known") return p.dim(roleName[role]) + " " + p[role](name) + " " + p.dim(hash); return p.dim(roleName[role]) + " " + p[role](hash) + (name ? " " + p.dim(name + " (ENS)") : ""); };
  lines.push("", "  " + p.bold("ChainSightline") + "  " + p.dim("follow the line"), "");
  lines.push("  " + p.bold(routeTitle(investigation.movements.length)));
  if (investigation.synthetic) wrap("An invented example, not real Ethereum data.", width + 3).forEach(line => lines.push("  " + p.warn(line)));
  else wrap("Ethereum mainnet, block " + investigation.blockNumber + ". Read from " + investigation.source + ".", width + 3).forEach(line => lines.push("  " + p.dim(line)));
  lines.push("");
  lines.push("  " + p.line("◉") + "  " + p.dim("Starting point"));
  onRail(investigation.kind === "address" ? "The address you asked about." : "The subject’s account.", p.bold);
  lines.push("  " + rail + "  " + address(investigation.subject));
  if (investigation.transactionHash) lines.push("  " + rail + "  " + p.dim(etherscanTx(investigation.transactionHash)));
  else if (!investigation.synthetic) lines.push("  " + rail + "  " + p.dim(etherscanAddress(investigation.subject)));
  onRail(investigation.synthetic ? "Invented Ethereum-style data at block " + investigation.blockNumber + ". " + asSentence(investigation.coverage.summary) : investigation.explanation.summary, p.dim);
  investigation.movements.forEach((movement, index) => {
    const notes = investigation.warnings.filter(item => item.evidenceId === movement.evidenceId);
    const warning = notes[0];
    const txHash = movement.transactionHash ?? investigation.transactionHash;
    const parts = describeMovement(movement, investigation);
    lines.push("  " + rail);
    lines.push("  " + (warning ? p.warn("○") : p.line("○")) + "  " + p.dim("Stop " + (index + 1) + ". " + kindName[movement.kind]));
    onRail(parts.before + parts.amount + (movement.usd ? " (" + movement.usd + (investigation.prices ? " " + investigation.prices.basis : "") + ")" : "") + parts.after, p.bold);
    lines.push("  " + rail + "  " + address(movement.from) + p.dim(" → ") + address(movement.to));
    for (const note of notes) {
      lines.push("  " + p.line("├") + p.warn("──  ! " + asSentence(note.title)));
      onRail(note.reason, p.dim, "    ");
      if (!investigation.synthetic && movement.kind === "approval" && note === warning) lines.push("  " + rail + "      " + p.dim("Check or revoke: " + revokeUrl(movement.from)));
    }
    if (options.evidence) {
      onRail("Evidence " + movement.evidenceId, p.dim, "    ");
      if (!investigation.synthetic && txHash) lines.push("  " + rail + "      " + p.dim(etherscanTx(txHash)));
      onRail("From " + movement.from, p.dim, "    ");
      onRail("To   " + movement.to, p.dim, "    ");
      if (movement.assetAddress) lines.push("  " + rail + "      " + p.dim("Token " + movement.assetAddress));
      if (movement.rawAmount) onRail("Exact amount " + movement.rawAmount, p.dim, "    ");
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
  chainsightline trace <transaction or address>   Draw the route in your terminal
  chainsightline sample                            Draw the invented example route
  chainsightline web [--port 3000] [--no-open]     Open the website on this computer, no Docker needed
  chainsightline setup                             Add your own free dRPC or Alchemy keys
  chainsightline keys [remove drpc|alchemy]        See or remove your saved keys

Options
  --evidence       Include full addresses, exact amounts and evidence references
  --json           Print the route as JSON instead of drawing it
  --no-color       Plain text output
  --rebuild        With web: rebuild the website before starting it
  -h, --help       Show this help
  -v, --version    Show the version

Transactions work without any keys. Address history needs a free Alchemy key.`;
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
export type Deps = { investigate: typeof investigate; resolveKeys: typeof resolveKeys; saveKey: typeof saveKey; checkKey: typeof checkKey; ask: (question: string, secret?: boolean) => Promise<string> };
async function ask(question: string, secret = false) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  const writer = rl as unknown as { _writeToOutput?: (text: string) => void; output?: NodeJS.WritableStream };
  if (secret && process.stdin.isTTY) {
    let prompted = false;
    writer._writeToOutput = (text: string) => { if (!prompted) { process.stdout.write(text); prompted = true; } else if (text.includes("\n")) process.stdout.write("\n"); else process.stdout.write("•".repeat(Math.min(text.length, 1))); };
  }
  try { return await rl.question(question); } finally { rl.close(); }
}
const defaultDeps = (): Deps => ({ investigate, resolveKeys, saveKey, checkKey, ask });
const signup: Record<KeyName, { purpose: string; steps: string }> = {
  drpc: { purpose: "faster, more reliable transaction lookups", steps: "Sign in at https://drpc.org/login, create a key, open its Settings tab and copy the key." },
  alchemy: { purpose: "address history", steps: "Sign up at https://www.alchemy.com, create an app for Ethereum and copy its API key." },
};
const sourceText = (source: string | undefined) => source === "environment" ? "set in your .env file" : source === "saved" ? "saved" : "not set";
async function setup(io: Io, deps: Deps) {
  const { sources } = await deps.resolveKeys();
  io.out("");
  io.out("ChainSightline works without any keys. Your own free keys make it faster and unlock more.");
  for (const [index, name] of keyNames.entries()) {
    io.out("");
    io.out((index + 1) + ". " + keyLabel[name] + " key, for " + signup[name].purpose + ". Currently " + sourceText(sources[name]) + ".");
    if (sources[name] === "environment") { io.out("   It comes from your .env file, so change it there."); continue; }
    io.out("   " + signup[name].steps);
    for (let attempt = 0; attempt < 3; attempt++) {
      const answer = (await deps.ask("   Paste your " + keyLabel[name] + " key or its link, or press Enter to " + (sources[name] ? "keep the current one" : "skip") + ": ", true)).trim();
      if (!answer) break;
      const key = extractKey(name, answer);
      if (!key) { io.err("   That doesn’t look like a " + keyLabel[name] + " key. Paste the key itself or the link that contains it."); continue; }
      io.out("   Checking it with " + keyLabel[name] + "…");
      const check = await deps.checkKey(name, key);
      if (!check.ok) { io.err("   " + check.message); continue; }
      await deps.saveKey(name, key);
      io.out("   Saved.");
      break;
    }
  }
  io.out("");
  io.out("Keys are saved only on this computer, in " + keysFile() + ".");
  io.out("Try it: chainsightline trace <transaction hash>");
  return 0;
}
async function keys(args: string[], io: Io, deps: Deps) {
  if (args[0] === "remove") {
    const name = args[1] as KeyName;
    if (!keyNames.includes(name)) { io.err("Say which key to remove: chainsightline keys remove drpc, or chainsightline keys remove alchemy."); return 2; }
    const { sources } = await deps.resolveKeys();
    if (sources[name] === "environment") { io.err("That key comes from your .env file. Remove it there."); return 1; }
    await deps.saveKey(name, null);
    io.out(keyLabel[name] + " key removed.");
    return 0;
  }
  const { sources } = await deps.resolveKeys();
  io.out("");
  for (const name of keyNames) io.out("  " + keyLabel[name].padEnd(9) + sourceText(sources[name]).padEnd(24) + (sources[name] ? "" : name === "drpc" ? "free public access is used instead" : "needed for address history"));
  io.out("");
  io.out("  Keys file: " + keysFile());
  io.out("  Add or change keys with: chainsightline setup");
  io.out("");
  return 0;
}
export async function main(argv: string[], io: Io = defaultIo(), deps: Deps = defaultDeps()) {
  const flags = new Set(argv.filter(arg => arg.startsWith("-")));
  const positional = argv.filter((arg, index) => !arg.startsWith("-") && argv[index - 1] !== "--port");
  const color = io.color && !flags.has("--no-color");
  const [command, value] = positional;
  if (flags.has("-v") || flags.has("--version")) { io.out(version); return 0; }
  if (!command || flags.has("-h") || flags.has("--help") || command === "help") { io.out(help); return 0; }
  if (command === "web") return web(argv, io);
  if (command === "setup") return setup(io, deps);
  if (command === "keys") return keys(positional.slice(1), io, deps);
  if (command !== "trace" && command !== "sample") { io.err("Unknown command \"" + command + "\". Run chainsightline --help."); return 2; }
  let investigation: Investigation = sampleInvestigation;
  if (command === "trace") {
    if (!value) { io.err("Paste a transaction hash or address after trace, for example:\n  chainsightline trace 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060"); return 2; }
    const kind = subjectKind(value);
    if (!kind) { io.err("That doesn’t look like an Ethereum transaction hash (0x and 64 hex characters) or address (0x and 40 hex characters)."); return 2; }
    if (!flags.has("--json")) io.err("Reading Ethereum…");
    try { investigation = await deps.investigate(kind, value); }
    catch (error) {
      io.err(error instanceof Error ? error.message : "Ethereum could not be read.");
      if (error instanceof ChainError && error.kind === "needs-key") io.err("Run chainsightline setup to add one.");
      return 1;
    }
  }
  if (flags.has("--json")) { io.out(JSON.stringify(investigation, null, 2)); return 0; }
  io.out(renderRoute(investigation, { color, columns: io.columns, evidence: flags.has("--evidence") }));
  return 0;
}

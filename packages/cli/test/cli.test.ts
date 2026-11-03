import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type { Investigation } from "../../core/src/investigation.js";
import { investigationSchema } from "../../core/src/investigation.js";
import { sampleInvestigation } from "../../core/src/sample.js";
import { ChainError } from "../../chain/src/rpc.js";
import { main, version, type Deps } from "../src/main.js";
const live: Investigation = { ...sampleInvestigation, id: "tx-live", synthetic: false, kind: "transaction", transactionHash: "0x" + "a".repeat(64), status: "success", source: "dRPC free public access", explanation: { ...sampleInvestigation.explanation, summary: "The subject sent this transaction. It produced 3 movements." } };
function fakeDeps(overrides: Partial<Deps> = {}) {
  const saved: Record<string, string | null> = {};
  const deps: Deps = {
    investigate: async () => live,
    checkBeforeSend: async (recipient, from) => ({ ...live, id: "check", kind: "check", subject: recipient, ...(from ? { from } : {}), movements: [], warnings: [], checks: [{ id: "account", status: "review", title: "This is a token contract", detail: "Tokens sent here are lost." }, { id: "history", status: "ok", title: "No lookalikes in your history", detail: "None match." }] }),
    checkup: async address => ({ ...live, id: "checkup", kind: "checkup", subject: address }),
    explain: async () => ({ summary: "The subject sent ETH (stop-1).", uncertainty: "Ownership is unknown.", citations: ["stop-1"], model: "moonshotai/kimi-k3.1-pro", provider: "Moonshot AI", costUsd: 0.0087 }),
    resolveKeys: async () => ({ keys: {}, sources: {} }),
    saveKey: async (name, value) => { saved[name] = value; },
    checkKey: async (_name, value) => value.startsWith("good") ? { ok: true } : { ok: false, message: "That key didn’t work" },
    ask: async () => "",
    ...overrides,
  };
  return { deps, saved };
}
const capture = async (args: string[], deps = fakeDeps().deps) => {
  const out: string[] = [];
  const err: string[] = [];
  const code = await main(args, { out: text => out.push(text), err: text => err.push(text), color: false, columns: 80 }, deps);
  return { code, out: out.join("\n"), err: err.join("\n") };
};
test("draws the sample route", async () => {
  const result = await capture(["sample"]);
  assert.equal(result.code, 0);
  for (const text of ["Three movements, one line.", "0.42 ETH left the subject.", "125.00 USDC arrived at the subject.", "! Approval worth reviewing.", "Where the evidence ends.", "An invented example"]) assert.ok(result.out.includes(text), text);
  assert.ok(!result.out.includes("\u001b["));
});
test("traces real data with its source and no sample warning", async () => {
  let asked: unknown[] = [];
  const result = await capture(["trace", "0x" + "a".repeat(64)], fakeDeps({ investigate: async (...args) => { asked = args; return live; } }).deps);
  assert.equal(result.code, 0);
  assert.deepEqual(asked, ["transaction", "0x" + "a".repeat(64)]);
  assert.ok(result.out.includes("Read from dRPC free public access."));
  assert.ok(result.out.includes("https://etherscan.io/tx/0x" + "a".repeat(64)));
  assert.ok(!result.out.includes("An invented example"));
});
test("strips terminal control sequences from chain data", async () => {
  const hostile: Investigation = { ...live, movements: live.movements.map(movement => ({ ...movement, asset: "\u001b[2J\u202eUSDC" })) };
  const result = await capture(["trace", "0x" + "a".repeat(64)], fakeDeps({ investigate: async () => hostile }).deps);
  assert.ok(!result.out.includes("\u001b"));
  assert.ok(!result.out.includes("\u202e"));
  assert.ok(result.out.includes("[2JUSDC"));
});
test("explains when address history needs a key", async () => {
  const result = await capture(["trace", "0x" + "ab".repeat(20)], fakeDeps({ investigate: async () => { throw new ChainError("needs-key", "Address history needs a free Alchemy key."); } }).deps);
  assert.equal(result.code, 1);
  assert.ok(result.err.includes("Address history needs a free Alchemy key."));
  assert.ok(result.err.includes("chainsightline setup"));
});
test("rejects malformed input and unknown commands", async () => {
  assert.equal((await capture(["trace", "0x123"])).code, 2);
  assert.equal((await capture(["trace"])).code, 2);
  assert.equal((await capture(["scan"])).code, 2);
  assert.equal((await capture(["web", "--port", "99999"])).code, 2);
  assert.equal((await capture(["keys", "remove", "nothing"])).code, 2);
});
test("prints valid JSON", async () => {
  const result = await capture(["trace", "0x" + "a".repeat(64), "--json"]);
  assert.ok(investigationSchema.safeParse(JSON.parse(result.out)).success);
});
test("setup checks keys, accepts pasted links and saves them", async () => {
  const answers = ["bad-key-value", "https://lb.drpc.org/ogrpc?network=ethereum&dkey=good_drpc_key", ""];
  const { deps, saved } = fakeDeps({ ask: async () => answers.shift() ?? "" });
  const result = await capture(["setup"], deps);
  assert.equal(result.code, 0);
  assert.ok(result.err.includes("That key didn’t work"));
  assert.equal(saved.drpc, "good_drpc_key");
  assert.equal("alchemy" in saved, false);
  assert.ok(result.out.includes("https://drpc.org/login"));
});
test("keys shows status and removes saved keys", async () => {
  const { deps, saved } = fakeDeps({ resolveKeys: async () => ({ keys: { drpc: "x" }, sources: { drpc: "saved" } }) });
  const status = await capture(["keys"], deps);
  assert.match(status.out, /dRPC\s+saved/);
  assert.match(status.out, /Alchemy\s+not set\s+needed for address history/);
  assert.equal((await capture(["keys", "remove", "drpc"], deps)).code, 0);
  assert.equal(saved.drpc, null);
});
test("checks an address before sending and prints the checks", async () => {
  const result = await capture(["check", "0x" + "cd".repeat(20), "--from", "0x" + "ef".repeat(20)]);
  assert.equal(result.code, 0);
  for (const text of ["1 thing to check before you send.", "The address you’re about to pay.", "Compared with", "Check 1. Look closer", "This is a token contract.", "Check 2. Looks fine"]) assert.ok(result.out.includes(text), text);
  assert.equal((await capture(["check", "0x123"])).code, 2);
  assert.equal((await capture(["check", "0x" + "cd".repeat(20), "--from", "nope"])).code, 2);
});
test("runs a wallet checkup and adds an AI explanation on request", async () => {
  const result = await capture(["checkup", "0x" + "cd".repeat(20), "--explain"]);
  assert.equal(result.code, 0);
  assert.ok(result.out.includes("Your wallet."));
  assert.ok(result.out.includes("AI explanation"));
  assert.ok(result.out.includes("The subject sent ETH (stop-1)."));
  assert.ok(result.out.includes("moonshotai/kimi-k3.1-pro"));
  const json = JSON.parse((await capture(["trace", "0x" + "a".repeat(64), "--json", "--explain"])).out);
  assert.equal(json.aiExplanation.citations[0], "stop-1");
});
test("prints MCP settings for AI apps", async () => {
  const result = await capture(["mcp", "--print-config"]);
  const config = JSON.parse(result.out.slice(0, result.out.indexOf("\n\n")));
  assert.deepEqual(config.mcpServers.chainsightline.args.slice(-1), ["mcp"]);
});
test("shows evidence, help and version", async () => {
  assert.ok((await capture(["sample", "--evidence"])).out.includes("From 0x1111111111111111111111111111111111111111"));
  assert.ok((await capture(["--help"])).out.includes("chainsightline setup"));
  assert.equal((await capture(["--version"])).out, version);
});
test("runs through the real command entry point", () => {
  const bin = fileURLToPath(new URL("../../../bin/chainsightline.mjs", import.meta.url));
  const output = execFileSync(process.execPath, [bin, "sample", "--no-color"], { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  assert.ok(output.includes("0.42 ETH left the subject."));
});

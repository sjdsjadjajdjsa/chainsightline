import assert from "node:assert/strict";
import { test } from "node:test";
import { evidenceSummary } from "../../core/src/route.js";
import { checkRecipient } from "../src/check.js";
import { UNLIMITED } from "../src/format.js";
import { createRpc, providersFor } from "../src/rpc.js";
const you = "0x" + "aa".repeat(20);
const friend = "0x9876bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb5555";
const poisoner = "0x9876cccccccccccccccccccccccccccccccc5555";
const scammer = "0x" + "dd".repeat(20);
const hash = (n: number) => "0x" + n.toString(16).padStart(64, "0");
const transfer = (n: number, from: string, to: string, category: string) => ({ uniqueId: hash(n) + ":" + category, blockNum: "0x" + n.toString(16), hash: hash(n), from, to, value: 1, asset: "USDT", category, rawContract: { value: "0x1", address: "0x" + "ee".repeat(20), decimal: "0x6" } });
function rpcFor(code: string, nonce: string, history: { sent: object[]; received: object[] }) {
  return createRpc(providersFor({ alchemy: "alchemykey123" }), (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    const result = body.method === "eth_getCode" ? code : body.method === "eth_getTransactionCount" ? nonce : body.method === "eth_getBalance" ? "0x0" : body.method === "eth_getBlockByNumber" ? { hash: "0x" + "ab".repeat(32), number: "0x100", timestamp: "0x65000000" } : body.method === "eth_getTransactionByHash" ? { from: body.params[0] === hash(2) ? scammer : you } : body.method === "eth_call" ? null : body.params[0].fromAddress ? { transfers: history.sent } : { transfers: history.received };
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
  }) as typeof fetch);
}
const statuses = (checks: { status: string; title: string }[] | undefined) => (checks ?? []).map(check => check.status + ": " + check.title);
test("a fake token transfer to a lookalike does not count as a past payment", async () => {
  const history = { sent: [transfer(1, you, friend, "external"), transfer(2, you, poisoner, "erc20")], received: [] };
  const result = await checkRecipient(poisoner, you, rpcFor("0x", "0x3", history));
  const checks = statuses(result.checks);
  assert.ok(checks.includes("review: Likely address poisoning"), checks.join(" | "));
  assert.ok(!checks.some(check => check.includes("You’ve paid this address before")));
  assert.deepEqual(result.movements.map(movement => movement.to), [friend]);
});
test("a real past payment is recognised and a fresh address is flagged", async () => {
  const known = await checkRecipient(friend, you, rpcFor("0x", "0x3", { sent: [transfer(1, you, friend, "external")], received: [] }));
  assert.ok(statuses(known.checks).includes("ok: You’ve paid this address before"));
  const fresh = await checkRecipient("0x" + "12".repeat(20), null, rpcFor("0x", "0x0", { sent: [], received: [] }));
  assert.ok(statuses(fresh.checks).includes("review: Never used"));
  assert.ok(statuses(fresh.checks).includes("unknown: Not compared with your history"));
});
test("contracts are not judged by their transaction count", async () => {
  const result = await checkRecipient("0x" + "34".repeat(20), null, rpcFor("0x6080", "0x1", { sent: [], received: [] }));
  const checks = statuses(result.checks);
  assert.ok(checks.includes("unknown: This is a smart contract"));
  assert.ok(checks.includes("unknown: Holds no ETH"));
  assert.ok(!checks.some(check => check.includes("In use")));
});
test("treats very large allowances as unlimited and describes live allowances correctly", () => {
  assert.ok(2n ** 96n - 1n >= UNLIMITED);
  assert.ok(10n ** 24n < UNLIMITED);
  assert.match(evidenceSummary({ id: "a", kind: "approval", from: you, to: friend, asset: "UNI", amount: "Unlimited", description: "Active token approval", evidenceId: "x" }, false), /current allowance/);
});

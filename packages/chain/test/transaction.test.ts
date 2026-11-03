import assert from "node:assert/strict";
import { test } from "node:test";
import { investigationSchema } from "../../core/src/investigation.js";
import { investigateAddress } from "../src/address.js";
import { formatUnits, decodeText } from "../src/format.js";
import { ChainError, createRpc, providersFor } from "../src/rpc.js";
import { investigateTransaction } from "../src/transaction.js";
const word = (hex: string) => hex.replace(/^0x/, "").padStart(64, "0");
const topic = (address: string) => "0x" + word(address);
const sender = "0x" + "aa".repeat(20);
const router = "0x" + "bb".repeat(20);
const token = "0x" + "cc".repeat(20);
const pool = "0x" + "dd".repeat(20);
const hash = "0x" + "12".repeat(32);
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const APPROVAL = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
const symbolData = "0x" + word("20") + word("4") + Buffer.from("USDC").toString("hex").padEnd(64, "0");
type Handler = (method: string, params: unknown[], url: string) => unknown;
function fakeFetch(handler: Handler, calls: string[] = []) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push(String(url) + " " + body.method);
    const result = handler(body.method, body.params, String(url));
    if (result instanceof Response) return result;
    return new Response(JSON.stringify(result === undefined ? { jsonrpc: "2.0", id: body.id, error: { code: -32601, message: "method not found" } } : { jsonrpc: "2.0", id: body.id, result }));
  }) as typeof fetch;
}
function chain(options: { failed?: boolean; trace?: boolean } = {}): Handler {
  return (method, params) => {
    if (method === "eth_getTransactionByHash") return { hash, from: sender, to: router, value: "0xde0b6b3a7640000", blockNumber: "0x10", blockHash: "0x" + "ab".repeat(32) };
    if (method === "eth_getBlockByNumber") return { hash: "0x" + "ab".repeat(32), number: "0x10", timestamp: "0x65000000" };
    if (method === "eth_getTransactionReceipt") return { status: options.failed ? "0x0" : "0x1", logs: [
      { address: token, topics: [TRANSFER, topic(pool), topic(sender)], data: "0x" + word("7735940"), logIndex: "0x0" },
      { address: token, topics: [APPROVAL, topic(sender), topic(router)], data: "0x" + "f".repeat(64), logIndex: "0x1" },
      { address: router, topics: ["0x" + "99".repeat(32)], data: "0x", logIndex: "0x2" },
    ] };
    if (method === "debug_traceTransaction") return options.trace === false ? undefined : { type: "CALL", from: sender, to: router, value: "0xde0b6b3a7640000", calls: [{ type: "CALL", from: router, to: pool, value: "0x6f05b59d3b20000", calls: [{ type: "CALL", from: pool, to: sender, value: "0x1", error: "execution reverted" }] }, { type: "DELEGATECALL", from: router, to: pool, value: "0x5" }] };
    if (method === "eth_call") { const data = (params[0] as { data: string }).data; return data === "0x95d89b41" ? symbolData : "0x" + word("6"); }
    return undefined;
  };
}
test("turns a transaction into ordered, labelled movements", async () => {
  const rpc = createRpc(providersFor({}), fakeFetch(chain()));
  const investigation = await investigateTransaction(hash, rpc);
  assert.ok(investigationSchema.safeParse(investigation).success);
  assert.equal(investigation.subject, sender);
  assert.equal(investigation.source, "dRPC free public access");
  assert.deepEqual(investigation.movements.map(movement => [movement.kind, movement.amount, movement.asset]), [["native-transfer", "1", "ETH"], ["native-transfer", "0.5", "ETH"], ["token-transfer", "125", "USDC"], ["approval", "Unlimited", "USDC"]]);
  assert.equal(investigation.warnings.length, 1);
  assert.equal(investigation.warnings[0]!.evidenceId, "log 1");
  assert.ok(investigation.coverage.limitations.some(item => item.includes("1 other contract event")));
});
test("shows nothing moved when the transaction failed", async () => {
  const investigation = await investigateTransaction(hash, createRpc(providersFor({}), fakeFetch(chain({ failed: true }))));
  assert.equal(investigation.status, "failed");
  assert.equal(investigation.movements.length, 0);
  assert.match(investigation.coverage.limitations[0]!, /failed/);
});
test("says so when no call trace is available", async () => {
  const investigation = await investigateTransaction(hash, createRpc(providersFor({}), fakeFetch(chain({ trace: false }))));
  assert.equal(investigation.movements.filter(movement => movement.evidenceId.startsWith("call trace")).length, 0);
  assert.ok(investigation.coverage.limitations.some(item => item.includes("no call trace")));
});
test("reports unknown and pending transactions clearly", async () => {
  await assert.rejects(investigateTransaction(hash, createRpc(providersFor({}), fakeFetch(() => null))), (error: unknown) => error instanceof ChainError && error.kind === "not-found");
  await assert.rejects(investigateTransaction(hash, createRpc(providersFor({}), fakeFetch(method => method === "eth_getTransactionByHash" ? { hash, from: sender, to: router, value: "0x0", blockNumber: null, blockHash: null } : null))), (error: unknown) => error instanceof ChainError && error.kind === "pending");
});
test("falls back to the next provider and never leaks keys", async () => {
  const calls: string[] = [];
  const secret = "secret-key-123456";
  const rpc = createRpc(providersFor({ drpc: secret }), fakeFetch((method, _params, url) => url.includes("lb.drpc.org") ? new Response("rate limited " + secret, { status: 429 }) : "0x10", calls));
  assert.equal(await rpc.call<string>("eth_blockNumber", []), "0x10");
  assert.deepEqual([...rpc.used], ["dRPC free public access"]);
  const failing = createRpc(providersFor({ drpc: secret }, false), fakeFetch(() => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { message: "bad key " + secret } }))));
  await assert.rejects(failing.call("eth_blockNumber", []), (error: unknown) => error instanceof Error && !error.message.includes(secret) && error.message.includes("[key]"));
});
test("skips providers without traces for trace calls", async () => {
  const calls: string[] = [];
  const rpc = createRpc(providersFor({ alchemy: "alchemykey123" }), fakeFetch(() => ({ type: "CALL" }), calls));
  await rpc.call("debug_traceTransaction", [hash], { traces: true });
  assert.ok(calls.every(call => !call.includes("alchemy")));
});
test("address history needs Alchemy and lists recent transfers oldest first", async () => {
  await assert.rejects(investigateAddress(sender, createRpc(providersFor({}), fakeFetch(() => null))), (error: unknown) => error instanceof ChainError && error.kind === "needs-key");
  const transfer = (block: string, from: string, to: string, category: string, extra: object = {}) => ({ uniqueId: block + category, blockNum: block, hash: "0x" + block.slice(2).padStart(64, "0"), from, to, value: 1, asset: "ETH", category, rawContract: { value: "0xde0b6b3a7640000", address: null, decimal: "0x12" }, ...extra });
  const rpc = createRpc(providersFor({ alchemy: "alchemykey123" }), fakeFetch((method, params) => {
    if (method === "eth_getBlockByNumber") return { hash: "0x" + "ab".repeat(32), number: "0x20", timestamp: "0x65000000" };
    const query = params[0] as { fromAddress?: string };
    return { transfers: query.fromAddress ? [transfer("0x5", sender, router, "external")] : [transfer("0x9", pool, sender, "erc20", { asset: "USDC", rawContract: { value: "0x7735940", address: token, decimal: "0x6" } }), transfer("0x3", pool, sender, "erc721", { asset: "PUNK", tokenId: "0x2a" })] };
  }));
  const investigation = await investigateAddress(sender, rpc);
  assert.ok(investigationSchema.safeParse(investigation).success);
  assert.deepEqual(investigation.movements.map(movement => movement.amount + " " + movement.asset), ["#42 PUNK", "1 ETH", "125 USDC"]);
  assert.equal(investigation.source, "Alchemy with your key");
});
test("keeps approvals and warnings when hostile transactions pad the route", async () => {
  const contracts = Array.from({ length: 25 }, (_, index) => "0x" + (index + 16).toString(16).padStart(40, "0"));
  const padding = Array.from({ length: 45 }, (_, index) => ({ address: contracts[index % 20]!, topics: [TRANSFER, topic(pool), topic(sender)], data: "0x" + word("1"), logIndex: "0x" + index.toString(16) }));
  const late = { address: contracts[24]!, topics: [APPROVAL, topic(sender), topic(router)], data: "0x" + "f".repeat(64), logIndex: "0x40" };
  const huge = { address: token, topics: [TRANSFER, topic(pool), topic(sender)], data: "0x" + "f".repeat(200000), logIndex: "0x41" };
  const base = chain();
  const rpc = createRpc(providersFor({}), fakeFetch((method, params, url) => method === "eth_getTransactionReceipt" ? { status: "0x1", logs: [...padding, late, huge] } : base(method, params, url)));
  const investigation = await investigateTransaction(hash, rpc);
  assert.equal(investigation.movements.length, 40);
  const approval = investigation.movements.find(movement => movement.kind === "approval");
  assert.ok(approval, "approval kept");
  assert.equal(approval!.asset, "USDC", "the approval contract is looked up first");
  assert.equal(investigation.warnings.length, 1);
  assert.ok(investigation.movements.every(movement => movement.amount.length < 40));
  assert.ok(investigation.coverage.limitations.some(item => item.includes("every approval is kept")));
  assert.ok(investigation.coverage.limitations.some(item => item.includes("20 of 22 token contracts")));
});
test("formats amounts and token names safely", () => {
  assert.equal(formatUnits(1234567890000000000000n, 18), "1,234.56789");
  assert.equal(formatUnits(1n, 18), "less than 0.000001");
  assert.equal(formatUnits(1234567n, 6, 2), "about 1.23");
  assert.equal(decodeText(symbolData), "USDC");
  assert.equal(decodeText("0x" + Buffer.from("DAI").toString("hex").padEnd(64, "0")), "DAI");
  assert.equal(decodeText("0x1234"), null);
  const longName = "Visit zk-claim.com to claim your 500 USD bonus now before it expires today";
  assert.equal(decodeText("0x" + word("20") + word(Buffer.byteLength(longName).toString(16)) + Buffer.from(longName).toString("hex").padEnd(192, "0")), longName);
  assert.equal(decodeText("0x" + Buffer.from("\u001b[2JX").toString("hex").padEnd(64, "0")), "[2JX");
});

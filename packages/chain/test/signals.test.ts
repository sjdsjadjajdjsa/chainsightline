import assert from "node:assert/strict";
import { test } from "node:test";
import type { Investigation } from "../../core/src/investigation.js";
import { sampleInvestigation } from "../../core/src/sample.js";
import { resolveNames } from "../src/labels.js";
import { formatUsd, priceMovements } from "../src/prices.js";
import { createRpc, providersFor } from "../src/rpc.js";
import { detectSignals, lookalike } from "../src/signals.js";
type Movement = Investigation["movements"][number];
const subject = "0x1234aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabcd";
const friend = "0x9876bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb5555";
const fakeFriend = "0x9876cccccccccccccccccccccccccccccccc5555";
const usdt = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const fakeUsdt = "0x" + "ee".repeat(20);
const move = (id: string, from: string, to: string, extra: Partial<Movement> = {}): Movement => ({ id, kind: "token-transfer", from, to, asset: "USDT", assetAddress: usdt, amount: "1", rawAmount: "1000000 base units", decimals: 6, description: "Token transfer", evidenceId: "e-" + id, ...extra });
const base = (movements: Movement[], kind: Investigation["kind"] = "address"): Investigation => ({ ...sampleInvestigation, id: "t", synthetic: false, kind, subject, movements, warnings: [] });
const titles = async (investigation: Investigation, rpc: Parameters<typeof detectSignals>[1] = null) => (await detectSignals(investigation, rpc)).map(warning => warning.title + " @ " + warning.evidenceId);
test("flags lookalike addresses and poisoning dust", async () => {
  assert.ok(lookalike(friend, fakeFriend));
  assert.ok(!lookalike(friend, friend));
  const result = await titles(base([move("1", subject, friend), move("2", fakeFriend, subject, { rawAmount: "1 base units", amount: "0.000001" })]));
  assert.deepEqual(result, ["Likely address poisoning @ e-2"]);
});
test("flags zero-value transfers reported for another account", async () => {
  const result = await titles(base([move("1", friend, fakeFriend, { rawAmount: "0 base units", amount: "0" })], "transaction"));
  assert.ok(result.includes("Zero-value transfer for another account @ e-1"));
});
test("flags fake and spam tokens but not the real ones", async () => {
  const result = await titles(base([move("1", friend, subject), move("2", friend, subject, { assetAddress: fakeUsdt }), move("3", friend, subject, { asset: "Visit usdt-claim.com", assetAddress: fakeUsdt }), move("4", friend, subject, { asset: "ETH", assetAddress: fakeUsdt })]));
  assert.deepEqual(result, ["Fake USDT token @ e-2", "Spam token @ e-3", "Fake ETH token @ e-4"]);
});
test("flags outgoing transfers sent by someone else", async () => {
  const hash = "0x" + "ab".repeat(32);
  const rpcWith = (code: string) => createRpc(providersFor({}), (async (_url: string | URL | Request, init?: RequestInit) => { const body = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: body.method === "eth_getCode" ? code : { from: friend } })); }) as typeof fetch);
  const movements = [move("1", subject, friend, { transactionHash: hash }), move("2", subject, friend, { transactionHash: hash, usd: "about $1.00" }), move("3", subject, friend, { transactionHash: hash, amount: "#7" })];
  assert.deepEqual(await titles(base(movements), rpcWith("0x")), ["Not sent by this address @ e-1"]);
  assert.deepEqual(await titles(base(movements), rpcWith("0x6080")), [], "contracts never send their own transactions");
});
test("adds dollar values from confident prices only", async () => {
  const investigation = base([move("1", subject, friend), move("2", subject, friend, { asset: "ETH", assetAddress: undefined as never, rawAmount: "500000000000000000 wei", decimals: 18 }), move("3", subject, friend, { assetAddress: fakeUsdt })], "transaction");
  delete (investigation.movements[1] as Partial<Movement>).assetAddress;
  investigation.observedAt = "2025-11-01T00:00:00.000Z";
  let asked = "";
  const prices = await priceMovements(investigation, (async (url: string | URL | Request) => { asked = String(url); return new Response(JSON.stringify({ coins: { ["ethereum:" + usdt]: { price: 1, confidence: 0.99 }, "coingecko:ethereum": { price: 3000, confidence: 0.99 }, ["ethereum:" + fakeUsdt]: { price: 5, confidence: 0.2 } } })); }) as typeof fetch);
  assert.deepEqual(prices, { source: "DefiLlama", basis: "at the time" });
  assert.match(asked, /historical\/1761955200\//);
  assert.deepEqual(investigation.movements.map(movement => movement.usd), ["about $1.00", "about $1,500", undefined]);
  assert.equal(formatUsd(0.001), "less than $0.01");
});
test("labels well-known addresses even when ENS is unreachable", async () => {
  const router = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
  const rpc = createRpc(providersFor({}, true), (async () => new Response("down", { status: 503 })) as typeof fetch);
  const names = await resolveNames(base([move("1", subject, router)]), rpc, 2000);
  assert.deepEqual(names, { [router]: { name: "Uniswap V2 Router", source: "known" } });
});

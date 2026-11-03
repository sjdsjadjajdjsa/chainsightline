import type { Investigation } from "../../core/src/investigation";
import { shortHash } from "../../core/src/route";
import { blockLabel, decodeText, formatUnits, isWord, toBigInt, topicAddress, UNLIMITED } from "./format";
import { ChainError, type Rpc } from "./rpc";
type Movement = Investigation["movements"][number];
type Warning = Investigation["warnings"][number];
type RawTransaction = { hash: string; from: string; to: string | null; value: string; blockNumber: string | null; blockHash: string | null };
type RawLog = { address: string; topics: string[]; data: string; logIndex: string; removed?: boolean };
type RawReceipt = { status?: string; logs?: RawLog[]; contractAddress?: string | null };
type RawBlock = { hash: string; number: string; timestamp: string };
type Frame = { type?: string; from?: string; to?: string; value?: string; error?: string; calls?: Frame[] };
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const APPROVAL = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
const APPROVAL_FOR_ALL = "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31";
export const MAX_MOVEMENTS = 40;
type Token = { symbol: string | null; decimals: number | null };
async function tokenInfo(rpc: Rpc, address: string): Promise<Token> {
  const read = (data: string) => rpc.call<string>("eth_call", [{ to: address, data }, "latest"]).catch(() => null);
  const [symbol, decimals] = await Promise.all([read("0x95d89b41"), read("0x313ce567")]);
  const decimalValue = typeof decimals === "string" && decimals.length === 66 ? Number(BigInt(decimals)) : null;
  return { symbol: decodeText(symbol), decimals: decimalValue !== null && decimalValue <= 36 ? decimalValue : null };
}
function internalTransfers(root: Frame) {
  const found: { frame: Frame; path: string }[] = [];
  const walk = (frame: Frame, path: string) => {
    (frame.calls ?? []).forEach((child, index) => {
      const childPath = path ? path + "." + (index + 1) : String(index + 1);
      if (child.error) return;
      if (toBigInt(child.value) > 0n && child.to && child.type !== "DELEGATECALL" && child.type !== "STATICCALL") found.push({ frame: child, path: childPath });
      walk(child, childPath);
    });
  };
  if (!root.error) walk(root, "");
  return found;
}
export async function investigateTransaction(hash: string, rpc: Rpc): Promise<Investigation> {
  const tx = await rpc.call<RawTransaction | null>("eth_getTransactionByHash", [hash]);
  if (!tx) throw new ChainError("not-found", "No Ethereum mainnet transaction has that hash. Check that it is fully copied and from Ethereum, not another chain.");
  if (!tx.blockNumber) throw new ChainError("pending", "This transaction is still waiting to be included in a block. Try again in a minute.");
  const [receipt, block, trace] = await Promise.all([
    rpc.call<RawReceipt | null>("eth_getTransactionReceipt", [hash]),
    rpc.call<RawBlock | null>("eth_getBlockByNumber", [tx.blockNumber, false]),
    rpc.call<Frame>("debug_traceTransaction", [hash, { tracer: "callTracer", timeout: "20s" }], { traces: true }).catch(() => null),
  ]);
  if (!receipt || !block) throw new ChainError("unavailable", "The transaction was found, but its receipt could not be read. Try again in a moment.");
  const subject = tx.from.toLowerCase();
  const failed = receipt.status === "0x0";
  const movements: Movement[] = [];
  const warnings: Warning[] = [];
  const limitations: string[] = ["This covers one transaction; what these accounts did before or after is not shown"];
  const value = toBigInt(tx.value);
  const target = (tx.to ?? receipt.contractAddress ?? "").toLowerCase();
  if (!failed && value > 0n && target) movements.push({ id: "native-0", kind: "native-transfer", from: subject, to: target, asset: "ETH", amount: formatUnits(value, 18), rawAmount: value.toString() + " wei", decimals: 18, description: "ETH sent with the transaction", evidenceId: "transaction value" });
  let traceMovements = 0;
  if (trace && !failed) for (const { frame, path } of internalTransfers(trace)) {
    const amount = toBigInt(frame.value);
    movements.push({ id: "call-" + path, kind: "native-transfer", from: (frame.from ?? subject).toLowerCase(), to: frame.to!.toLowerCase(), asset: "ETH", amount: formatUnits(amount, 18), rawAmount: amount.toString() + " wei", decimals: 18, description: "ETH moved inside the transaction", evidenceId: "call trace " + path });
    traceMovements++;
  }
  if (!trace && !failed) limitations.push("ETH moved between contracts inside the transaction could not be checked, because no call trace was available");
  const logs = failed ? [] : (receipt.logs ?? []).filter(log => !log.removed);
  const tokenLogs = logs.filter(log => [TRANSFER, APPROVAL, APPROVAL_FOR_ALL].includes(log.topics[0] ?? ""));
  const approvalFirst = [...tokenLogs.filter(log => log.topics[0] !== TRANSFER), ...tokenLogs.filter(log => log.topics[0] === TRANSFER)];
  const tokenAddresses = [...new Set(approvalFirst.map(log => log.address.toLowerCase()))];
  const lookedUp = tokenAddresses.slice(0, 20);
  const tokens = new Map(await Promise.all(lookedUp.map(async address => [address, await tokenInfo(rpc, address)] as const)));
  const unknownToken: Token = { symbol: null, decimals: null };
  let skipped = 0;
  let revoked = 0;
  for (const log of logs) {
    const topic = log.topics[0];
    const contract = log.address.toLowerCase();
    const isToken = topic === TRANSFER || topic === APPROVAL || topic === APPROVAL_FOR_ALL;
    const token = tokens.get(contract) ?? (isToken ? unknownToken : undefined);
    const symbol = token?.symbol ?? "tokens from " + shortHash(contract);
    const index = Number(toBigInt(log.logIndex));
    const evidenceId = "log " + index;
    const first = topicAddress(log.topics[1]);
    const second = topicAddress(log.topics[2]);
    if (!first || !second || !token) { skipped++; continue; }
    if (topic === TRANSFER) {
      if (log.topics.length === 3 && isWord(log.data)) {
        const amount = toBigInt(log.data);
        const movement: Movement = { id: "log-" + index, kind: "token-transfer", from: first, to: second, asset: symbol, assetAddress: contract, amount: token.decimals === null ? amount.toLocaleString("en-US") + " units of" : formatUnits(amount, token.decimals), rawAmount: amount.toString() + " base units", description: "Token transfer event", evidenceId };
        if (token.decimals !== null) movement.decimals = token.decimals;
        movements.push(movement);
      } else if (log.topics.length === 4) {
        movements.push({ id: "log-" + index, kind: "token-transfer", from: first, to: second, asset: symbol, assetAddress: contract, amount: "#" + toBigInt(log.topics[3]).toString(), description: "NFT transfer event", evidenceId });
      } else skipped++;
    } else if (topic === APPROVAL && log.topics.length === 3 && isWord(log.data)) {
      const amount = toBigInt(log.data);
      if (amount === 0n) { revoked++; continue; }
      const unlimited = amount >= UNLIMITED;
      movements.push({ id: "log-" + index, kind: "approval", from: first, to: second, asset: symbol, assetAddress: contract, amount: unlimited ? "Unlimited" : token.decimals === null ? amount.toLocaleString("en-US") + " units of" : formatUnits(amount, token.decimals), rawAmount: amount.toString() + " base units", description: "Token approval event", evidenceId });
      if (unlimited) warnings.push({ id: "warning-" + index, title: "Unlimited approval", reason: "The spender " + shortHash(second) + " may move any amount of this token from " + shortHash(first) + " until the approval is changed. Exchanges often ask for this, but it is worth checking that you trust the spender. Whether it was revoked later is not checked here.", evidenceId, severity: "review" });
    } else if (topic === APPROVAL && log.topics.length === 4) {
      movements.push({ id: "log-" + index, kind: "approval", from: first, to: second, asset: symbol, assetAddress: contract, amount: "#" + toBigInt(log.topics[3]).toString(), description: "NFT approval event", evidenceId });
    } else if (topic === APPROVAL_FOR_ALL && log.topics.length === 3 && isWord(log.data)) {
      if (toBigInt(log.data) === 0n) { revoked++; continue; }
      movements.push({ id: "log-" + index, kind: "approval", from: first, to: second, asset: symbol, assetAddress: contract, amount: "every token in", description: "Collection-wide approval event", evidenceId });
      warnings.push({ id: "warning-" + index, title: "Approval for a whole collection", reason: "The operator " + shortHash(second) + " may move every token in this collection from " + shortHash(first) + " until the approval is changed. Marketplaces ask for this, but so do many scams. Whether it was revoked later is not checked here.", evidenceId, severity: "review" });
    } else skipped++;
  }
  const total = movements.length;
  const keep = new Set(movements.filter(movement => movement.kind === "approval").slice(0, MAX_MOVEMENTS).map(movement => movement.id));
  for (const movement of movements) { if (keep.size >= MAX_MOVEMENTS) break; keep.add(movement.id); }
  const shown = movements.filter(movement => keep.has(movement.id));
  const shownIds = new Set(shown.map(movement => movement.evidenceId));
  if (failed) limitations.unshift("The transaction failed, so none of its transfers took effect; only the fee was paid");
  if (total > MAX_MOVEMENTS) limitations.push("Only " + MAX_MOVEMENTS + " of " + total + " movements are shown; every approval is kept");
  if (traceMovements && logs.length) limitations.push("ETH movements are listed before token events, not in strict execution order");
  if (tokenAddresses.length) limitations.push("Token transfers and names are reported by the token contracts themselves; a contract can report fake transfers, and balances are not checked");
  if (tokenAddresses.length > lookedUp.length) limitations.push("Names and decimals were looked up for " + lookedUp.length + " of " + tokenAddresses.length + " token contracts; the rest show raw amounts");
  if (revoked) limitations.push(revoked + (revoked === 1 ? " approval was" : " approvals were") + " removed in this transaction and " + (revoked === 1 ? "is" : "are") + " not shown");
  if (skipped) limitations.push(skipped + " other contract " + (skipped === 1 ? "event is" : "events are") + " not shown");
  limitations.push("Nothing here shows who controls these accounts or why the transaction was sent");
  const blockNumber = toBigInt(block.number);
  const summary = failed ? "The subject sent this transaction, but it failed." : total ? "The subject sent this transaction. It produced " + total + (total === 1 ? " movement" : " movements") + "." : "The subject sent this transaction. No ETH or tokens moved.";
  return {
    id: "tx-" + hash.slice(2, 12).toLowerCase(),
    synthetic: false,
    kind: "transaction",
    chain: "ethereum-mainnet",
    subject,
    transactionHash: hash.toLowerCase(),
    status: failed ? "failed" : "success",
    blockNumber: blockLabel(blockNumber),
    blockHash: block.hash,
    observedAt: new Date(Number(toBigInt(block.timestamp)) * 1000).toISOString(),
    source: [...rpc.used].join(" and "),
    coverage: { status: "partial", summary: trace ? "One transaction, its receipt and its call trace" : "One transaction and its receipt", limitations },
    movements: shown,
    warnings: warnings.filter(warning => shownIds.has(warning.evidenceId)),
    explanation: { summary, uncertainty: "On-chain data shows what moved and between which accounts. It does not show who controls them or why.", evidenceIds: shown.map(movement => movement.evidenceId) },
  };
}

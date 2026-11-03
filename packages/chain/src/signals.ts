import type { Investigation } from "../../core/src/investigation";
import { shortHash } from "../../core/src/route";
import { officialTokens } from "./labels";
import { rawValue, units } from "./prices";
import type { Rpc } from "./rpc";
type Movement = Investigation["movements"][number];
type Warning = Investigation["warnings"][number];
const dustLimit: Record<string, number> = { eth: 0.0001, weth: 0.0001, usdt: 0.01, usdc: 0.01, dai: 0.01 };
const spamWords = /(https?:|www\.|\.(com|io|org|net|xyz|app|finance|site|top|live|claim)\b|claim|visit|reward|airdrop|voucher)/i;
export const lookalike = (a: string, b: string) => a !== b && a.slice(2, 6) === b.slice(2, 6) && a.slice(-4) === b.slice(-4);
function isDust(movement: Movement) {
  const raw = rawValue(movement);
  if (raw === 0n) return true;
  if (movement.usd === "less than $0.01") return true;
  const limit = dustLimit[movement.asset.toLowerCase()];
  const amount = units(movement);
  return limit !== undefined && amount !== null && amount < limit;
}
export async function detectSignals(investigation: Investigation, rpc: Rpc | null) {
  const warnings: Warning[] = [];
  const add = (movement: Movement, title: string, reason: string) => warnings.push({ id: "signal-" + warnings.length + "-" + movement.id, title, reason, evidenceId: movement.evidenceId, severity: "review" });
  const order = new Map<string, number>();
  investigation.movements.forEach((movement, index) => { for (const address of [movement.from, movement.to]) if (!order.has(address)) order.set(address, index); });
  const addresses = [...order.keys()];
  const flagged = new Set<string>();
  for (const candidate of addresses) {
    const original = addresses.find(other => lookalike(other, candidate) && (other === investigation.subject || (order.get(other) ?? 0) < (order.get(candidate) ?? 0)));
    if (!original || candidate === investigation.subject) continue;
    for (const movement of investigation.movements) {
      if (movement.from !== candidate && movement.to !== candidate) continue;
      const key = movement.id + candidate;
      if (flagged.has(key)) continue;
      flagged.add(key);
      const poison = movement.to === investigation.subject || movement.from === investigation.subject ? isDust(movement) : false;
      add(movement, poison ? "Likely address poisoning" : "Lookalike address", shortHash(candidate) + " looks almost identical to " + shortHash(original) + ", which also appears in this route" + (poison ? ", and this is a tiny or zero transfer" : "") + ". Scammers create lookalike addresses so people copy the wrong one from their history. Check every character before sending to either.");
    }
  }
  if (investigation.kind === "transaction") for (const movement of investigation.movements) {
    if (movement.kind === "token-transfer" && rawValue(movement) === 0n && movement.from !== investigation.subject) add(movement, "Zero-value transfer for another account", "This transaction reports moving zero tokens out of " + shortHash(movement.from) + ", an account that did not send it. This is a common address-poisoning trick to plant a fake entry in that account’s history.");
  }
  for (const movement of investigation.movements) {
    if (movement.kind !== "token-transfer" && movement.kind !== "approval") continue;
    const symbol = movement.asset.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const official = officialTokens[symbol];
    if (official && movement.assetAddress && movement.assetAddress !== official) add(movement, "Fake " + movement.asset + " token", "This token calls itself " + movement.asset + " but is not the real " + movement.asset + " contract (" + shortHash(official) + "). Fake tokens are used to make scams look like real payments.");
    else if (symbol === "eth" && movement.assetAddress) add(movement, "Fake ETH token", "Real ETH is not a token contract. A token that calls itself ETH is almost always used to trick people.");
    else if (spamWords.test(movement.asset)) add(movement, "Spam token", "Its name advertises a website or reward. Tokens like this are airdropped to lure people to scam sites. Don’t visit it or interact with the token.");
  }
  if (investigation.kind === "address" && rpc) {
    const code = await rpc.call<string>("eth_getCode", [investigation.subject, "latest"]).catch(() => null);
    const personal = code === "0x" || (typeof code === "string" && code.toLowerCase().startsWith("0xef0100") && code.length === 48);
    const outgoing = personal ? investigation.movements.filter(movement => movement.kind === "token-transfer" && movement.from === investigation.subject && movement.transactionHash && !movement.usd && !movement.amount.startsWith("#")) : [];
    const hashes = [...new Set(outgoing.map(movement => movement.transactionHash!))].slice(0, 20);
    const senders = new Map(await Promise.all(hashes.map(async hash => [hash, await rpc.call<{ from?: string } | null>("eth_getTransactionByHash", [hash]).then(tx => tx?.from?.toLowerCase() ?? null).catch(() => null)] as const)));
    for (const movement of outgoing) {
      const sender = senders.get(movement.transactionHash!);
      if (sender && sender !== investigation.subject) add(movement, "Not sent by this address", "This transfer out of the address was reported in a transaction sent by " + shortHash(sender) + ", not by the address itself. Approved apps can do this, but spam tokens fake it to appear in your history.");
    }
  }
  return warnings;
}

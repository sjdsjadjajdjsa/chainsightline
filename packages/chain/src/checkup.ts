import { erc20Abi, parseAbi } from "viem";
import type { Investigation } from "../../core/src/investigation";
import { lookalike, shortHash } from "../../core/src/route";
import { historyQuery, investigateAddress, type RawBlock, type Transfer } from "./address";
import { blockLabel, cleanSymbol, formatUnits, toBigInt, UNLIMITED } from "./format";
import { knownSpenders, viemClient } from "./labels";
import { ChainError, type Rpc } from "./rpc";
import { detectSignals } from "./signals";
type Movement = Investigation["movements"][number];
type Warning = Investigation["warnings"][number];
const operatorAbi = parseAbi(["function isApprovedForAll(address owner, address operator) view returns (bool)"]);
export const TOKEN_LIMIT = 50;
export const COLLECTION_LIMIT = 20;
export const SPENDER_LIMIT = 60;
function unique<T>(items: T[]) { return [...new Set(items)]; }
export async function walletCheckup(address: string, rpc: Rpc): Promise<Investigation> {
  if (!rpc.providers.some(provider => provider.name === "alchemy")) throw new ChainError("needs-key", "A wallet checkup needs a free Alchemy key. Transactions work without one.");
  const owner = address.toLowerCase() as `0x${string}`;
  const transfers = (query: unknown[]) => rpc.call<{ transfers?: Transfer[] }>("alchemy_getAssetTransfers", query, { only: "alchemy" }).then(result => result.transfers ?? []);
  const [tokenTransfers, nftTransfers, sentTransactions, head, history, tokensOut] = await Promise.all([
    transfers(historyQuery(owner, "toAddress", 1000, ["erc20"])),
    transfers(historyQuery(owner, "toAddress", 500, ["erc721", "erc1155"])),
    transfers(historyQuery(owner, "fromAddress", 1000, ["external"])),
    rpc.call<RawBlock>("eth_getBlockByNumber", ["latest", false], { only: "alchemy" }),
    investigateAddress(owner, rpc),
    transfers(historyQuery(owner, "fromAddress", 100, ["erc20"])),
  ]);
  const pulled = unique(tokensOut.map(transfer => transfer.hash)).slice(0, 25);
  const pullers = (await Promise.all(pulled.map(hash => rpc.call<{ from?: string; to?: string | null } | null>("eth_getTransactionByHash", [hash]).catch(() => null)))).filter(tx => tx?.from && tx.from.toLowerCase() !== owner).flatMap(tx => [tx!.from!.toLowerCase(), tx!.to?.toLowerCase()]).filter((address): address is string => !!address);
  const tokenInfo = new Map<string, { symbol: string; decimals: number | null }>();
  for (const transfer of tokenTransfers) { const contract = transfer.rawContract?.address?.toLowerCase(); if (contract && !tokenInfo.has(contract)) tokenInfo.set(contract, { symbol: cleanSymbol(transfer.asset) ?? "tokens from " + shortHash(contract), decimals: transfer.rawContract?.decimal ? Number(toBigInt(transfer.rawContract.decimal)) : null }); }
  const collections = new Map<string, string>();
  for (const transfer of nftTransfers) { const contract = transfer.rawContract?.address?.toLowerCase(); if (contract && !collections.has(contract)) collections.set(contract, cleanSymbol(transfer.asset) ?? "NFT from " + shortHash(contract)); }
  for (const token of unique([...tokensOut.map(transfer => transfer.rawContract?.address?.toLowerCase()).filter((address): address is string => !!address)])) if (!tokenInfo.has(token)) { const sent = tokensOut.find(transfer => transfer.rawContract?.address?.toLowerCase() === token); tokenInfo.set(token, { symbol: cleanSymbol(sent?.asset) ?? "tokens from " + shortHash(token), decimals: sent?.rawContract?.decimal ? Number(toBigInt(sent.rawContract.decimal)) : null }); }
  const tokens = [...tokenInfo.keys()].slice(0, TOKEN_LIMIT) as `0x${string}`[];
  const nfts = [...collections.keys()].slice(0, COLLECTION_LIMIT) as `0x${string}`[];
  const spenders = unique([...pullers, ...knownSpenders, ...sentTransactions.map(transfer => transfer.to?.toLowerCase()).filter((to): to is string => !!to)]).filter(spender => spender !== owner).slice(0, SPENDER_LIMIT) as `0x${string}`[];
  const client = viemClient(rpc);
  const tokenPairs = tokens.flatMap(token => spenders.filter(spender => spender !== token).map(spender => ({ token, spender })));
  const nftPairs = nfts.flatMap(token => spenders.filter(spender => spender !== token).map(spender => ({ token, spender })));
  const [allowances, operators] = await Promise.all([
    tokenPairs.length ? client.multicall({ contracts: tokenPairs.map(pair => ({ address: pair.token, abi: erc20Abi, functionName: "allowance" as const, args: [owner, pair.spender] as const })), allowFailure: true, batchSize: 24000 }) : Promise.resolve([]),
    nftPairs.length ? client.multicall({ contracts: nftPairs.map(pair => ({ address: pair.token, abi: operatorAbi, functionName: "isApprovedForAll" as const, args: [owner, pair.spender] as const })), allowFailure: true, batchSize: 24000 }) : Promise.resolve([]),
  ]);
  const block = blockLabel(toBigInt(head.number));
  const movements: Movement[] = [];
  const warnings: Warning[] = [];
  allowances.forEach((result, index) => {
    if (result.status !== "success" || typeof result.result !== "bigint" || result.result === 0n) return;
    const pair = tokenPairs[index]!;
    const info = tokenInfo.get(pair.token)!;
    const unlimited = result.result >= UNLIMITED;
    const movement: Movement = { id: "allowance-" + movements.length, kind: "approval", from: owner, to: pair.spender, asset: info.symbol, assetAddress: pair.token, amount: unlimited ? "Unlimited" : info.decimals === null || info.decimals > 36 ? result.result.toLocaleString("en-US") + " units of" : formatUnits(result.result, info.decimals), rawAmount: result.result.toString() + " base units", description: "Active token approval", evidenceId: "allowance of " + info.symbol + " for " + shortHash(pair.spender) + " at block " + block };
    if (info.decimals !== null && info.decimals <= 36) movement.decimals = info.decimals;
    movements.push(movement);
  });
  operators.forEach((result, index) => {
    if (result.status !== "success" || result.result !== true) return;
    const pair = nftPairs[index]!;
    movements.push({ id: "operator-" + movements.length, kind: "approval", from: owner, to: pair.spender, asset: collections.get(pair.token)!, assetAddress: pair.token, amount: "every token in", description: "Active collection approval", evidenceId: "collection approval of " + shortHash(pair.token) + " for " + shortHash(pair.spender) + " at block " + block });
  });
  const approvalSpenders = unique(movements.map(movement => movement.to));
  const codes = new Map(await Promise.all(approvalSpenders.map(async spender => [spender, await rpc.call<string>("eth_getCode", [spender, "latest"]).catch(() => null)] as const)));
  for (const movement of movements) {
    const code = codes.get(movement.to);
    const personal = code === "0x" || (typeof code === "string" && code.toLowerCase().startsWith("0xef0100") && code.length === 48);
    const spender = shortHash(movement.to);
    if (personal) warnings.push({ id: "approval-wallet-" + movement.id, title: "Approval to a personal wallet", reason: "The personal wallet " + movement.to + " can move your " + movement.asset + ". Legitimate apps use contracts, not personal wallets; this is how most approval scams drain wallets. Revoke it unless you set it up on purpose.", evidenceId: movement.evidenceId, severity: "review" });
    else if (movement.amount === "Unlimited") warnings.push({ id: "approval-unlimited-" + movement.id, title: "Unlimited approval still active", reason: spender + " can move any amount of your " + movement.asset + ". Exchanges often ask for this, but every unlimited approval is a risk if that app is ever hacked. Revoke the ones you no longer use.", evidenceId: movement.evidenceId, severity: "review" });
    else if (movement.amount === "every token in") warnings.push({ id: "approval-collection-" + movement.id, title: "Collection approval still active", reason: spender + " can move every token in this collection. Marketplaces need this to list NFTs; revoke it for marketplaces you no longer use.", evidenceId: movement.evidenceId, severity: "review" });
  }
  const flagged = new Set((await detectSignals(history, rpc)).map(warning => warning.evidenceId));
  const flaggedMovements = history.movements.filter(movement => flagged.has(movement.evidenceId));
  const partners = new Set(flaggedMovements.flatMap(movement => [movement.from, movement.to]));
  const context = history.movements.filter(movement => !flagged.has(movement.evidenceId) && [movement.from, movement.to].some(address => [...partners].some(partner => lookalike(partner, address))));
  const historyMovements = history.movements.filter(movement => flaggedMovements.includes(movement) || context.includes(movement));
  const limitations = [
    "Free data plans can’t list every approval a wallet ever gave, so ChainSightline checks the " + tokens.length + " tokens and " + nfts.length + " collections this wallet has held against " + spenders.length + " apps it used, apps that moved its tokens, and well-known spenders. An approval to an app outside that list can be missed",
    "Permit2 sub-approvals and approvals for tokens the wallet never received are not checked",
    "Scam patterns were checked in the 20 most recent transfers only",
  ];
  if (tokenInfo.size > TOKEN_LIMIT || collections.size > COLLECTION_LIMIT) limitations.push("Only the " + TOKEN_LIMIT + " most recently received tokens and " + COLLECTION_LIMIT + " collections were checked");
  const approvalCount = movements.length;
  return {
    id: "checkup-" + owner.slice(2, 12),
    synthetic: false,
    kind: "checkup",
    chain: "ethereum-mainnet",
    subject: owner,
    blockNumber: block,
    blockHash: head.hash,
    observedAt: new Date(Number(toBigInt(head.timestamp)) * 1000).toISOString(),
    source: [...rpc.used].join(" and "),
    coverage: { status: "partial", summary: approvalCount + (approvalCount === 1 ? " active approval" : " active approvals") + " and " + historyMovements.length + " suspicious recent " + (historyMovements.length === 1 ? "transfer" : "transfers"), limitations },
    movements: [...movements, ...historyMovements],
    warnings,
    explanation: { summary: "This wallet has " + approvalCount + (approvalCount === 1 ? " active approval" : " active approvals") + " ChainSightline could find" + (historyMovements.length ? ", and recent transfers that match scam patterns." : ", and no recent transfers that match scam patterns."), uncertainty: "Approvals let apps move your tokens until you revoke them. A missing warning doesn’t mean an approval is safe.", evidenceIds: [...movements, ...historyMovements].map(movement => movement.evidenceId) },
  };
}

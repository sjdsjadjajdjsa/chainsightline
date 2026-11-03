import type { Investigation } from "../../core/src/investigation";
import { shortHash } from "../../core/src/route";
import { blockLabel, cleanSymbol, formatUnits, toBigInt } from "./format";
import { ChainError, type Rpc } from "./rpc";
type Movement = Investigation["movements"][number];
type Transfer = { uniqueId?: string; blockNum: string; hash: string; from: string; to: string | null; value: number | null; asset: string | null; category: string; tokenId?: string | null; erc1155Metadata?: { tokenId: string; value: string }[] | null; rawContract?: { value: string | null; address: string | null; decimal: string | null } };
type RawBlock = { hash: string; number: string; timestamp: string };
export const ADDRESS_LIMIT = 20;
function amountOf(transfer: Transfer): { amount: string; rawAmount?: string; decimals?: number } {
  if (transfer.category === "erc721") return { amount: "#" + toBigInt(transfer.tokenId ?? undefined).toString() };
  if (transfer.category === "erc1155") { const items = transfer.erc1155Metadata ?? []; const item = items[0]; return { amount: item ? toBigInt(item.value).toString() + " of #" + toBigInt(item.tokenId).toString() + (items.length > 1 ? " and " + (items.length - 1) + " more of" : "") : "some" }; }
  const raw = transfer.rawContract;
  if (raw?.value && raw.decimal) { const value = toBigInt(raw.value); const decimals = Number(toBigInt(raw.decimal)); return decimals <= 36 ? { amount: formatUnits(value, decimals), rawAmount: value.toString() + " base units", decimals } : { amount: value.toLocaleString("en-US") + " units of", rawAmount: value.toString() + " base units" }; }
  return { amount: transfer.value === null ? "an unknown amount of" : String(transfer.value) };
}
export async function investigateAddress(address: string, rpc: Rpc): Promise<Investigation> {
  if (!rpc.providers.some(provider => provider.name === "alchemy")) throw new ChainError("needs-key", "Address history needs a free Alchemy key. Transactions work without one.");
  const subject = address.toLowerCase();
  const query = (direction: "fromAddress" | "toAddress") => rpc.call<{ transfers: Transfer[] }>("alchemy_getAssetTransfers", [{ fromBlock: "0x0", toBlock: "latest", [direction]: subject, category: ["external", "internal", "erc20", "erc721", "erc1155"], withMetadata: false, excludeZeroValue: true, maxCount: "0x" + ADDRESS_LIMIT.toString(16), order: "desc" }], { only: "alchemy" });
  const [sent, received, head] = await Promise.all([query("fromAddress"), query("toAddress"), rpc.call<RawBlock>("eth_getBlockByNumber", ["latest", false], { only: "alchemy" })]);
  const seen = new Set<string>();
  const transfers = [...(sent.transfers ?? []), ...(received.transfers ?? [])].filter(transfer => { const id = transfer.uniqueId ?? transfer.hash + transfer.category + transfer.from + transfer.to; if (seen.has(id) || !transfer.to) return false; seen.add(id); return true; });
  transfers.sort((a, b) => Number(toBigInt(b.blockNum) - toBigInt(a.blockNum)));
  const recent = transfers.slice(0, ADDRESS_LIMIT).reverse();
  const movements: Movement[] = recent.map((transfer, index) => {
    const native = transfer.category === "external" || transfer.category === "internal";
    const nft = transfer.category === "erc721" || transfer.category === "erc1155";
    const contract = transfer.rawContract?.address;
    const shown = amountOf(transfer);
    const movement: Movement = { id: "transfer-" + index, kind: native ? "native-transfer" : "token-transfer", from: transfer.from.toLowerCase(), to: transfer.to!.toLowerCase(), asset: native ? "ETH" : cleanSymbol(transfer.asset) ?? (contract ? (nft ? "NFT from " : "tokens from ") + shortHash(contract) : nft ? "NFT" : "tokens"), amount: shown.amount, description: transfer.category === "internal" ? "ETH moved inside a transaction" : native ? "ETH transfer" : nft ? "NFT transfer" : "Token transfer", evidenceId: "block " + blockLabel(toBigInt(transfer.blockNum)) + ", " + (transfer.uniqueId ?? transfer.hash).replace(transfer.hash, "transaction " + transfer.hash.slice(0, 10) + "…").replace(/:/g, " ").replace(/\s+/g, " ").trim() + (transfer.uniqueId ? "" : " " + index), transactionHash: transfer.hash.toLowerCase() };
    if (shown.rawAmount) movement.rawAmount = shown.rawAmount;
    if (shown.decimals !== undefined) movement.decimals = shown.decimals;
    if (contract && /^0x[0-9a-fA-F]{40}$/.test(contract)) movement.assetAddress = contract.toLowerCase();
    return movement;
  });
  const limitations = [
    "Showing the " + (movements.length === ADDRESS_LIMIT ? ADDRESS_LIMIT + " most recent" : movements.length) + " transfers in and out of this address; older history is not included",
    "Approvals and other contract activity are not part of address history",
    "Token transfers and names are reported by the token contracts themselves; a contract can report fake transfers, and balances are not checked",
    "Nothing here shows who controls these accounts or why they transacted",
  ];
  return {
    id: "address-" + subject.slice(2, 12),
    synthetic: false,
    kind: "address",
    chain: "ethereum-mainnet",
    subject,
    blockNumber: blockLabel(toBigInt(head.number)),
    blockHash: head.hash,
    observedAt: new Date(Number(toBigInt(head.timestamp)) * 1000).toISOString(),
    source: [...rpc.used].join(" and "),
    coverage: { status: "partial", summary: movements.length ? "Recent transfers in and out, from Alchemy" : "No transfers found", limitations },
    movements,
    warnings: [],
    explanation: { summary: movements.length ? "These are the most recent ETH and token transfers involving this address, oldest first." : "No ETH or token transfers involving this address were found.", uncertainty: "On-chain data shows what moved and between which accounts. It does not show who controls them or why.", evidenceIds: movements.map(movement => movement.evidenceId) },
  };
}

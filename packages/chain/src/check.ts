import type { Investigation } from "../../core/src/investigation";
import { lookalike, shortHash } from "../../core/src/route";
import { historyQuery, transferToMovement, type RawBlock, type Transfer } from "./address";
import { blockLabel, decodeText, formatUnits, toBigInt } from "./format";
import { knownAddresses } from "./labels";
import type { Rpc } from "./rpc";
type Check = NonNullable<Investigation["checks"]>[number];
type Movement = Investigation["movements"][number];
export const HISTORY_LIMIT = 1000;
export async function checkRecipient(recipient: string, from: string | null, rpc: Rpc): Promise<Investigation> {
  const to = recipient.toLowerCase();
  const you = from?.toLowerCase() ?? null;
  const [code, nonce, balance, head] = await Promise.all([
    rpc.call<string>("eth_getCode", [to, "latest"]),
    rpc.call<string>("eth_getTransactionCount", [to, "latest"]),
    rpc.call<string>("eth_getBalance", [to, "latest"]),
    rpc.call<RawBlock>("eth_getBlockByNumber", ["latest", false]),
  ]);
  const checks: Check[] = [];
  const movements: Movement[] = [];
  const add = (id: string, status: Check["status"], title: string, detail: string) => checks.push({ id, status, title, detail });
  const delegated = code.toLowerCase().startsWith("0xef0100") && code.length === 48;
  const personal = code === "0x" || delegated;
  if (you && you === to) add("self", "review", "This is your own address", "You are about to send to the same address you are sending from.");
  if (personal) add("account", "ok", "A personal wallet", delegated ? "It is a personal wallet with smart-account features (EIP-7702)." : "It is a personal wallet, not a smart contract.");
  else {
    const [symbol, decimals] = await Promise.all(["0x95d89b41", "0x313ce567"].map(data => rpc.call<string>("eth_call", [{ to, data }, "latest"]).catch(() => null)));
    const name = decodeText(symbol);
    if (name && typeof decimals === "string" && decimals.length === 66) add("account", "review", "This is a token contract", "This address is the " + name + " token contract itself. Tokens sent straight to a token contract are usually lost forever. You almost certainly want a wallet address instead.");
    else add("account", "unknown", "This is a smart contract", "Only send to a contract when an app you trust tells you to. Contracts can’t always send funds back.");
  }
  const sent = Number(toBigInt(nonce));
  const eth = toBigInt(balance);
  if (!personal) add("activity", "unknown", eth > 0n ? "Holds " + formatUnits(eth, 18) + " ETH" : "Holds no ETH", "A contract’s balance and transaction count say little about whether it is safe to pay.");
  else if (sent === 0 && eth === 0n) add("activity", "review", "Never used", "This address has never sent a transaction and holds no ETH. Brand-new wallets look like this, but so do mistyped addresses. Check every character.");
  else add("activity", "ok", "In use", (sent ? "It has sent " + sent.toLocaleString("en-US") + (sent === 1 ? " transaction" : " transactions") : "It has not sent any transactions") + (eth > 0n ? " and holds " + formatUnits(eth, 18) + " ETH." : "."));
  if (knownAddresses[to]) add("name", "ok", "Known as " + knownAddresses[to], "This matches ChainSightline’s built-in list of well-known addresses.");
  const limitations = ["These checks can’t prove an address is safe; they point out common mistakes and scams"];
  if (!you) add("history", "unknown", "Not compared with your history", "Add your own address to check whether this one imitates an address you have paid before.");
  else if (!rpc.providers.some(provider => provider.name === "alchemy")) add("history", "unknown", "Not compared with your history", "Comparing with your history needs a free Alchemy key.");
  else {
    const [outgoing, incoming] = await Promise.all([
      rpc.call<{ transfers?: Transfer[] }>("alchemy_getAssetTransfers", historyQuery(you, "fromAddress", HISTORY_LIMIT, ["external", "erc20", "erc721", "erc1155"]), { only: "alchemy" }),
      rpc.call<{ transfers?: Transfer[] }>("alchemy_getAssetTransfers", historyQuery(you, "toAddress", 200, ["external", "erc20"]), { only: "alchemy" }),
    ]);
    const paid = (outgoing.transfers ?? []).filter(transfer => transfer.to);
    const reported = new Map<string, Transfer[]>();
    for (const transfer of paid) { const key = transfer.to!.toLowerCase(); reported.set(key, [...(reported.get(key) ?? []), transfer]); }
    const senders = new Map<string, string | null>();
    const sentByYou = async (transfer: Transfer) => {
      if (transfer.category === "external") return true;
      if (!senders.has(transfer.hash)) senders.set(transfer.hash, await rpc.call<{ from?: string } | null>("eth_getTransactionByHash", [transfer.hash]).then(tx => tx?.from?.toLowerCase() ?? null).catch(() => null));
      return senders.get(transfer.hash) === you;
    };
    const confirmed = async (address: string) => { const list = reported.get(address) ?? []; const real: Transfer[] = []; for (const transfer of list.slice(0, 5)) if (await sentByYou(transfer)) real.push(transfer); return real; };
    const paidTo = new Map<string, Transfer[]>();
    for (const address of [to, ...[...reported.keys()].filter(address => lookalike(address, to))]) { const real = await confirmed(address); if (real.length) paidTo.set(address, real); }
    const before = paidTo.get(to);
    const twins = [...paidTo.keys()].filter(address => lookalike(address, to));
    const fromRecipient = (incoming.transfers ?? []).filter(transfer => transfer.from.toLowerCase() === to);
    if (before) add("history", "ok", "You’ve paid this address before", "You sent to it in " + before.length + (before.length === 1 ? " transaction" : " transactions") + " you signed, among your last " + paid.length.toLocaleString("en-US") + " payments.");
    if (twins.length && !before) {
      add("history", "review", "Likely address poisoning", "It looks almost identical to " + twins[0] + ", which you have paid before. Scammers create lookalike addresses and send tiny amounts so you copy the wrong one from your history. Copy the address from a trusted source instead.");
      movements.push(transferToMovement(paidTo.get(twins[0]!)![0]!, movements.length, "history-"));
    } else if (twins.length) add("lookalike", "review", "A lookalike exists in your history", twins[0] + " looks almost identical to this address. Make sure you copied the right one.");
    if (fromRecipient.length && !before) {
      add("contact", "review", "It sent you something first", "This address sent you " + fromRecipient.length + (fromRecipient.length === 1 ? " transfer" : " transfers") + ", but you have never paid it. Scammers send tiny or fake transfers so their address shows up in your history.");
      for (const transfer of fromRecipient.slice(0, 5)) movements.push(transferToMovement(transfer, movements.length, "history-"));
    }
    if (!before && !twins.length && !fromRecipient.length) add("history", "ok", "No lookalikes in your history", "None of the " + reported.size.toLocaleString("en-US") + " addresses you’ve paid look like this one. You haven’t paid this address before.");
    limitations.push("Only your " + HISTORY_LIMIT.toLocaleString("en-US") + " most recent payments and 200 most recent incoming transfers were compared");
  }
  const review = checks.filter(check => check.status === "review").length;
  return {
    id: "check-" + to.slice(2, 12),
    synthetic: false,
    kind: "check",
    chain: "ethereum-mainnet",
    subject: to,
    ...(you ? { from: you } : {}),
    blockNumber: blockLabel(toBigInt(head.number)),
    blockHash: head.hash,
    observedAt: new Date(Number(toBigInt(head.timestamp)) * 1000).toISOString(),
    source: [...rpc.used].join(" and "),
    coverage: { status: "partial", summary: checks.length + " checks on " + shortHash(to), limitations },
    movements,
    warnings: [],
    checks,
    explanation: { summary: review ? review + (review === 1 ? " check needs" : " checks need") + " your attention before you send." : "None of the checks found a problem.", uncertainty: "A clean result doesn’t mean the address is safe or belongs to who you think. Confirm it with the person or app you’re paying.", evidenceIds: checks.map(check => check.id) },
  };
}

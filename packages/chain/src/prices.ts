import type { Investigation } from "../../core/src/investigation";
type Movement = Investigation["movements"][number];
const ETH = "coingecko:ethereum";
export const PRICE_SOURCE = "DefiLlama";
const coinOf = (movement: Movement) => movement.kind !== "token-transfer" && movement.kind !== "native-transfer" ? null : movement.asset === "ETH" && !movement.assetAddress ? ETH : movement.assetAddress ? "ethereum:" + movement.assetAddress : null;
export function rawValue(movement: Movement) {
  const match = movement.rawAmount?.match(/^(\d+) /);
  return match ? BigInt(match[1]!) : null;
}
export function units(movement: Movement) {
  const raw = rawValue(movement);
  if (raw === null || movement.decimals === undefined) return null;
  return Number(raw) / 10 ** movement.decimals;
}
export function formatUsd(value: number) {
  if (value === 0) return "$0";
  if (value < 0.01) return "less than $0.01";
  return "about $" + value.toLocaleString("en-US", { maximumFractionDigits: value < 1000 ? 2 : 0, minimumFractionDigits: value < 1000 ? 2 : 0 });
}
export async function priceMovements(investigation: Investigation, fetcher: typeof fetch = fetch, timeoutMs = 6000) {
  if (process.env.CHAINSIGHTLINE_PRICES === "off") return null;
  const coins = [...new Set(investigation.movements.filter(movement => units(movement) !== null).map(coinOf).filter((coin): coin is string => coin !== null))].slice(0, 60);
  if (!coins.length) return null;
  const basis = investigation.kind === "transaction" ? "at the time" as const : "today" as const;
  const timestamp = Math.floor(Date.parse(investigation.observedAt) / 3600000) * 3600;
  const url = "https://coins.llama.fi/prices/" + (basis === "at the time" && Number.isFinite(timestamp) ? "historical/" + timestamp + "/" : "current/") + coins.join(",") + "?searchWidth=4h";
  let prices: Record<string, { price?: unknown; confidence?: unknown }>;
  try {
    const response = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    prices = ((await response.json()) as { coins?: typeof prices }).coins ?? {};
  } catch { return null; }
  let priced = 0;
  for (const movement of investigation.movements) {
    const coin = coinOf(movement);
    const quote = coin ? prices[coin] : undefined;
    const amount = units(movement);
    if (!quote || amount === null || typeof quote.price !== "number" || !Number.isFinite(quote.price) || typeof quote.confidence !== "number" || quote.confidence < 0.9) continue;
    movement.usd = formatUsd(amount * quote.price);
    priced++;
  }
  return priced ? { source: PRICE_SOURCE, basis } : null;
}

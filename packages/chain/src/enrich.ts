import type { Investigation } from "../../core/src/investigation";
import { shortHash } from "../../core/src/route";
import { resolveNames } from "./labels";
import { priceMovements } from "./prices";
import type { Rpc } from "./rpc";
import { detectSignals } from "./signals";
export async function enrich(investigation: Investigation, rpc: Rpc, fetcher: typeof fetch = fetch) {
  const [names, prices] = await Promise.all([resolveNames(investigation, rpc).catch(() => ({})), priceMovements(investigation, fetcher)]);
  const signals = await detectSignals(investigation, rpc).catch(() => []);
  const named = (text: string) => Object.entries(names).reduce((value, [address, entry]) => value.split(shortHash(address)).join(entry.name + " (" + shortHash(address) + ")"), text);
  const result: Investigation = { ...investigation, warnings: [...investigation.warnings, ...signals].map(warning => ({ ...warning, reason: named(warning.reason) })) };
  if (Object.keys(names).length) result.names = names;
  if (prices) {
    result.prices = prices;
    result.coverage = { ...result.coverage, limitations: [...result.coverage.limitations, "Dollar values come from " + prices.source + " prices " + prices.basis + "; tokens without a reliable price show none"] };
  }
  if (signals.length) result.coverage = { ...result.coverage, limitations: [...result.coverage.limitations, "Scam warnings come from simple patterns and can be wrong in both directions"] };
  return result;
}

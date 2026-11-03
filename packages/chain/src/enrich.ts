import type { Investigation } from "../../core/src/investigation";
import { shortHash } from "../../core/src/route";
import { resolveNames } from "./labels";
import { priceMovements } from "./prices";
import type { Rpc } from "./rpc";
import { describeAddress, detectSignals } from "./signals";
export async function enrich(investigation: Investigation, rpc: Rpc, fetcher: typeof fetch = fetch) {
  const [names, prices] = await Promise.all([resolveNames(investigation, rpc).catch(() => ({})), priceMovements(investigation, fetcher)]);
  const signals = await detectSignals(investigation, rpc, names).catch(() => []);
  const addresses = [...new Set([investigation.subject, ...investigation.movements.flatMap(movement => [movement.from, movement.to])])];
  const unique = Object.keys(names).filter(address => addresses.filter(other => shortHash(other) === shortHash(address)).length === 1);
  const named = (text: string) => unique.reduce((value, address) => value.split(shortHash(address)).join(describeAddress(address, names)), text);
  const result: Investigation = { ...investigation, warnings: [...investigation.warnings.map(warning => ({ ...warning, reason: named(warning.reason) })), ...signals] };
  if (Object.keys(names).length) result.names = names;
  if (prices) {
    result.prices = prices;
    result.coverage = { ...result.coverage, limitations: [...result.coverage.limitations, "Dollar values come from " + prices.source + " prices " + prices.basis + "; tokens without a reliable price show none"] };
  }
  if (signals.length) result.coverage = { ...result.coverage, limitations: [...result.coverage.limitations, "Scam warnings come from simple patterns and can be wrong in both directions"] };
  return result;
}

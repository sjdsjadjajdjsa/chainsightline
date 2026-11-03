import type { Investigation } from "../../core/src/investigation";
import { asSentence, describeMovement, displayAsset, nameOf, shortHash } from "../../core/src/route";
import type { EvidencePackage } from "../../providers/src/analysis";
import { AnalysisError } from "../../providers/src/analysis";
import { OpenRouterAnalysisProvider } from "../../providers/src/openrouter";
import { resolveKeys } from "./config";
export const DEFAULT_MODEL = "moonshotai/kimi-k3.1-pro";
export type Explanation = { summary: string; uncertainty: string; citations: string[]; model: string; provider: string; costUsd: number | null };
const describe = (address: string, investigation: Investigation) => { const name = nameOf(address, investigation); return name ? name + " (" + shortHash(address) + ")" : shortHash(address); };
export function toEvidence(investigation: Investigation): EvidencePackage {
  const evidence: EvidencePackage["evidence"] = [];
  for (const check of investigation.checks ?? []) evidence.push({ id: "check-" + check.id, kind: "label", description: "Check (" + check.status + "): " + check.title + ". " + check.detail });
  investigation.movements.forEach((movement, index) => {
    const parts = describeMovement(movement, investigation);
    const notes = investigation.warnings.filter(warning => warning.evidenceId === movement.evidenceId).map(warning => "Warning: " + asSentence(warning.title) + " " + warning.reason);
    evidence.push({ id: "stop-" + (index + 1), kind: movement.kind, description: [parts.before + parts.amount + (movement.usd ? " (" + movement.usd + ")" : "") + parts.after, "From " + describe(movement.from, investigation) + " to " + describe(movement.to, investigation) + ".", movement.description + ", " + displayAsset(movement.asset) + ".", ...notes].join(" ").slice(0, 3900) });
  });
  if (!evidence.length) evidence.push({ id: "summary", kind: "label", description: investigation.explanation.summary });
  const coverage = [investigation.explanation.summary, ...(evidence.length > 50 ? ["Only the first 50 of " + evidence.length + " items were provided."] : []), "Subject " + describe(investigation.subject, investigation) + ".", ...investigation.coverage.limitations.map(asSentence)].join(" ").slice(0, 1990);
  return { version: "1", synthetic: investigation.synthetic, chain: "ethereum-mainnet", blockHash: investigation.blockHash.toLowerCase(), coverage, evidence: evidence.slice(0, 50) };
}
export async function aiAvailable() {
  const { keys } = await resolveKeys();
  return Boolean(keys.openrouter);
}
export async function explainInvestigation(investigation: Investigation, fetcher: typeof fetch = fetch): Promise<Explanation> {
  const { keys } = await resolveKeys();
  if (!keys.openrouter) throw new AnalysisError("configuration", "AI explanations need an OpenRouter key. Add one under “Your keys”.");
  const provider = new OpenRouterAnalysisProvider({ apiKey: keys.openrouter, model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL, fetch: fetcher, timeoutMs: 60000, maxOutputTokens: 3000, requireZeroDataRetention: process.env.CHAINSIGHTLINE_AI_REQUIRE_ZDR !== "false" });
  const result = await provider.explain(toEvidence(investigation));
  return { summary: result.analysis.summary, uncertainty: result.analysis.uncertainty, citations: result.analysis.evidenceIds, model: result.model, provider: result.provider, costUsd: result.usage.costUsd };
}

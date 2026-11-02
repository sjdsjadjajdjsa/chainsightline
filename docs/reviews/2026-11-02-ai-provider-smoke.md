# AI provider compatibility smoke

Date: 2026-11-02

## Scope

A user-authorized OpenRouter key with a $1 limit and one-day expiration was used for small synthetic-evidence requests. No private investigations, credentials, or live blockchain data were included. This tests API compatibility, not detection quality, factual reliability or privacy compliance.

## Results

The first probes verified the OpenRouter model ID `moonshotai/kimi-k3.1-pro` and structured responses from Kimi, OpenAI and Google. The final adapter sent the same versioned synthetic package to all three, with strict JSON Schema, required parameter support, no fallback and data-collection restrictions.

| Model | Endpoint | Structured result | Reported request cost |
| --- | --- | --- | --- |
| `moonshotai/kimi-k3.1-pro` | Moonshot AI | Passed | $0.004436 |
| `openai/gpt-4.1-mini` | OpenAI | Passed | $0.0001928 |
| `google/gemini-2.5-flash` | Google AI Studio | Passed | $0.0002499 |

Final adapter run total: **$0.0048787** as reported by the responses. Initial probes plus adapter tests remained a very small fraction of the $1 cap. The key endpoint's lifetime usage counter later showed $0.0032238, which did not yet reconcile with all reported request costs; do not treat either view as a final invoice. Production accounting should retain generation IDs and reconcile settled usage.

An additional explicit `zdr: true` synthetic test passed for OpenAI. Initial broad smoke tests allowed non-ZDR endpoints where required; this is not a privacy guarantee and must not become a silent production fallback.

The adapter defaults to ZDR, rejects malformed JSON, schema violations, unknown citations, truncation, refusals, missing usage and provider errors, and reports costs without retaining credentials. Fifteen offline tests and strict TypeScript checking passed. Dependency audit passed after updating Zod.

## Naming check

BlockTrace was rejected after finding an established blockchain tracing and incident-response business. A deeper check also rejected ChainWitness because chainwitness.net already offers crypto address lookup and evidence-backed scam reports. ChainSightline was subsequently selected as the working identity; initial exact-name checks found no direct product match, though ChainSight is a separate established analytics company. These are preliminary checks, not trademark advice or a clearance search.

## Limits

One synthetic transfer cannot measure explanation quality, hallucination rates or malicious-activity detection. The next milestone remains real evidence contracts and a transaction investigation, followed by adversarial and claim-grounding evaluation.

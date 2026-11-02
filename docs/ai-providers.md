# AI provider contract

Product AI is optional. Deterministic evidence and signals remain the source of truth.

The `AnalysisProvider` interface accepts a frozen evidence package and returns a summary, evidence references, uncertainty and reported usage. It does not create authoritative risk findings. The first implementation uses OpenRouter's structured-output API. Other providers can implement the same boundary; a model must support the required structured-output and privacy settings. "Model agnostic" means compatible models, not guaranteed support for every model.

## Verified smoke configuration

- Default model: `moonshotai/kimi-k3.1-pro` on OpenRouter. Direct Kimi Platform uses the provider-specific identifier and needs a separate adapter.
- Tested: `moonshotai/kimi-k3.1-pro`, `openai/gpt-4.1-mini`, `google/gemini-2.5-flash`.
- Request strict JSON Schema, `provider.require_parameters: true`, `data_collection: "deny"` and no provider fallback.
- Prefer `zdr: true`. An explicit test override was needed for two endpoints in the initial smoke; production must not weaken privacy automatically.
- Bound output tokens, request time and price. No automatic paid retries.

## Local checks

```sh
npm ci
npm test
npm run typecheck
```

For an authorized live compatibility test, inject `OPENROUTER_API_KEY` through your environment manager and run `npm run test:ai:live`. `OPENROUTER_MODELS` selects a comma-separated model list. `OPENROUTER_REQUIRE_ZDR=false` is a deliberate, synthetic-data-only override, not the default.

Never place credentials in source, shell history, chat, captured responses or Git. Use only synthetic evidence for smoke tests. A credential shared in chat should be revoked and replaced.

## Validation boundaries

Local validation rejects malformed responses, unknown evidence IDs, incomplete responses and missing usage. A valid citation does not prove the generated sentence is supported by that evidence. Full claim-level grounding, real evidence packages and model-quality evaluation remain part of the investigation slice.

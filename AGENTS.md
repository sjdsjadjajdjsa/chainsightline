# Repository guidance

- The website and terminal read real Ethereum transactions (keyless via dRPC public access) and address history (with an Alchemy key). AI explanations, durable storage and most detection rules are not built yet. Do not describe planned capabilities as implemented or measured.
- Keys come from environment variables, the project `.env` or `~/.config/chainsightline/keys.json`. Never print, log or return them; `packages/chain/src/rpc.ts` redacts them from provider errors.
- Use Kimi K3.1 Pro for most implementation work. Other models may provide specialist review. Product AI uses the provider-neutral evidence-analysis boundary, defaults to Kimi and supports compatible explicitly configured models. Never silently fall back or weaken privacy controls.
- Follow `docs/plans/2026-11-02-blockchain-investigation-tool-design.md` for scope and evidence contracts.
- Never commit credentials, private investigation data or unsanitized provider captures. `.env.example` must contain placeholders only.
- Keep provider-specific behavior behind adapters and expose exact coverage, provenance and canonical block identity.
- Deterministic rules produce signals; AI explains evidence but cannot invent observations, citations or verdicts.
- Do not initialize deployment, paid provider calls, public repository visibility or public application access without explicit approval.
- Keep web and terminal wording in `packages/core/src/route.ts` so both surfaces tell the same story.
- Verify with `npm run typecheck`, `npm test` and, with the site running, `npm run test:browser`. Record real results and limitations.

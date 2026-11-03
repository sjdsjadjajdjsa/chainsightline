# Repository guidance

- The website, terminal command and AI adapter run on invented evidence only. Do not describe planned capabilities, such as live Ethereum collection, as implemented or measured.
- Use Kimi K3.1 Pro for most implementation work. Other models may provide specialist review. Product AI uses the provider-neutral evidence-analysis boundary, defaults to Kimi and supports compatible explicitly configured models. Never silently fall back or weaken privacy controls.
- Follow `docs/plans/2026-11-02-blockchain-investigation-tool-design.md` for scope and evidence contracts.
- Never commit credentials, private investigation data or unsanitized provider captures. `.env.example` must contain placeholders only.
- Keep provider-specific behavior behind adapters and expose exact coverage, provenance and canonical block identity.
- Deterministic rules produce signals; AI explains evidence but cannot invent observations, citations or verdicts.
- Do not initialize deployment, paid provider calls, public repository visibility or public application access without explicit approval.
- Keep web and terminal wording in `packages/core/src/route.ts` so both surfaces tell the same story.
- Verify with `npm run typecheck`, `npm test` and, with the site running, `npm run test:browser`. Record real results and limitations.

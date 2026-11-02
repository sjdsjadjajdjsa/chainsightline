# Repository guidance

- This repository is currently design-only. Do not describe planned capabilities as implemented or measured.
- Use Kimi K3.1 Pro for most implementation work. Other models may provide specialist review. Product AI uses the provider-neutral evidence-analysis boundary, defaults to Kimi and supports compatible explicitly configured models. Never silently fall back or weaken privacy controls.
- Follow `docs/plans/2026-11-02-blockchain-investigation-tool-design.md` for scope and evidence contracts.
- Never commit credentials, private investigation data or unsanitized provider captures. `.env.example` must contain placeholders only.
- Keep provider-specific behavior behind adapters and expose exact coverage, provenance and canonical block identity.
- Deterministic rules produce signals; AI explains evidence but cannot invent observations, citations or verdicts.
- Do not initialize deployment, paid provider calls, public repository visibility or public application access without explicit approval.
- Verify changes with the repository's typecheck, lint, tests and build once those commands exist. Record real results and limitations.

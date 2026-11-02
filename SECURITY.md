# Security and data handling

## Current status

Blocktrace is in design stage. No hosted service, application authentication or live provider integration exists yet. These are intended boundaries, not completed security controls.

## Reporting a vulnerability

Do not open a public issue containing credentials, exploit details or private investigation data. Until a dedicated security contact is configured, contact the repository owner privately through their GitHub account. A private reporting route will be documented before public contributions or deployment are accepted.

## Design boundaries

- Provider, database and Kimi credentials belong only on the server.
- Investigation access requires authentication and authorization before a hosted pilot.
- On-chain text, token metadata and external labels are untrusted input.
- Deterministic observations and signals are separate from generated AI explanations.
- Missing evidence is unknown or partial, never proof of safety.
- Live provider and paid model calls must not run in untrusted pull-request workflows.

## Before deployment

Authentication and authorization review, rate and spending limits, secret management, retention/deletion rules, private caching, backups and tested recovery must be implemented and verified. Investigation history may be sensitive even though blockchain identifiers are public.

The [architecture](docs/plans/2026-11-02-blockchain-investigation-tool-design.md) and [release checklist](docs/plans/2026-11-02-github-roadmap.md) contain the full security requirements.

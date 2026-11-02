# Blockchain investigation tool

A planned read-only Ethereum investigation tool for inspecting address and transaction activity, explainable risk signals and cited Kimi K3.1 Pro analysis.

## Current status

**Design stage. There is no runnable application, blockchain scanner or AI integration yet.** No live provider calls have been made and no detection accuracy has been measured.

The first planned workflow is:

1. Submit an Ethereum address or transaction hash.
2. Collect bounded evidence from an indexed-history and call-tracing provider.
3. Show source-backed risk signals and a single-transaction movement graph.
4. Optionally ask Kimi K3.1 Pro to explain the frozen evidence with citations.

Missing history or traces will be reported as incomplete, never as proof that activity is safe.

## Planned stack

TypeScript, Next.js, React, viem, PostgreSQL, Drizzle, pg-boss, Zod and Cytoscape.js. The web application and background worker will share domain packages in one repository.

## Documentation

- [Investigation tool design](docs/plans/2026-11-02-blockchain-investigation-tool-design.md)
- [GitHub readiness and delivery roadmap](docs/plans/2026-11-02-github-roadmap.md)

## Development

Application setup and verification commands will be added with the TypeScript foundation. `.env.example` contains placeholders only; local environment files are ignored by Git.

Kimi K3.1 Pro is the primary development model and intended product-analysis model. Application inference requires separate authorized Kimi Platform API access; a Kimi Code subscription is not assumed to provide it.

## Release status

Private development repository. A license, contribution policy and public-release checklist will be resolved before deliberately making the project public. No permission for public redistribution is implied at this stage.

# GitHub readiness and delivery roadmap

Status: proposed, 2026-11-02

## Current state

The architecture is reviewed. A local Git repository and initial documentation/hygiene files are being prepared. There is no application code, license or CI. GitHub CLI authentication is available. No remote repository has been created and nothing has been pushed.

Create a private GitHub repository when cj approves publication. Keep it private until the product name, license, setup instructions and security boundaries are clear. Making it public is a separate decision.

## 1. Repository foundation

- Choose a product name and public one-sentence description; `blockchain` is only the working directory.
- Initialize Git locally, confirm the author identity and create the initial documented commit only with cj's approval.
- Add `.gitignore`, `.dockerignore`, `.gitattributes`, `.editorconfig`, `.env.example` and repository instructions before credentials enter the workspace. Never commit API credentials, session secrets, private case data, raw dumps containing sensitive metadata, databases or generated dependencies.
- Select an explicit license before public release. A source-visible repository without a license is not permission for others to reuse it.
- Add a README with scope, supported chains, limitations, architecture, local setup, test commands and AI/provider configuration.
- Add `SECURITY.md` for vulnerability reporting and `CONTRIBUTING.md` when outside contributions are wanted. Add a code of conduct only if the project will accept a public community.
- Keep implementation design and decision records in `docs/`; use GitHub Issues for actionable work and Pull Requests for reviewed changes.

## 2. Buildable TypeScript foundation

- Pin the current active Node.js LTS and pnpm versions; use pnpm workspaces and committed lockfiles. Mark application/internal packages `private: true` to prevent accidental npm publication.
- Create `apps/web`, `apps/worker`, `packages/core`, `packages/providers` and `packages/db` with strict TypeScript project references and shared formatting/linting.
- Add checked-in Drizzle migrations, local PostgreSQL 18, pg-boss and Docker Compose. Include a documented reset path for disposable local development data.
- Add server-only environment validation and a local owner login. Keep provider and model credentials out of the browser.
- Establish the ensoul design system before constructing investigation screens.
- Make `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` reproducible on a clean checkout.

## 3. Provider and model proof

This needs cj's service accounts and credentials; do not request secrets in chat or commit them.

- Select an Ethereum indexed-transfer-history and historical call-tracing provider. Alchemy is the current candidate, not an authenticated choice.
- Verify account plan, quotas, historical range, supported transfer categories, pagination, index freshness, retention and commercial terms with real fixtures.
- Create a separate Kimi Platform application credential and verify `kimi-k3.1-pro` access, quotas, retention and costs. Kimi Code subscription access covers development, not automatically product inference.
- Start with no live dependency: define capability contracts, fixture schemas, budgets, error types and clearly marked synthetic examples. Add schema-validated captured fixtures only after credentials and redistribution terms are checked. Keep live-provider smoke tests separate from normal CI.
- Give every fixture provenance, block/transaction identity, provider method, capture time, normalization version, expected coverage and redistribution status. Sanitize request URLs, headers and error bodies as well as credential fields. Never present synthetic results as live-provider validation.

## 4. First usable vertical slice

- Validate an Ethereum transaction hash and collect its receipt, logs and call tree at a finalized block anchor.
- Normalize evidence with exact amounts, canonical block identity, source provenance and truthful coverage. Exclude reverted flows and duplicated root-call value.
- Show transaction facts, raw evidence and a single-transaction native/ERC-20 graph with a 50-node/200-edge display cap.
- Add one bounded page of indexed address transfer history; selecting a transaction opens its evidence view.
- Add sourced labels, possible-address-poisoning and approval-exposure signals. Show uncertainty and benign explanations, not unsupported accusations.
- Add on-demand Kimi summaries over a frozen evidence bundle with strict schema validation and citations. Deterministic evidence remains available if Kimi is disabled.

## 5. Verification and operations

- Build a labeled evaluation set before tuning rules: benign activity, dust recipients, ordinary approvals, known flagged entities, failed transactions and internal calls.
- Test provider pagination, cursor expiry, indexing lag, block mismatch, missing traces, worker crashes, duplicate delivery and rate limits.
- Add real end-to-end coverage through the web UI and worker, including explicit partial and unavailable states.
- Add structured redacted logs, job metrics, provider/model usage, error reporting, data retention and backup/restore checks before deployment.
- Measure false positives, missed labeled cases, provider costs, model costs and latency. Record results rather than claiming unmeasured detection accuracy.

## 6. GitHub automation and security

- GitHub Actions: install with the committed pnpm lockfile, typecheck, lint, unit/contract tests, database integration tests and production build on pull requests and the default branch. Use read-only default permissions, job timeouts and restricted artifact retention. Never run untrusted pull-request code in a privileged `pull_request_target` workflow.
- Keep live-provider and paid Kimi tests out of untrusted pull requests. Run them only in controlled environments with limited secrets and budgets.
- Generate and review `.github/workflows/actions.lock` with `gh actions-lock` to pin action dependencies, including transitive actions. Pin reusable-workflow calls by full commit SHA because the lockfile does not cover them. Use minimal workflow permissions and separate release credentials from CI.
- Add `.github/dependabot.yml` for pnpm, Docker and GitHub Actions updates; group routine updates and require CI.
- Enable secret scanning and push protection where the selected private-repository plan supports them. GitHub currently limits private-repository availability by ownership and GitHub Secret Protection eligibility; user-level push protection only covers pushes to public repositories. Otherwise use suitable standalone scanners in CI.
- Enable CodeQL default setup for JavaScript/TypeScript where available. Private-repository advanced security features may require a paid GitHub Code Security plan; they are not assumed free.
- Add dependency review for pull requests and CodeQL `security-extended` after establishing a clean baseline. Use the enshield skill for the pre-launch application security audit.
- Protect the default branch with required reviews and status checks once collaboration begins. Never require credentials from forked pull requests.

## 7. Before public release

- Resolve the repository/product name, visibility, license, trademark and provider redistribution/attribution terms.
- Replace placeholder documentation with tested setup instructions and an honest supported-coverage statement.
- Complete authentication/authorization review, abuse and spending limits, privacy/retention policy, dependency/security fixes and a recovery drill.
- Deploy a private preview first. Public anonymous access, launch infrastructure and production monitoring need separate approval.
- Only then consider public visibility, releases, screenshots, issue templates and external contribution guidelines.

## Suggested GitHub milestones

1. **Foundation:** repository, workspace, database, CI, documentation and fixtures.
2. **Transaction evidence:** real provider evidence, finalized anchor and evidence UI.
3. **Address investigation:** bounded transfer history, jobs and movement graph.
4. **Signals and Kimi:** explainable rules, cited summaries and evaluation results.
5. **Private preview:** security, operations, cost controls and recovery verification.
6. **Later:** recursive tracing, owner-scoped watchlists, reorg-aware alerts and additional chains.

## Immediate sequence

1. Approve implementation and choose a product name.
2. Create the local repository foundation and private GitHub repository with explicit approval.
3. Build the TypeScript foundation and fixture-backed transaction evidence slice.
4. Connect cj's provider and Kimi Platform accounts in server-side local configuration.
5. Review the working vertical slice before expanding detection or public access.

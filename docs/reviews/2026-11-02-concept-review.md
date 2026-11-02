# Blocktrace concept review

Date: 2026-11-02

## Honest assessment

**Concept: 8/10. Architecture: 8.5/10. Implementation: not yet scoreable.**

This is a good product direction because it addresses a real comprehension problem: blockchain activity is visible, but transaction context and risk are hard to interpret. The decision to show evidence and uncertainty rather than issue opaque accusations is the strongest part of the design.

These scores evaluate the current proposal, not a functioning or validated product. There is no application code, live provider integration, detection benchmark or user research yet.

| Area | Assessment | Reason |
| --- | --- | --- |
| Problem and usefulness | 8/10 | Clear need for readable transaction investigations. |
| Evidence and trust model | 9/10 | Provenance, finalized blocks, citations and explicit uncertainty are well considered. |
| MVP architecture | 8.5/10 | Practical TypeScript stack and sensible limits; still unproven in operation. |
| Detection readiness | 5/10 | Rules are plausible but have no labeled evaluation results. |
| Product differentiation | 6.5/10 | Explainability is promising, but established explorers and forensics products already trace transactions. |
| Implementation | Not scored | No runnable product exists. |

## What is especially good

- **Evidence before AI.** Deterministic observations remain useful if the configured model is unavailable.
- **No universal guilt score.** Signals describe observed patterns and possible benign explanations.
- **Canonical, bounded evidence.** Finalized block identity, pagination and partial coverage avoid common false-confidence failures.
- **Realistic first infrastructure.** TypeScript, PostgreSQL and one worker are enough for the initial product.
- **Read-only scope.** Avoiding wallet signing and automated intervention reduces risk.

## Main weaknesses

1. **No proof of usefulness yet.** The design needs real investigator workflows and measurable outcomes, not just clean architecture.
2. **Detection may be too narrow.** Known labels, address poisoning and approval exposure do not amount to general malicious-transaction detection. That limitation must stay explicit.
3. **Provider dependence is a core product risk.** History coverage, historical traces, quotas and commercial terms can limit both usefulness and public availability.
4. **The audience can become blurred.** Casual safety checks and professional investigations need different explanation depth and workflows. Start with a simple summary and progressively reveal evidence.
5. **Cross-chain forensics is a different problem.** Bridges, exchange records and entity attribution cannot be inferred reliably from a simple Ethereum graph.
6. **The repository cannot yet substantiate its presentation.** Professional documentation is useful, but working software and reproducible evidence matter more.

## Highest-value improvements

### 1. Prove one investigation end to end

Build the offline transaction evidence slice first. Then connect one real provider and test successful, reverted, token, approval and missing-trace transactions. Do not expand into broad chain coverage before this works.

### 2. Publish a small evaluation report

Use labeled benign and malicious cases with provenance. Report true positives, false positives, unsupported cases and provider blind spots separately. Include ordinary approvals and unsolicited dust recipients to expose over-warning.

### 3. Make explanations actionable

For each signal, show what was observed, why it may matter, what else could explain it and what the user can verify next. Approval exposure could eventually link to a trusted revocation resource, but the application itself should not submit wallet transactions.

### 4. Choose a clear niche

Do not attempt to replicate full Chainalysis or TRM attribution. A credible starting niche is **inspectable evidence with plain-language explanations**. Competing products already offer extensive tracing, labels and cross-chain capabilities:

- [Chainalysis Reactor](https://www.chainalysis.com/product/reactor)
- [TRM Forensics](https://www.trmlabs.com/forensics)
- [Chainabuse](https://www.chainabuse.com/)

These vendor pages describe their own products; their coverage and marketing claims have not been independently validated here.

### 5. Test with target users early

Give a few security-curious users and investigators the same cases. Measure whether they can correctly explain the evidence, spot incomplete coverage and avoid treating a connection as guilt. Record comprehension and task completion, not only interface preference.

### 6. Keep costs and privacy visible

Track provider and model usage per investigation. Define retention before hosting investigations. Public identifiers do not make a person's search and investigation history non-sensitive.

## Recommended next decision

Approve the narrow implementation milestone: TypeScript foundation plus an offline transaction evidence vertical slice. Defer live AI, broad detection, recursive graphs and public deployment until that slice and its acceptance tests pass.

## Review limitations

This review inspected the repository's design and presentation documents and checked selected official product sources. It did not execute an application, call a blockchain provider, evaluate detection rules or conduct user research.

## Follow-up review

Independent reviewers supported the focused direction and emphasized: one clear user decision first, approval events versus current allowance, cautious poisoning candidates, typed claim support beyond valid citations, immediate investigation-data privacy, and total cost measurement. The design was updated accordingly. Their alternative proposal ratings were 7/10 overall and 4/10 for product differentiation; see the assessment above for this document's own scores and rationale.

<p align="center">
  <img src="docs/assets/chainsightline-banner.png" alt="ChainSightline: follow the line. Every investigation, one stop at a time." width="100%" />
</p>

# ChainSightline

**Follow the line.** ChainSightline turns blockchain activity into one route you read from top to bottom: what moved, between whom, which warnings deserve a look, and exactly where the evidence ends.

> [!IMPORTANT]
> **Early preview.** The website, terminal command and AI provider adapter work, but ChainSightline is **not connected to Ethereum yet**. Every search shows the same clearly labelled invented example.

<p align="center">
  <img src="docs/assets/route-light.png" alt="A ChainSightline route in the light theme: a starting point and stops connected by one line" width="49%" />
  <img src="docs/assets/route-dark.png" alt="The same route in the dark theme" width="49%" />
</p>

## Try it

You need [Node.js](https://nodejs.org) 22.12 or newer. Docker is optional.

```sh
git clone https://github.com/sjdsjadjajdjsa/chainsightline.git
cd chainsightline
npm install
```

### In your terminal

```sh
npm run cli -- sample                 # draw the example route
npm run cli -- trace 0xYourAddress    # paste any address or transaction hash
npm run cli -- sample --evidence      # include full addresses for every stop
npm run cli -- sample --json          # machine-readable output
```

Run `npm link` once to use it as `chainsightline` from anywhere, for example `chainsightline trace 0x…`.

<p align="center">
  <img src="docs/assets/cli.png" alt="The same route drawn in a terminal, with coloured addresses and the line running down the left" width="80%" />
</p>

### In your browser, no Docker

```sh
npm run web          # or: chainsightline web
```

The first run builds the site, then it opens at `http://127.0.0.1:3000` in your default browser. Press Ctrl+C to stop it. Use `--port 3001` if 3000 is busy and `--no-open` to skip the browser.

### In Docker

```sh
npm start            # build, wait until healthy, open the browser
npm stop             # stop without deleting data
```

The container is read-only, runs as a non-root user and is reachable only from your own computer.

## How it works

```mermaid
flowchart LR
    A["Address or transaction"] --> B["Collect evidence<br/>(planned)"]
    B --> C["Normalise into stops"]
    C --> D["Explainable warnings"]
    D --> E["The route<br/>web or terminal"]
    E --> F["Optional cited<br/>AI explanation"]

    style B fill:#f4f0e6,stroke:#9a4f17,color:#1d2928,stroke-dasharray:4 3
    style A fill:#e3efe9,stroke:#21685c,color:#1d2928
    style C fill:#e3efe9,stroke:#21685c,color:#1d2928
    style D fill:#e3efe9,stroke:#21685c,color:#1d2928
    style E fill:#e3efe9,stroke:#21685c,color:#1d2928
    style F fill:#e3efe9,stroke:#21685c,color:#1d2928
```

1. You paste an address or transaction hash. It is checked before anything else happens.
2. **Today** the server returns the invented example. **Planned:** a worker fetches receipts, token transfers and call traces from an Ethereum provider.
3. Each movement becomes a stop with a plain sentence such as "0.42 ETH left the subject", plus the two addresses colour-coded and labelled by role.
4. Rules attach warnings to the stop they concern, for example an unlimited token approval. A warning is a reason to look closer, never a verdict.
5. The route ends with what is still unknown, so missing data never reads as safety.
6. Optionally, an AI model (Kimi by default, or any compatible OpenRouter model) explains the route. Its answer must cite the evidence or it is rejected.

The website and the terminal share the same evidence format and wording, so both always tell the same story.

## Product principles

| Principle | What it means |
| --- | --- |
| Evidence before conclusions | Every signal links to source observations and coverage. |
| Honest uncertainty | Missing traces, unsupported activity and partial history stay visible. |
| AI with boundaries | A configured compatible model summarizes a frozen evidence bundle; validation rejects invented citations. |
| Small, measurable scope | Ethereum first. No full-chain indexing or cross-chain claims in the MVP. |
| Read-only by design | No wallet signing, transaction submission or automated fund blocking. |

## Planned architecture

```mermaid
flowchart TB
    UI["Next.js investigation interface"] --> API["Server API"]
    API --> DB[("PostgreSQL evidence and jobs")]
    API --> Worker["Durable TypeScript worker"]
    Worker --> History["Indexed transfer-history provider"]
    Worker --> Chain["Tracing-capable Ethereum RPC"]
    Worker --> Rules["Evidence normalizer and detection rules"]
    Worker --> AI["Configured evidence explanation provider"]
    Rules --> DB
    AI --> DB
```

**Planned architecture; no deployed infrastructure yet.**

**TypeScript throughout:** Next.js, React, viem, PostgreSQL, Drizzle, pg-boss, Zod and Cytoscape.js. One web application and one worker; no premature microservices.

See the [full architecture](docs/plans/2026-11-02-blockchain-investigation-tool-design.md) for provider coverage, canonical evidence, transfer semantics, recovery and security contracts.

## Roadmap

| Milestone | Scope | Status |
| --- | --- | --- |
| Architecture and repository | Reviewed design, private repository and project guidance | Complete |
| AI provider contract | Model-neutral evidence schema, OpenRouter adapter and offline tests | Complete for the preview |
| Sightline website | One-line route design, intro, light and dark themes, mobile layout | Preview working |
| Terminal command | `chainsightline trace`, `sample` and `web` without Docker | Preview working |
| Live Ethereum investigation | Provider-backed transaction and bounded address history | Next |
| Branching routes | One address sending to several, shown on the line | Design needed |
| Signals | Versioned, explainable rules with labelled test cases | Not started |
| Cited AI analysis in the app | Configurable model explanations over frozen evidence | Adapter tested |
| Private preview | Database, jobs, security, recovery and cost checks | Not started |

The detailed [delivery roadmap](docs/plans/2026-11-02-github-roadmap.md) tracks release gates. The [concept review](docs/reviews/2026-11-02-concept-review.md) records strengths, weaknesses and priorities. The [design system](design_system/README.md) explains the visual rules.

## Development

```sh
npm run dev            # live-reloading website
npm test               # unit tests for the evidence format, route wording, CLI and AI adapter
npm run typecheck
npm run test:browser   # with the site running: phone, laptop and ultrawide checks in both themes
```

Kimi K3.1 Pro is the primary development model and the default product model. OpenRouter provides the provider-neutral transport; Kimi, OpenAI and Google models passed a small structured-output compatibility test. There is no silent fallback and privacy settings are never weakened automatically. See [AI provider configuration](docs/ai-providers.md) and the [smoke report](docs/reviews/2026-11-02-ai-provider-smoke.md). Real environment files are ignored by Git.

## Security and release

Not yet publicly released. A license, contribution policy and private security contact are still needed before the repository goes public. See [security and data-handling notes](SECURITY.md).

No license has been selected. Reuse and redistribution are not currently granted.

---

*ChainSightline is the selected working name following preliminary name-conflict checks. Trademark clearance remains a separate public-release step.*

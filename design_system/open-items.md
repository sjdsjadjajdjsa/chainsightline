# Open items

- Routes are written by deterministic rules. AI explanations are optional, on request, and must cite stops; they can still misstate what a stop shows.
- Database, authentication, jobs and durable investigations are not implemented.
- Passed local browser acceptance at 390, 1440 and 3440 widths, light/dark, interactions and health endpoint on 2026-11-02.
- Docker launcher verified on 2026-11-02: `npm start` builds, starts and waits for a healthy loopback-only container. Host networking is used for the build step, and the runtime network uses MTU 1280, because bridge networking stalled behind cj's WireGuard VPN; the port remains bound to 127.0.0.1.
- Intro plays once per browser session, never blocks clicks and is skipped with reduced motion. Theme choice is remembered in local storage.
- Terminal command (`chainsightline`) renders the same route; web mode runs without Docker via `next start`. Neither is published to npm.
- 2026-11-03: live Ethereum transactions (keyless via dRPC public access) and Alchemy address history are connected. The invented example remains one click away and is labelled.
- Movements within a transaction are grouped (ETH before token events), not in strict execution order.
- Branching routes (one address sending to many) still render as a straight list of stops.
- Names: known labels win over ENS; ENS names must be plain ASCII `.eth` names and the hash is always shown beside any name, so a name can't hide a lookalike address.
- Dollar values only appear for prices DefiLlama reports with at least 90% confidence; transactions use the price at the time, address history uses today's price.
- "Not sent by this address" only applies to personal wallets (including EIP-7702 delegated ones), unpriced fungible tokens, so marketplace and exchange pulls are not flagged.
- Wallet checkup finds approvals by checking tokens the wallet received against apps it used and well-known spenders (free-tier providers block full approval-log history). Approvals to apps the wallet never called can be missed.
- Kimi K3.1 Pro explanations take 25–60 seconds and cost about $0.01–0.02.

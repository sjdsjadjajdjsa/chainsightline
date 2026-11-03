# Security

## Reporting a vulnerability

Please report security problems privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue, and never include real API keys or private wallet details in a report.

You should get a first reply within a week.

## What ChainSightline protects

- **Your keys.** dRPC, Alchemy and OpenRouter keys stay on your computer (environment variables, a local `.env` file, or `~/.config/chainsightline/keys.json`, readable only by you). They are only ever sent to the provider they belong to and are removed from every error message.
- **Your local server.** The website and its API answer only requests from your own computer and from ChainSightline's own pages. Other websites can't frame it, save keys, or make it spend your provider allowance, and a shared link waits for your click before looking anything up.
- **Untrusted chain data.** Token names, ENS names and on-chain text are treated as data, never instructions. They are cleaned before they reach the terminal or an AI model, and off-chain ENS lookups are turned off.
- **Read-only by design.** ChainSightline never connects a wallet, signs anything or moves funds.

## Known limits

- Scam warnings come from simple patterns and can be wrong in both directions. A missing warning is not proof that something is safe.
- AI explanations can misstate what a stop shows. Each one cites the stops it relies on so you can check.
- ChainSightline is built to run on your own computer. It has no accounts or rate limits, so do not expose it to the internet as a public service.

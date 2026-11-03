# Contributing

Thanks for your interest in ChainSightline.

## Getting started

```sh
npm install
npm run dev          # the website at http://127.0.0.1:3000
npm test             # unit tests
npm run typecheck
```

`npm run test:browser` checks the running site in a real browser at phone, laptop and ultrawide sizes.

## Guidelines

- Keep wording shared between the website and the terminal in `packages/core/src/route.ts`, so both tell the same story.
- A warning is a reason to look closer, never a verdict. New rules need tests for both a real hit and a lookalike that should not be flagged.
- Never commit API keys, `.env` files or private wallet data.
- Follow the visual rules in [the design system](design_system/README.md).

Open an issue before starting a large change, so we can agree on the approach first.

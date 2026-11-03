# ChainSightline design system

## Idea

Follow the line. Every investigation is one route read from top to bottom, in the browser and in the terminal. Calm investigation, not a dashboard.

## Reference direction

The owner supplied `clotheshoesandwoes/web-refs`. Use its discipline: one subject-driven idea, two typefaces, restrained motion from the subject, and judgement by phone and desktop screenshots. The implemented direction is the sightline route (see `docs/superpowers/specs/2026-11-03-sightline-route-design.md`).

## Product

Local-first, read-only blockchain investigations. Invented evidence is labelled until live collection exists.

## Reading order

1. `identity.md`: brand, type, colour, motion and what to avoid.
2. `preferences.md`: owner feedback and decisions over time.
3. `open-items.md`: what is not implemented or verified.

Implementation: `apps/web/app/globals.css`, `apps/web/components/` (Intro, SightlineWorkspace, Brand), the terminal renderer in `packages/cli/src/main.ts`, and shared wording in `packages/core/src/route.ts`.

## Assets and checks

- `npm run test:browser` (site running) captures `screenshots/` at 390, 1440 and 3440 px in both themes and checks the intro, theme memory, evidence disclosure and validation.
- `node design_system/tools/readme-assets.mjs` (site running) regenerates the README banner, terminal image and route screenshots in `docs/assets/`.

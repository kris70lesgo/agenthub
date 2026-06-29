# Submission assets

## Feature graphics

- Hero: workflow canvas with glowing active edge and Casper attestation badge.
- Architecture: Next.js + FastAPI + LangGraph + NVIDIA NIM + Casper Testnet.
- Trust layer: workflow hash, execution hash, agent version, reputation score.
- Marketplace: professional agent cards with reputation, price, runtime, and
  publisher.

## Screenshots to capture

Captured assets:

1. [Landing page hero](assets/landing.png)
2. [Dashboard](assets/dashboard.png)
3. [Marketplace agent grid](assets/marketplace.png)
4. [Workflow Studio](assets/workflow-studio.png)
5. [Runtime console](assets/runtime.png)
6. [Casper trust page](assets/casper.png)

## GIF plan

1. Start on Workflow Studio.
2. Click **Run Workflow**.
3. Show nodes moving through running/success states.
4. Cut to Runtime console live logs.
5. Cut to Casper page showing the new attestation.

## Submission checklist

- Production build passes.
- API tests pass.
- Contract `cargo check` passes.
- `.env.example` includes NVIDIA, API, database, and Casper settings.
- README links to setup, architecture, deployment, judge guide, and demo script.
- No prompts, AI outputs, or private secrets are intended for on-chain storage.

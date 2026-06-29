# Judge guide

## Two-minute walkthrough

1. Open AgentHub and start on the landing page.
2. Enter the platform and show the dashboard: installed agents, active
   workflows, runtime health, and trust ledger.
3. Open Workflow Studio and press **Run Workflow** for:

   > Research NVIDIA's latest AI announcements, summarize them, translate them
   > into Hindi, generate a presentation outline, and draft an email.

4. Narrate the live runtime: Planner, Research, Summarizer, Translator,
   Presentation, and Email agents stream through the same execution UI.
5. Open the Runtime inspector to show structured output previews, logs, tokens,
   latency, and cost.
6. Open Casper to show wallet/network state, workflow hash, execution hash,
   contract-call transaction records, agent identity, and reputation updates.

## What to emphasize

- Real multi-agent execution uses NVIDIA NIM with Kimi K2.6.
- The UI is not a chat wrapper; it is an operating surface for workflows.
- Every workflow completion creates compact verifiability artifacts.
- The Odra contract stores hashes and scores only, never prompts or AI outputs.
- The architecture is deployable: Vercel frontend, Railway backend, Supabase
  Postgres, Casper Testnet.

## Backup path

If network latency is high, use the existing completed runtime and Casper trust
records to explain the same flow. The app still builds and demonstrates the
complete architecture locally.

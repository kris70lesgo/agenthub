# FAQ

## Is AgentHub a chatbot?

No. Chat is only an input pattern. AgentHub is a workflow operating surface for
multi-agent execution, observability, trust, reputation, and marketplace
distribution.

## What AI model does it use?

The backend uses NVIDIA NIM with `moonshotai/kimi-k2.6` through an
OpenAI-compatible provider adapter.

## Does it store AI output on Casper?

No. The contract stores hashes and compact metadata only.

## What does the Odra contract store?

Agent ID, publisher, version, workflow hash, execution hash, timestamp,
reputation score, execution count, and successful execution count.

## Can it be deployed?

Yes. The target deployment is Vercel for the frontend, Railway for FastAPI,
Supabase Postgres for persistence, and Casper Testnet for the trust layer.

## What should judges try?

Run:

> Research NVIDIA's latest AI announcements, summarize them, translate them
> into Hindi, generate a presentation outline, and draft an email.

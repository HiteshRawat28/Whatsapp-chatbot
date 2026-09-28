# VoltAssist AI — Meta WhatsApp Cloud API Showcase

A full-stack assignment project demonstrating a professional WhatsApp customer-support journey, backend automation, lead capture, human handoff, delivery tracking, and an operator inbox.

## What is included

- Interactive customer demo backed by the real application API
- FAQ and service-intent routing
- Multi-step consultation capture
- Confidence-based human escalation
- Direct fallback contact: **+91 74550 85375**
- Shared inbox with takeover, manual replies, resolution, and AI return
- Persistent local conversation repository
- Direct Meta WhatsApp Cloud API provider—no BSP dependency
- Meta GET webhook challenge verification
- `X-Hub-Signature-256` validation against the raw request body
- Incoming text, interactive-button, and delivery-status normalization
- WhatsApp interactive quick-reply buttons and read receipts
- 24-hour customer-service-window protection
- Duplicate-message protection and asynchronous webhook processing
- Responsive desktop and mobile UI

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:8787`.

Production-style local run:

```bash
npm run build
npm start
```

Then open `http://localhost:8787`.

## Demo mode and live WhatsApp mode

The default configuration uses `WHATSAPP_PROVIDER=demo`. It needs no external account, but still exercises the backend, automation, persistence and agent inbox.

For live WhatsApp, copy `.env.example` to `.env` and set:

```dotenv
WHATSAPP_PROVIDER=meta
META_GRAPH_API_VERSION=vXX.X
META_WHATSAPP_ACCESS_TOKEN=...
META_WHATSAPP_PHONE_NUMBER_ID=...
META_WHATSAPP_WABA_ID=...
META_WHATSAPP_VERIFY_TOKEN=your-own-random-string
META_APP_SECRET=...
```

Use the current Graph API version shown in your Meta dashboard/documentation. The server intentionally rejects a missing or malformed version instead of silently using an outdated one.

Webhook callback:

```text
https://YOUR_PUBLIC_HTTPS_DOMAIN/webhooks/meta
```

Complete onboarding and conversion instructions are in [META_SETUP.md](./META_SETUP.md).

For a presentation-ready walkthrough, expected chatbot responses and student testing options, use [STUDENT_DEMO_GUIDE.md](./STUDENT_DEMO_GUIDE.md).

## Commands

```bash
npm run typecheck
npm test
npm run build
```

## Architecture

```text
Customer WhatsApp
        │
        ▼
Meta WhatsApp Cloud API
        │ signed webhook
        ▼
GET/POST /webhooks/meta
        │
        ├── Verify signature and deduplicate
        ├── Persist conversation
        ├── Intent and guided-flow engine
        └── Meta /{PHONE_NUMBER_ID}/messages
                    │
                    ▼
             Customer WhatsApp

Agent inbox ── REST API ── Conversation repository
```

## Project structure

```text
src/                     React showcase and agent inbox
server/app.ts            REST API, Meta webhook and orchestration
server/bot.ts            Conversation flows and escalation logic
server/store.ts          Persistent demo repository
server/providers/meta.ts Direct Meta Cloud API adapter
server/app.test.ts       End-to-end API and webhook tests
META_SETUP.md            Demo-to-live conversion guide
```

## Production note

The JSON repository is deliberately zero-setup for an assignment. Before serving real customers, replace it with PostgreSQL, use a Redis-backed queue, add agent authentication/RBAC, centralised logs, encrypted backups and a documented retention policy.

The Cloud API removes the need for a Superfone subscription, but production WhatsApp messaging is not automatically free. Meta may charge for delivered messages depending on message category and recipient market. Always check the current [official pricing page](https://whatsappbusiness.com/products/platform-pricing/).

# Architecture Document

## Tech Stack
- **Frontend:** React 19, Vite, Lucide React (Icons).
- **Backend:** Node.js, Express 5, TypeScript.
- **Validation:** Zod (for API schema parsing).
- **Storage:** Local JSON file (`server/data/runtime.json`) acting as an in-memory database to simplify the demo deployment.

## System Components

### 1. Backend API (`server/`)
- `index.ts`: Entry point, starts the Express server on port 8787.
- `app.ts`: Defines all Express routes. Includes the critical `/webhooks/meta` endpoint.
- `bot.ts`: Contains the logic for the automated assistant (Ava).
- `store.ts`: Manages reading and writing conversations to the `runtime.json` file.
- `providers/meta.ts`: Abstraction layer for interacting with the Meta Graph API. Handles sending outbound messages and normalizing incoming Meta webhooks into a standard format.

### 2. Frontend Dashboard (`src/`)
- Connects to the backend via a Vite proxy (`/api` -> `http://127.0.0.1:8787`).
- Polls or fetches dashboard statistics and active conversations.

### 3. Cloudflare Tunnel
- A `cloudflared` tunnel exposes the local Express server (`localhost:8787`) to a public HTTPS URL.
- Essential for receiving inbound webhooks from Meta's servers.

## Webhook Verification Flow
1. Meta sends a `GET` request to `/webhooks/meta` with a `hub.verify_token`.
2. The server compares it against `META_WHATSAPP_VERIFY_TOKEN` in `.env`.
3. If valid, the server echoes back the `hub.challenge`.

## Inbound Message Flow
1. Meta sends a `POST` request to `/webhooks/meta`.
2. Express uses a raw body parser to capture the exact byte stream.
3. `verifyMetaSignature()` computes a SHA256 HMAC using `META_APP_SECRET` and compares it to the `x-hub-signature-256` header.
4. The payload is normalized and saved to `runtime.json`.
5. The `SupportBot` evaluates the message and dispatches a reply via the `WhatsAppProvider`.

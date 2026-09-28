# Project Rules & Guidelines

## 1. Code Modularity
- Maintain clear separation between frontend (`src/`) and backend (`server/`).
- Frontend components should remain stateless where possible, relying on fetching data from the backend.

## 2. Webhook Security
- NEVER disable the `verifyMetaSignature` check in `app.ts`. It is strictly required to prevent malicious actors from spoofing Meta webhooks.
- Do NOT parse `request.body` manually before Express JSON middleware does, as this destroys the raw body stream needed for SHA256 HMAC verification.

## 3. Meta API Constraints
- Ensure all outbound messages strictly adhere to the 24-hour customer service window rule. The backend should block free-form messages if `customerWindowExpiresAt` is in the past.
- The `META_GRAPH_API_VERSION` must be explicitly defined (e.g., `v25.0`) to avoid silent deprecations.

## 4. Error Handling
- Do not let backend errors crash the node process. Use `void catch()` on async functions called within webhook event loops (e.g., in `app.post('/webhooks/meta')`).
- Keep `zod` schema parsing for all incoming API requests to guarantee type safety.

## 5. Deployment
- The app requires a secure HTTPS endpoint to function with Meta.
- Never commit the `.env` file containing real Access Tokens or App Secrets.

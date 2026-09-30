# Project Memory & Debugging History

## 2026-09-27 - Meta WhatsApp Webhook Configuration
During initial setup, several critical issues were resolved regarding the Meta WhatsApp Cloud API integration:

1. **Cloudflared Tunnel UDP/QUIC Issue:**
   - **Problem:** `cloudflared` failed to connect with the error `failed to dial to edge with quic`.
   - **Solution:** The ISP/Firewall was blocking UDP port 7844. Forced `cloudflared` to use HTTP/2 over TCP by adding the `--protocol http2` flag (`cloudflared tunnel --protocol http2 --url http://localhost:8787`).

2. **Vite ECONNREFUSED Proxy Error:**
   - **Problem:** Vite frontend threw `ECONNREFUSED` when proxying to `/api/dashboard`.
   - **Solution:** Node.js >17 resolves `localhost` to IPv6 `::1`. Changed the proxy target in `vite.config.ts` from `http://localhost:8787` to `http://127.0.0.1:8787`.

3. **Meta Webhook Subscription Glitch:**
   - **Problem:** Despite the Meta Dashboard showing the `messages` webhook field as toggled ON (blue), and the Cloudflare URL successfully passing the GET verification, inbound messages from physical phones were completely ignored by Meta.
   - **Solution:** The Meta Developer Dashboard UI often fails to properly link the WhatsApp Business Account (WABA) to the App's webhook under the hood. Fixed this programmatically by sending a POST request to the Graph API `/{WABA_ID}/subscribed_apps` endpoint using the Access Token.

4. **Temporary Token Expiration:**
   - **Problem:** Server threw an `Authentication Error` when attempting to call `MetaCloudProvider.sendText`.
   - **Solution:** Temporary Meta access tokens expire every 24 hours. A fresh token must be generated in the Dashboard and placed into `META_WHATSAPP_ACCESS_TOKEN` in `.env`.

## 2026-09-30 - Chatbot Persona & Localization Updates

1. **Company Context & Persona Alignment:**
   - **Action:** Created `context/company_context.md` from the provided ad campaign details. 
   - **Action:** Updated `server/bot.ts` system prompt to reflect the EnergInAI marketing strategy. The bot now explicitly highlights key features (Smart Solar + AI, Free ₹20,000 Monitor, 100% Finance) instead of providing hard-coded pricing (like the previous ₹60,000 base rate).
   - **Action:** Added a strict guardrail: The bot is prohibited from making deals and must hand off to a human agent using the `save_customer_profile` tool whenever pricing or a quote is requested.

2. **Bilingual Support (English & Hindi):**
   - **Action:** Introduced a `LANGUAGE_SELECTION` state in `server/types.ts` (`botState`) and added a `language` property to `CustomerProfile`.
   - **Action:** Modified `welcome()` in `bot.ts` to first prompt the user to choose between English and Hindi.
   - **Action:** Updated the `respond()` method to interpret the language selection, dynamically translate the initial greeting and quick replies, and inject a strict instruction into the LLM system prompt (`You MUST respond ONLY in [Language]`) to ensure the conversation consistently continues in the user's preferred language.

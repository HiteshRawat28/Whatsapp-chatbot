# Student Demo and Testing Guide

This guide explains exactly how to test the customer experience now, demonstrate the assignment without company credentials, and later convert it into a production system.

## Part A — Test as a customer right now

### Start the application

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

For the production build already used by the showcase:

```bash
npm run build
npm start
```

Open:

```text
http://localhost:8787
```

### Start a fresh customer journey

1. Open the showcase page rather than `/#dashboard`.
2. Find the WhatsApp-style phone on the right.
3. Click **Restart** at the bottom of the phone whenever you want a clean conversation.
4. Use the quick-reply buttons or type into the message field.

The local customer chat is not a hard-coded animation. It calls the backend, stores the conversation and immediately makes the same conversation available in the operator inbox.

### Recommended presentation script

#### Test 1: Greeting and menu

Send:

```text
Hi
```

Expected result: Ava introduces herself and displays service, consultation, pricing and human-support options.

#### Test 2: Service discovery

Send:

```text
What services do you offer?
```

Expected result: rooftop solar, energy audit, EV charging and maintenance options.

Then send:

```text
Tell me about rooftop solar
```

Expected result: an explanation of site assessment, system sizing, installation planning, subsidy guidance and support.

#### Test 3: Pricing safety

Send:

```text
How much will it cost?
```

Expected result: the bot avoids inventing a price and offers a tailored consultation.

#### Test 4: Lead/consultation capture

Send:

```text
Book consultation
```

Respond to the prompts with:

```text
Rahul Sharma
Delhi
Home
```

Expected result: the bot confirms the captured name, city and property type and provides **+91 74550 85375** for urgent support.

#### Test 5: Explicit human handoff

Send:

```text
I want to talk to a human
```

Expected result: the conversation changes to **Needs attention** and displays the fallback phone number.

Open the agent inbox and verify that the same conversation appears there. Click **Take over**, send a response, then optionally click **Return to AI** or **Mark as resolved**.

#### Test 6: Confidence-based handoff

Click **Restart**, then send two unsupported messages such as:

```text
Explain quantum mango protocol
```

```text
That did not answer my question
```

Expected result: after the second low-confidence turn, the bot escalates to a human instead of hallucinating.

#### Test 7: Opt-out

Send:

```text
Stop
```

Expected result: automation confirms opt-out and resolves the conversation.

### Test the backend automatically

```bash
npm test
npm run typecheck
npm run build
```

The automated suite validates chatbot flows, lead capture, escalation, Meta verification, webhook signatures, interactive messages and status normalization.

## Part B — Student-friendly Meta API options

### Option 1: Local showcase with no Meta credentials

Use this when the assignment is about demonstrating architecture and implementation rather than receiving a real WhatsApp message.

Configuration:

```dotenv
WHATSAPP_PROVIDER=demo
```

What it demonstrates:

- Customer experience
- Real backend requests
- Persistent conversations
- Chatbot decision logic
- Consultation capture
- Agent dashboard and takeover
- Meta-compatible event architecture
- Webhook security tests

Limitation: the WhatsApp-style chat is in the website, not the WhatsApp mobile application.

This is the safest zero-cost presentation option.

### Option 2: Meta developer test number with temporary credentials

Use this when you want one real message to arrive in the WhatsApp mobile application.

You do not need the client company’s production API key or business phone number. Create your own Meta developer app and use Meta’s generated test WABA and test phone number. Add your personal phone as an allowed test recipient.

The temporary user token from the WhatsApp API Setup panel is suitable for a short demonstration but expires. Meta’s official Cloud API documentation notes that user tokens are short-lived; production normally uses a system-user token. See [Meta Cloud API documentation](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).

What stays local:

- Source code
- Backend server
- `.env` credentials
- Conversation data
- Agent dashboard

What cannot remain private localhost-only:

- The webhook callback URL must be reachable by Meta over public HTTPS.

For a student demo, expose only port `8787` temporarily using an HTTPS tunnel such as Cloudflare Tunnel or ngrok. The tunnel forwards Meta’s webhook to your local backend; the keys still remain in your local `.env` file.

Example callback:

```text
https://temporary-random-domain.example/webhooks/meta
```

Do not share the temporary tunnel URL as a permanent production address.

### Option 3: Local signed-webhook demonstration

If Meta account onboarding is unavailable, run:

```bash
npm test
```

The suite constructs an authentic HMAC-SHA256 webhook signature, proves that valid requests are accepted, and proves that invalid signatures are rejected. Combine this with the browser demo to show both security and functionality without any external credentials.

## Part C — Connect your own Meta test account step by step

### 1. Create the developer app

1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Create an app for a business integration.
3. Add WhatsApp.
4. Open **WhatsApp → API Setup**.

Meta will provide a test WhatsApp number and test WABA for development.

### 2. Add your phone as a test recipient

1. In API Setup, find the recipient-number selector.
2. Add your personal number with country code.
3. Enter the verification code received on WhatsApp.
4. Send Meta’s built-in `hello_world` test message.

Do not configure this project until the built-in test succeeds. Meta’s official test-message request uses the `/messages` endpoint and the `hello_world` template. [Official test-message example](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api?entity=request-13382743-ba924e99-3d98-4954-b4e3-73a519939c33)

### 3. Create the local environment file

```powershell
Copy-Item .env.example .env
```

Fill it with values from your Meta dashboard:

```dotenv
WHATSAPP_PROVIDER=meta
META_GRAPH_API_VERSION=vXX.X
META_WHATSAPP_ACCESS_TOKEN=PASTE_TEMPORARY_TOKEN
META_WHATSAPP_PHONE_NUMBER_ID=PASTE_PHONE_NUMBER_ID
META_WHATSAPP_WABA_ID=PASTE_WABA_ID
META_WHATSAPP_VERIFY_TOKEN=CHOOSE_YOUR_OWN_RANDOM_STRING
META_APP_SECRET=PASTE_APP_SECRET

BUSINESS_NAME=VoltAssist Energy
ESCALATION_PHONE=917455085375
```

Use the Graph API version currently shown by Meta. Do not write the token into React code, commit it to Git, paste it into screenshots or send it to an evaluator.

### 4. Start the local application

```bash
npm run build
npm start
```

Verify:

```text
http://localhost:8787/api/config
```

It should report:

```text
Meta Cloud API connected
```

### 5. Start an HTTPS tunnel

Use one tunnel provider. For example:

```bash
cloudflared tunnel --url http://localhost:8787
```

or:

```bash
ngrok http 8787
```

Copy the generated HTTPS URL. The application continues running locally.

### 6. Configure the Meta webhook

In Meta WhatsApp configuration enter:

```text
Callback URL: https://YOUR-TUNNEL-DOMAIN/webhooks/meta
Verify token: the exact META_WHATSAPP_VERIFY_TOKEN value
```

Verify and save, then subscribe to `messages`. Meta’s official webhook documentation requires a reachable HTTPS endpoint and WABA subscription. [Official webhook reference](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference)

### 7. Demonstrate the real chat

1. Message Meta’s test business number from your allowlisted personal WhatsApp number.
2. Send `Hi`.
3. Ava replies through the Cloud API.
4. Open the local dashboard at `http://localhost:8787/#dashboard`.
5. Show that the real WhatsApp conversation appears.
6. Complete the consultation flow.
7. Trigger handoff and take over in the dashboard.

## Part D — What changes for production

The student test configuration is not the production configuration. Before real customers use it:

1. Deploy the backend on a stable HTTPS domain.
2. Replace the JSON repository with PostgreSQL.
3. Add Redis-backed background jobs and retries.
4. Add authenticated agent accounts and role-based access.
5. Replace the temporary user token with a properly scoped system-user token.
6. Register and verify the company-owned sending number.
7. Use a secrets manager instead of a local `.env` file.
8. Add monitoring, alerts, encrypted backups and audit logs.
9. Create approved message templates for communication outside the 24-hour window.
10. Document consent, opt-out, privacy and data-retention processes.
11. Review Meta’s current pricing before launch.
12. Perform load, webhook-retry, duplicate-delivery and failure testing.

The production number must be owned or controlled by the company. Do not use an employee’s personal WhatsApp number as the production sender without an approved migration/coexistence plan.

## Credential safety for the assignment

- Keep `.env` local; it is already ignored by Git.
- Use Meta’s test number as the sender.
- Use your own number only as an allowlisted recipient.
- Treat temporary tokens as passwords.
- Do not include keys in the presentation, screenshots or repository.
- Revoke or rotate the temporary token after the presentation.
- Stop the HTTPS tunnel after the demonstration.
- Never use browser-side JavaScript to call Meta with the access token.

## Cost clarification

Using Meta Cloud API directly removes a separate provider subscription, but it does not mean unlimited production messaging is free. Developer test assets are intended for testing; production message charging depends on Meta’s current category and recipient-market rules. Review the [official WhatsApp Business Platform pricing](https://whatsappbusiness.com/products/platform-pricing/) before sending production traffic.

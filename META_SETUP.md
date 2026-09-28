# Converting the Showcase to Live Meta WhatsApp Cloud API

This guide separates two goals:

1. **Showcase mode** — demonstrate the complete experience without external credentials.
2. **Live mode** — receive a real customer message in WhatsApp and reply through Meta Cloud API.

The application is already implemented for both. The remaining live steps create and connect the Meta-owned resources.

## 1. Understand the live message flow

```text
Customer sends a WhatsApp message
        ↓
Meta sends a signed POST webhook to /webhooks/meta
        ↓
The server validates X-Hub-Signature-256
        ↓
The message is deduplicated and stored
        ↓
The bot selects a response or requests human handoff
        ↓
The server calls /{PHONE_NUMBER_ID}/messages
        ↓
Meta delivers the reply and sends status webhooks
```

The browser is never given the Meta access token or app secret.

## 2. Create the Meta assets

1. Sign in to [Meta for Developers](https://developers.facebook.com/).
2. Create a Meta app appropriate for a business integration.
3. Add the **WhatsApp** product/use case.
4. Complete the WhatsApp API setup flow. Meta normally creates or connects:
   - A Meta business portfolio
   - A WhatsApp Business Account (WABA)
   - A test business phone number
5. In **WhatsApp → API Setup**, record:
   - Phone Number ID
   - WhatsApp Business Account ID
   - The Graph API version shown by Meta
   - The temporary access token for initial testing

Meta’s test number and temporary token are suitable for initial development. The temporary token expires and must not be used for deployment.

Official references:

- [Meta WhatsApp Business Platform workspace](https://www.postman.com/meta/whatsapp-business-platform/overview)
- [Cloud API documentation](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Send text message request](https://www.postman.com/meta/whatsapp-business-platform/request/8gvd47s/send-text-message)

## 3. Test with Meta’s test number first

1. Add your personal WhatsApp number as an allowed test recipient in the API Setup screen.
2. Confirm the number using the code Meta sends.
3. Use Meta’s built-in test action to send the `hello_world` message.
4. Confirm that the message arrives in WhatsApp.

This isolates Meta account setup from application deployment. Do not continue until the built-in Meta test succeeds.

## 4. Configure the application

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Generate a private verification token. It is a string chosen by you—not the access token and not the app secret.

Update `.env`:

```dotenv
PORT=8787
PUBLIC_APP_URL=https://YOUR_PUBLIC_DOMAIN

WHATSAPP_PROVIDER=meta
META_GRAPH_API_VERSION=vXX.X
META_WHATSAPP_ACCESS_TOKEN=YOUR_TEMPORARY_TOKEN_FOR_INITIAL_TESTING
META_WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID
META_WHATSAPP_WABA_ID=YOUR_WABA_ID
META_WHATSAPP_VERIFY_TOKEN=YOUR_RANDOM_VERIFICATION_TOKEN
META_APP_SECRET=YOUR_META_APP_SECRET

BUSINESS_NAME=VoltAssist Energy
ESCALATION_PHONE=917455085375
```

Important distinctions:

- `META_WHATSAPP_VERIFY_TOKEN`: chosen by you and repeated in the webhook form.
- `META_APP_SECRET`: copied from **App settings → Basic** and used to validate signed POST requests.
- `META_WHATSAPP_ACCESS_TOKEN`: authorises outbound Graph API requests.
- `META_WHATSAPP_PHONE_NUMBER_ID`: identifies the sending number; it is not the visible phone number.

Never commit `.env` or expose these values to frontend code.

## 5. Give the server a public HTTPS URL

Meta cannot call `localhost`. Deploy the project to a Node.js host, or use a temporary HTTPS tunnel for development.

Production start command:

```bash
npm install
npm run build
npm start
```

Required public endpoint:

```text
https://YOUR_PUBLIC_DOMAIN/webhooks/meta
```

Confirm this endpoint is publicly reachable before configuring the webhook.

## 6. Configure and verify the webhook

1. Open the app in Meta App Dashboard.
2. Go to **WhatsApp → Configuration** or the Webhooks configuration screen.
3. Set the callback URL to:

   ```text
   https://YOUR_PUBLIC_DOMAIN/webhooks/meta
   ```

4. Enter the exact value from `META_WHATSAPP_VERIFY_TOKEN`.
5. Click **Verify and save**.
6. Subscribe the WhatsApp Business Account to the `messages` webhook field.

During verification Meta sends:

```text
GET /webhooks/meta?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
```

The implemented server compares the token and returns the challenge. For event POSTs, it calculates HMAC-SHA256 over the unmodified raw request body and compares it using a constant-time operation with `X-Hub-Signature-256`.

Meta requires the WABA subscription only once, rather than once per phone number. See [official webhook subscriptions](https://www.postman.com/meta/whatsapp-business-platform/folder/ozgs3jn/webhook-subscriptions).

## 7. Verify the real conversation

1. Restart the application with `WHATSAPP_PROVIDER=meta`.
2. Send `Hi` from the registered recipient WhatsApp account to Meta’s test business number.
3. Meta posts the inbound message to `/webhooks/meta`.
4. Ava replies through the Cloud API.
5. Open `https://YOUR_PUBLIC_DOMAIN/#dashboard`.
6. Confirm the conversation appears with delivery/read states.
7. Send `book consultation` and complete the three-turn lead flow.
8. Send two unknown messages and verify human escalation.
9. Take over from the inbox and send a manual response.

## 8. Move from the test number to a company number

After the test-number flow works:

1. Add the company phone number in WhatsApp Manager/API Setup.
2. Complete display-name and phone-number verification.
3. Replace `META_WHATSAPP_PHONE_NUMBER_ID` with the production phone-number ID.
4. Ensure the production WABA is subscribed to the app.
5. Confirm the business profile, support contact and privacy-policy details.
6. Test customer-initiated messaging before announcing the number.

If the number is already used in WhatsApp Business App, use an officially supported migration or coexistence onboarding path. Do not connect it through QR scraping or unofficial WhatsApp Web libraries.

## 9. Replace the temporary token

For deployment, create a Meta system user and issue a system-user access token with the required WhatsApp assets and permissions.

Typical permissions are:

- `whatsapp_business_messaging` for messaging
- `whatsapp_business_management` when managing/subscribing WhatsApp business assets

Assign only the required app, WABA and phone-number assets. Store the token in the hosting provider’s secret manager and plan a rotation process.

## 10. Understand the 24-hour rule

When a customer messages the business, a 24-hour customer-service window opens and resets with every new customer message. The bot and agents can send normal service replies inside it.

Outside the window, the business must use an approved message template. This project blocks manual free-form WhatsApp replies after the stored window expires and returns a clear error rather than making an invalid API request.

For the assignment demonstration, start each conversation from the customer’s WhatsApp account so the service window is open.

## 11. Demo-to-live conversion checklist

- [ ] Local showcase passes `npm test` and `npm run build`
- [ ] Meta built-in `hello_world` test succeeds
- [ ] `.env` contains server-side Meta credentials
- [ ] Application is available over HTTPS
- [ ] GET webhook verification succeeds
- [ ] `messages` webhook field is subscribed
- [ ] Signed POST webhook succeeds
- [ ] Customer `Hi` creates an inbox conversation
- [ ] Bot response reaches WhatsApp
- [ ] Sent, delivered and read statuses update
- [ ] Consultation flow completes
- [ ] Human takeover sends a real reply
- [ ] Production system-user token replaces the temporary token
- [ ] Privacy notice, opt-in and data-retention policies are documented
- [ ] Current Meta pricing is reviewed before production traffic

## 12. Common failures

### Webhook verification returns 403

The value entered in Meta must exactly match `META_WHATSAPP_VERIFY_TOKEN`, and the running server must have loaded the correct `.env` file.

### POST webhook returns 401

Check `META_APP_SECRET`. Signature verification must use the raw body; the project already preserves it before JSON parsing.

### Meta returns an OAuth error

The token may be expired, lack `whatsapp_business_messaging`, or not have access to the selected WABA/phone-number asset.

### Message is accepted but not received

Confirm the recipient is an allowed test recipient, the phone number includes the country code, and inspect delivery-status webhook errors.

### Agent reply is blocked with HTTP 409

The 24-hour customer-service window has closed. Ask the customer to message again or send an approved template using Meta’s template workflow.

### App starts in Demo mode

Set `WHATSAPP_PROVIDER=meta`, restart the process, and confirm `/api/config` reports `Meta Cloud API connected`.

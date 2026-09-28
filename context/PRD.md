# Product Requirements Document (PRD)

## Project: VoltAssist WhatsApp AI Demo

### 1. Overview
VoltAssist is an AI-powered customer support application designed for a solar energy company (EnergyAI). It integrates directly with the Meta WhatsApp Cloud API to automate customer conversations, providing instant responses about clean-energy services, solar consultations, and pricing.

### 2. Core Features
- **Automated AI Assistant (Ava):** Automatically responds to inbound WhatsApp messages using a predefined conversation tree/logic.
- **Human Handoff:** Identifies when a user needs human assistance (e.g., typing "Help" twice) and transitions the chat status to `human_requested`.
- **Live Agent Dashboard:** A React-based web dashboard (running on Vite) that allows human agents to view active conversations, take over automated chats, and reply directly to customers.
- **Omnichannel Simulation:** Capable of running in a local "demo" mode or connecting live to the Meta WhatsApp Cloud API.

### 3. Target Audience
- **End-users:** Customers inquiring about solar energy installations, seeking quotes, or requesting technical support.
- **Business Agents:** Customer support representatives who monitor the dashboard and step in when the AI cannot resolve a query.

### 4. Key Workflows
1. **Inbound Webhook:** Meta sends a webhook POST request to the server when a user sends a WhatsApp message.
2. **Signature Verification:** The server validates the `X-Hub-Signature-256` header to ensure security.
3. **Bot Processing:** The backend evaluates the message text and sends an outbound reply via the Graph API (`/messages` endpoint).
4. **Agent Takeover:** An agent clicks "Takeover" on the dashboard; the backend pauses automated bot replies for that specific conversation.

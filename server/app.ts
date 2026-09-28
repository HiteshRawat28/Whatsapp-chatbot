import { existsSync } from 'node:fs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { SupportBot } from './bot.js';
import { DemoProvider, MetaCloudProvider, type WhatsAppProvider } from './providers/meta.js';
import { ConversationStore } from './store.js';
import type { Conversation } from './types.js';

interface AppOptions {
  dataPath?: string;
  provider?: WhatsAppProvider;
  businessName?: string;
  escalationPhone?: string;
  verifyToken?: string;
  appSecret?: string;
  serveFrontend?: boolean;
}

type RequestWithRawBody = express.Request & { rawBody?: Buffer };

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(moduleDirectory, '..');

const createConversationSchema = z.object({
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(24).optional()
});

const messageSchema = z.object({
  text: z.string().trim().min(1).max(2_000)
});

const agentReplySchema = z.object({
  text: z.string().trim().min(1).max(2_000),
  agentName: z.string().trim().min(1).max(80).default('Demo Agent')
});

function publicConversation(conversation: Conversation) {
  return {
    ...conversation,
    contact: {
      ...conversation.contact,
      phone: conversation.contact.phone.startsWith('demo-') ? 'Website visitor' : conversation.contact.phone
    }
  };
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const businessName = options.businessName || process.env.BUSINESS_NAME || 'EnergINai';
  const escalationPhone = (options.escalationPhone || process.env.ESCALATION_PHONE || '917455085375').replace(/\D/g, '');
  const botPhoneNumber = (process.env.BOT_PHONE_NUMBER || escalationPhone).replace(/\D/g, '');
  const verifyToken = options.verifyToken || process.env.META_WHATSAPP_VERIFY_TOKEN || '';
  const appSecret = options.appSecret || process.env.META_APP_SECRET || '';
  const store = new ConversationStore(options.dataPath);
  const bot = new SupportBot(businessName, escalationPhone);
  const provider = options.provider || createProvider();

  app.disable('x-powered-by');
  app.use(cors({ origin: true, credentials: false }));
  app.use(express.json({
    limit: '1mb',
    verify: (request, _response, buffer) => {
      (request as RequestWithRawBody).rawBody = Buffer.from(buffer);
    }
  }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', provider: provider.name, timestamp: new Date().toISOString() });
  });

  app.get('/api/config', (_request, response) => {
    response.json({
      businessName,
      provider: provider.name,
      mode: provider.name === 'demo' ? 'Demo mode' : 'Meta Cloud API connected',
      escalationPhone,
      escalationPhoneDisplay: `+91 ${escalationPhone.slice(-10, -5)} ${escalationPhone.slice(-5)}`,
      whatsappUrl: `https://wa.me/${botPhoneNumber}?text=Hi!%20I%20would%20like%20to%20know%20more.`
    });
  });

  app.get('/api/dashboard', (_request, response) => {
    response.json({
      stats: store.getStats(),
      conversations: store.listConversations().map(publicConversation)
    });
  });

  app.get('/api/conversations/:id', (request, response) => {
    const conversation = store.getConversation(request.params.id);
    if (!conversation) return response.status(404).json({ error: 'Conversation not found' });
    return response.json(publicConversation(conversation));
  });

  app.post('/api/conversations', (request, response) => {
    const parsed = createConversationSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'Invalid conversation details' });

    const conversation = store.createConversation({ ...parsed.data, channel: 'demo' });
    const welcome = bot.welcome();
    store.appendMessage(conversation.id, {
      sender: 'bot',
      text: welcome.text,
      quickReplies: welcome.quickReplies,
      status: 'read'
    });
    return response.status(201).json(publicConversation(store.getConversation(conversation.id)!));
  });

  app.post('/api/conversations/:id/messages', async (request, response) => {
    const parsed = messageSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'Message must contain 1–2,000 characters' });

    const conversation = store.getConversation(request.params.id);
    if (!conversation) return response.status(404).json({ error: 'Conversation not found' });

    store.appendMessage(conversation.id, {
      sender: 'customer',
      text: parsed.data.text,
      status: 'read'
    });

    const freshConversation = store.getConversation(conversation.id)!;
    const result = await bot.respond(freshConversation, parsed.data.text);
    if (result) {
      if (result.conversationPatch) store.updateConversation(conversation.id, result.conversationPatch);
      store.appendMessage(conversation.id, {
        sender: 'bot',
        text: result.text,
        quickReplies: result.quickReplies,
        status: 'delivered'
      });
    }

    return response.status(201).json(publicConversation(store.getConversation(conversation.id)!));
  });

  app.post('/api/conversations/:id/takeover', (request, response) => {
    const conversation = store.getConversation(request.params.id);
    if (!conversation) return response.status(404).json({ error: 'Conversation not found' });
    const agentName = typeof request.body?.agentName === 'string' ? request.body.agentName.slice(0, 80) : 'Demo Agent';
    store.updateConversation(conversation.id, {
      status: 'human_active',
      assignedAgent: agentName,
      unreadCount: 0
    });
    store.appendMessage(conversation.id, {
      sender: 'system',
      type: 'system',
      text: `${agentName} joined the conversation.`,
      status: 'read'
    });
    return response.json(publicConversation(store.getConversation(conversation.id)!));
  });

  app.post('/api/conversations/:id/release', (request, response) => {
    const conversation = store.getConversation(request.params.id);
    if (!conversation) return response.status(404).json({ error: 'Conversation not found' });
    store.updateConversation(conversation.id, {
      status: 'bot_active',
      assignedAgent: undefined,
      unreadCount: 0,
      fallbackCount: 0,
      context: {}
    });
    store.appendMessage(conversation.id, {
      sender: 'system',
      type: 'system',
      text: 'Automation resumed for this conversation.',
      status: 'read'
    });
    return response.json(publicConversation(store.getConversation(conversation.id)!));
  });

  app.post('/api/conversations/:id/resolve', (request, response) => {
    const conversation = store.getConversation(request.params.id);
    if (!conversation) return response.status(404).json({ error: 'Conversation not found' });
    store.updateConversation(conversation.id, { status: 'resolved', unreadCount: 0 });
    return response.json(publicConversation(store.getConversation(conversation.id)!));
  });

  app.post('/api/conversations/:id/agent-message', async (request, response) => {
    const parsed = agentReplySchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'Invalid reply' });
    const conversation = store.getConversation(request.params.id);
    if (!conversation) return response.status(404).json({ error: 'Conversation not found' });
    if (conversation.channel === 'whatsapp' && new Date(conversation.customerWindowExpiresAt).getTime() < Date.now()) {
      return response.status(409).json({
        error: 'The 24-hour customer-service window has closed. Send an approved Meta message template instead.'
      });
    }

    try {
      let providerMessageId: string | undefined;
      if (conversation.channel === 'whatsapp') {
        const result = await provider.sendText({ recipient: conversation.contact.phone, text: parsed.data.text });
        providerMessageId = result.providerMessageId;
      }
      store.updateConversation(conversation.id, {
        status: 'human_active',
        assignedAgent: parsed.data.agentName,
        unreadCount: 0
      });
      store.appendMessage(conversation.id, {
        sender: 'agent',
        text: parsed.data.text,
        providerMessageId,
        status: conversation.channel === 'whatsapp' ? 'sent' : 'read'
      });
      return response.status(201).json(publicConversation(store.getConversation(conversation.id)!));
    } catch (error) {
      return response.status(502).json({ error: error instanceof Error ? error.message : 'Provider request failed' });
    }
  });

  app.get('/webhooks/meta', (request, response) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];
    if (mode === 'subscribe' && verifyToken && token === verifyToken && typeof challenge === 'string') {
      return response.status(200).type('text/plain').send(challenge);
    }
    return response.status(403).json({ error: 'Webhook verification failed' });
  });

  app.post('/webhooks/meta', (request, response) => {
    if (!appSecret) return response.status(503).json({ error: 'Meta app secret is not configured' });
    const signature = request.get('x-hub-signature-256') || '';
    const rawBody = (request as RequestWithRawBody).rawBody;
    
    console.log('--- Incoming Webhook from Meta ---');
    console.log('Signature:', signature);
    
    if (!rawBody || !verifyMetaSignature(rawBody, signature, appSecret)) {
      console.error('Signature verification failed! Check your META_APP_SECRET in .env');
      return response.status(401).json({ error: 'Invalid Meta webhook signature' });
    }

    const events = provider.normalizeWebhook(request.body);
    console.log('Event successfully verified and normalized:', JSON.stringify(events, null, 2));
    
    response.status(200).type('text/plain').send('EVENT_RECEIVED');

    queueMicrotask(() => {
      for (const status of events.statuses) {
        store.updateMessageStatus(status.providerMessageId, status.status);
      }

      for (const incoming of events.messages) {
        void processInboundMessage(store, bot, provider, incoming).catch((error) => {
          console.error('Failed to process WhatsApp event', error);
        });
      }
    });
  });

  app.post('/api/demo/reset', (_request, response) => {
    store.reset();
    response.json({ reset: true });
  });

  if (options.serveFrontend !== false) {
    const frontendPath = join(projectRoot, 'dist');
    if (existsSync(frontendPath)) {
      app.use(express.static(frontendPath));
      app.use((request, response, next) => {
        if (request.method !== 'GET' || request.path.startsWith('/api/') || request.path.startsWith('/webhooks/')) {
          return next();
        }
        return response.sendFile(join(frontendPath, 'index.html'));
      });
    }
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    console.error(error);
    response.status(500).json({ error: 'An unexpected server error occurred' });
  });

  return app;
}

function createProvider(): WhatsAppProvider {
  if (process.env.WHATSAPP_PROVIDER === 'meta') {
    const accessToken = requiredEnvironmentVariable('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = requiredEnvironmentVariable('META_WHATSAPP_PHONE_NUMBER_ID');
    const graphApiVersion = requiredEnvironmentVariable('META_GRAPH_API_VERSION');
    if (!/^v\d+\.\d+$/.test(graphApiVersion)) {
      throw new Error('META_GRAPH_API_VERSION must use the format vXX.X shown in Meta App Dashboard');
    }
    return new MetaCloudProvider(accessToken, phoneNumberId, graphApiVersion);
  }
  return new DemoProvider();
}

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when WHATSAPP_PROVIDER=meta`);
  return value;
}

function verifyMetaSignature(rawBody: Buffer, signatureHeader: string, appSecret: string) {
  if (!signatureHeader.startsWith('sha256=')) return false;
  const received = Buffer.from(signatureHeader.slice('sha256='.length), 'hex');
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function processInboundMessage(
  store: ConversationStore,
  bot: SupportBot,
  provider: WhatsAppProvider,
  incoming: { providerMessageId: string; from: string; name: string; text: string }
) {
  let conversation = store.findByPhone(incoming.from);
  if (!conversation) {
    conversation = store.createConversation({ name: incoming.name, phone: incoming.from, channel: 'whatsapp' });
  }

  if (conversation.messages.some((message) => message.providerMessageId === incoming.providerMessageId)) return;

  store.appendMessage(conversation.id, {
    sender: 'customer',
    text: incoming.text,
    providerMessageId: incoming.providerMessageId,
    status: 'read'
  });

  await provider.markAsRead(incoming.providerMessageId).catch((error) => {
    console.error('Failed to mark WhatsApp message as read', error);
  });

  const current = store.getConversation(conversation.id)!;
  const result = await bot.respond(current, incoming.text);
  if (!result) return;
  if (result.conversationPatch) store.updateConversation(conversation.id, result.conversationPatch);

  const sendResult = await provider.sendText({
    recipient: incoming.from,
    text: result.text,
    quickReplies: result.quickReplies
  });
  store.appendMessage(conversation.id, {
    sender: 'bot',
    text: result.text,
    providerMessageId: sendResult.providerMessageId,
    status: 'sent'
  });
}

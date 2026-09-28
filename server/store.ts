import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ChatMessage,
  Channel,
  Conversation,
  ConversationStatus,
  DashboardStats,
  MessageSender,
  MessageStatus,
  QuickReply,
  RuntimeData
} from './types.js';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const defaultDataPath = join(moduleDirectory, 'data', 'runtime.json');

function isoNow() {
  return new Date().toISOString();
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function seedConversation(
  name: string,
  phone: string,
  status: ConversationStatus,
  minutes: number,
  customerText: string,
  botText: string
): Conversation {
  const id = randomUUID();
  const contactId = randomUUID();
  const timestamp = minutesAgo(minutes);
  return {
    id,
    contactId,
    contact: {
      id: contactId,
      name,
      phone,
      language: 'English',
      source: 'website-demo',
      createdAt: timestamp
    },
    channel: 'demo',
    status,
    assignedAgent: status === 'human_active' ? 'Aarav Sharma' : undefined,
    unreadCount: status === 'human_requested' ? 1 : 0,
    fallbackCount: 0,
    context: {},
    createdAt: timestamp,
    updatedAt: timestamp,
    customerWindowExpiresAt: hoursFromNow(24),
    messages: [
      {
        id: randomUUID(),
        conversationId: id,
        sender: 'customer',
        type: 'text',
        text: customerText,
        status: 'read',
        createdAt: timestamp
      },
      {
        id: randomUUID(),
        conversationId: id,
        sender: status === 'human_active' ? 'agent' : 'bot',
        type: 'text',
        text: botText,
        status: 'read',
        createdAt: new Date(new Date(timestamp).getTime() + 12_000).toISOString()
      }
    ]
  };
}

function initialData(): RuntimeData {
  return {
    conversations: [
      seedConversation(
        'Priya Mehta',
        '919810000182',
        'human_requested',
        4,
        'I need help with an issue in my solar installation.',
        'I want to make sure this is handled correctly. I’m connecting you with a support specialist now.'
      ),
      seedConversation(
        'Rohan Verma',
        '919820000441',
        'bot_active',
        18,
        'Can I book a consultation for rooftop solar?',
        'Absolutely. I can help arrange a free consultation. What name should I use for the request?'
      ),
      seedConversation(
        'Ananya Singh',
        '919830000097',
        'resolved',
        56,
        'What services do you offer?',
        'We help with rooftop solar, energy audits, EV charging and maintenance support.'
      )
    ]
  };
}

export class ConversationStore {
  private readonly path: string;
  private data: RuntimeData;

  constructor(path = defaultDataPath) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
    if (existsSync(path)) {
      try {
        this.data = JSON.parse(readFileSync(path, 'utf8')) as RuntimeData;
      } catch {
        this.data = initialData();
        this.persist();
      }
    } else {
      this.data = initialData();
      this.persist();
    }
  }

  listConversations() {
    return [...this.data.conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getConversation(id: string) {
    return this.data.conversations.find((conversation) => conversation.id === id);
  }

  findByPhone(phone: string) {
    return this.data.conversations.find(
      (conversation) => conversation.contact.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')
    );
  }

  createConversation(input: { name?: string; phone?: string; channel?: Channel }) {
    const id = randomUUID();
    const contactId = randomUUID();
    const now = isoNow();
    const name = input.name?.trim() || 'Website visitor';
    const phone = input.phone?.replace(/\D/g, '') || `demo-${Date.now()}`;
    const conversation: Conversation = {
      id,
      contactId,
      contact: {
        id: contactId,
        name,
        phone,
        language: 'English',
        source: input.channel === 'whatsapp' ? 'whatsapp' : 'website-demo',
        createdAt: now
      },
      channel: input.channel || 'demo',
      status: 'bot_active',
      botState: 'GREETING',
      customerProfile: {},
      unreadCount: 0,
      fallbackCount: 0,
      context: {},
      createdAt: now,
      updatedAt: now,
      customerWindowExpiresAt: hoursFromNow(24),
      messages: []
    };
    this.data.conversations.unshift(conversation);
    this.persist();
    return conversation;
  }

  appendMessage(
    conversationId: string,
    input: {
      sender: MessageSender;
      text: string;
      status?: MessageStatus;
      providerMessageId?: string;
      quickReplies?: QuickReply[];
      type?: 'text' | 'system';
    }
  ) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return undefined;

    const now = isoNow();
    const message: ChatMessage = {
      id: randomUUID(),
      conversationId,
      sender: input.sender,
      type: input.type || 'text',
      text: input.text,
      status: input.status || 'delivered',
      providerMessageId: input.providerMessageId,
      quickReplies: input.quickReplies,
      createdAt: now
    };
    conversation.messages.push(message);
    conversation.updatedAt = now;
    if (input.sender === 'customer') {
      conversation.customerWindowExpiresAt = hoursFromNow(24);
      conversation.unreadCount += 1;
    }
    this.persist();
    return message;
  }

  updateConversation(id: string, patch: Partial<Conversation>) {
    const conversation = this.getConversation(id);
    if (!conversation) return undefined;
    Object.assign(conversation, patch, { updatedAt: isoNow() });
    this.persist();
    return conversation;
  }

  updateMessageStatus(providerMessageId: string, status: MessageStatus) {
    for (const conversation of this.data.conversations) {
      const message = conversation.messages.find((item) => item.providerMessageId === providerMessageId);
      if (message) {
        message.status = status;
        conversation.updatedAt = isoNow();
        this.persist();
        return message;
      }
    }
    return undefined;
  }

  getStats(): DashboardStats {
    const conversations = this.data.conversations;
    const automated = conversations.filter((item) => item.status === 'bot_active' || item.status === 'resolved').length;
    return {
      totalConversations: conversations.length,
      activeNow: conversations.filter((item) => item.status !== 'resolved').length,
      needsAttention: conversations.filter((item) => item.status === 'human_requested').length,
      automationRate: conversations.length ? Math.round((automated / conversations.length) * 100) : 100,
      averageResponseSeconds: 2.4
    };
  }

  reset() {
    this.data = initialData();
    this.persist();
  }

  private persist() {
    const temporaryPath = `${this.path}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(this.data, null, 2), 'utf8');
    renameSync(temporaryPath, this.path);
  }
}

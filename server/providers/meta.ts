import { randomUUID } from 'node:crypto';
import type { NormalizedInboundMessage, NormalizedStatusEvent, QuickReply } from '../types.js';

export interface OutboundMessage {
  recipient: string;
  text: string;
  quickReplies?: QuickReply[];
}

export interface SendResult {
  providerMessageId: string;
  accepted: boolean;
}

export interface WhatsAppProvider {
  readonly name: string;
  sendText(message: OutboundMessage): Promise<SendResult>;
  markAsRead(providerMessageId: string): Promise<void>;
  normalizeWebhook(payload: unknown): {
    messages: NormalizedInboundMessage[];
    statuses: NormalizedStatusEvent[];
  };
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function asArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function extractInboundText(message: UnknownRecord) {
  if (message.type === 'text') {
    const text = isRecord(message.text) ? message.text : {};
    return typeof text.body === 'string' ? text.body : '';
  }

  if (message.type === 'interactive') {
    const interactive = isRecord(message.interactive) ? message.interactive : {};
    const buttonReply = isRecord(interactive.button_reply) ? interactive.button_reply : {};
    const listReply = isRecord(interactive.list_reply) ? interactive.list_reply : {};
    if (typeof buttonReply.id === 'string') return buttonReply.id;
    if (typeof listReply.id === 'string') return listReply.id;
  }

  if (message.type === 'button') {
    const button = isRecord(message.button) ? message.button : {};
    return typeof button.payload === 'string' ? button.payload : '';
  }

  return '';
}

export class MetaCloudProvider implements WhatsAppProvider {
  readonly name = 'meta-cloud-api';
  private readonly messagesUrl: string;

  constructor(
    private readonly accessToken: string,
    phoneNumberId: string,
    graphApiVersion: string
  ) {
    this.messagesUrl = `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`;
  }

  async sendText(message: OutboundMessage): Promise<SendResult> {
    const replies = (message.quickReplies || []).slice(0, 3);
    const payload = replies.length
      ? {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: message.recipient,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: message.text },
            action: {
              buttons: replies.map((reply) => ({
                type: 'reply',
                reply: {
                  id: reply.id.slice(0, 256),
                  title: reply.label.slice(0, 20)
                }
              }))
            }
          }
        }
      : {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: message.recipient,
          type: 'text',
          text: { preview_url: false, body: message.text }
        };

    const body = await this.graphRequest(payload);
    const messages = asArray(body.messages);
    const providerMessageId = typeof messages[0]?.id === 'string' ? messages[0].id : '';
    if (!providerMessageId) throw new Error('Meta accepted no message ID');
    return { providerMessageId, accepted: true };
  }

  async markAsRead(providerMessageId: string) {
    await this.graphRequest({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: providerMessageId
    });
  }

  normalizeWebhook(payload: unknown) {
    const messages: NormalizedInboundMessage[] = [];
    const statuses: NormalizedStatusEvent[] = [];
    if (!isRecord(payload) || payload.object !== 'whatsapp_business_account') return { messages, statuses };

    for (const entry of asArray(payload.entry)) {
      for (const change of asArray(entry.changes)) {
        if (change.field !== 'messages') continue;
        const value = isRecord(change.value) ? change.value : {};
        const contacts = asArray(value.contacts);
        const firstContact = contacts[0];
        const profile = isRecord(firstContact?.profile) ? firstContact.profile : {};
        const fallbackName = typeof profile.name === 'string' ? profile.name : 'WhatsApp customer';

        for (const item of asArray(value.messages)) {
          const text = extractInboundText(item);
          if (typeof item.id === 'string' && typeof item.from === 'string' && text) {
            messages.push({
              providerMessageId: item.id,
              from: item.from,
              name: fallbackName,
              text
            });
          }
        }

        for (const item of asArray(value.statuses)) {
          if (
            typeof item.id === 'string' &&
            typeof item.status === 'string' &&
            ['sent', 'delivered', 'read', 'failed'].includes(item.status)
          ) {
            statuses.push({
              providerMessageId: item.id,
              status: item.status as NormalizedStatusEvent['status']
            });
          }
        }
      }
    }
    return { messages, statuses };
  }

  private async graphRequest(payload: UnknownRecord) {
    const response = await fetch(this.messagesUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000)
    });
    const body = (await response.json()) as UnknownRecord;
    if (!response.ok) {
      const error = isRecord(body.error) ? body.error : {};
      const message = typeof error.message === 'string' ? error.message : `HTTP ${response.status}`;
      throw new Error(`Meta Cloud API rejected the request: ${message}`);
    }
    return body;
  }
}

export class DemoProvider implements WhatsAppProvider {
  readonly name = 'demo';

  async sendText(): Promise<SendResult> {
    return { providerMessageId: `demo-${randomUUID()}`, accepted: true };
  }

  async markAsRead() {
    return Promise.resolve();
  }

  normalizeWebhook(payload: unknown) {
    return normalizeMetaWebhook(payload);
  }
}

function normalizeMetaWebhook(payload: unknown) {
  const parser = new MetaCloudProvider('', 'demo', 'v0.0');
  return parser.normalizeWebhook(payload);
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetaCloudProvider } from './meta.js';

describe('MetaCloudProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends interactive quick-reply messages to the configured Graph endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid.123' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new MetaCloudProvider('secret-token', 'phone-id', 'v99.0');

    const result = await provider.sendText({
      recipient: '919876543210',
      text: 'How can I help?',
      quickReplies: [{ id: 'services', label: 'Explore services' }]
    });

    expect(result.providerMessageId).toBe('wamid.123');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v99.0/phone-id/messages');
    expect((options.headers as Record<string, string>).authorization).toBe('Bearer secret-token');
    const body = JSON.parse(options.body as string);
    expect(body.type).toBe('interactive');
    expect(body.interactive.action.buttons[0].reply.id).toBe('services');
  });

  it('normalizes Meta interactive replies and delivery statuses', () => {
    const provider = new MetaCloudProvider('token', 'phone-id', 'v99.0');
    const events = provider.normalizeWebhook({
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          field: 'messages',
          value: {
            contacts: [{ profile: { name: 'Karan' }, wa_id: '919876543210' }],
            messages: [{
              from: '919876543210',
              id: 'wamid.inbound',
              type: 'interactive',
              interactive: { type: 'button_reply', button_reply: { id: 'pricing', title: 'Pricing' } }
            }],
            statuses: [{ id: 'wamid.outbound', status: 'delivered' }]
          }
        }]
      }]
    });

    expect(events.messages).toEqual([{
      providerMessageId: 'wamid.inbound',
      from: '919876543210',
      name: 'Karan',
      text: 'pricing'
    }]);
    expect(events.statuses).toEqual([{ providerMessageId: 'wamid.outbound', status: 'delivered' }]);
  });
});

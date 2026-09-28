import { mkdtempSync, rmSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('VoltAssist API', () => {
  let temporaryDirectory: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'voltassist-test-'));
    app = createApp({
      dataPath: join(temporaryDirectory, 'runtime.json'),
      serveFrontend: false,
      verifyToken: 'test-verify-token',
      appSecret: 'test-app-secret'
    });
  });

  afterAll(() => {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('creates a conversation with the assistant welcome message', async () => {
    const response = await request(app).post('/api/conversations').send({ name: 'Test customer' });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('bot_active');
    expect(response.body.messages[0].text).toContain('Ava');
    expect(response.body.messages[0].quickReplies).toHaveLength(4);
  });

  it('answers a known service question', async () => {
    const created = await request(app).post('/api/conversations').send({});
    const response = await request(app)
      .post(`/api/conversations/${created.body.id}/messages`)
      .send({ text: 'Tell me about rooftop solar' });
    expect(response.status).toBe(201);
    expect(response.body.messages.at(-1).text).toContain('site assessment');
    expect(response.body.status).toBe('bot_active');
  });

  it('captures consultation details across multiple turns', async () => {
    const created = await request(app).post('/api/conversations').send({});
    const id = created.body.id as string;
    await request(app).post(`/api/conversations/${id}/messages`).send({ text: 'book consultation' });
    await request(app).post(`/api/conversations/${id}/messages`).send({ text: 'Neha' });
    await request(app).post(`/api/conversations/${id}/messages`).send({ text: 'Delhi' });
    const final = await request(app).post(`/api/conversations/${id}/messages`).send({ text: 'Home' });
    expect(final.body.messages.at(-1).text).toContain('Neha');
    expect(final.body.messages.at(-1).text).toContain('Delhi');
    expect(final.body.messages.at(-1).text).toContain('+91 74550 85375');
  });

  it('escalates after two unrecognised messages', async () => {
    const created = await request(app).post('/api/conversations').send({});
    const id = created.body.id as string;
    await request(app).post(`/api/conversations/${id}/messages`).send({ text: 'xyzzy one' });
    const response = await request(app).post(`/api/conversations/${id}/messages`).send({ text: 'xyzzy two' });
    expect(response.body.status).toBe('human_requested');
    expect(response.body.messages.at(-1).text).toContain('+91 74550 85375');
  });

  it('completes the Meta webhook verification challenge', async () => {
    const response = await request(app)
      .get('/webhooks/meta')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'test-verify-token', 'hub.challenge': 'challenge-123' });
    expect(response.status).toBe(200);
    expect(response.text).toBe('challenge-123');
  });

  it('rejects a Meta webhook with an invalid signature', async () => {
    const response = await request(app)
      .post('/webhooks/meta')
      .set('x-hub-signature-256', 'sha256=incorrect')
      .send({ object: 'whatsapp_business_account' });
    expect(response.status).toBe(401);
  });

  it('accepts an authentic Meta webhook event', async () => {
    const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const signature = `sha256=${createHmac('sha256', 'test-app-secret').update(payload).digest('hex')}`;
    const response = await request(app)
      .post('/webhooks/meta')
      .set('content-type', 'application/json')
      .set('x-hub-signature-256', signature)
      .send(payload);
    expect(response.status).toBe(200);
    expect(response.text).toBe('EVENT_RECEIVED');
  });
});

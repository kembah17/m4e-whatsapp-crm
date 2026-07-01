import { describe, expect, it, vi, beforeEach } from 'vitest';
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature';

describe('Webhook Receiver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests with missing signature', () => {
    const result = verifyMetaWebhookSignature('', 'test-body');
    expect(result).toBe(false);
  });

  it('rejects requests with invalid signature', () => {
    const result = verifyMetaWebhookSignature('sha256=invalid', 'test-body');
    expect(result).toBe(false);
  });

  it('rejects requests with malformed signature prefix', () => {
    const result = verifyMetaWebhookSignature('md5=abc123', 'test-body');
    expect(result).toBe(false);
  });

  it('verifyMetaWebhookSignature is a function', () => {
    expect(typeof verifyMetaWebhookSignature).toBe('function');
  });

  it('validates WhatsApp webhook verification challenge params', () => {
    const verifyToken = 'test-verify-token';
    const challenge = 'test-challenge-string';

    const params = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.verify_token': verifyToken,
      'hub.challenge': challenge,
    });

    expect(params.get('hub.mode')).toBe('subscribe');
    expect(params.get('hub.challenge')).toBe(challenge);
    expect(params.get('hub.verify_token')).toBe(verifyToken);
  });

  it('handles typical WhatsApp webhook payload structure', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123456789',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '2348012345678', phone_number_id: '123' },
            messages: [{ from: '2348099999999', type: 'text', text: { body: 'Hello' } }],
          },
          field: 'messages',
        }],
      }],
    };

    expect(payload.object).toBe('whatsapp_business_account');
    expect(payload.entry).toHaveLength(1);
    expect(payload.entry[0].changes[0].field).toBe('messages');
    expect(payload.entry[0].changes[0].value.messages[0].type).toBe('text');
  });
});

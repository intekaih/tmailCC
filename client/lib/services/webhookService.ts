/**
 * Webhook Service - TypeScript version
 * Handles webhook creation, management, and delivery with retry logic
 */
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

// ============================================
// Configuration
// ============================================

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // exponential backoff in ms
const WEBHOOK_TIMEOUT = 30000; // 30 seconds

// ============================================
// Types
// ============================================

export interface WebhookRecord {
  id: string;
  user_id: string;
  url: string;
  name: string;
  events: string[];
  secret: string;
  secret_hint: string;
  is_active: boolean;
  last_triggered_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode: number | null;
  body: string | null;
  error: string | null;
}

// ============================================
// Core Functions
// ============================================

export function generateWebhookSecret(): { secret: string; hint: string } {
  const secret = crypto.randomBytes(32).toString('hex');
  const hint = '****' + secret.substring(secret.length - 8);
  return { secret, hint };
}

export function generateSignature(secret: string, timestamp: number, payload: unknown): string {
  const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signaturePayload);
  return `sha256=${hmac.digest('hex')}`;
}

export function verifySignature(secret: string, timestamp: string, signature: string, payload: unknown): boolean {
  const expected = generateSignature(secret, parseInt(timestamp, 10), payload);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

// ============================================
// CRUD Operations
// ============================================

export async function createWebhook(
  userId: string,
  url: string,
  events: string[] = [],
  name = '',
) {
  if (!supabaseAdmin) throw new Error('Database not configured');

  const { secret, hint } = generateWebhookSecret();

  const { data, error } = await supabaseAdmin
    .from('webhooks')
    .insert({
      user_id: userId,
      url,
      name,
      events,
      secret,
      secret_hint: hint,
    })
    .select()
    .single();

  if (error) {
    console.error('[WebhookService] Failed to create webhook:', error);
    throw new Error('Failed to create webhook');
  }

  return {
    id: data.id,
    url: data.url,
    name: data.name,
    events: data.events,
    secretHint: data.secret_hint,
    isActive: data.is_active,
    createdAt: data.created_at,
  };
}

export async function listWebhooks(userId: string) {
  if (!supabaseAdmin) throw new Error('Database not configured');

  const { data, error } = await supabaseAdmin
    .from('webhooks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[WebhookService] Failed to list webhooks:', error);
    throw new Error('Failed to list webhooks');
  }

  return (data || []).map((w: WebhookRecord) => ({
    id: w.id,
    url: w.url,
    name: w.name,
    events: w.events,
    secretHint: w.secret_hint,
    isActive: w.is_active,
    lastTriggeredAt: w.last_triggered_at,
    lastSuccessAt: w.last_success_at,
    lastError: w.last_error,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }));
}

export async function getWebhook(webhookId: string, userId: string) {
  if (!supabaseAdmin) throw new Error('Database not configured');

  const { data, error } = await supabaseAdmin
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[WebhookService] Failed to get webhook:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    url: data.url,
    name: data.name,
    events: data.events,
    secretHint: data.secret_hint,
    secret: data.secret,
    isActive: data.is_active,
    lastTriggeredAt: data.last_triggered_at,
    lastSuccessAt: data.last_success_at,
    lastError: data.last_error,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateWebhook(webhookId: string, userId: string, updates: Record<string, unknown>) {
  if (!supabaseAdmin) throw new Error('Database not configured');

  const allowedFields = ['url', 'name', 'events', 'is_active'];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return await getWebhook(webhookId, userId);
  }

  const { data, error } = await supabaseAdmin
    .from('webhooks')
    .update(updateData)
    .eq('id', webhookId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('[WebhookService] Failed to update webhook:', error);
    throw new Error('Failed to update webhook');
  }

  return {
    id: data.id,
    url: data.url,
    name: data.name,
    events: data.events,
    isActive: data.is_active,
    updatedAt: data.updated_at,
  };
}

export async function deleteWebhook(webhookId: string, userId: string): Promise<boolean> {
  if (!supabaseAdmin) throw new Error('Database not configured');

  const { error } = await supabaseAdmin
    .from('webhooks')
    .delete()
    .eq('id', webhookId)
    .eq('user_id', userId);

  if (error) {
    console.error('[WebhookService] Failed to delete webhook:', error);
    return false;
  }

  return true;
}

// ============================================
// Webhook Delivery (using fetch instead of http/https)
// ============================================

async function sendWebhookRequest(
  webhook: { url: string; secret: string },
  event: string,
  payload: unknown,
): Promise<WebhookDeliveryResult> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(webhook.secret, timestamp, payload);
    const body = JSON.stringify(payload);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TmailCC-Event': event,
          'X-TmailCC-Signature': signature,
          'X-TmailCC-Timestamp': String(timestamp),
          'User-Agent': 'tmailCC-Webhook/1.0',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text().catch(() => '');
      const success = response.status >= 200 && response.status < 300;

      return {
        success,
        statusCode: response.status,
        body: responseBody.substring(0, 1000),
        error: success ? null : `HTTP ${response.status}`,
      };
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const message = fetchErr instanceof Error ? fetchErr.message : 'Unknown error';
      return {
        success: false,
        statusCode: null,
        body: null,
        error: message.includes('abort') ? 'Request timeout' : message,
      };
    }
  } catch (err) {
    return {
      success: false,
      statusCode: null,
      body: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function sendWebhookWithRetry(
  webhookId: string,
  event: string,
  payload: unknown,
  attempt = 1,
): Promise<WebhookDeliveryResult> {
  if (!supabaseAdmin) {
    throw new Error('Database not configured');
  }

  // Get webhook details
  const { data: webhook, error: webhookError } = await supabaseAdmin
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .eq('is_active', true)
    .maybeSingle();

  if (webhookError || !webhook) {
    console.error('[WebhookService] Webhook not found or inactive:', webhookId);
    return { success: false, statusCode: null, body: null, error: 'Webhook not found or inactive' };
  }

  // Create delivery record
  const { data: delivery } = await supabaseAdmin
    .from('webhook_deliveries')
    .insert({ webhook_id: webhookId, event, payload, attempt })
    .select()
    .single();

  // Send the webhook
  const result = await sendWebhookRequest(webhook, event, payload);

  // Update delivery record
  if (delivery) {
    const updateData: Record<string, unknown> = {
      response_status: result.statusCode,
      response_body: result.body,
    };

    if (result.success) {
      updateData.delivered_at = new Date().toISOString();
    } else if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      updateData.next_retry_at = new Date(Date.now() + delay).toISOString();
    }

    await supabaseAdmin
      .from('webhook_deliveries')
      .update(updateData)
      .eq('id', delivery.id);
  }

  // Update webhook status
  const webhookUpdate: Record<string, unknown> = {
    last_triggered_at: new Date().toISOString(),
  };

  if (result.success) {
    webhookUpdate.last_success_at = new Date().toISOString();
    webhookUpdate.last_error = null;
  } else {
    webhookUpdate.last_error = result.error;
  }

  await supabaseAdmin
    .from('webhooks')
    .update(webhookUpdate)
    .eq('id', webhookId);

  // Retry if failed and not at max attempts
  if (!result.success && attempt < MAX_RETRIES) {
    const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    console.log(`[WebhookService] Retrying webhook ${webhookId} in ${delay}ms (attempt ${attempt + 1})`);

    await new Promise(resolve => setTimeout(resolve, delay));
    return sendWebhookWithRetry(webhookId, event, payload, attempt + 1);
  }

  return result;
}

// ============================================
// Trigger Webhooks
// ============================================

export async function triggerWebhooks(
  userId: string,
  event: string,
  payload: unknown,
): Promise<WebhookDeliveryResult[]> {
  if (!supabaseAdmin) return [];

  // Find all active webhooks for this user subscribed to this event
  const { data: webhooks, error } = await supabaseAdmin
    .from('webhooks')
    .select('id, url, events, secret, is_active')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !webhooks) {
    console.error('[WebhookService] Failed to fetch webhooks:', error);
    return [];
  }

  // Filter to only webhooks subscribed to this event
  const subscribedWebhooks = webhooks.filter((w: Record<string, any>) =>
    w.events.length === 0 || w.events.includes(event) || w.events.includes('*'),
  );

  if (subscribedWebhooks.length === 0) return [];

  // Trigger all subscribed webhooks in parallel
  const results = await Promise.all(
    subscribedWebhooks.map((w: Record<string, any>) => sendWebhookWithRetry(w.id, event, payload)),
  );

  return results;
}

// ============================================
// Webhook Deliveries
// ============================================

export async function getWebhookDeliveries(webhookId: string, limit = 20) {
  if (!supabaseAdmin) throw new Error('Database not configured');

  const { data, error } = await supabaseAdmin
    .from('webhook_deliveries')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[WebhookService] Failed to get deliveries:', error);
    throw new Error('Failed to get webhook deliveries');
  }

  return (data || []).map((d: Record<string, unknown>) => ({
    id: d.id,
    event: d.event,
    payload: d.payload,
    responseStatus: d.response_status,
    responseBody: d.response_body,
    attempt: d.attempt,
    nextRetryAt: d.next_retry_at,
    deliveredAt: d.delivered_at,
    createdAt: d.created_at,
  }));
}

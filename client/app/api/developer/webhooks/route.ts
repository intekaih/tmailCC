/**
 * Developer API Routes - Webhooks Management
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';
import { WEBHOOK_EVENTS } from '@/lib/constants';

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

interface Webhook {
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

async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  const profile = await getProfile(decoded.sub);
  if (!profile) {
    return { error: 'User not found', status: 401 };
  }

  if (!profile.is_active) {
    return { error: 'Account is disabled', status: 403 };
  }

  return { user: { ...decoded, ...profile } };
}

function generateWebhookSecret(): { raw: string; hint: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const hint = '****' + raw.slice(-8);
  return { raw, hint };
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * GET /api/developer/webhooks - List user's webhooks
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user!;

  try {
    const { data: webhooks, error } = await supabaseAdmin!
      .from('webhooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Developer] Failed to fetch webhooks:', error);
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
    }

    const formattedWebhooks = (webhooks || []).map((webhook: Webhook) => ({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secretHint: webhook.secret_hint,
      isActive: webhook.is_active,
      lastTriggeredAt: webhook.last_triggered_at,
      lastSuccessAt: webhook.last_success_at,
      lastError: webhook.last_error,
      createdAt: webhook.created_at,
    }));

    return NextResponse.json({ webhooks: formattedWebhooks });
  } catch (err) {
    console.error('[Developer] GET /webhooks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/developer/webhooks - Create webhook
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user!;

  try {
    const body = await request.json();
    const { url, name = '', events = [] } = body;

    // Validate URL
    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Valid URL is required (https:// or http://)' }, { status: 400 });
    }

    // Validate events
    const validEvents = events.filter((e: string) => WEBHOOK_EVENTS.includes(e as WebhookEvent));
    if (validEvents.length === 0) {
      return NextResponse.json({ error: 'At least one event is required' }, { status: 400 });
    }

    const { raw, hint } = generateWebhookSecret();

    const { data: webhook, error } = await supabaseAdmin!
      .from('webhooks')
      .insert({
        user_id: user.id,
        url: url.trim(),
        name: name.trim(),
        events: validEvents,
        secret: raw,
        secret_hint: hint,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Developer] Failed to create webhook:', error);
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
    }

    // Return the raw secret ONLY this time
    return NextResponse.json({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: raw, // Only returned once!
      secretHint: webhook.secret_hint,
      isActive: webhook.is_active,
      createdAt: webhook.created_at,
    }, { status: 201 });
  } catch (err) {
    console.error('[Developer] POST /webhooks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

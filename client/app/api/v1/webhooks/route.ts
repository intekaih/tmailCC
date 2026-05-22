/**
 * API v1 - Webhooks
 * POST /api/v1/webhooks - Create webhook
 * GET  /api/v1/webhooks - List webhooks
 */
import { NextRequest } from 'next/server';
import {
  authenticateApiKey,
  successResponse,
  errorResponse,
  logApiUsage,
} from '@/lib/services/apiV1Auth';
import * as webhookService from '@/lib/services/webhookService';

/**
 * POST /api/v1/webhooks - Create webhook
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateApiKey(request);
  if ('error' in authResult) return authResult.error;
  const { auth } = authResult;

  try {
    const body = await request.json();
    const { url, events = ['email.received'], name = '' } = body;

    if (!url || typeof url !== 'string') {
      return errorResponse('VALIDATION_ERROR', 'URL is required', 400);
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return errorResponse('VALIDATION_ERROR', 'URL must use http or https protocol', 400);
      }
    } catch {
      return errorResponse('VALIDATION_ERROR', 'Invalid URL format', 400);
    }

    const webhook = await webhookService.createWebhook(
      auth.apiKey.userId,
      url,
      events,
      name,
    );

    const res = successResponse(webhook, 201);
    logApiUsage(request, res, auth);
    return res;
  } catch (err) {
    console.error('[API v1] POST /webhooks error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}

/**
 * GET /api/v1/webhooks - List webhooks
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateApiKey(request);
  if ('error' in authResult) return authResult.error;
  const { auth } = authResult;

  try {
    const webhooks = await webhookService.listWebhooks(auth.apiKey.userId);

    const res = successResponse({ webhooks });
    logApiUsage(request, res, auth);
    return res;
  } catch (err) {
    console.error('[API v1] GET /webhooks error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}

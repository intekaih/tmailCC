/**
 * API v1 - Webhook by ID
 * GET    /api/v1/webhooks/:id - Get webhook details
 * PATCH  /api/v1/webhooks/:id - Update webhook
 * DELETE /api/v1/webhooks/:id - Delete webhook
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
 * GET /api/v1/webhooks/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateApiKey(request, ['webhooks:manage']);
  if ('error' in authResult) return authResult.error;
  const { auth } = authResult;

  try {
    const { id: webhookId } = await params;
    const webhook = await webhookService.getWebhook(webhookId, auth.apiKey.userId);

    if (!webhook) {
      return errorResponse('NOT_FOUND', 'Webhook not found', 404);
    }

    const res = successResponse(webhook);
    logApiUsage(request, res, auth);
    return res;
  } catch (err) {
    console.error('[API v1] GET /webhooks/:id error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}

/**
 * PATCH /api/v1/webhooks/:id
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateApiKey(request, ['webhooks:manage']);
  if ('error' in authResult) return authResult.error;
  const { auth } = authResult;

  try {
    const { id: webhookId } = await params;
    const updates = await request.json();

    const webhook = await webhookService.updateWebhook(webhookId, auth.apiKey.userId, updates);

    if (!webhook) {
      return errorResponse('NOT_FOUND', 'Webhook not found', 404);
    }

    const res = successResponse(webhook);
    logApiUsage(request, res, auth);
    return res;
  } catch (err) {
    console.error('[API v1] PATCH /webhooks/:id error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}

/**
 * DELETE /api/v1/webhooks/:id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateApiKey(request, ['webhooks:manage']);
  if ('error' in authResult) return authResult.error;
  const { auth } = authResult;

  try {
    const { id: webhookId } = await params;

    const deleted = await webhookService.deleteWebhook(webhookId, auth.apiKey.userId);

    if (!deleted) {
      return errorResponse('NOT_FOUND', 'Webhook not found', 404);
    }

    const res = successResponse({ message: 'Webhook deleted' });
    logApiUsage(request, res, auth);
    return res;
  } catch (err) {
    console.error('[API v1] DELETE /webhooks/:id error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}

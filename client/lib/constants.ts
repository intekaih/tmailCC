/**
 * Shared constants for the TMail CC application.
 */

// API Key Scopes
export const API_KEY_SCOPES = [
  'accounts:create',
  'accounts:read',
  'accounts:delete',
  'emails:read',
  'emails:delete',
  'otp:read',
  'domains:read',
  'webhooks:manage',
  'usage:read',
] as const;

export type ApiKeyScope = typeof API_KEY_SCOPES[number];

// Webhook Events
export const WEBHOOK_EVENTS = [
  'email.received',
  'otp.detected',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

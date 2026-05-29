/**
 * Shared TypeScript interfaces and response helpers for tmailCC API routes.
 * Single source of truth for all cross-cutting types and standardized responses.
 */

import type { NextResponse } from 'next/server';
import { NextResponse as NR } from 'next/server';

// ============================================
// API Response Helpers
// ============================================

export type { NextResponse };

export function apiOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NR.json({ success: true, data }, init);
}

export function apiErr(
  code: string,
  message: string,
  status = 400,
  init?: ResponseInit
): NextResponse {
  return NR.json({ success: false, error: { code, message } }, { status, ...init });
}

export function apiUnauthorized(message = 'Unauthorized', init?: ResponseInit) {
  return apiErr('UNAUTHORIZED', message, 401, init);
}

export function apiForbidden(message = 'Forbidden', init?: ResponseInit) {
  return apiErr('FORBIDDEN', message, 403, init);
}

export function apiNotFound(message = 'Not found', init?: ResponseInit) {
  return apiErr('NOT_FOUND', message, 404, init);
}

export function apiRateLimited(message = 'Too many requests', init?: ResponseInit) {
  return apiErr('RATE_LIMITED', message, 429, init);
}

// ============================================
// API Response Types
// ============================================

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: ApiErrorDetail;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
}

export const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  DB_ERROR: 'DB_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  CONFLICT: 'CONFLICT',
} as const;

// ============================================
// User & Auth Types
// ============================================

export type UserRole = 'user' | 'admin';

export interface UserPreferences {
  darkMode: boolean | null;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  displayName?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  emailCount?: number;
  preferences?: UserPreferences;
}

export interface AuthTokens {
  token: string;
  supabase_access_token?: string;
  supabase_refresh_token?: string;
}

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string | null;
  created_at?: string;
  last_login?: string;
}

// ============================================
// Account Types
// ============================================

export interface Account {
  _id: string;
  id: string;
  address: string;
  localPart: string;
  domain: string;
  user?: string | null;
  owner?: {
    id: string;
    username: string;
    role: UserRole;
  } | null;
  createdAt: string;
  lastActivity: string;
  emailCount: number;
  unreadCount?: number;
  guestToken?: string;
}

export interface AccountsResponse {
  accounts: Account[];
  total: number;
  skip: number;
  limit: number;
}

export interface Domain {
  _id: string;
  id: string;
  domain: string;
  label: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface DomainsResponse {
  domains: Domain[];
}

// ============================================
// Email Types
// ============================================

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  contentId: string;
  content?: string;
}

export interface Email {
  _id: string;
  id: string;
  account: string;
  messageId: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments: Attachment[];
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isDeleted: boolean;
}

export interface EmailsResponse {
  emails: Email[];
  total: number;
  unreadCount: number;
  skip: number;
  limit: number;
}

// ============================================
// Admin Types
// ============================================

export interface AdminStats {
  totalUsers: number;
  totalAccounts: number;
  totalEmails: number;
  activeDomains: number;
  emails24h: number;
  dbSize?: string;
  uptime?: number;
  timestamp: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  account_count?: number;
  email_count?: number;
}

export interface AdminDomain {
  id: string;
  domain: string;
  label: string;
  is_active: boolean;
  is_default: boolean;
  note?: string;
  created_at: string;
}

export interface AdminConfig {
  captchaEnabled: boolean;
  captchaSiteKey?: string;
  captchaSecretKey?: string;
  allowGuestView: boolean;
  allowUserDotmail: boolean;
  maxMailboxStorageMb: number;
  maxEmailSizeMb: number;
  emailsPerMinute: number;
  emailsPerDay: number;
  allowUserOtpKey: boolean;
}

export interface IpBlock {
  ip: string;
  reason?: string;
  expires_at?: string;
  created_at: string;
}

// ============================================
// Developer API Types
// ============================================

export interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  keyHint: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  prefix: string;
  keyHint: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
  key: string; // Raw key — shown only once on creation
}

export interface ApiUsageStats {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  byDay: Array<{ date: string; count: number }>;
}

export interface WebhookInfo {
  id: string;
  url: string;
  name: string;
  events: string[];
  secretHint: string;
  isActive: boolean;
  lastTriggeredAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  event: string;
  payload: unknown;
  responseStatus?: number;
  responseBody?: string;
  attempt: number;
  nextRetryAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

// ============================================
// Dotmail Types
// ============================================

export interface Dotmail {
  id: string;
  parent_id: string;
  address: string;
  created_at: string;
}

export interface DotmailParent {
  id: string;
  address: string;
  app_password?: string; // Always masked as '********' in API responses
  user_id?: string;
  created_at: string;
  updated_at?: string;
  last_checked?: string;
  dotmails: Dotmail[];
}

// ============================================
// OTP Types
// ============================================

export interface OtpEmail {
  id?: string;
  code: string | null;
  from: string;
  subject: string;
  preview?: string;
  receivedAt: string;
  date?: Date;
}

export interface OtpRefreshResponse {
  code: string | null;
  from: string;
  subject: string;
  receivedAt: string;
}

// ============================================
// Realtime Types
// ============================================

export interface RealtimeEmailPayload {
  id: string;
  account_id: string;
  from_address: string;
  from_name: string;
  to_address: string;
  subject: string;
  received_at: string;
}

export type RealtimeConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

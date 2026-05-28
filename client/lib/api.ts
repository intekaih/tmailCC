/**
 * tmailCC API Client - Next.js Backend Compatible
 * 
 * All API calls go to local Next.js API routes (same origin)
 * No CORS needed - same origin policy applies
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  avatarUrl?: string | null;
  emailCount?: number;
  preferences?: {
    darkMode: boolean | null;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
  };
}

export interface Account {
  _id: string;
  id: string;
  address: string;
  localPart: string;
  domain: string;
  user?: string;
  owner?: {
    id: string;
    username: string;
    role: 'user' | 'admin';
  } | null;
  createdAt: string;
  lastActivity: string;
  emailCount: number;
  unreadCount?: number;
  guestToken?: string;
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

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  contentId: string;
  content?: string;
}

export interface Domain {
  _id: string;
  id: string;
  domain: string;
  label: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface AccountsResponse {
  accounts: Account[];
  total: number;
  skip: number;
  limit: number;
}

export interface EmailsResponse {
  emails: Email[];
  total: number;
  unreadCount: number;
  skip: number;
  limit: number;
}

// ============================================
// Token Management
// ============================================

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tmail_token');
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tmail_token', token);
  }
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('tmail_token');
  }
}

function getGuestTokens(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('tmail_guest_tokens') || '{}');
  } catch {
    return {};
  }
}

function setGuestToken(address: string, token: string) {
  if (typeof window === 'undefined') return;
  const tokens = getGuestTokens();
  tokens[address.toLowerCase()] = token;
  localStorage.setItem('tmail_guest_tokens', JSON.stringify(tokens));
}

function getGuestToken(address: string): string | null {
  return getGuestTokens()[address.toLowerCase()] || null;
}

function clearGuestToken(address: string) {
  if (typeof window === 'undefined') return;
  const tokens = getGuestTokens();
  delete tokens[address.toLowerCase()];
  localStorage.setItem('tmail_guest_tokens', JSON.stringify(tokens));
}

// ============================================
// HTTP Client (Same Origin - No CORS)
// ============================================

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Same origin - no API_BASE needed
  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    let errorMsg = `HTTP ${res.status}`;
    if (contentType.includes('application/json')) {
      try {
        const error = await res.json();
        errorMsg = error.error || error.message || errorMsg;
      } catch {
        // Response was not valid JSON
      }
    } else {
      try {
        const text = await res.text();
        if (text && text.length < 200) errorMsg = text;
      } catch {
        // ignore
      }
    }
    throw new Error(errorMsg);
  }

  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text);
  } catch {
    return {} as T;
  }
}

// ============================================
// API Methods
// ============================================

export const api = {
  // ==========================================
  // AUTH
  // ==========================================
  auth: {
    login: (data: { username: string; password: string }) =>
      request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(res => {
        setToken(res.token);
        return res;
      }),

    loginWithSupabaseToken: (data: { supabase_access_token: string; supabase_user_id: string }) =>
      request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        setToken(res.token);
        return res;
      }),

    me: () => request<{ user: User }>('/api/auth/me'),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<{ message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    logout() {
      clearToken();
    },
  },

  // ==========================================
  // ACCOUNTS
  // ==========================================
  accounts: {
    create: (data: { localPart?: string; domain: string }) =>
      request<Account>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(account => {
        if (account.guestToken) setGuestToken(account.address, account.guestToken);
        return account;
      }),

    list: (params?: { domain?: string; search?: string; limit?: number; skip?: number }) => {
      const qs = new URLSearchParams();
      if (params?.domain) qs.set('domain', params.domain);
      if (params?.search) qs.set('search', params.search);
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.skip) qs.set('skip', String(params.skip));
      const query = qs.toString();
      return request<AccountsResponse>(`/api/accounts${query ? `?${query}` : ''}`);
    },

    get: (address: string) =>
      request<Account>(`/api/accounts/${encodeURIComponent(address)}`, {
        headers: {
          ...(getGuestToken(address) ? { 'X-Guest-Token': getGuestToken(address)! } : {}),
        },
      }),

    remove: (address: string) =>
      request<{ message: string }>(`/api/accounts/${encodeURIComponent(address)}`, {
        method: 'DELETE',
        headers: {
          ...(getGuestToken(address) ? { 'X-Guest-Token': getGuestToken(address)! } : {}),
        },
      }).then(res => {
        clearGuestToken(address);
        return res;
      }),

    domains: () => request<{ domains: Domain[] }>('/api/accounts/domains'),

    qr: (address: string) => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return request<{ address: string; qrCode: string }>(`/api/qr/${encodeURIComponent(address)}?origin=${encodeURIComponent(origin)}`);
    },
  },

  // ==========================================
  // EMAILS
  // ==========================================
  emails: {
    list: (address: string, params?: { limit?: number; skip?: number; unreadOnly?: boolean }) => {
      const qs = new URLSearchParams({ address });
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.skip) qs.set('skip', String(params.skip));
      if (params?.unreadOnly) qs.set('unreadOnly', 'true');
      return request<EmailsResponse>(`/api/emails?${qs.toString()}`, {
        headers: {
          ...(getGuestToken(address) ? { 'X-Guest-Token': getGuestToken(address)! } : {}),
        },
      });
    },

    get: (id: string, address?: string) =>
      request<Email>(`/api/emails/${id}`, {
        headers: {
          ...(address && getGuestToken(address) ? { 'X-Guest-Token': getGuestToken(address)! } : {}),
        },
      }),

    markRead: (id: string, isRead: boolean, address?: string) =>
      request<Email>(`/api/emails/${id}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ isRead }),
        headers: {
          ...(address && getGuestToken(address) ? { 'X-Guest-Token': getGuestToken(address)! } : {}),
        },
      }),

    markStar: (id: string, isStarred: boolean, address?: string) =>
      request<Email>(`/api/emails/${id}/star`, {
        method: 'PATCH',
        body: JSON.stringify({ isStarred }),
        headers: {
          ...(address && getGuestToken(address) ? { 'X-Guest-Token': getGuestToken(address)! } : {}),
        },
      }),

    remove: (id: string, address?: string) =>
      request<{ message: string }>(`/api/emails/${id}`, {
        method: 'DELETE',
        headers: {
          ...(address && getGuestToken(address) ? { 'X-Guest-Token': getGuestToken(address)! } : {}),
        },
      }),

    clearAll: (address: string) =>
      request<{ message: string; deleted: number }>(`/api/emails?address=${encodeURIComponent(address)}`, {
        method: 'DELETE',
        headers: {
          ...(getGuestToken(address) ? { 'X-Guest-Token': getGuestToken(address)! } : {}),
        },
      }),
  },

  // ==========================================
  // ADMIN
  // ==========================================
  admin: {
    stats: () => request<any>('/api/admin/stats'),

    users: (params?: { search?: string; role?: string; limit?: number; skip?: number }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.role) qs.set('role', params.role);
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.skip) qs.set('skip', String(params.skip));
      const q = qs.toString();
      return request<any>(`/api/admin/users${q ? `?${q}` : ''}`);
    },

    createUser: (data: { username: string; password: string }) =>
      request<any>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateUser: (id: string, data: any) =>
      request<any>(`/api/admin/user/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteUser: (id: string) =>
      request<any>(`/api/admin/user/${id}`, {
        method: 'DELETE',
      }),

    domains: () => request<any>('/api/admin/domains'),

    addDomain: (data: { domain: string; label?: string; isDefault?: boolean; note?: string }) =>
      request<any>('/api/admin/domains', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteDomain: (id: string) =>
      request<any>(`/api/admin/domain/${id}`, {
        method: 'DELETE',
      }),

    syncCloudflare: (domains?: string[]) =>
      request<{
        success: boolean;
        cloudflareTotal: number;
        cloudflareDomains: string[];
        added: string[];
        alreadyExisted: string[];
        notInCloudflare: string[];
        errors: string[];
      }>('/api/admin/domains/sync-cloudflare', {
        method: 'POST',
        body: domains ? JSON.stringify({ domains }) : undefined,
      }),

    listCloudflare: () =>
      request<{
        success: boolean;
        domains: Array<{ domain: string; id: string; status: string; alreadySynced: boolean }>;
      }>('/api/admin/domains/sync-cloudflare'),

    config: () => request<any>('/api/admin/config'),

    updateConfig: (data: any) =>
      request<any>('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    blocklist: () => request<any>('/api/admin/blocklist'),

    blockIP: (data: { ip: string; reason?: string; expiresInHours?: number }) =>
      request<any>('/api/admin/blocklist', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    unblockIP: (ip: string) =>
      request<any>(`/api/admin/blocklist/${encodeURIComponent(ip)}`, {
        method: 'DELETE',
      }),

    // Dotmail Management
    dotmails: () => request<any>('/api/admin/dotmails'),

    addGmailParent: (data: { address: string; app_password: string }) =>
      request<any>('/api/admin/dotmails', {
        method: 'POST',
        body: JSON.stringify({ action: 'add-parent', ...data }),
      }),

    deleteGmailParent: (id: string) =>
      request<any>('/api/admin/dotmails', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete-parent', id }),
      }),

    generateDotmails: (parent_id: string) =>
      request<any>('/api/admin/dotmails', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate', parent_id }),
      }),

    deleteDotmail: (id: string) =>
      request<any>('/api/admin/dotmails', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete-dotmail', id }),
      }),

    getDotmailOtp: (address: string) =>
      request<{ otp: string | null; from: string; subject: string }>(
        `/api/admin/dotmails?action=otp&address=${encodeURIComponent(address)}`
      ),

    updateGmailParent: (id: string, app_password: string) =>
      request<any>('/api/admin/dotmails', {
        method: 'POST',
        body: JSON.stringify({ action: 'update-parent', id, app_password }),
      }),

    checkGmailParent: (id: string) =>
      request<{ success: boolean; message?: string; error?: string }>('/api/admin/dotmails', {
        method: 'POST',
        body: JSON.stringify({ action: 'check-parent', id }),
      }),
  },

  health: () =>
    request<{ status: string; uptime: number; supabase: string; realtime: string }>('/api/health'),

  // ==========================================
  // DEVELOPER SETTINGS
  // ==========================================
  developer: {
    // API Keys
    keys: {
      list: () => request<{ keys: any[] }>('/api/developer/keys'),
      create: (data: { name: string; scopes: string[]; expiresAt?: string }) =>
        request<any>('/api/developer/keys', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      revoke: (id: string) =>
        request<{ message: string }>(`/api/developer/keys/${id}`, {
          method: 'DELETE',
        }),
    },

    // Webhooks
    webhooks: {
      list: () => request<{ webhooks: any[] }>('/api/developer/webhooks'),
      create: (data: { url: string; name?: string; events: string[] }) =>
        request<any>('/api/developer/webhooks', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request<{ message: string }>(`/api/developer/webhooks/${id}`, {
          method: 'DELETE',
        }),
    },

    // Usage
    usage: () => request<{
      apiKeys: { total: number; active: number };
      webhooks: { total: number; active: number };
      apiCalls: { today: number; thisMonth: number };
      webhookDeliveries: { today: number; thisMonth: number };
      accounts: { total: number };
    }>('/api/developer/usage'),
  },
};

// ============================================
// Utility Functions
// ============================================

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = window.document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  window.document.body.appendChild(textarea);
  textarea.select();
  window.document.execCommand('copy');
  window.document.body.removeChild(textarea);
  return Promise.resolve();
}

// Re-export notification helpers from notification.ts for backward compatibility
export { requestNotificationPermission, showNotification } from './notification';

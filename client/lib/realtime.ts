/**
 * tmailCC - Supabase Realtime Email Subscription
 * Production-ready realtime subscription with:
 * - Automatic reconnection with exponential backoff
 * - Duplicate event tracking to prevent duplicate notifications
 * - Proper cleanup on unsubscribe
 * - Connection status tracking
 * - Multi-tab awareness via BroadcastChannel
 */
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPES
// ============================================

export interface RealtimeEmailPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'emails';
  record: {
    id: string;
    account_id: string;
    from_address: string;
    from_name: string;
    subject: string;
    text_content: string;
    html_content: string;
    received_at: string;
    is_read: boolean;
    is_starred: boolean;
    is_deleted: boolean;
  };
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface SubscribeOptions {
  /** Callback when new email arrives */
  onNewEmail: (email: FormattedEmail) => void;
  /** Callback on connection status change */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether to track seen emails for deduplication */
  enableDeduplication?: boolean;
}

export interface FormattedEmail {
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
  attachments: any[];
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isDeleted: boolean;
}

export interface RealtimeSubscription {
  unsubscribe: () => void;
  channel: any; // Supabase channel
}

// ============================================
// DEDUPLICATION
// ============================================

/**
 * Track recently seen email IDs to prevent duplicate notifications.
 * Uses a sliding window with timestamps for memory efficiency.
 */
class SeenEmailsTracker {
  private seenIds = new Map<string, number>(); // emailId -> timestamp
  private readonly MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_SIZE = 1000; // Maximum entries

  /**
   * Check if an email ID has been seen recently.
   * @returns true if this is a duplicate
   */
  isDuplicate(emailId: string): boolean {
    return this.seenIds.has(emailId);
  }

  /**
   * Mark an email ID as seen.
   */
  markSeen(emailId: string): void {
    // Clean up old entries periodically
    if (this.seenIds.size >= this.MAX_SIZE) {
      this.cleanup();
    }
    this.seenIds.set(emailId, Date.now());
  }

  /**
   * Remove old entries from the tracker.
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.seenIds.entries());
    for (const [id, timestamp] of entries) {
      if (now - timestamp > this.MAX_AGE_MS) {
        this.seenIds.delete(id);
      }
    }
  }

  /**
   * Clear all tracked emails.
   */
  clear(): void {
    this.seenIds.clear();
  }
}

// Global deduplication tracker - shared across all subscriptions
const globalSeenEmails = new SeenEmailsTracker();

/**
 * Reset the global seen emails tracker.
 * Useful for testing or when user changes accounts.
 */
export function resetSeenEmailsTracker(): void {
  globalSeenEmails.clear();
}

// ============================================
// MULTI-TAB SYNC
// ============================================

/**
 * BroadcastChannel for cross-tab communication.
 * Used to sync state like unread counts and seen emails.
 */
let broadcastChannel: BroadcastChannel | null = null;
let broadcastListeners: Map<string, (data: any) => void> = new Map();

function getBroadcastChannel(): BroadcastChannel {
  if (!broadcastChannel && typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel('tmail-realtime');
    broadcastChannel.onmessage = (event) => {
      const { type, data } = event.data;
      const listener = broadcastListeners.get(type);
      if (listener) {
        listener(data);
      }
    };
  }
  return broadcastChannel!;
}

/**
 * Send a message to other tabs.
 */
export function broadcastToTabs(type: string, data: any): void {
  try {
    const channel = getBroadcastChannel();
    channel.postMessage({ type, data, tabId: getTabId() });
  } catch (err) {
    console.warn('[Realtime] Failed to broadcast:', err);
  }
}

/**
 * Listen for messages from other tabs.
 */
export function listenForTabMessages(type: string, callback: (data: any) => void): () => void {
  broadcastListeners.set(type, callback);
  return () => {
    broadcastListeners.delete(type);
  };
}

// Generate unique tab ID
let tabId: string | null = null;
function getTabId(): string {
  if (!tabId) {
    tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return tabId;
}

// ============================================
// REALTIME SUBSCRIPTION
// ============================================

/**
 * Subscribe to new emails for an account via Supabase Realtime.
 *
 * @param accountId - The account ID to subscribe to
 * @param options - Subscription options
 * @returns Unsubscribe function
 */
export function subscribeToEmails(
  accountId: string,
  options: SubscribeOptions
): RealtimeSubscription {
  const { onNewEmail, onStatusChange, onError, enableDeduplication = true } = options;

  const supabase = createClient();
  const channelName = `emails:${accountId}`;

  console.log('[Realtime] Creating subscription for account:', accountId);

  // Track reconnection attempts
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second

  console.log('[Realtime-Diagnostic] Preparing subscription for account:', accountId);
  supabase.auth.getSession().then((res: any) => {
    const session = res.data?.session;
    const role = session?.user?.role || 'none (anon)';
    const userId = session?.user?.id || 'none';
    const email = session?.user?.email || 'none';
    const hasSession = !!session;
    console.log(`[Realtime-Diagnostic] Session Details -> Role: "${role}", UserId: "${userId}", Email: "${email}", HasSession: ${hasSession}`);
  });


  // =============================================
  // POSTGRES_CHANGES CHANNEL (Fallback for when Supabase fixes WAL/RLS)
  // Primary broadcast channel is managed by RealtimeContext
  // =============================================
  const pgChannel = supabase.channel(channelName);

  pgChannel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'emails',
    },
    (payload: any) => {
      console.log('[Realtime-PG] WAL insert event received:', payload.new?.id);

      // Client-side filter
      if (payload.new?.account_id !== accountId) {
        return;
      }

      const emailId = payload.new?.id;

      // Deduplication: skip if already received via broadcast
      if (enableDeduplication && emailId && globalSeenEmails.isDuplicate(emailId)) {
        console.log('[Realtime-PG] Already received via broadcast, skipping:', emailId);
        return;
      }

      if (emailId) {
        globalSeenEmails.markSeen(emailId);
        broadcastToTabs('email-seen', { emailId, accountId });
      }

      const email = formatEmailFromRealtime(payload.new);
      console.log('[Realtime-PG] Dispatching email to callback:', email.subject);
      onNewEmail(email);
    }
  );

  // Subscribe to postgres_changes channel
  pgChannel.subscribe((status: string, err: any) => {
    console.log('[Realtime-PG] Channel status:', status, err || '');

      switch (status) {
        case 'SUBSCRIBED':
          reconnectAttempts = 0;
          onStatusChange?.('connected');
          console.log('[Realtime] Successfully subscribed to emails for account:', accountId);
          break;

        case 'CHANNEL_ERROR':
          onStatusChange?.('error');
          handleReconnect();
          break;

        case 'TIMED_OUT':
          onStatusChange?.('disconnected');
          handleReconnect();
          break;

        case 'CLOSED':
          onStatusChange?.('disconnected');
          break;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        const error = new Error(`Channel error: ${status} - ${err?.message || 'Unknown'}`);
        onError?.(error);
      }
    });

  /**
   * Handle reconnection with exponential backoff.
   */
  function handleReconnect(): void {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('[Realtime] Max reconnection attempts reached for account:', accountId);
      onStatusChange?.('error');
      onError?.(new Error('Max reconnection attempts reached'));
      return;
    }

    reconnectAttempts++;
    const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000); // Max 30 seconds

    console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
    onStatusChange?.('connecting');

    setTimeout(() => {
      console.log('[Realtime] Attempting to resubscribe for account:', accountId);
      pgChannel.subscribe();
    }, delay);
  }

  return {
    unsubscribe: () => {
      console.log('[Realtime] Unsubscribing from emails for account:', accountId);
      reconnectAttempts = maxReconnectAttempts; // Prevent reconnection
      supabase.removeChannel(pgChannel);
    },
    channel: pgChannel,
  };
}

/**
 * Format raw database row into FormattedEmail.
 * Exported for use by RealtimeContext broadcast handler.
 */
export function formatEmailFromRealtimeRow(row: any): FormattedEmail {
  return formatEmailFromRealtime(row);
}

function formatEmailFromRealtime(row: any): FormattedEmail {
  return {
    _id: row.id,
    id: row.id,
    account: row.account_id,
    messageId: row.message_id || '',
    from: row.from_address || '',
    fromName: row.from_name || '',
    to: row.to_address || '',
    subject: row.subject || '(No Subject)',
    text: row.text_content || '',
    html: row.html_content || '',
    attachments: row.attachments || [],
    receivedAt: row.received_at,
    isRead: row.is_read || false,
    isStarred: row.is_starred || false,
    isDeleted: row.is_deleted || false,
  };
}

/**
 * Format email from database row.
 */
export function formatEmail(row: any): FormattedEmail {
  return {
    _id: row.id,
    id: row.id,
    account: row.account_id,
    messageId: row.message_id || '',
    from: row.from_address || '',
    fromName: row.from_name || '',
    to: row.to_address || '',
    subject: row.subject || '(No Subject)',
    text: row.text_content || '',
    html: row.html_content || '',
    attachments: row.attachments || [],
    receivedAt: row.received_at,
    isRead: row.is_read || false,
    isStarred: row.is_starred || false,
    isDeleted: row.is_deleted || false,
  };
}

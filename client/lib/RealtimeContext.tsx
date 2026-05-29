'use client';

/**
 * Realtime Email Context Provider
 * Manages Supabase Realtime subscriptions for email notifications.
 *
 * Key features:
 * - Stable subscription management (no duplicate subscriptions)
 * - Multi-tab sync via BroadcastChannel
 * - Tab visibility awareness (don't notify when tab is active)
 * - Deduplication at context level
 * - Proper cleanup on unmount
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import {
  subscribeToEmails,
  FormattedEmail,
  ConnectionStatus,
  resetSeenEmailsTracker,
  broadcastToTabs,
  listenForTabMessages,
  formatEmailFromRealtimeRow,
} from '@/lib/realtime';
import {
  showNotification,
  requestNotificationPermission,
} from './notification';

// ============================================
// TYPES
// ============================================

interface RealtimeContextType {
  /** Whether realtime is connected */
  isConnected: boolean;
  /** Connection status */
  connectionStatus: ConnectionStatus;
  /** Accounts currently subscribed */
  subscribedAccounts: Set<string>;
  /** Subscribe to an account's emails with a callback */
  subscribe: (accountId: string, onNewEmail?: (email: FormattedEmail) => void) => void;
  /** Unsubscribe from an account */
  unsubscribe: (accountId: string) => void;
  /** Unsubscribe from all accounts */
  unsubscribeAll: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

interface RealtimeProviderProps {
  children: ReactNode;
  /** Callback when new email arrives */
  onNewEmail?: (email: FormattedEmail, accountId: string) => void;
  /** Whether notifications are enabled */
  notificationsEnabled?: boolean;
  /** Whether sound is enabled */
  soundEnabled?: boolean;
}

// ============================================
// PROVIDER COMPONENT
// ============================================

export function RealtimeProvider({
  children,
  onNewEmail,
  notificationsEnabled = true,
  soundEnabled = true,
}: RealtimeProviderProps) {
  const subscriptions = useRef<Map<string, { unsubscribe: () => void }>>(new Map());
  // Track per-account onNewEmail callbacks
  const accountCallbacks = useRef<Map<string, (email: FormattedEmail) => void>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [tabIsVisible, setTabIsVisible] = useState(true);

  // Use refs for stable callbacks
  const onNewEmailRef = useRef(onNewEmail);
  const notificationsEnabledRef = useRef(notificationsEnabled);
  const soundEnabledRef = useRef(soundEnabled);

  // Update refs when props change
  useEffect(() => {
    onNewEmailRef.current = onNewEmail;
  }, [onNewEmail]);

  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setTabIsVisible(isVisible);
      console.log('[RealtimeContext] Tab visibility changed:', isVisible ? 'visible' : 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // =============================================
  // PERSISTENT BROADCAST CHANNEL
  // Uses a DEDICATED Supabase client (not the SSR singleton) so that
  // login/logout/setSession() on the main client CANNOT disrupt this
  // WebSocket connection. Broadcasts don't need auth.
  // =============================================
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[RealtimeContext-Broadcast] Missing Supabase env vars');
      return;
    }

    // Create a completely independent client just for broadcast
    const { createClient: createDirectClient } = require('@supabase/supabase-js');
    const broadcastClient = createDirectClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const broadcastChannel = broadcastClient.channel('email-notifications');

    broadcastChannel.on('broadcast', { event: 'new-email' }, (payload: any) => {
      const row = payload.payload;
      if (!row?.account_id || !row?.id) return;

      console.log('[RealtimeContext-Broadcast] New email received:', row.id, 'for account:', row.account_id);

      const email = formatEmailFromRealtimeRow(row);

      // Try exact account match first
      const exactCallback = accountCallbacks.current.get(row.account_id);
      if (exactCallback) {
        exactCallback(email);
      } else {
        // No exact match - dispatch to ALL registered callbacks
        // This handles admin users who subscribe with their own account ID
        // but need to see emails for ALL accounts in the system
        accountCallbacks.current.forEach((cb, registeredAccountId) => {
          console.log('[RealtimeContext-Broadcast] Dispatching to registered account:', registeredAccountId);
          cb(email);
        });
      }
      // Also call provider-level callback
      onNewEmailRef.current?.(email, row.account_id);
    });

    broadcastChannel.subscribe((status: string, err: any) => {
      console.log('[RealtimeContext-Broadcast] Channel status:', status, err || '');
      if (status === 'SUBSCRIBED') {
        console.log('[RealtimeContext-Broadcast] ✅ Persistent broadcast channel ACTIVE (independent client)');
      }
    });

    return () => {
      console.log('[RealtimeContext-Broadcast] Cleaning up persistent broadcast channel');
      broadcastClient.removeChannel(broadcastChannel);
    };
  }, []); // Empty deps = mount once, never recreate

  // Listen for seen email broadcasts from other tabs
  useEffect(() => {
    const unsubscribe = listenForTabMessages('email-seen', ({ emailId, accountId }: { emailId: string; accountId: string }) => {
      console.log('[RealtimeContext] Received email-seen broadcast from another tab:', emailId);
    });

    return unsubscribe;
  }, []);

  /**
   * Subscribe to emails for an account.
   * Only creates a new subscription if one doesn't already exist for this account.
   * @param accountId - The account ID to subscribe to
   * @param onNewEmail - Optional callback for this specific account (overrides provider-level callback)
   */
  const subscribe = useCallback((accountId: string, onNewEmail?: (email: FormattedEmail) => void) => {
    // Already subscribed - update callback if provided
    if (subscriptions.current.has(accountId)) {
      if (onNewEmail) {
        accountCallbacks.current.set(accountId, onNewEmail);
      }
      return;
    }

    console.log('[RealtimeContext] Creating subscription for account:', accountId);

    // Store the page-level callback
    if (onNewEmail) {
      accountCallbacks.current.set(accountId, onNewEmail);
    }

    const subscription = subscribeToEmails(accountId, {
      enableDeduplication: true,
      onNewEmail: (email) => {
        // Call page-level callback if set
        const pageCallback = accountCallbacks.current.get(accountId);
        if (pageCallback) {
          pageCallback(email);
        }
        // Also call provider-level callback
        onNewEmailRef.current?.(email, accountId);
      },
      onStatusChange: (status) => {
        console.log('[RealtimeContext] Connection status changed:', status);
        setConnectionStatus(status);
      },
      onError: (err) => {
        console.error('[RealtimeContext] Subscription error for account:', accountId, err);
      },
    });

    subscriptions.current.set(accountId, subscription);
  }, []); // No dependencies - this function is stable

  /**
   * Unsubscribe from an account.
   */
  const unsubscribe = useCallback((accountId: string) => {
    const sub = subscriptions.current.get(accountId);
    if (sub) {
      console.log('[RealtimeContext] Unsubscribing from account:', accountId);
      sub.unsubscribe();
      subscriptions.current.delete(accountId);
    }
  }, []);

  /**
   * Unsubscribe from all accounts.
   */
  const unsubscribeAll = useCallback(() => {
    console.log('[RealtimeContext] Unsubscribing from all accounts, count:', subscriptions.current.size);
    subscriptions.current.forEach((sub) => sub.unsubscribe());
    subscriptions.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll();
    };
  }, [unsubscribeAll]);

  // Subscribe to email events from other tabs to sync state
  useEffect(() => {
    const handleFocusEmail = ((event: CustomEvent) => {
      const { emailId } = event.detail;
      // Notify parent to scroll to/focus this email
      onNewEmailRef.current?.({ _id: emailId } as FormattedEmail, '');
    }) as EventListener;

    window.addEventListener('tmail:focus-email', handleFocusEmail);
    return () => {
      window.removeEventListener('tmail:focus-email', handleFocusEmail);
    };
  }, []);

  const subscribedAccounts = useMemo(() => new Set(subscriptions.current.keys()), []);

  const value: RealtimeContextType = {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    subscribedAccounts,
    subscribe,
    unsubscribe,
    unsubscribeAll,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

// Safe hook that works both inside and outside provider
export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    // Return a no-op context when not inside provider (e.g., during SSR)
    return {
      isConnected: false,
      connectionStatus: 'disconnected' as ConnectionStatus,
      subscribedAccounts: new Set<string>(),
      subscribe: () => {},
      unsubscribe: () => {},
      unsubscribeAll: () => {},
    };
  }
  return context;
}

/**
 * Hook to play notification sound.
 * Listens for 'tmail:play-notification-sound' events.
 */
export function useNotificationSound(enabled: boolean = true) {
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handlePlaySound = () => {
      setShouldPlay(true);
      // Reset after a short delay
      setTimeout(() => setShouldPlay(false), 500);
    };

    window.addEventListener('tmail:play-notification-sound', handlePlaySound);
    return () => {
      window.removeEventListener('tmail:play-notification-sound', handlePlaySound);
    };
  }, [enabled]);

  return shouldPlay;
}

/**
 * Hook to handle email focus events from notifications.
 * Returns the email ID to focus (null if none).
 */
export function useEmailFocus() {
  const [focusEmailId, setFocusEmailId] = useState<string | null>(null);

  useEffect(() => {
    const handleFocus = ((event: CustomEvent) => {
      const { emailId } = event.detail;
      setFocusEmailId(emailId);
      // Clear after handling
      setTimeout(() => setFocusEmailId(null), 100);
    }) as EventListener;

    window.addEventListener('tmail:focus-email', handleFocus);
    return () => {
      window.removeEventListener('tmail:focus-email', handleFocus);
    };
  }, []);

  return focusEmailId;
}

// Re-export utilities from realtime.ts
export { resetSeenEmailsTracker, broadcastToTabs, listenForTabMessages };

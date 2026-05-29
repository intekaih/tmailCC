'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, User, Account, Email, requestNotificationPermission, copyToClipboard } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { createClient as createDirectSupabaseClient } from '@supabase/supabase-js';
import { getGuestAccounts, saveGuestAccount, removeGuestAccount } from '@/components/Sidebar';
import AuthModal from '@/components/AuthModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import AdminPanel from '@/components/AdminPanel';
import DeveloperSettings from '@/components/DeveloperSettings';
import Sidebar from '@/components/Sidebar';
import EmailList from '@/components/EmailList';
import EmailView from '@/components/EmailView';
import DotmailView from '@/components/DotmailView';
import QRModal from '@/components/QRModal';
import NotificationSound from '@/components/NotificationSound';
import AvatarUpload from '@/components/AvatarUpload';
import { AppContext, Toast, AppContextType } from '@/lib/AppContext';
import { Locale, t as translate } from '@/lib/i18n';
import {
  RealtimeProvider,
  useRealtime,
  resetSeenEmailsTracker,
} from '@/lib/RealtimeContext';
import { broadcastToTabs, listenForTabMessages, FormattedEmail } from '@/lib/realtime';
import { showNotification, extractVerificationCode } from '@/lib/notification';
import AnimatedBackground from '@/components/AnimatedBackground';
import { DotsBounce, LoadingKeyframes } from '@/components/AnimatedLoader';
import type { InitialServerData } from './types';

// ============================================
// TYPES
// ============================================

interface EmailListItem extends Email {
  _id: string;
}

// ============================================
// MODULE-LEVEL BROADCAST SINGLETON
// Created once when module loads. React Strict Mode cannot destroy it.
// Supabase Realtime broadcast channel for instant email notifications.
// ============================================
let _broadcastChannel: any = null;

function getBroadcastChannel() {
  if (_broadcastChannel) return _broadcastChannel;

  if (typeof window === 'undefined') return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const client = createDirectSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  _broadcastChannel = client.channel('email-notifications');

  // Forward broadcast events to window custom events
  // This decouples the Supabase channel from React lifecycle
  _broadcastChannel.on('broadcast', { event: 'new-email' }, (payload: any) => {
    console.log('[BroadcastSingleton] Received email event, dispatching to window');
    window.dispatchEvent(new CustomEvent('tmail:broadcast-email', { detail: payload }));
  });

  _broadcastChannel.subscribe((status: string, err: any) => {
    console.log('[BroadcastSingleton] Channel status:', status, err || '');
    if (status === 'SUBSCRIBED') {
      console.log('[BroadcastSingleton] ✅ Listening (module-level, React-proof)');
    }
  });

  return _broadcastChannel;
}

// ============================================
// SOUND CONTROLLER
// ============================================

function NotificationSoundController({ soundEnabled }: { soundEnabled: boolean }) {
  const [playSound, setPlaySound] = useState(false);

  useEffect(() => {
    if (!soundEnabled) return;

    const handlePlaySound = () => {
      setPlaySound(true);
      setTimeout(() => setPlaySound(false), 500);
    };

    window.addEventListener('tmail:play-notification-sound', handlePlaySound);
    return () => {
      window.removeEventListener('tmail:play-notification-sound', handlePlaySound);
    };
  }, [soundEnabled]);

  return <NotificationSound play={playSound} onDone={() => setPlaySound(false)} />;
}

// ============================================
// REALTIME SUBSCRIPTION MANAGEMENT
// ============================================

function useEmailRealtime(
  accountId: string | undefined,
  options: {
    onNewEmail: (email: FormattedEmail) => void;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    t: (key: Parameters<typeof translate>[0]) => string;
  }
) {
  // useRealtime now returns safe defaults when not in provider
  const { subscribe, unsubscribe, isConnected, connectionStatus } = useRealtime();

  // Keep options ref updated to avoid dependency changes
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  useEffect(() => {
    if (!accountId) return;

    const { onNewEmail } = optionsRef.current;

    // Pass the page-level callback to the context's subscribe
    subscribe(accountId, onNewEmail);

    return () => {
      unsubscribe(accountId);
    };
  }, [accountId, subscribe, unsubscribe]);

  return { isConnected, connectionStatus };
}

// ============================================
// INNER PAGE (needs to be inside RealtimeProvider)
// ============================================

function HomePageInner({ initialData }: { initialData?: InitialServerData }) {
  // Auth & data state
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showDeveloperSettings, setShowDeveloperSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  const [domainVersion, setDomainVersion] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>('vi');

  // Refs for stable access in callbacks
  const selectedAccountRef = useRef<Account | null>(null);
  const seenEmailIds = useRef<Set<string>>(new Set());
  const callbacksRef = useRef<{
    showToast: (msg: string, type: Toast['type']) => void;
    setEmails: React.Dispatch<React.SetStateAction<Email[]>>;
    setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
    setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
    t: (key: Parameters<typeof translate>[0]) => string;
    locale: Locale;
    emails: Email[];
  } | null>(null);

  const t = useCallback((key: Parameters<typeof translate>[0]) => translate(key, locale), [locale]);

  // ============================================
  // STABLE CALLBACK REGISTRY
  // Keep refs to latest state/props for use in realtime callbacks
  // ============================================
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 3000);
  }, []);

  // Update callbacks ref whenever relevant state changes
  useEffect(() => {
    callbacksRef.current = {
      showToast,
      setEmails,
      setUnreadCount,
      setAccounts,
      soundEnabled,
      notificationsEnabled,
      t,
      locale,
      emails,
    };
  }, [showToast, soundEnabled, notificationsEnabled, t, locale, emails]);

  // ============================================
  // DIRECT BROADCAST LISTENER
  // Uses module-level singleton (defined at top of file)
  // React Strict Mode cannot destroy it
  // ============================================

  // Refs to avoid stale closures in the broadcast handler
  const soundEnabledRef = useRef(soundEnabled);
  const notificationsEnabledRef = useRef(notificationsEnabled);
  const tRef = useRef(t);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { notificationsEnabledRef.current = notificationsEnabled; }, [notificationsEnabled]);
  useEffect(() => { tRef.current = t; }, [t]);

  useEffect(() => {
    const channel = getBroadcastChannel();
    if (!channel) return;

    const handler = (payload: any) => {
      const row = payload.payload;
      if (!row?.id) return;

      console.log('[DirectBroadcast] Email notification:', row.id, 'account:', row.account_id, 'subject:', row.subject);

      // Skip if already seen
      if (seenEmailIds.current.has(row.id)) {
        console.log('[DirectBroadcast] Already seen, skipping:', row.id);
        return;
      }
      seenEmailIds.current.add(row.id);

      // 1. Show toast immediately (using minimal broadcast metadata)
      showToast(`${tRef.current('newEmailFrom')} ${row.from_name || row.from_address || ''}`, 'info');

      // 2. Play notification sound
      if (soundEnabledRef.current) {
        window.dispatchEvent(new CustomEvent('tmail:play-notification-sound'));
      }

      // 3. Browser notification if tab hidden
      if (notificationsEnabledRef.current && document.visibilityState === 'hidden') {
        requestNotificationPermission().then((perm) => {
          if (perm === 'granted') {
            showNotification(
              row.from_name || row.from_address || '',
              row.subject || '(No Subject)',
              {
                tag: `email-${row.account_id}`,
                data: { emailId: row.id, accountId: row.account_id },
                onClick: () => { window.focus(); },
              }
            );
          }
        });
      }

      // 4. Update sidebar counts
      setAccounts(prev => prev.map(acc =>
        acc.id === row.account_id
          ? { ...acc, emailCount: (acc.emailCount || 0) + 1, unreadCount: (acc.unreadCount || 0) + 1 }
          : acc
      ));

      // 5. Fetch full email via authenticated API (RLS protected)
      const currentAcc = selectedAccountRef.current;
      if (currentAcc && currentAcc.id === row.account_id) {
        api.emails.list(currentAcc.address, { limit: 100 }).then(res => {
          const freshEmails = res.emails;
          setEmails(prev => {
            const existingIds = new Set(prev.map(e => e._id));
            const toAdd = freshEmails.filter((e: Email) => !existingIds.has(e._id));
            if (toAdd.length === 0) return prev;
            return [...toAdd, ...prev];
          });
          setUnreadCount(res.unreadCount);
        }).catch(err => {
          console.warn('[DirectBroadcast] Failed to fetch full email:', err);
        });
      }
    };

    // Register handler via window event (survives React Strict Mode)
    const eventHandler = (e: Event) => handler((e as CustomEvent).detail);
    window.addEventListener('tmail:broadcast-email', eventHandler);

    return () => {
      window.removeEventListener('tmail:broadcast-email', eventHandler);
    };
  }, []); // Mount once - refs keep values fresh

  // ============================================
  // REALTIME HANDLER (legacy - kept for postgres_changes fallback)
  // ============================================

  const handleNewEmailFromRealtime = useCallback((email: FormattedEmail) => {
    const cb = callbacksRef.current;
    console.log('[Page-Diagnostic] handleNewEmailFromRealtime called, callbacksRef.current is:', cb ? 'SET' : 'NULL', 'showToast:', cb?.showToast ? 'AVAILABLE' : 'MISSING');
    if (!cb) return;

    const currentAccount = selectedAccountRef.current;
    if (!currentAccount) return;

    // Admin sees all emails; regular users only see their selected account
    const isCurrentAccount = email.account === currentAccount.id;

    console.log('[Page-Diagnostic] handleNewEmailFromRealtime triggered with:', {
      emailId: email._id,
      subject: email.subject,
      emailAccount: email.account,
      currentAccountId: currentAccount?.id,
      isCurrentAccount,
    });

    // Deduplication at page level
    if (seenEmailIds.current.has(email._id)) {
      console.log('[Page] Duplicate email ignored at page level:', email._id);
      return;
    }
    seenEmailIds.current.add(email._id);
    if (seenEmailIds.current.size > 1000) {
      const arr = Array.from(seenEmailIds.current);
      seenEmailIds.current = new Set(arr.slice(-500));
    }

    console.log('[Page] Processing new email from realtime:', email._id);

    // Only add to email list if it's for the currently viewed account
    if (isCurrentAccount) {
      cb.setEmails(prev => {
        if (prev.some(e => e._id === email._id)) return prev;
        return [email as unknown as Email, ...prev];
      });

      // Update unread count for current view
      cb.setUnreadCount(prev => prev + 1);
    }

    // Update the account's counts in the accounts sidebar list immediately
    cb.setAccounts(prev => prev.map(acc => 
      acc.id === email.account 
        ? { 
            ...acc, 
            emailCount: (acc.emailCount || 0) + 1, 
            unreadCount: (acc.unreadCount || 0) + 1 
          }
        : acc
    ));

    // Show toast (always, for any account)
    cb.showToast(`${cb.t('newEmailFrom')} ${email.fromName || email.from}`, 'info');

    // Play sound if enabled (always - regardless of tab visibility)
    if (cb.soundEnabled) {
      window.dispatchEvent(new CustomEvent('tmail:play-notification-sound'));
    }

    // Broadcast to other tabs
    broadcastToTabs('unread-count-update', { accountId: email.account, increment: 1 });

    // Browser notification only if tab is hidden and notifications enabled
    if (cb.notificationsEnabled && document.visibilityState === 'hidden') {
      requestNotificationPermission().then((permission) => {
        if (permission === 'granted') {
          const verificationCode = extractVerificationCode(email.subject, email.text);
          showNotification(
            email.fromName || email.from,
            email.subject,
            {
              tag: `email-${email.account}`,
              data: { emailId: email._id, accountId: email.account },
              verificationCode,
              onClick: () => {
                window.focus();
                window.dispatchEvent(
                  new CustomEvent('tmail:focus-email', { detail: { emailId: email._id } })
                );
              },
            }
          );
        }
      });
    }
  }, []);

  // ============================================
  // REALTIME SUBSCRIPTION (via context)
  // ============================================

  const { isConnected, connectionStatus } = useEmailRealtime(selectedAccount?.id, {
    onNewEmail: handleNewEmailFromRealtime,
    soundEnabled,
    notificationsEnabled,
    showToast,
    t,
  });

  // Keep selectedAccountRef in sync
  useEffect(() => {
    selectedAccountRef.current = selectedAccount;
  }, [selectedAccount]);


  // ============================================
  // MULTI-TAB SYNC
  // ============================================

  useEffect(() => {
    const unsubUnread = listenForTabMessages('unread-count-update', (data: { accountId: string; increment?: number; count?: number }) => {
      if (selectedAccountRef.current?.id === data.accountId) {
        if (data.count !== undefined) {
          setUnreadCount(data.count);
        } else if (data.increment) {
          setUnreadCount(prev => prev + data.increment!);
        }
      }
    });

    const unsubRead = listenForTabMessages('email-read', (data: { emailId: string; accountId: string }) => {
      if (selectedAccountRef.current?.id === data.accountId) {
        setEmails(prev => prev.map(e => e._id === data.emailId ? { ...e, isRead: true } : e));
        setUnreadCount(prev => Math.max(0, prev - 1));
        setAccounts(prev => prev.map(acc =>
          acc.id === data.accountId
            ? { ...acc, unreadCount: Math.max(0, (acc.unreadCount || 0) - 1) }
            : acc
        ));
      }
    });

    return () => {
      unsubUnread();
      unsubRead();
    };
  }, []);

  // ============================================
  // EMAIL FOCUS FROM NOTIFICATION CLICK
  // ============================================

  useEffect(() => {
    const handler = ((event: CustomEvent) => {
      const { emailId } = event.detail;
      const email = emails.find(e => e._id === emailId);
      if (email) {
        setSelectedEmail(email);
      }
    }) as EventListener;
    window.addEventListener('tmail:focus-email', handler);
    return () => window.removeEventListener('tmail:focus-email', handler);
  }, [emails]);

  // ============================================
  // GLOBAL TOAST LISTENER & URL PARAMS
  // ============================================

  useEffect(() => {
    const handleToast = ((event: CustomEvent) => {
      const { message, type } = event.detail;
      showToast(message, type || 'info');
    }) as EventListener;

    window.addEventListener('tmail:show-toast', handleToast);

    // Handle startup parameters (from sw.js when no open window existed)
    const urlParams = new URLSearchParams(window.location.search);
    const copyCode = urlParams.get('copyCode');
    const focusEmail = urlParams.get('focusEmail');

    if (copyCode) {
      navigator.clipboard.writeText(copyCode)
        .then(() => {
          showToast(`Đã sao chép mã xác thực: ${copyCode}`, 'success');
        })
        .catch(err => console.error(err));
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (focusEmail) {
      window.dispatchEvent(new CustomEvent('tmail:focus-email', { detail: { emailId: focusEmail } }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      window.removeEventListener('tmail:show-toast', handleToast);
    };
  }, []);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    const storedDark = localStorage.getItem('tmail_darkMode');
    let isDark = true;
    if (storedDark !== null) {
      isDark = storedDark === 'true';
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    setThemeLoaded(true);

    const storedSound = localStorage.getItem('tmail_soundEnabled');
    if (storedSound !== null) setSoundEnabled(storedSound === 'true');

    const storedNotif = localStorage.getItem('tmail_notifEnabled');
    if (storedNotif !== null) {
      // Respect local storage preference, but override if browser blocked it
      const hasPermission = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
      setNotificationsEnabled(storedNotif === 'true' && hasPermission);
    } else {
      // First time - check if permission is already granted
      const hasPermission = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
      setNotificationsEnabled(hasPermission);
    }

    const storedLocale = localStorage.getItem('tmail_locale') as Locale | null;
    if (storedLocale === 'en' || storedLocale === 'vi') setLocale(storedLocale);

    const token = localStorage.getItem('tmail_token');
    if (token) {
      api.auth.me().then(async res => {
        if (res.supabase_access_token) {
          try {
            const supabase = createClient();
            await supabase.auth.setSession({
              access_token: res.supabase_access_token,
              refresh_token: '',
            });
            console.log('[Startup] Supabase authenticated session established.');
          } catch (err) {
            console.error('[Startup] Failed to set supabase session:', err);
          }
        }
        setUser(res.user);
      }).catch(() => {
        localStorage.removeItem('tmail_token');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const loadGuestAccounts = async () => {
    setAccounts([]);
    setSelectedAccount(null);
    setEmails([]);
    const guestAccounts = getGuestAccounts();
    if (guestAccounts.length === 0) { setLoading(false); return; }

    const syncedAccounts: Account[] = [];
    for (const ga of guestAccounts) {
      try {
        const res = await api.accounts.get(ga.address);
        syncedAccounts.push(res);
      } catch {
        try {
          const newRes = await api.accounts.create({ localPart: ga.localPart, domain: ga.domain });
          syncedAccounts.push(newRes);
        } catch {
          removeGuestAccount(ga.address);
        }
      }
    }
    setAccounts(syncedAccounts);
    if (syncedAccounts.length > 0) {
      const targetAddress = localStorage.getItem('tmail_select_account');
      const targetAcc = (targetAddress ? syncedAccounts.find(a => a?.address === targetAddress) : null) || syncedAccounts[0];
      if (targetAcc) {
        setSelectedAccount(targetAcc);
        loadEmails(targetAcc);
      }
      localStorage.removeItem('tmail_select_account');
    }
    setLoading(false);
  };

  // ============================================
  // PREFERENCES
  // ============================================

  useEffect(() => {
    if (!themeLoaded) return;
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('tmail_darkMode', String(darkMode));
  }, [darkMode, themeLoaded]);

  useEffect(() => { localStorage.setItem('tmail_soundEnabled', String(soundEnabled)); }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('tmail_notifEnabled', String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => { localStorage.setItem('tmail_locale', locale); }, [locale]);

  // Keep selectedEmail in sync with the current emails list and selectedAccount
  useEffect(() => {
    if (!selectedAccount) {
      setSelectedEmail(null);
      return;
    }
    if (selectedEmail) {
      const exists = emails.some(e => e._id === selectedEmail._id);
      if (!exists) {
        setSelectedEmail(null);
      }
    }
  }, [selectedAccount, emails, selectedEmail]);

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadAccounts() {
    if (!user) { setAccounts([]); setSelectedAccount(null); setEmails([]); setLoading(false); return; }
    try {
      const res = await api.accounts.list({ limit: 100 });
      // Sort accounts: current user's own accounts first
      const sortedAccounts = [...res.accounts].sort((a, b) => {
        const aIsOwner = a.owner?.username === user?.username;
        const bIsOwner = b.owner?.username === user?.username;
        if (aIsOwner && !bIsOwner) return -1;
        if (!aIsOwner && bIsOwner) return 1;
        return 0;
      });
      setAccounts(sortedAccounts);
      const targetAddress = localStorage.getItem('tmail_select_account');
      const targetAcc = sortedAccounts.find(a => a.address === targetAddress);
      if (targetAcc) {
        setSelectedAccount(targetAcc);
        loadEmails(targetAcc);
        localStorage.removeItem('tmail_select_account');
      } else if (sortedAccounts.length > 0) {
        // If there's currently a selectedAccount, verify if it still exists in the list
        const exists = sortedAccounts.find(a => a.address === selectedAccount?.address);
        if (exists) {
          // If it exists, keep it but reload emails just in case
          setSelectedAccount(exists);
        } else {
          // Otherwise select default (e.g. user's own account or first account)
          const userAcc = sortedAccounts.find(a => a.owner?.username === user?.username);
          const defaultAcc = userAcc || sortedAccounts[0];
          setSelectedAccount(defaultAcc);
          loadEmails(defaultAcc);
        }
      } else {
        // No accounts remaining
        setSelectedAccount(null);
        setEmails([]);
        setSelectedEmail(null);
      }
    } catch (err: any) {
      showToast(`${t('failedToLoadAccounts')}: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadEmails(account: Account) {
    if ((account as any).isDotmail) {
      setEmailsLoading(false);
      setSelectedEmail(null);
      setEmails([]);
      return;
    }
    setEmailsLoading(true);
    setSelectedEmail(null);
    seenEmailIds.current.clear();

    try {
      const res = await api.emails.list(account.address, { limit: 100 });
      res.emails.forEach((e: Email) => seenEmailIds.current.add(e._id));
      setEmails(res.emails);
      setUnreadCount(res.unreadCount);
    } catch (err: any) {
      showToast(`${t('failedToLoadEmails')}: ${err.message}`, 'error');
      setEmails([]);
    } finally {
      setEmailsLoading(false);
    }
  }

  // ============================================
  // ACCOUNT ACTIONS
  // ============================================

  async function handleClearAllEmails() {
    if (!selectedAccount) return;
    try {
      await api.emails.clearAll(selectedAccount.address);
      setEmails([]); setSelectedEmail(null); setUnreadCount(0);
      setAccounts(prev => prev.map(acc => 
        acc.address === selectedAccount.address 
          ? { ...acc, emailCount: 0, unreadCount: 0 }
          : acc
      ));
      showToast(`${t('clearAllSuccess')} (${selectedAccount.address})`, 'success');
    } catch (err: any) {
      showToast(`${t('clearAllFailed')}: ${err.message}`, 'error');
    }
  }

  function handleSelectAccount(account: Account) {
    setSelectedAccount(account);
    loadEmails(account);
  }

  async function handleCreateAccount(address: string, captchaToken?: string) {
    const [localPart, domain] = address.split('@');
    if (!user) saveGuestAccount({ address, localPart, domain, createdAt: new Date().toISOString(), lastUsed: new Date().toISOString() });
    try {
      const account = await api.accounts.create({ localPart, domain, captchaToken });
      setAccounts(prev => [account, ...prev]);
      setSelectedAccount(account);
      loadEmails(account);
      showToast(`${t('created')}: ${address}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      if (!user) removeGuestAccount(address);
      throw err;
    }
  }

  async function handleDeleteAccount(address: string) {
    try {
      await api.accounts.remove(address);
      if (!user) removeGuestAccount(address);
      const remaining = accounts.filter(a => a.address !== address);
      setAccounts(remaining);
      if (selectedAccount?.address === address) {
        if (remaining.length > 0) handleSelectAccount(remaining[0]);
        else { setSelectedAccount(null); setEmails([]); setSelectedEmail(null); }
      }
      showToast(`${t('deleted')}: ${address}`, 'success');
    } catch (err: any) { showToast(err.message, 'error'); }
  }

  async function handleCopyAddress(address: string) {
    try {
      await copyToClipboard(address);
      showToast(t('copiedToClipboard'), 'success');
    } catch { showToast(t('failedToCopy'), 'error'); }
  }

  // ============================================
  // EMAIL ACTIONS
  // ============================================

  async function handleSelectEmail(email: Email) {
    setSelectedEmail(email);
    if (!email.isRead) {
      try {
        await api.emails.markRead(email._id, true, email.to);
        setEmails(prev => prev.map(e => e._id === email._id ? { ...e, isRead: true } : e));
        setUnreadCount(prev => Math.max(0, prev - 1));
        if (selectedAccount) {
          setAccounts(prev => prev.map(acc =>
            acc.address === selectedAccount.address
              ? { ...acc, unreadCount: Math.max(0, (acc.unreadCount || 0) - 1) }
              : acc
          ));
        }
        broadcastToTabs('email-read', { emailId: email._id, accountId: selectedAccount?.id });
      } catch (err) { console.error('Failed to mark read:', err); }
    }
  }

  async function handleToggleStar(email: Email) {
    try {
      const updated = await api.emails.markStar(email._id, !email.isStarred, email.to);
      setEmails(prev => prev.map(e => e._id === email._id ? updated : e));
      if (selectedEmail?._id === email._id) setSelectedEmail(updated);
    } catch (err: any) { showToast(err.message, 'error'); }
  }

  async function handleDeleteEmail(email: Email) {
    try {
      await api.emails.remove(email._id, email.to);
      setEmails(prev => prev.filter(e => e._id !== email._id));
      if (selectedEmail?._id === email._id) setSelectedEmail(null);
      const wasUnread = !email.isRead;
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
      if (selectedAccount) {
        setAccounts(prev => prev.map(acc =>
          acc.address === selectedAccount.address
            ? { ...acc, emailCount: Math.max(0, acc.emailCount - 1), unreadCount: wasUnread ? Math.max(0, (acc.unreadCount || 0) - 1) : acc.unreadCount }
            : acc
        ));
      }
      showToast(t('emailDeleted'), 'success');
    } catch (err: any) { showToast(err.message, 'error'); }
  }

  // ============================================
  // AUTH
  // ============================================

  function handleLogin(userData: User) { setUser(userData); setShowAuthModal(false); loadAccounts(); }
  function handleLogout() {
    api.auth.logout();
    setUser(null);
    resetSeenEmailsTracker();
    seenEmailIds.current.clear();
    showToast(t('loggedOut'), 'info');
  }
  function handleDomainsChanged() { setDomainVersion(v => v + 1); }

  useEffect(() => {
    if (!loading) {
      if (user) {
        loadAccounts();
      } else {
        loadGuestAccounts();
      }
    }
  }, [user, loading]); // eslint-disable-line

  const totalUnread = accounts.reduce((sum, acc) => sum + (acc.unreadCount || 0), 0);

  const ctxValue: AppContextType = {
    user, setUser, toast: showToast, darkMode, setDarkMode,
    soundEnabled, setSoundEnabled, notificationsEnabled, setNotificationsEnabled,
    locale, setLocale, t,
  };

  if (loading) {
    return (
      <AppContext.Provider value={ctxValue}>
        <LoadingKeyframes />
        <AnimatedBackground variant="gradient" intensity="low" />
        <div className="initial-loading">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <DotsBounce size="lg" />
              <div className="absolute inset-0 blur-xl bg-[var(--accent)]/20 animate-pulse" />
            </div>
            <p className="text-sm text-[var(--text-muted)] animate-pulse">Đang khởi tạo...</p>
          </div>
        </div>
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={ctxValue}>
      <LoadingKeyframes />
      <AnimatedBackground variant="gradient" intensity="low" />
      <div className="app-container">
        {showAdminPanel && user?.role === 'admin' && <AdminPanel onClose={() => setShowAdminPanel(false)} onDomainsChanged={handleDomainsChanged} />}
        {showDeveloperSettings && <DeveloperSettings onClose={() => setShowDeveloperSettings(false)} />}
        {showAuthModal && <AuthModal onLogin={handleLogin} onClose={() => setShowAuthModal(false)} />}
        {showChangePassword && user && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
        {showQRModal && <QRModal address={showQRModal} onClose={() => setShowQRModal(null)} />}

        <Sidebar accounts={accounts} selectedAccount={selectedAccount} isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          onSelectAccount={acc => { handleSelectAccount(acc); setMobileSidebarOpen(false); }}
          onCreateAccount={handleCreateAccount} onDeleteAccount={handleDeleteAccount}
          onCopyAddress={handleCopyAddress} onShowQR={setShowQRModal}
          onRefresh={loadAccounts} loading={loading} totalUnread={totalUnread} domainVersion={domainVersion} />

        {selectedAccount && (selectedAccount as any).isDotmail ? (
          <DotmailView account={selectedAccount as any} />
        ) : (
          <>
            <EmailList emails={emails} selectedEmail={selectedEmail} onSelectEmail={handleSelectEmail}
              onRefresh={() => selectedAccount && loadEmails(selectedAccount)}
              onClearAll={handleClearAllEmails} loading={emailsLoading} account={selectedAccount} />

            <EmailView email={selectedEmail} onToggleStar={handleToggleStar} onDelete={handleDeleteEmail} />
          </>
        )}

        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setMobileSidebarOpen(true)} title={t('menu')} aria-label={t('menu')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <a href="/" className="btn btn-ghost btn-sm flex items-center justify-center" title="Trang chủ & API Guide" aria-label="Trang chủ & API Guide">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </a>
            {!user && <button className="btn btn-primary btn-sm" onClick={() => setShowAuthModal(true)}>{t('signIn')}</button>}
            {user && (
              <div className="user-menu">
                <AvatarUpload
                  avatarUrl={user.avatarUrl}
                  username={user.username}
                  size={32}
                  onAvatarChange={(newUrl) => setUser(prev => prev ? { ...prev, avatarUrl: newUrl } : prev)}
                />
                <span className="user-info">
                  <span className="user-name">{user.username}</span>
                  {user.role === 'admin' && <span className="role-badge">{t('admin')}</span>}
                </span>
                {user.role === 'admin' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAdminPanel(true)} title={t('adminPanel')} aria-label={t('adminPanel')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDeveloperSettings(true)} title={locale === 'vi' ? 'Cài đặt tài khoản & API' : 'Account & API Settings'} aria-label={locale === 'vi' ? 'Cài đặt tài khoản & API' : 'Account & API Settings'}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout} title={t('logout')} aria-label={t('logout')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="topbar-right">
            {/* Realtime status indicator */}
            <div 
              className={`realtime-indicator ${isConnected ? 'connected' : 'disconnected'}`} 
              title={
                isConnected 
                  ? (locale === 'vi' ? 'Nhận thư tự động: Đang hoạt động (Live)' : 'Real-time update: Active (Live)')
                  : (locale === 'vi' 
                      ? 'Nhận thư tự động bị tắt để bảo vệ quyền riêng tư của tài khoản Khách. Hãy nhấn nút Làm Mới thư hoặc Đăng Nhập để bật Live.' 
                      : 'Real-time updates disabled for Guest privacy security. Please click the Refresh button or Sign In to enable Live.')
              }
            >
              <div className="realtime-dot" />
              <span className="realtime-label">{isConnected ? 'Live' : (locale === 'vi' ? 'Tĩnh' : 'Safe')}</span>
            </div>

            <button className={`icon-btn ${soundEnabled ? 'active' : ''}`} onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? t('soundOn') : t('soundOff')} aria-label={soundEnabled ? t('soundOn') : t('soundOff')}>
              {soundEnabled ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </button>

            <button
              className={`icon-btn ${notificationsEnabled ? 'active' : ''}`}
              onClick={() => {
                if (!notificationsEnabled) {
                  requestNotificationPermission().then(perm => {
                    if (perm === 'granted') setNotificationsEnabled(true);
                    else if (perm === 'denied') showToast(t('notificationsBlocked'), 'error');
                  });
                } else {
                  setNotificationsEnabled(false);
                }
              }}
              title={notificationsEnabled ? t('notificationsOn') : t('notificationsOff')}
              aria-label={notificationsEnabled ? t('notificationsOn') : t('notificationsOff')}
            >
              {notificationsEnabled ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.63 13A17.89 17.89 0 0 1 18 8M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 8a6 6 0 0 0-9.33-5M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>

            <button className="icon-btn lang-btn" onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')} style={{ fontSize: 12, fontWeight: 600, fontFamily: 'inherit', minWidth: 28 }}>
              {locale === 'vi' ? 'EN' : 'VI'}
            </button>

            <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} title={darkMode ? t('lightMode') : t('darkMode')} aria-label={darkMode ? t('lightMode') : t('darkMode')}>
              {darkMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                  <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Toast Notifications */}
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type} fade-in`} role="status" aria-live="polite">
            {toast.type === 'success' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {toast.type === 'error' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
            {toast.message}
          </div>
        ))}

        <NotificationSoundController soundEnabled={soundEnabled} />
      </div>

      <style jsx global>{`
        .initial-loading { display: flex; align-items: center; justify-content: center; height: 100vh; background: var(--bg-primary); }
        .topbar { position: fixed; top: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-secondary); border-bottom: 1px solid var(--border); min-width: 200px; }
        .topbar-left { display: flex; align-items: center; gap: 8px; }
        .topbar-right { display: flex; align-items: center; gap: 4px; }
        .hamburger-btn { display: none; width: 36px; height: 36px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: var(--text-secondary); align-items: center; justify-content: center; transition: background 0.15s; }
        .hamburger-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        @media (max-width: 768px) { .hamburger-btn { display: flex; } .topbar { min-width: 100%; } }
        .user-menu { display: flex; align-items: center; gap: 6px; }
        .user-info { display: flex; align-items: center; gap: 6px; }
        .user-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .role-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: rgba(99, 102, 241, 0.2); color: var(--accent); font-weight: 600; }
        .btn-sm { padding: 5px 10px; font-size: 12px; }
        .icon-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all 0.15s; }
        .icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .icon-btn.active { color: var(--accent); }
        .lang-btn { border: 1px solid var(--border); color: var(--text-secondary); font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
        .lang-btn:hover { color: var(--accent); border-color: var(--accent); }
        .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 10px; font-size: 13px; z-index: 9999; box-shadow: 0 8px 32px rgba(0,0,0,0.3); white-space: nowrap; }
        .toast-success { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: var(--success); }
        .toast-error { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--error); }
        .toast-info { background: var(--bg-tertiary); border: 1px solid var(--border-light); color: var(--text-primary); }
        .realtime-indicator { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; }
        .realtime-indicator.connected { color: var(--success, #22c55e); }
        .realtime-indicator.disconnected { color: var(--text-muted); }
        .realtime-dot { width: 6px; height: 6px; border-radius: 50%; }
        .realtime-indicator.connected .realtime-dot { background: var(--success, #22c55e); animation: pulse 2s infinite; }
        .realtime-indicator.disconnected .realtime-dot { background: var(--text-muted); }
        .realtime-label { display: none; }
        @media (min-width: 640px) { .realtime-label { display: inline; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </AppContext.Provider>
  );
}

// ============================================
// PAGE ENTRY POINT (Client Component)
// Receives initialData from Server Component (page.tsx)
// ============================================

interface HomeClientProps {
  initialData: InitialServerData;
}

export default function HomeClient({ initialData }: HomeClientProps) {
  return (
    <RealtimeProvider
      onNewEmail={() => {/* handled by HomePageInner via the subscribe callback */}}
    >
      <HomePageInner initialData={initialData} />
    </RealtimeProvider>
  );
}

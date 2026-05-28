'use client';

import { useState, useEffect, useRef } from 'react';
import { Account } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import AnimatedEmptyState from '@/components/AnimatedText';

// ============================================
// LOCAL STORAGE KEYS
// ============================================
const LS_GUEST_ACCOUNTS = 'tmail_guest_accounts';

export interface GuestAccount {
  address: string;
  localPart: string;
  domain: string;
  createdAt: string;
  lastUsed: string;
}

// Load guest accounts from localStorage
export function getGuestAccounts(): GuestAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_GUEST_ACCOUNTS) || '[]');
  } catch {
    return [];
  }
}

// Save guest account to localStorage
export function saveGuestAccount(account: GuestAccount) {
  if (typeof window === 'undefined') return;
  const accounts = getGuestAccounts();
  const existing = accounts.findIndex(a => a.address === account.address);
  if (existing >= 0) {
    accounts[existing] = { ...accounts[existing], lastUsed: account.lastUsed };
  } else {
    accounts.push(account);
  }
  localStorage.setItem(LS_GUEST_ACCOUNTS, JSON.stringify(accounts));
}

// Remove guest account from localStorage
export function removeGuestAccount(address: string) {
  if (typeof window === 'undefined') return;
  const accounts = getGuestAccounts().filter(a => a.address !== address);
  localStorage.setItem(LS_GUEST_ACCOUNTS, JSON.stringify(accounts));
}

// ============================================
// API CALLS
// ============================================
async function apiCreateAccount(address: string): Promise<{ account: any; guestToken?: string }> {
  const token = localStorage.getItem('tmail_token');
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      localPart: address.split('@')[0],
      domain: address.split('@')[1],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create account');
  return data;
}

async function apiGetAccount(address: string): Promise<any> {
  const token = localStorage.getItem('tmail_token');
  const res = await fetch(`/api/accounts/${encodeURIComponent(address)}`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Account not found');
  return data;
}

interface SidebarProps {
  accounts: Account[];
  selectedAccount: Account | null;
  isOpen?: boolean;
  onClose?: () => void;
  onSelectAccount: (account: Account) => void;
  onCreateAccount: (address: string) => void;
  onDeleteAccount: (address: string) => void;
  onCopyAddress: (address: string) => void;
  onShowQR: (address: string) => void;
  onRefresh: () => void;
  loading: boolean;
  totalUnread: number;
  domainVersion?: number;
}

export default function Sidebar({
  accounts,
  selectedAccount,
  isOpen,
  onClose,
  onSelectAccount,
  onCreateAccount,
  onDeleteAccount,
  onCopyAddress,
  onShowQR,
  onRefresh,
  loading,
  totalUnread,
  domainVersion,
}: SidebarProps) {
  const { t, toast, user, locale } = useApp();
  const isAdmin = user?.role === 'admin';
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [customLocal, setCustomLocal] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [otpKeyGenerated, setOtpKeyGenerated] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const hasSetDefaultFilter = useRef(false);
  const [dotmailAccounts, setDotmailAccounts] = useState<any[]>([]);

  // Set default filter for admin to show only their own accounts initially
  useEffect(() => {
    if (isAdmin && user?.username && !hasSetDefaultFilter.current) {
      setOwnerFilter(user.username);
      hasSetDefaultFilter.current = true;
    }
  }, [user, isAdmin]);

  const loadDotmails = async () => {
    if (!isAdmin) return;
    try {
      const { api } = await import('@/lib/api');
      const res = await api.admin.dotmails();
      const allDotmails = (res.parents || []).flatMap((parent: any) => {
        return (parent.dotmails || []).map((dm: any) => ({
          _id: dm.id,
          id: dm.id,
          address: dm.address,
          domain: 'GMAIL DOTMAIL',
          emailCount: 0,
          isDotmail: true,
          parentAddress: parent.address
        }));
      });
      setDotmailAccounts(allDotmails);
    } catch (err) {
      console.warn('loadDotmails error:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadDotmails();
    } else {
      setDotmailAccounts([]);
    }
  }, [user, isAdmin, domainVersion, accounts.length]);

  const loadDomains = async () => {
    try {
      const { api } = await import('@/lib/api');
      const res = await api.accounts.domains();
      const domainNames = res.domains.map((d: { domain: string }) => d.domain);
      setAvailableDomains(domainNames);
      if (!selectedDomain || !domainNames.includes(selectedDomain)) {
        setSelectedDomain(domainNames[0] || '');
      }
    } catch (err) {
      const accountDomains = Array.from(new Set(accounts.map(a => a.domain)));
      setAvailableDomains(accountDomains);
      if (!selectedDomain || !accountDomains.includes(selectedDomain)) {
        setSelectedDomain(accountDomains[0] || '');
      }
    }
  };

  // Load guest accounts on mount (for non-logged-in users)
  useEffect(() => {
    if (!user && accounts.length === 0) {
      loadGuestAccountsFromStorage();
    }
  }, [user]);

  // Load guest accounts from localStorage and sync with server
  const loadGuestAccountsFromStorage = async () => {
    const guestAccounts = getGuestAccounts();
    if (guestAccounts.length === 0) return;

    setGuestLoading(true);
    const syncedAccounts: Account[] = [];

    for (const ga of guestAccounts) {
      try {
        const accountData = await apiGetAccount(ga.address);
        syncedAccounts.push(accountData.account);
      } catch {
        // Account doesn't exist on server, try to recreate
        try {
          const newAccount = await apiCreateAccount(ga.address);
          syncedAccounts.push(newAccount.account);
        } catch {
          // Account creation failed, remove from localStorage
          removeGuestAccount(ga.address);
        }
      }
    }

    if (syncedAccounts.length > 0 && !selectedAccount) {
      onSelectAccount(syncedAccounts[0]);
    }
    setGuestLoading(false);
  };

  // Update guest account lastUsed in localStorage
  const updateGuestAccountLastUsed = (address: string) => {
    const accounts = getGuestAccounts();
    const idx = accounts.findIndex(a => a.address === address);
    if (idx >= 0) {
      accounts[idx].lastUsed = new Date().toISOString();
      localStorage.setItem(LS_GUEST_ACCOUNTS, JSON.stringify(accounts));
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadDomains().catch(err => {
      if (!cancelled) console.warn('loadDomains error:', err);
    });
    return () => { cancelled = true; };
  }, [showCreate, accounts.length, domainVersion, user]);

  useEffect(() => {
    if (selectedAccount?.domain) {
      setExpandedDomains(prev => {
        const next = new Set(prev);
        next.add(selectedAccount.domain);
        return next;
      });
    }
  }, [selectedAccount]);

  async function handleCreate() {
    const local = customLocal.trim() || generateRandom(12);
    const domain = selectedDomain;
    if (!domain) return;

    const address = `${local}@${domain}`;
    setCreateLoading(true);
    try {
      await onCreateAccount(address);
    } finally {
      setCreateLoading(false);
      setCustomLocal('');
      setShowCreate(false);
    }
  }

  async function handleSelectAccount(account: Account) {
    onSelectAccount(account);
    // Update lastUsed for guest accounts
    if (!user) {
      updateGuestAccountLastUsed(account.address);
    }
  }

  function generateRandom(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function toggleDomain(domain: string) {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

  function handleDelete(address: string, e: React.MouseEvent) {
    e.stopPropagation();
    const account = accounts.find(item => item.address === address);
    if (account) setDeleteTarget(account);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    onDeleteAccount(deleteTarget.address);
    setDeleteTarget(null);
  }

  const guestLabel = locale === 'vi' ? 'Khách (Guest)' : 'Guest (Anonymous)';
  
  const uniqueOwners = Array.from(
    new Set(accounts.map(a => a.owner?.username || guestLabel))
  ).sort((a, b) => {
    if (a === guestLabel) return 1;
    if (b === guestLabel) return -1;
    return a.localeCompare(b);
  });

  const filteredAccounts = accounts.filter(a => {
    if (!ownerFilter) return true;
    const ownerName = a.owner?.username || guestLabel;
    return ownerName === ownerFilter;
  });
  const normalDomains = Array.from(new Set(filteredAccounts.map(a => a.domain)));
  const filteredAccountDomains = [...normalDomains];
  if (dotmailAccounts.length > 0) {
    filteredAccountDomains.push('GMAIL DOTMAIL');
  }

  const accountsByDomain = filteredAccountDomains.reduce((acc, domain) => {
    if (domain === 'GMAIL DOTMAIL') {
      acc[domain] = dotmailAccounts;
    } else {
      acc[domain] = filteredAccounts.filter(a => a.domain === domain);
    }
    return acc;
  }, {} as Record<string, any[]>);

  async function handleGenerateOtpKey(address: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('tmail_token');
      const res = await fetch('/api/accounts/otp-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      navigator.clipboard?.writeText(`hãy truy cập ${origin}/otp và nhập ${data.credential} vào để lấy mã otp`);
      setOtpKeyGenerated(address);
      toast(`Đã copy OTP Key! Hãy truy cập ${origin}/otp và nhập "${data.credential}" vào để lấy mã OTP.`, 'success');
      setTimeout(() => setOtpKeyGenerated(null), 3000);
    } catch (err: any) {
      toast(err.message || 'Cần quyền admin', 'error');
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100] md:hidden" 
          onClick={onClose} 
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          sidebar fixed md:relative top-0 left-0 h-full z-[150] md:z-auto
          flex flex-col h-screen overflow-hidden
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5 text-lg font-bold text-[var(--accent)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M2 7L12 13L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>tmailCC</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              className="btn btn-ghost" 
              onClick={onRefresh} 
              title={t('refresh')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L4 7m16 10l-1.64 1.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button 
              className="btn btn-ghost md:hidden" 
              onClick={onClose}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Create Button - Available for both logged in users and guests */}
        <button 
          className="btn btn-primary mx-3 my-3 justify-center text-sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {t('newEmailAddress')}
        </button>

        {/* Create Form - Available for both logged in users and guests */}
        {showCreate && (
          <div className="fade-in px-3 pb-3 border-b border-[var(--border)]">
            <div className="mb-2">
              <input
                type="text"
                className="input"
                placeholder={t('randomAddress')}
                value={customLocal}
                onChange={e => setCustomLocal(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div className="mb-2">
              <select
                className="select w-full"
                value={selectedDomain}
                onChange={e => setSelectedDomain(e.target.value)}
              >
                {availableDomains.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {customLocal && (
              <div className="text-xs text-[var(--text-muted)] text-center mb-2">
                @{selectedDomain}
              </div>
            )}
            <button
              className="btn btn-primary w-full justify-center"
              onClick={handleCreate}
              disabled={createLoading || !selectedDomain}
            >
              {createLoading ? t('loading') : t('tao')}
            </button>
          </div>
        )}

        {/* Owner Filter */}
        {isAdmin && uniqueOwners.length > 0 && (
          <div className="px-5 pb-4">
            <select
              className="select w-full text-sm"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
              value={ownerFilter}
              onChange={e => setOwnerFilter(e.target.value)}
            >
              <option value="">Tất cả User</option>
              {uniqueOwners.map(owner => (
                <option key={owner as string} value={owner as string}>{owner}</option>
              ))}
            </select>
          </div>
        )}

        {/* Accounts List */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="loading-spinner" />
            </div>
          ) : filteredAccountDomains.length === 0 ? (
            <AnimatedEmptyState
              icon="email"
              title={t('noEmailAddressesYet')}
              description={user ? t('clickToCreate') : undefined}
              textVariant="fade"
            />
          ) : (
            filteredAccountDomains.map(domain => (
              <div key={domain} className="mb-0.5">
                <button 
                  className="w-full flex items-center gap-1.5 px-4 py-1.5 
                             text-[var(--text-secondary)] text-[11px] font-semibold 
                             uppercase tracking-wide hover:text-[var(--text-primary)]
                             transition-colors duration-150"
                  onClick={() => toggleDomain(domain)}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="transition-transform duration-200"
                    style={{ transform: expandedDomains.has(domain) ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="flex-1 text-left">{domain}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)]">
                    {accountsByDomain[domain]?.length || 0}
                  </span>
                </button>

                {expandedDomains.has(domain) && (
                  <div className="px-2">
                    {accountsByDomain[domain]?.map(account => (
                      <div
                        key={account._id}
                        className={`
                          w-full flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer
                          transition-all duration-150 relative group
                          hover:bg-[var(--bg-hover)]
                          ${selectedAccount?.address === account.address 
                            ? 'bg-[var(--accent-subtle)] border border-[var(--accent)]/30' 
                            : 'border border-transparent'}
                        `}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectAccount(account)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectAccount(account);
                          }
                        }}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0
                                      ${account.isDotmail 
                                        ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                        : 'bg-[var(--accent-subtle)] text-[var(--accent)]'}`}>
                          {account.isDotmail ? 'G' : account.address[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {account.address}
                          </div>
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                              {account.isDotmail ? 'Gmail (IMAP)' : `${account.emailCount} ${t('emails')}`}
                            </span>
                            {account.owner?.username && (
                              <span 
                                className="text-[11px] text-[var(--accent)] truncate max-w-[60px]"
                                title={`Owner: ${account.owner.username}`}
                              >
                                {account.owner.username}
                              </span>
                            )}
                            <div className="flex items-center gap-0.5 ml-auto">
                              <button
                                className="w-6 h-6 rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] 
                                           hover:text-[var(--accent)] transition-all duration-150 flex items-center justify-center"
                                onClick={e => { e.stopPropagation(); onCopyAddress(account.address); setCopiedAddress(account.address); setTimeout(() => setCopiedAddress(null), 2000); }}
                                title={t('copyAddress')}
                              >
                                {copiedAddress === account.address ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--success)]">
                                    <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                                  </svg>
                                )}
                              </button>
                              {account.isDotmail ? (
                                <button
                                  className={`w-6 h-6 rounded transition-all duration-150 flex items-center justify-center
                                    ${otpKeyGenerated === account.address 
                                      ? 'text-[var(--success)]' 
                                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]'}`}
                                  onClick={e => handleGenerateOtpKey(account.address, e)}
                                  title="Tạo OTP key"
                                >
                                  {otpKeyGenerated === account.address ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </button>
                              ) : (
                                <>
                                  <button
                                    className="w-6 h-6 rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] 
                                               hover:text-[var(--accent)] transition-all duration-150 flex items-center justify-center"
                                    onClick={e => { e.stopPropagation(); onShowQR(account.address); }}
                                    title={t('showQRCode')}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
                                      <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
                                      <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
                                      <rect x="14" y="14" width="3" height="3" stroke="currentColor" strokeWidth="2"/>
                                      <rect x="18" y="14" width="3" height="3" stroke="currentColor" strokeWidth="2"/>
                                      <rect x="14" y="18" width="3" height="3" stroke="currentColor" strokeWidth="2"/>
                                      <rect x="18" y="18" width="3" height="3" stroke="currentColor" strokeWidth="2"/>
                                    </svg>
                                  </button>
                                  <button
                                    className={`w-6 h-6 rounded transition-all duration-150 flex items-center justify-center
                                      ${otpKeyGenerated === account.address 
                                        ? 'text-[var(--success)]' 
                                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]'}`}
                                    onClick={e => handleGenerateOtpKey(account.address, e)}
                                    title="Tạo OTP key"
                                  >
                                    {otpKeyGenerated === account.address ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </button>
                                  <button
                                    className="w-6 h-6 rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--error)] 
                                               transition-all duration-150 flex items-center justify-center"
                                    onClick={e => handleDelete(account.address, e)}
                                    title={t('delete')}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {(account.unreadCount || 0) > 0 && (
                          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full 
                                         bg-[var(--accent)] text-white text-[10px] font-bold 
                                         flex items-center justify-center px-1.5">
                            {account.unreadCount}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteTarget && (
          <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/45"
            onClick={() => setDeleteTarget(null)}
          >
            <div 
              className="w-full max-w-[320px] border border-[var(--border)] rounded-lg 
                         bg-[var(--bg-secondary)] shadow-xl p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-base font-bold text-[var(--text-primary)] mb-2">
                {t('delete')}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mb-4 break-all">
                <span className="text-[var(--text-primary)] font-semibold">
                  {deleteTarget.address}
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                  {t('no')}
                </button>
                <button 
                  className="btn text-white" 
                  style={{ background: 'var(--error)' }}
                  onClick={confirmDelete}
                >
                  {t('yes')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

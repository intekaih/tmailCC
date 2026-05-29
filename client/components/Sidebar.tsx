'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { Account } from '@/lib/types';
import type { User } from '@/lib/types';
import { useApp } from '@/lib/AppContext';
import AnimatedEmptyState from '@/components/AnimatedText';
import CreateAccountForm from '@/components/CreateAccountForm';
import OwnerFilter from '@/components/OwnerFilter';
import AccountItem from '@/components/AccountItem';

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

export function getGuestAccounts(): GuestAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_GUEST_ACCOUNTS) || '[]');
  } catch {
    return [];
  }
}

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

export function removeGuestAccount(address: string) {
  if (typeof window === 'undefined') return;
  const accounts = getGuestAccounts().filter(a => a.address !== address);
  localStorage.setItem(LS_GUEST_ACCOUNTS, JSON.stringify(accounts));
}

interface SidebarProps {
  accounts: Account[];
  selectedAccount: Account | null;
  isOpen?: boolean;
  onClose?: () => void;
  onSelectAccount: (account: Account) => void;
  onCreateAccount: (address: string, captchaToken?: string) => Promise<unknown>;
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
  const { toast, user, darkMode, t } = useApp();
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
  const hasSetDefaultFilter = useRef(false);
  const [dotmailAccounts, setDotmailAccounts] = useState<(Account & { isDotmail?: boolean; parentAddress?: string })[]>([]);

  // Captcha
  const [captchaConfig, setCaptchaConfig] = useState<{ enabled: boolean; siteKey: string } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [captchaVersion, setCaptchaVersion] = useState(0);

  // Load captcha config for guests
  useEffect(() => {
    if (!user) {
      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          setCaptchaConfig({
            enabled: data.captchaEnabled,
            siteKey: data.captchaSiteKey,
          });
        })
        .catch(err => console.error('Failed to load captcha config:', err));
    }
  }, [user]);

  // Set default filter for admin
  useEffect(() => {
    if (isAdmin && user?.username && !hasSetDefaultFilter.current) {
      setOwnerFilter(user.username);
      hasSetDefaultFilter.current = true;
    }
  }, [user, isAdmin]);

  // Load dotmail accounts
  useEffect(() => {
    if (!user) {
      setDotmailAccounts([]);
      return;
    }
    api.admin.dotmails()
      .then((res: any) => {
        const all = (res.parents || []).flatMap((parent: any) =>
          (parent.dotmails || []).map((dm: any) => ({
            _id: dm.id,
            id: dm.id,
            address: dm.address,
            domain: 'GMAIL DOTMAIL',
            emailCount: 0,
            isDotmail: true,
            parentAddress: parent.address,
          }))
        );
        setDotmailAccounts(all);
      })
      .catch(err => console.warn('loadDotmails error:', err));
  }, [user, domainVersion, accounts.length]);

  // Load available domains
  useEffect(() => {
    api.accounts.domains()
      .then(res => {
        const names = res.domains.map((d: { domain: string }) => d.domain);
        setAvailableDomains(names);
        if (!selectedDomain || !names.includes(selectedDomain)) {
          setSelectedDomain(names[0] || '');
        }
      })
      .catch(() => {
        const fallback = Array.from(new Set(accounts.map(a => a.domain)));
        setAvailableDomains(fallback);
        if (!selectedDomain || !fallback.includes(selectedDomain)) {
          setSelectedDomain(fallback[0] || '');
        }
      });
  }, [showCreate, accounts.length, domainVersion, user]);

  // Expand domain of selected account
  useEffect(() => {
    if (selectedAccount?.domain) {
      setExpandedDomains(prev => {
        const next = new Set(prev);
        next.add(selectedAccount.domain);
        return next;
      });
    }
  }, [selectedAccount]);

  // Update guest account lastUsed
  const updateGuestAccountLastUsed = (address: string) => {
    const stored = getGuestAccounts();
    const idx = stored.findIndex(a => a.address === address);
    if (idx >= 0) {
      stored[idx].lastUsed = new Date().toISOString();
      localStorage.setItem(LS_GUEST_ACCOUNTS, JSON.stringify(stored));
    }
  };

  async function handleCreate() {
    const local = customLocal.trim() || generateRandom(12);
    const domain = selectedDomain;
    if (!domain) return;

    const address = `${local}@${domain}`;
    setCreateLoading(true);
    try {
      await onCreateAccount(address, captchaToken);
      setCustomLocal('');
      setCaptchaToken('');
      setShowCreate(false);
    } catch {
      setCaptchaToken('');
      setCaptchaVersion(v => v + 1);
    } finally {
      setCreateLoading(false);
    }
  }

  function handleSelectAccount(account: Account) {
    onSelectAccount(account);
    if (!user) {
      updateGuestAccountLastUsed(account.address);
    }
  }

  function generateRandom(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
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

  const guestLabel = 'Khách (Guest)';

  const uniqueOwners = Array.from(
    new Set(accounts.map(a => a.owner?.username || guestLabel))
  );

  const filteredAccounts = accounts.filter(a => {
    if (!ownerFilter) return true;
    return (a.owner?.username || guestLabel) === ownerFilter;
  });

  const normalDomains = Array.from(new Set(filteredAccounts.map(a => a.domain)));
  const filteredDomains = [...normalDomains];
  if (dotmailAccounts.length > 0) {
    filteredDomains.push('GMAIL DOTMAIL');
  }

  const accountsByDomain = filteredDomains.reduce((acc, domain) => {
    if (domain === 'GMAIL DOTMAIL') {
      acc[domain] = dotmailAccounts;
    } else {
      acc[domain] = filteredAccounts.filter(a => a.domain === domain);
    }
    return acc;
  }, {} as Record<string, (Account & { isDotmail?: boolean })[]>);

  const labels = {
    randomAddress: t('randomAddress'),
    create: t('tao'),
    cancel: t('cancel'),
    loading: t('loading'),
    copyAddress: t('copyAddress'),
    showQRCode: t('showQRCode'),
    delete: t('delete'),
    emails: t('emails'),
    otpKey: 'Tạo OTP key',
  };

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
            <button className="btn btn-ghost" onClick={onRefresh} title={t('refresh')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L4 7m16 10l-1.64 1.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="btn btn-ghost md:hidden" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Create Button */}
        <button
          className="btn btn-primary mx-3 my-3 justify-center text-sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {t('newEmailAddress')}
        </button>

        {/* Create Form */}
        {showCreate && (
          <CreateAccountForm
            availableDomains={availableDomains}
            selectedDomain={selectedDomain}
            customLocal={customLocal}
            captchaToken={captchaToken}
            captchaConfig={captchaConfig}
            captchaVersion={captchaVersion}
            darkMode={!!darkMode}
            onDomainChange={setSelectedDomain}
            onLocalChange={setCustomLocal}
            onCaptchaToken={setCaptchaToken}
            onCaptchaExpire={() => setCaptchaToken('')}
            onCaptchaError={() => setCaptchaToken('')}
            onSubmit={handleCreate}
            onCancel={() => { setShowCreate(false); setCustomLocal(''); setCaptchaToken(''); }}
            isLoading={createLoading}
            isGuest={!user}
            labels={labels}
          />
        )}

        {/* Owner Filter */}
        {isAdmin && uniqueOwners.length > 0 && (
          <OwnerFilter
            owners={uniqueOwners}
            value={ownerFilter}
            onChange={setOwnerFilter}
            guestLabel={guestLabel}
          />
        )}

        {/* Accounts List */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="loading-spinner" />
            </div>
          ) : filteredDomains.length === 0 ? (
            <AnimatedEmptyState
              icon="email"
              title={t('noEmailAddressesYet')}
              description={user ? t('clickToCreate') : undefined}
              textVariant="fade"
            />
          ) : (
            filteredDomains.map(domain => (
              <div key={domain} className="mb-0.5">
                {/* Domain header */}
                <button
                  className="w-full flex items-center gap-1.5 px-4 py-1.5
                    text-[var(--text-secondary)] text-[11px] font-semibold
                    uppercase tracking-wide hover:text-[var(--text-primary)]
                    transition-colors duration-150"
                  onClick={() => toggleDomain(domain)}
                >
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
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

                {/* Account items */}
                {expandedDomains.has(domain) && (
                  <div className="px-2">
                    {accountsByDomain[domain]?.map((account, idx) => (
                      <AccountItem
                        key={account._id || account.id || `dm-${idx}`}
                        account={account}
                        isSelected={selectedAccount?.address === account.address}
                        labels={labels}
                        onSelect={() => handleSelectAccount(account)}
                        onCopy={() => { onCopyAddress(account.address); setCopiedAddress(account.address); setTimeout(() => setCopiedAddress(null), 2000); }}
                        onShowQR={() => onShowQR(account.address)}
                        onDelete={() => setDeleteTarget(account as Account)}
                        onOtpKey={(e: React.MouseEvent) => { handleGenerateOtpKey(account.address, e); }}
                        copiedAddress={copiedAddress}
                        otpKeyGenerated={otpKeyGenerated}
                      />
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
                  onClick={() => { onDeleteAccount(deleteTarget.address); setDeleteTarget(null); }}
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

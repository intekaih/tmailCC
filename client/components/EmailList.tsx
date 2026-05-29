'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Account, Email } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { EmailListSkeleton } from './SkeletonLoader';
import AnimatedEmptyState from './AnimatedText';

interface EmailListProps {
  emails: Email[];
  selectedEmail: Email | null;
  onSelectEmail: (email: Email) => void;
  onRefresh?: () => void;
  onClearAll?: () => void;
  onMarkAllRead?: () => void;
  loading: boolean;
  account: Account | null;
}

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diff < 60000) return locale === 'vi' ? 'Vừa xong' : 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (days === 1) return locale === 'vi' ? 'Hôm qua' : 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' });
}

function extractPreview(text: string, html: string): string {
  let content = html || text || '';
  
  // 1. Remove style tags and their content
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  // 2. Remove script tags and their content
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  // 3. Remove all HTML tags
  content = content.replace(/<[^>]*>/g, ' ');
  // 4. Decode HTML entities
  content = content
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');

  // 5. Clean CSS stylesheet blocks (e.g., selector { margin: 0; ... })
  const cssPropertyRegex = /(?:margin|padding|font-family|box-sizing|background|color|display|width|height|border|outline|align-items|justify-content|text-align|position|float|clear|flex|grid|cursor|opacity|transition|box-shadow|text-shadow|line-height|letter-spacing)\s*:/i;
  
  let lastContent = '';
  let cleaned = content;
  while (cleaned !== lastContent) {
    lastContent = cleaned;
    cleaned = cleaned.replace(/([^{}]*)\{([^{}]*)\}/g, (match, selector, block) => {
      if (
        cssPropertyRegex.test(block) ||
        selector.trim().startsWith('.') ||
        selector.trim().startsWith('#') ||
        selector.trim().startsWith('@') ||
        selector.trim() === '*'
      ) {
        return ' ';
      }
      return match;
    });
  }
  
  content = cleaned.replace(/\s+/g, ' ').trim();

  // 6. Fallback if empty
  if (!content) {
    content = text || '';
  }

  return content.substring(0, 120).trim() || '(No content)';
}

type FilterType = 'all' | 'unread' | 'starred';

export default function EmailList({
  emails,
  selectedEmail,
  onSelectEmail,
  onRefresh,
  onClearAll,
  onMarkAllRead,
  loading,
  account,
}: EmailListProps) {
  const { t, locale, user } = useApp();
  const isAdmin = user?.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const countdownStart = useRef(10);

  const handleRefresh = useCallback(() => {
    if (onRefresh && !refreshing) {
      setRefreshing(true);
      onRefresh();
      setTimeout(() => setRefreshing(false), 800);
    }
  }, [onRefresh, refreshing]);

  useEffect(() => {
    if (autoRefresh && account && !loading) {
      countdownStart.current = 10;
      setCountdown(10);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (onRefresh && !refreshing) {
              setRefreshing(true);
              onRefresh();
              setTimeout(() => setRefreshing(false), 800);
            }
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [autoRefresh, account, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredEmails = useMemo(() => {
    let result = emails;

    if (filter === 'unread') result = result.filter(e => !e.isRead);
    if (filter === 'starred') result = result.filter(e => e.isStarred);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.subject.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q) ||
        e.fromName.toLowerCase().includes(q) ||
        e.text.toLowerCase().includes(q)
      );
    }

    return result;
  }, [emails, searchQuery, filter]);

  const unreadCount = emails.filter(e => !e.isRead).length;
  const starredCount = emails.filter(e => e.isStarred).length;

  if (!account) {
    return (
      <div className="w-[var(--list-width)] min-w-[var(--list-width)] border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col h-screen overflow-hidden">
        <div className="flex flex-col h-full items-center justify-center text-[var(--text-muted)] gap-3">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.2">
            <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 7L12 13L22 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p className="text-sm">{t('selectEmailAddress')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="email-list flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)] flex-shrink-0">
        {/* Row 1: Inbox + controls + action icons */}
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">{t('inbox')}</span>
            {unreadCount > 0 && (
              <span className="bg-[var(--accent)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
            <button
              className={`w-7 h-7 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center text-[var(--text-muted)] transition-all duration-200 hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] ${refreshing ? 'animate-spin' : ''}`}
              onClick={handleRefresh}
              title={t('refresh')}
              disabled={refreshing}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className={`relative w-7 h-7 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center transition-all duration-200 ${autoRefresh ? 'text-[var(--accent)] bg-[var(--accent)]/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]'}`}
              onClick={() => {
                setAutoRefresh(prev => {
                  if (!prev) {
                    countdownStart.current = 10;
                    setCountdown(10);
                  } else {
                    if (countdownRef.current) {
                      clearInterval(countdownRef.current);
                      countdownRef.current = null;
                    }
                  }
                  return !prev;
                });
              }}
              title={t('autoRefresh')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {autoRefresh && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[var(--accent)] text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono">
                  {countdown}
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                className="w-7 h-7 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center text-[var(--text-muted)] transition-all duration-200 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                onClick={() => onMarkAllRead?.()}
                title={t('markAllRead')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12.5l5 5L17 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 12.5l5 5L23 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            {emails.length > 0 && (
              <button
                className="w-7 h-7 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center text-[var(--text-muted)] transition-all duration-200 hover:bg-red-500/10 hover:text-[var(--error)]"
                onClick={() => setShowClearConfirm(true)}
                title={t('clearAll')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        {/* Row 2: Account address */}
        <div className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded-md flex flex-col gap-0.5 mb-2.5">
          <span className="truncate">{account.address}</span>
          {isAdmin && (
            <span className="text-[var(--accent)] truncate">Owner: {account.owner?.username || 'unknown'}</span>
          )}
        </div>

        {/* Clear Confirm Bar */}
        {showClearConfirm && (
          <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg mb-2 text-xs text-[var(--error)] animate-[fadeIn_0.2s_ease]">
            <span>{t('clearAllConfirm')}</span>
            <button 
              className="px-2 py-1 rounded border-none bg-[var(--error)] text-white cursor-pointer text-[11px] font-semibold hover:opacity-85 transition-opacity"
              onClick={() => { setShowClearConfirm(false); onClearAll?.(); }}
            >
              {t('yes')}
            </button>
            <button 
              className="px-2 py-1 rounded border border-[var(--border)] bg-transparent text-[var(--text-secondary)] cursor-pointer text-[11px] hover:border-[var(--text-muted)] transition-all"
              onClick={() => setShowClearConfirm(false)}
            >
              {t('no')}
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative flex items-center mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="absolute left-2.5 text-[var(--text-muted)] pointer-events-none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            className="w-full pl-8 pr-8 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
            placeholder={t('searchEmails')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-2 bg-none border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded"
              onClick={() => setSearchQuery('')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex gap-0.5">
          {(['all', 'unread', 'starred'] as FilterType[]).map(f => (
            <button
              key={f}
              className={`px-2.5 py-1.5 border-none bg-transparent cursor-pointer text-[12px] border-b-2 transition-all duration-150 ${filter === f ? 'text-[var(--accent)] border-[var(--accent)] font-semibold' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' && `${t('all')} (${emails.length})`}
              {f === 'unread' && `${t('unread')} (${unreadCount})`}
              {f === 'starred' && `${t('starred')} (${starredCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <EmailListSkeleton />
        ) : filteredEmails.length === 0 ? (
          <AnimatedEmptyState
            icon={searchQuery ? 'search' : 'email'}
            title={emails.length === 0 ? t('noEmailsYet') : t('noResultsFound')}
            description={emails.length === 0 ? `${t('sendAnEmailTo')} ${account.address}` : t('tryDifferentSearch')}
            textVariant="fade"
          />
        ) : (
          <div className="p-2">
            {filteredEmails.map((email, idx) => (
              <button
                key={email._id}
                className={`
                  w-full flex items-start gap-2.5 p-3 rounded-xl border-none bg-transparent cursor-pointer text-left
                  text-[var(--text-primary)]
                  transition-all duration-150 mb-0.5 animate-fade-in
                  hover:bg-[var(--bg-hover)]
                  ${selectedEmail?._id === email._id ? 'bg-[var(--bg-tertiary)] border border-[var(--border-light)]' : ''}
                  ${!email.isRead ? 'bg-[var(--accent)]/5' : ''}
                `}
                style={{ animationDelay: `${idx * 30}ms` }}
                onClick={() => onSelectEmail(email)}
              >
                {/* Left side */}
                <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                  {!email.isRead && (
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  )}
                  <div className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {(email.fromName || email.from)[0].toUpperCase()}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate max-w-[180px]">
                      {email.fromName || email.from.split('@')[0]}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0 ml-1">
                      {formatDate(email.receivedAt, locale)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mb-0.5">
                    {email.isStarred && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--star-color)" className="flex-shrink-0">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="var(--star-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    <span className="text-[13px] font-medium text-[var(--text-secondary)] truncate">
                      {email.subject}
                    </span>
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)] truncate">
                    {extractPreview(email.text, email.html)}
                  </div>
                </div>

                {/* Attachment Icon */}
                {email.attachments.length > 0 && (
                  <div className="text-[var(--text-muted)] flex-shrink-0 mt-0.5" title={`${email.attachments.length} ${t('attachment')}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

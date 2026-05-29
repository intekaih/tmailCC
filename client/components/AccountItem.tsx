'use client';

import React from 'react';
import type { Account } from '@/lib/types';

interface AccountItemProps {
  account: Account & { isDotmail?: boolean; parentAddress?: string };
  isSelected: boolean;
  labels: {
    copyAddress: string;
    showQRCode: string;
    delete: string;
    emails: string;
    otpKey: string;
  };
  onSelect: () => void;
  onCopy: () => void;
  onShowQR: () => void;
  onDelete: () => void;
  onOtpKey: (e: React.MouseEvent) => void;
  copiedAddress: string | null;
  otpKeyGenerated: string | null;
}

export default function AccountItem({
  account,
  isSelected,
  labels,
  onSelect,
  onCopy,
  onShowQR,
  onDelete,
  onOtpKey,
  copiedAddress,
  otpKeyGenerated,
}: AccountItemProps) {
  const isCopied = copiedAddress === account.address;
  const isOtpReady = otpKeyGenerated === account.address;

  return (
    <div
      className={`
        w-full flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer
        transition-all duration-150 relative group
        hover:bg-[var(--bg-hover)]
        ${isSelected
          ? 'bg-[var(--accent-subtle)] border border-[var(--accent)]/30'
          : 'border border-transparent'}
      `}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0
        ${account.isDotmail
          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
          : 'bg-[var(--accent-subtle)] text-[var(--accent)]'}`}>
        {account.isDotmail ? 'G' : (account.address[0] || '?').toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="text-sm font-medium text-[var(--text-primary)] truncate pr-6" title={account.address}>
          {account.address}
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
            {account.isDotmail
              ? 'Gmail (IMAP)'
              : `${account.emailCount} ${labels.emails}`}
          </span>
          {account.owner?.username && (
            <span
              className="text-[11px] text-[var(--accent)] truncate max-w-[60px]"
              title={`Owner: ${account.owner.username}`}
            >
              {account.owner.username}
            </span>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 ml-auto">
            {/* Copy */}
            <button
              className="w-6 h-6 rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] transition-all duration-150 flex items-center justify-center"
              onClick={e => { e.stopPropagation(); onCopy(); }}
              title={labels.copyAddress}
            >
              {isCopied ? (
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

            {/* QR / OTP */}
            {account.isDotmail ? (
              <button
                className={`w-6 h-6 rounded transition-all duration-150 flex items-center justify-center
                  ${isOtpReady
                    ? 'text-[var(--success)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]'}`}
                onClick={e => { e.stopPropagation(); onOtpKey(e); }}
                title={labels.otpKey}
              >
                {isOtpReady ? (
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
                  className="w-6 h-6 rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] transition-all duration-150 flex items-center justify-center"
                  onClick={e => { e.stopPropagation(); onShowQR(); }}
                  title={labels.showQRCode}
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
                    ${isOtpReady
                      ? 'text-[var(--success)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]'}`}
                  onClick={e => { e.stopPropagation(); onOtpKey(e); }}
                  title={labels.otpKey}
                >
                  {isOtpReady ? (
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
                  className="w-6 h-6 rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--error)] transition-all duration-150 flex items-center justify-center"
                  onClick={e => { e.stopPropagation(); onDelete(); }}
                  title={labels.delete}
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

      {/* Unread badge */}
      {(account.unreadCount || 0) > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center px-1.5">
          {account.unreadCount}
        </span>
      )}
    </div>
  );
}

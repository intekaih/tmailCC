'use client';

import { useState, useMemo } from 'react';
import { Email, copyToClipboard } from '@/lib/api';
import { useApp } from '@/lib/AppContext';

interface EmailViewProps {
  email: Email | null;
  onToggleStar: (email: Email) => void;
  onDelete: (email: Email) => void;
}

function formatFullDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractOtp(text: string, html: string): string | null {
  let content = text;

  if (!content && html) {
    if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        content = doc.body.textContent || '';
      } catch {
        content = html.replace(/<[^>]*>/g, ' ');
      }
    } else {
      content = html.replace(/<[^>]*>/g, ' ');
    }
  }

  if (!content) return null;

  // Clean URLs, email addresses, and markdown link formats to avoid matching random tokens inside URLs/headers
  content = content.replace(/https?:\/\/[^\s\]\)]+/gi, ' ');
  content = content.replace(/\[([^\]]*)\]\([^\)]*\)/g, ' $1 '); // convert [text](url) to text
  content = content.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' '); // remove emails

  // Normalize all unicode hyphens/dashes (like non-breaking hyphen, en-dash, em-dash) to standard ASCII hyphen
  content = content.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212–—]/g, '-');

  // 1. Check for alphanumeric codes with a hyphen (e.g. F2P-6WP, CJN-I33, BWC-JRX)
  const hyphenMatch = content.match(/\b([A-Z0-9]{2,5}-[A-Z0-9]{2,5})\b/i);
  if (hyphenMatch) {
    const code = hyphenMatch[1].toUpperCase();
    const exclusions = ['OPT-IN', 'OPT-OUT', 'ADD-ON', 'PRE-AMP', 'E-MAIL', 'X-AI'];
    if (code.length >= 5 && code.length <= 11 && !exclusions.includes(code)) {
      return code;
    }
  }

  // 2. Pure digits of length 6 (highest priority standard numeric OTP)
  const sixDigitMatch = content.match(/\b(\d{6})\b/);
  if (sixDigitMatch) {
    return sixDigitMatch[1];
  }

  // 3. Pure digits of length 4 to 8
  const digitsMatch = content.match(/\b(\d{4,8})\b/);
  if (digitsMatch) {
    const code = digitsMatch[1];
    // Exclude years (2024-2030) to avoid false positive matching with copyright year
    if (!(code.length === 4 && /^202[4-9]|2030$/.test(code))) {
      return code;
    }
  }

  // 4. Context-based alphanumeric code matching (e.g. code: A1B2, verification: 4910)
  const contextPatterns = [
    /(?:code|mã|otp|verification|xác\s*minh|confirm|security)[:\s]+([A-Z0-9-]{4,8})/i,
    /([A-Z0-9-]{4,8})[:\s]+(?:is\s+your\s+code|là\s+mã\s+xác\s+minh)/i
  ];
  for (const pattern of contextPatterns) {
    const match = content.match(pattern);
    if (match) {
      const code = match[1];
      if (code && code.length >= 4 && code.length <= 8 && /[0-9]/.test(code)) {
        return code.toUpperCase();
      }
    }
  }

  // 5. Alphanumeric of length 4 to 8 containing both letters and digits (e.g. A1B2C3, GROK12)
  const alphaNumMatch = content.match(/\b([A-Z0-9]{4,8})\b/i);
  if (alphaNumMatch) {
    const code = alphaNumMatch[1];
    // Must contain both letters and digits to be classified as an OTP (prevent matching words like 'EMAIL')
    if (/[A-Z]/i.test(code) && /[0-9]/.test(code)) {
      return code.toUpperCase();
    }
  }

  return null;
}

function renderBody(text: string, html: string): string {
  if (html && html.trim()) {
    return sanitizeEmailHtml(html);
  }
  if (text) {
    return text
      .split('\n')
      .map(line => `<div style="margin-bottom:4px">${escapeHtml(line) || '&nbsp;'}</div>`)
      .join('');
  }
  return '<p style="color:var(--text-muted)">No content</p>';
}

function sanitizeEmailHtml(html: string): string {
  if (typeof window === 'undefined') return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blockedTags = ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form', 'input', 'button'];

  doc.querySelectorAll(blockedTags.join(',')).forEach(node => node.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();

      if (name.startsWith('on') || name === 'srcdoc' || name === 'style') {
        el.removeAttribute(attr.name);
        continue;
      }

      if (['href', 'src', 'xlink:href', 'formaction'].includes(name)) {
        if (!isAllowedUrl(value, name === 'src')) {
          el.removeAttribute(attr.name);
          continue;
        }
      }
    }

    if (el.tagName.toLowerCase() === 'a') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return doc.body.innerHTML;
}

function isAllowedUrl(value: string, isSource: boolean): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return false;
  if (lower.startsWith('data:')) return isSource && lower.startsWith('data:image/');
  if (lower.startsWith('cid:')) return isSource;

  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function EmailView({ email, onToggleStar, onDelete }: EmailViewProps) {
  const { t, locale, toast } = useApp();
  const [showRaw, setShowRaw] = useState(false);
  const [otpCopied, setOtpCopied] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const otp = useMemo(() => {
    if (!email) return null;
    return extractOtp(email.text, email.html);
  }, [email]);

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" opacity="0.15">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.5"/>
            <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <p className="text-sm">{t('selectAnEmailToRead')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="email-view flex-1 flex flex-col overflow-hidden h-screen">
      {/* Header */}
      <div className="p-5 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-secondary)]">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-lg font-semibold flex-1 pr-4 leading-tight">{email.subject}</h1>
          <div className="flex gap-1 flex-shrink-0">
            <button
              className={`w-9 h-9 rounded-lg border-none bg-transparent cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-[var(--bg-hover)] ${email.isStarred ? 'text-[var(--star-color)]' : 'text-[var(--text-secondary)]'}`}
              onClick={() => onToggleStar(email)}
              title={email.isStarred ? t('unstar') : t('star')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={email.isStarred ? 'currentColor' : 'none'}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className="w-9 h-9 rounded-lg border-none bg-transparent cursor-pointer flex items-center justify-center text-[var(--text-secondary)] transition-all duration-150 hover:bg-red-500/15 hover:text-[var(--error)]"
              onClick={() => setDeleteConfirmOpen(true)}
              title={t('deleteEmail')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Sender Info */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-base font-bold flex-shrink-0">
            {(email.fromName || email.from)[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="text-sm font-semibold">{email.fromName || t('unknownSender')}</span>
              <span className="text-xs text-[var(--text-secondary)]">&lt;{email.from}&gt;</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{t('to')} {email.to}</span>
              <span className="text-[11px]">{formatFullDate(email.receivedAt, locale)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Banner */}
      {otp && (
        <div className="flex items-center gap-3 p-3 px-6 border-b border-[var(--accent)]/20 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)' }}>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wide">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('otpDetected')}
          </div>
          <div className="flex-1 text-center font-mono text-xl font-bold text-[var(--accent)] tracking-[6px]"
            style={{ textShadow: '0 0 20px rgba(99, 102, 241, 0.3)' }}>
            {otp}
          </div>
          <button
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer font-sans transition-all duration-200 ${otpCopied 
              ? 'border-[var(--success)] bg-green-500/10 text-[var(--success)]' 
              : 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20'}`}
            onClick={async () => {
              try {
                await copyToClipboard(otp);
                setOtpCopied(true);
                setTimeout(() => setOtpCopied(false), 2000);
              } catch {
                // ignore
              }
            }}
          >
            {otpCopied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t('copiedToClipboard')}
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {t('copyCode')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Body Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-[var(--border)] flex-shrink-0">
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border-none cursor-pointer text-xs transition-all duration-150 ${!showRaw ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            onClick={() => setShowRaw(false)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
              <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {t('emailTab')}
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border-none cursor-pointer text-xs transition-all duration-150 ${showRaw ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            onClick={() => setShowRaw(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('raw')}
          </button>
          {email.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] ml-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {email.attachments.length} {t('attachment')}
            </div>
          )}
        </div>

        {/* Content */}
        {showRaw ? (
          <pre className="flex-1 p-6 overflow-y-auto font-mono text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap break-all">
            {email.text}
          </pre>
        ) : (
          <div
            className="flex-1 p-6 overflow-y-auto text-sm leading-relaxed text-[var(--text-primary)] break-words"
            dangerouslySetInnerHTML={{ __html: renderBody(email.text, email.html) }}
          />
        )}

        {/* Attachments */}
        {email.attachments.length > 0 && !showRaw && (
          <div className="p-4 px-6 border-t border-[var(--border)] flex-shrink-0">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
              {t('attachments')} ({email.attachments.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3.5 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{att.filename}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{formatBytes(att.size)}</span>
                  </div>
                  {att.content && att.contentType?.startsWith('image/') && (
                    <button
                      className="w-6 h-6 rounded-md bg-[var(--bg-tertiary)] border-none cursor-pointer flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] transition-all ml-1"
                      onClick={() => {
                        try {
                          const binary = atob(att.content!);
                          const bytes = new Uint8Array(binary.length);
                          for (let i = 0; i < binary.length; i++) {
                            bytes[i] = binary.charCodeAt(i);
                          }
                          const blob = new Blob([bytes], { type: att.contentType });
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank');
                        } catch {
                          toast(t('cannotPreviewImage'), 'error');
                        }
                      }}
                      title={t('previewImage')}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                  )}
                  {att.content && (
                    <button
                      className="w-6 h-6 rounded-md bg-[var(--bg-tertiary)] border-none cursor-pointer flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--success)] transition-all"
                      onClick={() => {
                        try {
                          const binary = atob(att.content!);
                          const bytes = new Uint8Array(binary.length);
                          for (let i = 0; i < binary.length; i++) {
                            bytes[i] = binary.charCodeAt(i);
                          }
                          const blob = new Blob([bytes], { type: att.contentType });
                          const url = URL.createObjectURL(blob);
                          const a = window.document.createElement('a');
                          a.href = url;
                          a.download = att.filename;
                          a.click();
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        } catch {
                          toast(t('cannotDownloadFile'), 'error');
                        }
                      }}
                      title={t('download')}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      {deleteConfirmOpen && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/45"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div 
            className="w-full max-w-[340px] border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] shadow-xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-base font-bold text-[var(--text-primary)] mb-2">
              {t('deleteEmail')}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mb-4 break-words">
              <span className="text-[var(--text-primary)] font-semibold">{email.subject || 'No subject'}</span>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirmOpen(false)}>
                {t('no')}
              </button>
              <button 
                className="btn text-white" 
                style={{ background: 'var(--error)' }}
                onClick={() => {
                  onDelete(email);
                  setDeleteConfirmOpen(false);
                }}
              >
                {t('yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
